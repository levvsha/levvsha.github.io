import './styles.styl';

import * as d3 from 'd3';
import _throttle from 'lodash/throttle';
import groups from '../groupsMapping.json';
import data from '../scores.json';

const nodePadding = 2.5;

// fetch('https://api.stackexchange.com/2.2/users/5806646/top-answer-tags?key=U4DMV*8nvpm3EOpvf69Rxw((&site=stackoverflow&pagesize=100&filter=default')
//   .then(function(response) { return response.json(); })
//   .then(function(json) {
//     console.log('JSON.stringify(json.items ==>', JSON.stringify(json.items));
//     draw(json.items)
//   });

draw(data);

export default function draw(dataAsJson) {
  const processedData = dataAsJson
    .map(item => ({ tag: item.tag_name, score: item.answer_score }))
    .map(types);

  const width = window.innerWidth;
  const height = window.innerHeight;

  const svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  const tooltip = d3.select('.js-tooltip');

  const color = d3.scaleOrdinal(['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3']);

  const simulation = d3.forceSimulation()
    .force('forceX', d3.forceX().strength(.1).x(width * .5))
    .force('forceY', d3.forceY().strength(.1).y(height * .5))
    .force('center', d3.forceCenter().x(width * .5).y(height * .5))
    .force('charge', d3.forceManyBody().strength(-15));

  // sort the nodes so that the bigger ones are at the back
  //   graph = graph.sort(function(a, b) {
  //     return b.size - a.size;
  //   });

  // update the simulation based on the data
  simulation
    .nodes(processedData)
    .force('collide', d3.forceCollide().strength(.5).radius(function(d) {
      return d.radius + nodePadding;
    }).iterations(1))
    .on('tick', function() {
      circles
        .attr('cx', function(d) {
          return d.x;
        })
        .attr('cy', function(d) {
          return d.y;
        })
    });

  const moveTooltip = _throttle((left, top) => {
    tooltip.style('left', `${ left }px`)
      .style('top', `${ top }px`);
  }, 300);

  const circles = svg.append('g')
    .attr('class', 'node')
    .selectAll('circle')
    .data(processedData)
    .enter().append('circle')
    .attr('r', function(d) {
      return d.radius;
    })
    .attr('fill', function(d) {
      return color(groups[d.tag] || 'other');
    })
    .attr('cx', function(d) {
      return d.x;
    })
    .attr('cy', function(d) {
      return d.y;
    })
    .on('mouseenter', (d) => {
      if (!isDragged) {
        tooltip.classed('show', true)
          .text(`${ d.tag }: ${ d.score }`);
      }
    })
    .on('mouseout', () => {
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

  d3.selectAll('.js-tag-link')
    .on('mouseenter', function() {
      const tag = this.getAttribute('data-tag');
      animateCircles(tag);
    })
    .on('mouseout', function() {
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
    console.log('==> ANIMATE');
    circles.filter(function(d) {
      return groups[d.tag] === tag
    })
      .each(function() {
        d3.select(this)
          .transition()
          .duration(400)
          .attr('r', function(d) {
            return d.radius - 5;
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

  let isDragged = false;

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
    d.size = d.score * 1.5;
    d.size <= 5 ? d.radius = 5 : d.radius = d.size;
    return d;
  }
}
