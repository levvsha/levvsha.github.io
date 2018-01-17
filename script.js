import * as d3 from 'd3';

export default function draw() {
  var dataAsCsv = `country,gdp,continent
  Afghanistan,18.4,Asia
  Albania,12.14,Europe
  Algeria,168.32,Africa
  Angola,91.94,Africa
  Antigua and Barbuda,1.3,Americas
  Argentina,541.75,Americas
  Armenia,10.75,Asia
  Austria,387.3,Europe
  Bahrain,31.82,Asia
  Bangladesh,226.76,Asia
  Barbados,4.47,Americas
  Belarus,48.13,Europe
  Belgium,470.18,Europe
  Belize,1.77,Americas
  Benin,8.93,Africa
  Bhutan,2.09,Asia
  Bolivia,35.7,Americas
  Bosnia and Herzegovina,16.53,Europe
  Botswana,10.95,Africa
  Brazil,1769.6,Americas
  Bulgaria,50.45,Europe
  Burkina Faso,12.01,Africa
  Burundi,2.74,Africa
  Cabo Verde,1.68,Africa
  Cambodia,19.37,Asia
  Cameroon,30.87,Africa
  Canada,1532.34,Americas
  Central African Republic,1.78,Africa
  Chad,10.44,Africa
  Chile,234.9,Americas
  China,11391.62,Asia
  Colombia,274.14,Americas
  Comoros,0.62,Africa
  Costa Rica,57.69,Americas
  Croatia,49.86,Europe
  Czech Republic,193.54,Europe
  Democratic Republic of the Congo,39.82,Africa
  Denmark,302.57,Europe
  Djibouti,1.89,Africa
  Dominica,0.52,Americas
  Dominican Republic,71.46,Americas
  Ecuador,99.12,Americas
  El Salvador,26.61,Americas
  Equatorial Guinea,11.64,Africa
  Eritrea,5.35,Africa
  Estonia,23.48,Europe
  Ethiopia,69.22,Africa
  Fiji,4.56,Oceania
  Finland,239.19,Europe
  France,2488.28,Europe
  Gabon,14.56,Africa
  Germany,3494.9,Europe
  Ghana,42.76,Africa
  Greece,195.88,Europe
  Grenada,1.03,Americas
  Guatemala,68.39,Americas
  Guinea,6.75,Africa
  Guinea-Bissau,1.17,Africa
  Guyana,3.46,Americas
  Haiti,8.26,Americas
  Honduras,20.93,Americas
  Hungary,117.07,Europe
  Iceland,19.44,Europe
  India,2250.99,Asia
  Indonesia,940.95,Asia
  Iraq,156.32,Asia
  Ireland,307.92,Europe
  Israel,311.74,Asia
  Italy,1852.5,Europe
  Jamaica,13.78,Americas
  Japan,4730.3,Asia
  Jordan,39.45,Asia
  Kazakhstan,128.11,Asia
  Kenya,69.17,Africa
  Kiribati,0.17,Oceania
  Kuwait,110.46,Asia
  Latvia,27.95,Europe
  Lebanon,51.82,Asia
  Lesotho,1.81,Africa
  Liberia,2.17,Africa
  Libya,39.39,Africa
  Lithuania,42.78,Europe
  Luxembourg,60.98,Europe
  Madagascar,9.74,Africa
  Malawi,5.47,Africa
  Malaysia,302.75,Asia
  Maldives,3.27,Asia
  Mali,14.1,Africa
  Malta,10.46,Europe
  Marshall Islands,0.19,Oceania
  Mauritania,4.72,Africa
  Mauritius,11.74,Africa
  Mexico,1063.61,Americas
  Mongolia,11.16,Asia
  Montenegro,4.24,Europe
  Morocco,104.91,Africa
  Mozambique,12.05,Africa
  Myanmar,68.28,Asia
  Namibia,10.18,Africa
  Nepal,21.15,Asia
  Netherlands,769.93,Europe
  New Zealand,179.36,Oceania
  Nicaragua,13.41,Americas
  Niger,7.57,Africa
  Nigeria,415.08,Africa
  Norway,376.27,Europe
  Oman,59.68,Asia
  Palau,0.3,Oceania
  Panama,55.23,Americas
  Papua New Guinea,19.92,Oceania
  Paraguay,27.32,Americas
  Peru,180.29,Americas
  Philippines,311.69,Asia
  Poland,467.35,Europe
  Portugal,205.86,Europe
  Puerto Rico,100.85,Americas
  Qatar,156.6,Asia
  Romania,186.51,Europe
  Russia,1267.75,Europe
  Rwanda,8.34,Africa
  Samoa,0.88,Oceania
  San Marino,1.56,Europe
  Saudi Arabia,637.79,Asia
  Senegal,14.87,Africa
  Seychelles,1.42,Africa
  Sierra Leone,4.29,Africa
  Singapore,296.64,Asia
  Slovenia,44.12,Europe
  Solomon Islands,1.22,Oceania
  South Africa,280.37,Africa
  South Sudan,2.63,Africa
  Spain,1252.16,Europe
  Sri Lanka,82.24,Asia
  Sudan,94.3,Africa
  Suriname,4.14,Americas
  Swaziland,3.43,Africa
  Sweden,517.44,Europe
  Switzerland,662.48,Europe
  Tajikistan,6.61,Asia
  Thailand,390.59,Asia
  Timor-Leste,2.5,Asia
  Togo,4.52,Africa
  Tonga,0.43,Oceania
  Trinidad and Tobago,22.81,Americas
  Tunisia,42.39,Africa
  Turkey,735.72,Asia
  Turkmenistan,36.57,Asia
  Tuvalu,0.03,Oceania
  Uganda,25.61,Africa
  Ukraine,87.2,Europe
  United Arab Emirates,375.02,Asia
  United Kingdom,2649.89,Europe
  United States,18561.93,Americas
  Uruguay,54.37,Americas
  Uzbekistan,66.8,Asia
  Vanuatu,0.77,Oceania
  Venezuela,333.72,Americas
  Vietnam,200.49,Asia
  Yemen,31.33,Asia
  Zambia,20.57,Africa
  Zimbabwe,14.19,Africa`;

  var width = window.innerWidth,
    height = window.innerHeight,
    sizeDivisor = 100,
    nodePadding = 2.5;

  var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  var color = d3.scaleOrdinal(["#66c2a5", "#fc8d62", "#8da0cb", "#e78ac3", "#a6d854", "#ffd92f", "#e5c494", "#b3b3b3"]);

  var simulation = d3.forceSimulation()
    .force("forceX", d3.forceX().strength(.1).x(width * .5))
    .force("forceY", d3.forceY().strength(.1).y(height * .5))
    .force("center", d3.forceCenter().x(width * .5).y(height * .5))
    .force("charge", d3.forceManyBody().strength(-15));

  var graph = d3.csvParse(dataAsCsv, types);
  console.log('graph ', graph);


  // sort the nodes so that the bigger ones are at the back
  graph = graph.sort(function(a, b) {
    return b.size - a.size;
  });

  //update the simulation based on the data
  simulation
    .nodes(graph)
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
    .data(graph)
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
    d.gdp = +d.gdp;
    d.size = +d.gdp / sizeDivisor;
    d.size < 3 ? d.radius = 3 : d.radius = d.size;
    return d;
  }

}
