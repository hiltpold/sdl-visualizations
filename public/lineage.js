import layers from "./config.js";

console.log("starting d3", d3);

const rootElement = d3.select("#sdl-lineage-container")

// logical dimensions of svg viewbox
const viewWidth = window.innerWidth;
const viewHeight = window.innerHeight;
const margin = 10;
const spaceBetweenEdges = 6;
const width = viewWidth
const height = viewHeight;

// append the svg object to the body of the page
const svg = rootElement
  .append("svg")
  .classed("sdl-lineage-content ", true)
  .attr("viewBox", 0+" "+0+" "+viewWidth+" "+viewHeight)
  .attr("preserveAspectRatio", "xMinYMin meet")

const sankeyChart = svg
  .append("g")
  .attr("height", viewHeight)
  .attr("width", viewWidth)

//const files = ["../data/data-objects.csv","../data/actions.csv"];
//const files = ["../data/metadata-data-objects.csv","../data/metadata-actions.csv"];
//const files = ["../data/metadata-data-objects-stamm.csv","../data/metadata-actions-stamm.csv"];
//const files = ["../data/metadata-data-objects-bew.csv","../data/metadata-actions-bew.csv"];

const files = ["../data/vertices_grouped.csv", "../data/edges_grouped.csv"];

const d3Data = files.map( (fn) => {
  const extension = fn.slice(-3);
  if(extension === "csv"){
    return d3.csv(fn);
  } else {
    throw ("Unknown file format. ONly .csv and .json are valid at the moment.");
  }
});

// define data
Promise.all(d3Data).then((data) => {
  console.log(data);
  const nodes = data[0].map( node => ({name: node.name, group: node.group}));
  const links = data[1].map( link => ({source: link.source, target: link.target, value: 1 }));
  
  /*
  console.log(edges)
  console.log(nodes)
  */

  createLineage(nodes, links, layers)
}).catch((error) => {
  console.log(error);
});

function createLineage(nodes, links, layers) {

  const data = {nodes: nodes, links: links};
  console.log("data", data);

  // init sankey generator
  function nodeSorter(n1, n2) {
    return n2.value - n1.value; // smaller pos first
  }
  var sankey = Sankey()
    .nodeId(d => d.name)
    //.nodeAlign(d => d.depth)
    .nodeSort(nodeSorter)
    .nodeWidth(15)
    .nodePadding(10)
    .size([width, height])
    .iterations(10);

  // generate layocomputeNodeDeut
  const layout = sankey(data);
  console.log("layout", layout);
  //const color = d3.scaleOrdinal(d3.schemeBrBG[11]);
  const format = d3.format(",.0f");
//  console.log(d3.scaleSequential().domain([1,10]).interpolator(d3.interpolatePuRd));
  const colorGenerator = d3.scaleSequential().domain([1, nodes.length]).interpolator(d3.interpolateViridis);
  const colorScale = nodes.map((x,i)=>{return d3.color(colorGenerator(i)).formatHex()});

  const color = d3.scaleOrdinal(colorScale);
  
  //const color = d3.scaleOrdinal().domain(nodes).range(d3.schemeBlues[9]);

  const node = sankeyChart.selectAll("rect")
    .data(nodes)
    .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill",  d => color(d.category === undefined ? d.name : d.category))
    .append("title")
    .text(d => `${d.name}\n${format(d.value)}`);
  
    const link = sankeyChart.append("g")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(links)
      .join("g")
      .style("mix-blend-mode", "multiply");
     
    link.append("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke","#aaa")
    .attr("stroke-width", d => Math.max(1, d.width));

    link.append("title").text(d => `${d.source.name} → ${d.target.name}\n${format(d.value)}`);

    sankeyChart.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
    .selectAll("text")
    .data(nodes)
    .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);
      /*
  // edges
  var edgePlane = sankeyChart
    .append("g")
  var edge = edgePlane
    .selectAll(".edge")
    .data(layout.links)
    .join("path")
      .attr("class", "edge")
      .attr("fill", "none")
      .attr("stroke-opacity", 0.5)
      .attr("d", sankeyLinkHorizontal())
      .style("stroke", d => d.state=="failed" ? "red" :
                            d.state=="succeeded" ? "green" :
                            d.state=="skipped" ? "#888" : "#aaa")
      .style("stroke-width", d => Math.max(1, d.width - spaceBetweenEdges))
  edge.append("title")
      .text(d => `${d.source.name} → ${d.target.name}\n${d3.format(",.0f")(d.value)}`);
  var edgeRunning = edgePlane
    .selectAll(".edgeRunning")
    .data(layout.links.filter( l => l.state && l.state == "running"))
    .join("path")
      .attr("class", "edgeRunning")
      .attr("fill", "none")
      .attr("d", sankeyLinkHorizontal())
      .style("stroke", "#666")
      .style("stroke-width", d => Math.max(1, d.width / 5))
      .style("stroke-dasharray", "10, 10");
  edgeRunning.append("title")
      .text(d => `${d.source.name} → ${d.target.name}\n${d3.format(",.0f")(d.value)}`);
*/
/*
  
  // layer box
  // calc layer box boundaries
  function updateLayerBoxDef() {
    var nodesByLayer = _.groupBy(data.nodes.filter( n => n.layerName), n => n.layerName)
    layers.forEach(function (l) {
      var nodes = nodesByLayer[l.name];
      if (nodes) {
        l.x0 = d3.min(nodes, n => n.x0)-margin;
        l.x1 = d3.max(nodes, n => n.x1)+margin;
        l.y0 = d3.min(nodes, n => n.y0)-2*margin;
        l.y1 = d3.max(nodes, n => n.y1)+margin;
        l.display = true;
      }
    });
  }
  updateLayerBoxDef();
  var layerBoxPlane = sankeyChart
    .append("g")
  var layerBox = layerBoxPlane
    .selectAll(".layerBox")
    .data(layers.filter( l => l.display))
    .join("g")
      .attr("class", "node")
      .attr("transform", d => "translate(" + d.x0 + "," + d.y0 + ")")
      .attr("font-family", "arial")
      .attr("font-size", 10);
  var layerBoxRect = layerBox.append("rect")
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("opacity", 0.3)
      .attr("fill", d => d.color)
  // layer name
  layerBox.append("text")
      .attr("class", ".layerName")
      .attr("x", d => (d.x1 - d.x0) / 2)
      .attr("y", d => margin)
      .attr("dy", 5)
      .attr("text-anchor", "middle")
      .text(d => d.name);

*/
/*
  // drag nodes
  var posX, deltaY, nodeHeight;
  node.call(d3.drag()
    .on("start", function(d) {
      posX = d.x0;
      deltaY = d.y0 - d3.event.y;
      nodeHeight = d.y1 - d.y0;
      d3.select(this).raise().classed("dragging", true);
      showNodeLineage(d); // show node lineage on drag
    })
    .on("drag", function (d) {
      d.y0 = Math.max(0, Math.min(height - (d.y1 - d.y0), d3.event.y + deltaY));
      d.y1 = d.y0 + nodeHeight;
      d3.select(this)
        .attr("transform", d => "translate(" + d.x0 + "," + (d.dummy ? d.y0 + spaceBetweenEdges/2 : d.y0) + ")");
      // update edges
      sankey.update(layout);
      edge.attr("d", sankeyLinkHorizontal());
      edgeRunning.attr("d", linkHorizontal());
      // update layer boxes
      var layerBoxDef = updateLayerBoxDef();
      layerBox.attr("transform", d => "translate(" + d.x0 + "," + d.y0 + ")")
      layerBoxRect.attr("height", d => d.y1 - d.y0)
    })
    .on("end", function () {
      d3.select(this).classed("dragging", false);
      resetNodeLineage();
    })
  );

  
  // Node Lineage
  // see also https://bl.ocks.org/tomshanley/abcd8a1e2876c41079a2d36332e77865
  function showNodeLineage(node) {
    iterateLinkedLinksRight(node); //Recurse source direction
      iterateLinkedLinksLeft(node); //Recurse target direction
  }
  function resetNodeLineage(node) {
    edge.style("stroke", d => d.color ? d.color : "#aaa")
  }
  //Select links that have a given source name
  function iterateLinkedLinksRight(pStartNode) {
    edge.filter((pLinkedLink,i) => pLinkedLink.source.name == pStartNode.name)
    .style("stroke","LightCoral")
    .each(iterateLinkedNodesRight);
  }
  //Select nodes that have a given source name
  function iterateLinkedNodesRight(pStartLink) {
    node.filter((pLinkedNode,i) => pLinkedNode.name == pStartLink.target.name)
    .each(iterateLinkedLinksRight);
  }
  //Select links that have a given source name
  function iterateLinkedLinksLeft(pStartNode) {
    edge.filter((pLinkedLink,i) => pLinkedLink.target.name == pStartNode.name)
    .style("stroke","LightCoral")
    .each(iterateLinkedNodesLeft);
  }
  //Select nodes that have a given source name
  function iterateLinkedNodesLeft(pStartLink) {
    node.filter((pLinkedNode,i) => pLinkedNode.name == pStartLink.source.name)
    .each(iterateLinkedLinksLeft);
  }

  // animate running edges
  let duration = 5
  let maxOffset = 10;
  let percentageOffset = 1;
  var animateDash = setInterval(updateDash, duration);
  function updateDash() {
    edgeRunning.style("stroke-dashoffset", percentageOffset * maxOffset)
    percentageOffset = percentageOffset == 0 ? 1 : percentageOffset - 0.01
  }

  // display  order
  edgePlane.raise();
  nodePlane.raise();
  */
  console.log("lineage created")
}