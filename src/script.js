import './styles.styl';

import * as d3 from 'd3';
import _throttle from 'lodash/throttle';
import _ceil from 'lodash/ceil';
import groups from '../groupsMapping.json';

import { interpolateWarm } from 'd3-scale-chromatic';

const colorInterpolation = d3.scaleSequential(interpolateWarm);

const fetchAndDraw = (userId, useColorByScore) => {
  fetch(getApiEndPoint(userId))
    .then(function(response) { return response.json(); })
    .then(function(json) {
      draw(json.items, userId && useColorByScore)
    });
}

const nodePadding = 2.5;

const getApiEndPoint = userId => {
  return `https://api.stackexchange.com/2.2/users/${ userId || 5806646 }/top-answer-tags?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&pagesize=100&filter=default`
};

const input = document.getElementById('js-input');

const width = window.innerWidth;
const height = window.innerHeight;
const MAX_RADIUS = 150;
const MAX_AREA = Math.pow(MAX_RADIUS , 2) * Math.PI;

const svg = d3.select('body')
  .append('svg')
  .attr('width', width)
  .attr('height', height);

document.getElementById('js-send-button').addEventListener('click', () => {
  svg.html('');
  fetchAndDraw(input.value.split('/')[4], true);
});

fetchAndDraw();

const linearScale = d3.scaleLinear()
  .domain([0, 100])
  .range([0, 600]);

const sequentialScale = d3.scaleSequential()
  .domain([0, 100]);

const myData = d3.range(0, 200, 2);

sequentialScale
  .interpolator(d3.interpolateWarm);

const legend = d3.select('#wrapper svg g')
  .append('g')
  .attr('class', 'interpolator');

legend
  .selectAll('rect')
  .data(myData)
  .enter()
  .append('rect')
  .attr('x', function(d) {
    return linearScale(d);
  })
  .attr('width', 11)
  .attr('height', 30)
  .style('fill', function(d) {
    return sequentialScale(d);
  });

export default function draw(dataAsJson, useColorByScore) {
  let isDragged = false;

  const areaScaleDomain = d3.extent(dataAsJson, d => d.answer_score);

  const areaScale = d3.scaleLinear()
    .domain(areaScaleDomain)
    .range([MAX_AREA / (areaScaleDomain[1] / areaScaleDomain[0]), MAX_AREA]);

  const processedData = dataAsJson
    .map(item => ({ tag: item.tag_name, score: item.answer_score }))
    .map(types);

  const colorScale = d3.scaleLinear()
    .domain([0, _ceil(areaScaleDomain[1], -(areaScaleDomain[1].toString().length - 1))])
    .range([0, 1]);

  const color = d3.scaleOrdinal(d3.schemeCategory20);

  const getColorByScore = (d) => colorInterpolation(colorScale(d.score));
  const getColorByTag = (d) => (color(groups[d.tag] || 'other'));

  const tooltip = d3.select('.js-tooltip');

  const simulation = d3.forceSimulation()
    .force('forceX', d3.forceX().strength(.1).x(width * .5))
    .force('forceY', d3.forceY().strength(.1).y(height * .5))
    .force('center', d3.forceCenter().x(width * .5).y(height * .5))
    .force('charge', d3.forceManyBody().strength(-15));

  simulation
    .nodes(processedData)
    .force('collide', d3.forceCollide().strength(.5).radius(function(d) {
      return d.radius + nodePadding;
    }).iterations(1))
    .on('tick', function() {
      nodes
        .attr('transform', function(d) {
          return `translate(${ d.x },${ d.y })`;
        });
    });

  const moveTooltip = _throttle((left, top) => {
    tooltip.style('left', `${ left }px`)
      .style('top', `${ top }px`);
  }, 300);

  const nodes = svg.append('g')
    .attr('class', 'nodes')
    .selectAll('.node')
    .data(processedData)
    .enter()
    .append('g')
    .attr('class', 'node')
    .attr('transform', function(d) {
      return `translate(${ d.x },${ d.y })`;
    })
    .on('mouseenter', (d) => {
      if (!isDragged) {
        tooltip.classed('show', true)
          .text(`${ d.tag }: ${ d.score }`);
      }
    })
    .on('mouseleave', () => {
      tooltip.classed('show', false);
    })
    .on('mousemove', () => {
      const { clientX, clientY } = d3.event;
      moveTooltip(clientX, clientY);
    })
    .call(d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended)
    );

  const circles = nodes.append('circle')
    .attr('r', function(d) {
      return d.radius;
    })
    .attr('fill', useColorByScore ? getColorByScore : getColorByTag);

  nodes
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

  d3.selectAll('.js-tag-link')
    .on('mouseenter', function() {
      const tag = this.getAttribute('data-tag');
      animateCircles(tag);
    })
    .on('mouseleave', function() {
      const tag = this.getAttribute('data-tag');

      circles.filter(function(d) {
        return groups[d.tag] === tag
      })
        .transition()
        .duration(400)
        .attr('r', function(d) {
          return d.radius;
        })
    });

  function animateCircles(tag) {
    circles.filter(function(d) {
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
    tooltip.classed('show', false);
    isDragged = true;

    if (!d3.event.active) simulation.alphaTarget(.03).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    isDragged = false;
    if (!d3.event.active) simulation.alphaTarget(.03);
    d.fx = null;
    d.fy = null;
  }

  function types(d) {
    d.size =  d.score;
    d.radius = Math.sqrt(areaScale(d.score) / Math.PI);

    return d;
  }
}
