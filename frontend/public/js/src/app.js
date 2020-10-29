import {select} from "../contrib/d3-selection/src/index";

import dataFromUrls from "./csv";
import { createLineage } from "./lineage";

import {viewWidth, viewHeight} from "./config";


const rootElement = select("#sdl-lineage-container");

const svg = rootElement
  .append("svg")
  .classed("sdl-lineage-content ", true)
  .attr("viewBox", 0+" "+0+" "+viewWidth+" "+viewHeight)
  .attr("preserveAspectRatio", "xMinYMin meet");

const sankeyChart = svg
  .append("g")
  .attr("height", viewHeight)
  .attr("width", viewWidth);

const loadData = dataFromUrls;

Promise.all(loadData).then((data) => {
  console.log(data);
  const nodes = data[0].map( node => ({name: node.name, group: node.group}));
  const links = data[1].map( link => ({source: link.source, target: link.target, value: 1 }));
  
  console.log("< NODES >");
  console.log(nodes);
  console.log("< LINKS >");
  console.log(links);

  createLineage(nodes, links, sankeyChart);

}).catch((error) => {
  console.log(error);
});
