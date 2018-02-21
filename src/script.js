import './styles.styl';

import * as d3 from 'd3';
import _throttle from 'lodash/throttle';
import _ceil from 'lodash/ceil';
import groups from '../groupsMapping.json';

const fetchAndDraw = (userId, useColorByScore) => {
  fetch(getApiEndPoint(userId))
    .then(function(response) { return response.json(); })
    .then(function(json) {
      new Vizualization(json.items, userId && useColorByScore)
    });
}

const getApiEndPoint = userId => {
  return `https://api.stackexchange.com/2.2/users/${ userId || 5806646 }/top-answer-tags?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&pagesize=100&filter=default`
};

const input = document.getElementById('js-input');

const width = window.innerWidth;
const height = window.innerHeight;
const MAX_RADIUS = 150;
const MAX_AREA = Math.pow(MAX_RADIUS , 2) * Math.PI;

document.getElementById('js-send-button').addEventListener('click', () => {
  svg.html('');
  fetchAndDraw(input.value.split('/')[4], true);
});

fetchAndDraw();

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

class Vizualization {
  constructor(rawData, useColorByScore) {
    this.nodes = {
      rootSvg: svg,
      circleGroup: null,
      circles: null,
      tooltip: d3.select('.js-tooltip'),
      tagLinks: d3.selectAll('.js-tag-link')
    };

    this.scales = {
      circleAreaScale: null,
      colorScale: null,
      colorScheme: null
    };

    this.data = this.getProcessedData(rawData);

    this.moveTooltip = _throttle(this.moveTooltip, 300);

    this.calculateScales();
    this.drawCircles(this.data); // drawSkeleton
    this.fillWithData();
    this.bindEvents();
  }

  bindEvents() {

  }

  calculateScales() {

  }

  getProcessedData(dataAsJson) {
    return dataAsJson
      .map(item => ({ tag: item.tag_name, score: item.answer_score }))
      .map(d => {
        d.size =  d.score;
        d.radius = Math.sqrt(this.scales.circleAreaScale(d.score) / Math.PI);

        return d;
      });
  }

  moveTooltip(left, top) {
    this.nodes.tooltip
      .style('left', `${ left }px`)
      .style('top', `${ top }px`);
  }

  drawCircles(data, useColorByScore) {
    let isDragged = false;

    const areaScaleDomain = d3.extent(data, d => d.score);

    this.scales.circleAreaScale = d3.scaleLinear()
      .domain(areaScaleDomain)
      .range([MAX_AREA / (areaScaleDomain[1] / areaScaleDomain[0]), MAX_AREA]);

    const upperValueForScale = _ceil(areaScaleDomain[1], -1);

    this.scales.colorScale = d3.scaleLinear()
      .domain([0, upperValueForScale / 2, upperValueForScale])
      .range(['rgb(34, 131, 187)', 'rgb(253, 255, 140)', 'rgb(216, 31, 28)']);

    this.scales.colorScheme = d3.scaleOrdinal(d3.schemeCategory20);

    this.getColorByScore = (d) => this.scales.colorScale(d.score);
    this.getColorByTag = (d) => (this.scales.colorScheme(groups[d.tag] || 'other'));

    // drawLegend(upperValueForScale);

    this.simulation = d3.forceSimulation()
      .force('forceX', d3.forceX().strength(.1).x(width * .5))
      .force('forceY', d3.forceY().strength(.1).y(height * .5))
      .force('center', d3.forceCenter().x(width * .5).y(height * .5))
      .force('charge', d3.forceManyBody().strength(-15));

    this.simulation
      .nodes(this.data)
      .force('collide', d3.forceCollide().strength(.5).radius(d => d.radius + 2.5).iterations(1))
      .on('tick', () => {
        this.nodes.circleGroup
          .attr('transform', d => `translate(${ d.x },${ d.y })`);
      });

    this.nodes.circleGroup = svg.append('g')
      .attr('class', 'nodes')
      .selectAll('.node')
      .data(this.processedData)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', function(d) {
        return `translate(${ d.x },${ d.y })`;
      })
      .on('mouseenter', (d) => {
        if (!isDragged) {
          this.nodes.tooltip.classed('show', true)
            .text(`${ d.tag }: ${ d.score }`);
        }
      })
      .on('mouseleave', () => {
        this.nodes.tooltip.classed('show', false);
      })
      .on('mousemove', () => {
        const { clientX, clientY } = d3.event;
        this.moveTooltip(clientX, clientY);
      })
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended)
      );

    this.nodes.circles = this.nodes.circleGroup.append('circle')
      .attr('r', function(d) {
        return d.radius;
      })
      .attr('fill', /* useColorByScore ? */ this.getColorByScore /* : getColorByTag */);

    this.nodes.circleGroup
      .append('text')
      .text(function(d) { return d.tag; })
      .style('font-size', function(d) {
        const fontSize = Math.min(2 * d.radius, (2 * d.radius - 8)) / this.getComputedTextLength() * 16;

        if (fontSize < 14) {
          this.remove();
        }

        return `${ fontSize }px`;
      })
      .attr('dy', '.35em');

    this.nodes.tagLinks
      .on('mouseenter', function() {
        const tag = this.getAttribute('data-tag');
        animateCircles(tag);
      })
      .on('mouseleave', function() {
        const tag = this.getAttribute('data-tag');

        this.nodes.circles.filter(function(d) {
          return groups[d.tag] === tag
        })
          .transition()
          .duration(400)
          .attr('r', function(d) {
            return d.radius;
          })
      });

    function animateCircles(tag) {
      this.nodes.circles.filter(function(d) {
        return groups[d.tag] === tag
      })
        .each(function() {
          d3.select(this)
            .transition()
            .duration(400)
            .attr('r', function(d) {
              return d.radius - 3;
            })
            .on('end', function() {
              d3.select(this)
                .transition()
                .duration(400)
                .attr('r', function(d) {
                  return d.radius;
                })
                .on('end', () => animateCircles(tag))
            })
        })
    }

    function dragstarted(d) {
      this.nodes.tooltip.classed('show', false);
      isDragged = true;

      if (!d3.event.active) {
        this.simulation.alphaTarget(.03).restart();
      }

      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(d) {
      d.fx = d3.event.x;
      d.fy = d3.event.y;
    }

    function dragended(d) {
      isDragged = false;

      if (!d3.event.active) {
        this.simulation.alphaTarget(.03);
      }

      d.fx = null;
      d.fy = null;
    }
  }

  drawLegend() {

  }
}

// function draw(dataAsJson, useColorByScore) {

// function drawLegend(upperValueForScale) {
//   const legendWidth = 600;
//
//   const countScale = d3.scaleLinear()
//     .domain([0, upperValueForScale])
//     .range([0, legendWidth]);
//
//   const numStops = 10;
//   const countRange = countScale.domain();
//   countRange[2] = countRange[1] - countRange[0];
//   const countPoint = [];
//   for(var i = 0; i < numStops; i++) {
//     countPoint.push(i * countRange[2] / (numStops - 1) + countRange[0]);
//   }
//
//   svg.append('defs')
//     .append('linearGradient')
//     .attr('id', 'legend-traffic')
//     .attr('x1', '0%').attr('y1', '0%')
//     .attr('x2', '100%').attr('y2', '0%')
//     .selectAll('stop')
//     .data(d3.range(10))
//     .enter().append('stop')
//     .attr('offset', function(d,i) {
//       return countScale( countPoint[i] )/legendWidth;
//     })
//     .attr('stop-color', function(d,i) {
//       return this.scales.colorScale( countPoint[i] );
//     });
//
//   const legendsvg = svg.append('g')
//     .attr('class', 'legendWrapper')
//     .attr('transform', 'translate(' + (width/2) + ',80)');
//
//   legendsvg.append('rect')
//     .attr('class', 'legendRect')
//     .attr('x', -legendWidth/2)
//     .attr('y', 0)
//     .attr('width', legendWidth)
//     .attr('height', 10)
//     .style('fill', 'url(#legend-traffic)');
//
//   legendsvg.append('text')
//     .attr('class', 'legendTitle')
//     .attr('x', 0)
//     .attr('y', -10)
//     .style('text-anchor', 'middle')
//     .text('Scores');
//
//   const xScale = d3.scaleLinear()
//     .range([-legendWidth/2, legendWidth/2])
//     .domain([0, upperValueForScale]);
//
//   const xAxis = d3.axisBottom()
//     .scale(xScale)
//     .tickValues(xScale.ticks(4).concat(xScale.domain()));
//
//   legendsvg.append('g')
//     .attr('class', 'axis')
//     .attr('transform', 'translate(0,' + (10) + ')')
//     .call(xAxis);
// }
// function update() {
//   const nodes
// }
// }
