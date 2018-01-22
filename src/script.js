import * as d3 from 'd3';


import dataAsJson from '../scores.json';
console.log('dataAsJson ==>', dataAsJson)
const sizeDivisor = 100;
const nodePadding = 2.5;


export default function draw() {
  const processedData = Object.keys(dataAsJson)
    .map(tagName => ({ tag: tagName, score: dataAsJson[tagName] }))
    .map(types);

  console.log('processedData ==>', processedData);
  const width = window.innerWidth;
  const height = window.innerHeight;


  function dragstarted(d) {
    if (!d3.event.active) simulation.alphaTarget(.03).restart();
    d.fx = d.x;
    d.fy = d.y;
  }

  function dragged(d) {
    d.fx = d3.event.x;
    d.fy = d3.event.y;
  }

  function dragended(d) {
    if (!d3.event.active) simulation.alphaTarget(.03);
    d.fx = null;
    d.fy = null;
  }

  function types(d) {
    console.log('d', d, sizeDivisor)
    d.size = d.score * 1.5;
    d.size < 3 ? d.radius = 3 : d.radius = d.size;
    return d;
  }

  var svg = d3.select('body')
    .append('svg')
    .attr('width', width)
    .attr('height', height);

  var color = d3.scaleOrdinal(["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"]);

  var simulation = d3.forceSimulation()
  .force("forceX", d3.forceX().strength(.1).x(width * .5))
  .force("forceY", d3.forceY().strength(.1).y(height * .5))
  .force("center", d3.forceCenter().x(width * .5).y(height * .5))
  .force("charge", d3.forceManyBody().strength(-15));


// sort the nodes so that the bigger ones are at the back
//   graph = graph.sort(function(a, b) {
//     return b.size - a.size;
//   });

//update the simulation based on the data
  simulation
  .nodes(processedData)
  .force("collide", d3.forceCollide().strength(.5).radius(function(d) {
    return d.radius + nodePadding;
  }).iterations(1))
  .on("tick", function(d) {
    node
    .attr("cx", function(d) {
      return d.x;
    })
    .attr("cy", function(d) {
      return d.y;
    })
  });

  var node = svg.append("g")
  .attr("class", "node")
  .selectAll("circle")
  .data(processedData)
  .enter().append("circle")
  .attr("r", function(d) {
    return d.radius;
  })
  .attr("fill", function(d) {
    return color(d.continent);
  })
  .attr("cx", function(d) {
    return d.x;
  })
  .attr("cy", function(d) {
    return d.y;
  })
  .call(d3.drag()
  .on("start", dragstarted)
  .on("drag", dragged)
  .on("end", dragended));
}
