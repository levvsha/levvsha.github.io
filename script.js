import * as d3 from 'd3';

export default function draw() {
  const svg = d3.select('body')
    .append('svg')
    .append('text')
    .text('lets write code');
}
