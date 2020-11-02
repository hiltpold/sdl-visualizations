
import { sankey, sankeyLinkHorizontal } from "../contrib/d3-sankey/src/index";
import { scaleSequential, scaleOrdinal } from "../contrib/d3-scale/src/index";
import {interpolateViridis} from "../contrib/d3-scale-chromatic/src/index"
import {width, height, numberFormat } from "./config";

export const nodeSorter = (l1, l2) => { 
    return l2.value - l1.value; 
}

export const linkSorter = (n1, n2) => { 
    return n2.value - n1.value; 
}

export const createLineage = (nodes, links, sankeyChart) => {

  const data = {nodes: nodes, links: links};
  console.log("data", data);

  const sankeyObj = sankey().nodeId(d => d.name)
    .nodeAlign(d => d.depth)
    //.nodeSort(nodeSorter)
    //.linkSort(linkSorter)
    .nodeWidth(15)
    .nodePadding(10)
    .size([width, height])
    .iterations(10);
  
  //console.log(sankeyObj());

  // generate layocomputeNodeDeut
  const layout = sankeyObj(data);
  //console.log("layout", layout);
  const realNodes = layout.nodes.filter((node) => node.group != "virtual")
  const virtualNodes = layout.nodes.filter((node) => node.group == "virtual")


  const colorGenerator = scaleSequential().domain([1, realNodes.length]).interpolator(interpolateViridis);
  const colorScale = realNodes.map((x,i)=>{return colorGenerator(i)});
  const color = scaleOrdinal(colorScale);
  console.log("realNodes", colorScale)
  const node = sankeyChart
    .append("g")
    .selectAll("rect")
    .data(layout.nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill",  d => d.group == "virtual" ? "#000" : color(d.category === undefined ? d.name : d.category))
    .append("title")
    .text(d => `${d.name}\n${numberFormat(d.value)}`);
  
  const link = sankeyChart.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll("g")
    .data(layout.links)
    .join("g")
    .style("mix-blend-mode", "multiply");
     
    link.append("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke","#aaa")
    .attr("stroke-width", d => Math.max(1, d.width));

    link.append("title").text(d => `${d.source.name} → ${d.target.name}\n${numberFormat(d.value)}`);
    sankeyChart.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
    .selectAll("text")
    .data(layout.nodes)
    .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);
  console.log("< LINEAGE CREATED >")
}
export default createLineage