import './styles.styl';

import * as d3 from 'd3';
import _throttle from 'lodash/throttle';
import _ceil from 'lodash/ceil';
import groups from '../groupsMapping.json';

let vizualization = null;

const fetchAndDraw = (userId, useColorByScore) => {
  fetch(getApiEndPoint(userId))
    .then(function(response) { return response.json(); })
    .then(function(json) {
      if (vizualization) {
        vizualization.update(json.items);
      } else {
        vizualization = new Vizualization(json.items, userId && useColorByScore);
      }
    });
}

const getApiEndPoint = userId => {
  return `https://api.stackexchange.com/2.2/users/${ userId || 5806646 }/top-answer-tags?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&pagesize=100&filter=default`
};

const input = document.getElementById('js-input');
const MAX_RADIUS = 90;

document.getElementById('js-send-button').addEventListener('click', () => {
  fetchAndDraw(input.value.split('/')[4], true);
});

export default () => fetchAndDraw();

const svg = d3.select('body')
  .append('svg');

class Vizualization {
  constructor(rawData, useColorByScore) {
    this.sizes = {
      width: window.innerWidth,
      height: window.innerHeight,
      maxRadius: MAX_RADIUS,
      maxArea: Math.pow(MAX_RADIUS , 2) * Math.PI
    };

    this.nodes = {
      svg: svg,
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

    this.isDragged = false;

    this.initialDraw(rawData);
    this.bindEvents() ;

    this.moveTooltip = _throttle(this.moveTooltip, 300);
  }

  initialDraw(rawData) {

    // this.gradientLegend = new GradientLegend(this.nodes.svg, {
    //   upperValueForScale,
    //   containerWidth: this.sizes.width,
    //   colorScale: this.scales.colorScale
    // });

    this.scales.colorScheme = d3.scaleOrdinal(d3.schemeCategory20);

    this.simulation = d3.forceSimulation()
      .force('forceX', d3.forceX().strength(.1).x(this.sizes.width * .5))
      .force('forceY', d3.forceY().strength(.1).y(this.sizes.height * .5))
      .force('center', d3.forceCenter().x(this.sizes.width * .5).y(this.sizes.height * .5))
      .force('charge', d3.forceManyBody().strength(-15));

    this.nodes.svg
      .attr('width', this.sizes.width)
      .attr('height', this.sizes.height);

    this.nodes.groupsContainer = this.nodes.svg
      .append('g')
      .attr('class', 'nodes');

    this.update(rawData, true);
  }

  update(newData, isInitial) {
    const areaScaleDomain = d3.extent(newData, d => d.answer_score);

    this.scales.circleAreaScale = d3.scaleLinear()
      .domain(areaScaleDomain)
      .range([this.sizes.maxArea / (areaScaleDomain[1] / areaScaleDomain[0]), this.sizes.maxArea]);

    const upperValueForScale = _ceil(areaScaleDomain[1], -1);

    this.scales.colorScale = d3.scaleLinear()
      .domain([0, upperValueForScale / 2, upperValueForScale])
      .range(['rgb(34, 131, 187)', 'rgb(253, 255, 140)', 'rgb(216, 31, 28)']);

    this.data = this.getProcessedData(newData);

    this.nodes.circleGroup = this.nodes.groupsContainer
      .selectAll('g.node')
      .data(this.data, d => d.tag);

    const exitGroups = this.nodes.circleGroup
      .exit();

    const transition = d3.transition()
      .duration(750);

    exitGroups
      .selectAll('text')
      .remove();

    exitGroups
      .selectAll('circle')
      .transition(transition)
      .attr('r', () => 0)
      .on('end', function() {
        d3.select(this.parentNode).remove();
      });

    this.nodes.circleGroup = this.nodes.circleGroup
      .enter()
      .append('g')
      .attr('class', 'node')
      .merge(this.nodes.circleGroup);

    this.nodes.circles = this.nodes.circleGroup
      .selectAll('circle')
      .data(d => [d], d => d.tag);

    this.nodes.circles
      .transition(transition.on('end', () => console.log('==> sdfsdf')))
      .attr('r', d => d.radius);

    this.nodes.circles = this.nodes.circles
      .enter()
      .append('circle')
      .transition(transition)
      .attr('r', d => d.radius)
      .attr('fill', /* useColorByScore ? */ d => this.getColorByScore(d) /* : getColorByTag */)

    this.nodes.circles.merge(this.nodes.circles);

    this.nodes.labels = this.nodes.circleGroup
      .selectAll('text')
      .data(d => [d], d => d.tag);

    this.nodes.labels
      .transition(transition)
      .style('font-size', function(d) {
        const currentFontSize = parseFloat(window.getComputedStyle(this, null).getPropertyValue('font-size'));
        const fontSize = Math.min(2 * d.radius, (2 * d.radius - 8)) / this.getComputedTextLength() * currentFontSize;

        if (fontSize < 14) {
          this.remove();
        }

        return `${ fontSize }px`;
      });

    this.nodes.labels = this.nodes.labels
      .enter()
      .append('text')
      .text(d => d.tag)
      .transition(transition)
      .style('font-size', function(d) {
        const currentFontSize = parseFloat(window.getComputedStyle(this, null).getPropertyValue('font-size'));
        const fontSize = Math.min(2 * d.radius, (2 * d.radius - 8)) / this.getComputedTextLength() * currentFontSize;

        if (fontSize < 14) {
          this.remove();
        }

        return `${ fontSize }px`;
      })
      .attr('dy', '.35em');

    this.nodes.labels.merge(this.nodes.labels);

    this.simulation
      .nodes(this.data)
      .force('collide', d3.forceCollide().strength(.5).radius(d => d.radius + 2.5).iterations(1));

    this.simulation.alphaTarget(.03).restart();
  }

  bindEvents() {
    const component = this;

    this.simulation
      .on('tick', () => {
        this.nodes.circleGroup.attr('transform', d => `translate(${ d.x },${ d.y })`);
      });

    this.nodes.circleGroup
      .on('mouseenter', (d) => {
        if (!this.isDragged) {
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
        .on('start', d => this.dragstarted(d))
        .on('drag', d => this.dragged(d))
        .on('end', d => this.dragended(d))
      );

    this.nodes.tagLinks
      .on('mouseenter', function() {
        const tag = this.getAttribute('data-tag');

        component.animateCircles(tag);
      })
      .on('mouseleave', function() {
        const tag = this.getAttribute('data-tag');

        component.nodes.circles.filter(d => groups[d.tag] === tag)
          .transition()
          .duration(d => d.radius)
      });
  }

  animateCircles(tag) {
    const component = this;

    this.nodes.circles.filter(d => groups[d.tag] === tag)
      .each(function() {
        d3.select(this)
          .transition()
          .duration(400)
          .attr('r', d => d.radius - 3)
          .on('end', function() {
            d3.select(this)
              .transition()
              .duration(400)
              .attr('r', d => d.radius)
              .on('end', () => component.animateCircles(tag))
          })
      })
  }

  getProcessedData(rawData) {
    return rawData
      .map(item => ({ tag: item.tag_name, score: item.answer_score }))
      .map(d => {
        d.radius = Math.sqrt(this.scales.circleAreaScale(d.score) / Math.PI);

        return d;
      });
  }

  getColorByScore(d) {
    return this.scales.colorScale(d.score);
  }

  getColorByTag(d) {
    return this.scales.colorScheme(groups[d.tag] || 'other')
  }

  moveTooltip(left, top) {
    this.nodes.tooltip
      .style('left', `${ left }px`)
      .style('top', `${ top }px`);
  }

  dragstarted(d) {
    this.nodes.tooltip.classed('show', false);
    this.isDragged = true;

    if (!d3.event.active) {
      this.simulation.alphaTarget(.03).restart();
    }

    d.fx = d.x;
    d.fy = d.y;
  }

  dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  dragended(d) {
    this.isDragged = false;

    if (!d3.event.active) {
      this.simulation.alphaTarget(.03);
    }

    d.fx = null;
    d.fy = null;
  }
}

class GradientLegend {
  constructor(node, options) {
    this.options = options;
    this.rootNode = node;

    this.sizes = {
      width: 600
    };

    const legendScale = d3.scaleLinear()
      .domain([0, options.upperValueForScale])
      .range([0, this.sizes.width]);

    this.scales = {
      legendScale,
      colorScale: options.colorScale
    };

    this.drawLegend();
  }

  drawLegend() {
    const numStops = 10;
    const countRange = this.scales.legendScale.domain();
    countRange[2] = countRange[1] - countRange[0];
    const countPoint = [];

    for(var i = 0; i < numStops; i++) {
      countPoint.push(i * countRange[2] / (numStops - 1) + countRange[0]);
    }

    this.rootNode.append('defs')
      .append('linearGradient')
      .attr('id', 'legend-traffic')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%')
      .selectAll('stop')
      .data(d3.range(10))
      .enter().append('stop')
      .attr('offset', (d,i) => this.scales.legendScale(countPoint[i]) / this.sizes.width)
      .attr('stop-color', (d,i) => this.scales.colorScale(countPoint[i]));

    const legendsvg = svg.append('g')
      .attr('class', 'legendWrapper')
      .attr('transform', `translate(${ this.options.containerWidth / 2 },80)`);

    legendsvg.append('rect')
      .attr('class', 'legendRect')
      .attr('x', -this.sizes.width / 2)
      .attr('y', 0)
      .attr('width', this.sizes.width)
      .attr('height', 10)
      .style('fill', 'url(#legend-traffic)');

    legendsvg.append('text')
      .attr('class', 'legendTitle')
      .attr('x', 0)
      .attr('y', -10)
      .style('text-anchor', 'middle')
      .text('Scores');

    const xScale = d3.scaleLinear()
      .range([-this.sizes.width / 2, this.sizes.width / 2])
      .domain([0, this.options.upperValueForScale]);

    const xAxis = d3.axisBottom()
      .scale(xScale)
      .tickValues(xScale.ticks(4).concat(xScale.domain()));

    legendsvg.append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,10)')
      .call(xAxis);
  }
}
