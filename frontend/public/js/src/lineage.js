
import { sankey, sankeyLinkHorizontal } from "../contrib/d3-sankey/src/index";
import { scaleSequential, scaleOrdinal } from "../contrib/d3-scale/src/index";
import {interpolateViridis} from "../contrib/d3-scale-chromatic/src/index"
import {width, height, numberFormat } from "./config";
import getAllPaths, {linkPath} from "./path";
import { line, curveCatmullRom, curveBasis, curveLinear, curveCardinalOpen, curveCatmullRomOpen}  from "../contrib/d3-shape/src/index";

export const nodeSorter = (p1, p2) => { 
    return p1.position - p2.position; 
}

export const linkSorter = (n1, n2) => { 
    return n2.value - n1.value; 
}

export const createLineage = (nodes, links, sankeyChart) => {

  const data = {nodes: nodes, links: links};
  //console.log("data", links);

  const sankeyObj = sankey().nodeId(d => d.name)
    .nodeAlign(d => d.depth)
    .nodeSort(nodeSorter)
    //.linkSort(linkSorter)
    .nodeWidth(15)
    .nodePadding(10)
    .size([width, height])
    .iterations(10);
  

  // generate layocomputeNodeDeut
  const layout = sankeyObj(data);
  //console.log("layout", layout);
  const realNodes = layout.nodes.filter((node) => node.group != "virtual")
  const virtualNodes = layout.nodes.filter((node) => node.group == "virtual")
  
  //
  // might be dangerous, be aware of mutability
  //
  const pairs = links.map((link) => {
    const src = layout.nodes.filter(n => n.name === link.source.name);
    const tgt = layout.nodes.filter(n => n.name === link.target.name);
    return {source: src.pop(), target: tgt.pop()};
  });

  const paths = getAllPaths(pairs);
  console.log("PATHS ", paths);

  const colorGenerator = scaleSequential().domain([1, realNodes.length]).interpolator(interpolateViridis);
  const colorScale = realNodes.map((x,i)=>{return colorGenerator(i)});
  const color = scaleOrdinal(colorScale);
  const node = sankeyChart
    .append("g")
    .selectAll("rect")
    .data(realNodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
      .attr("rx", 4)
      .attr("ry", 4)
      .attr("height", d => d.y1 - d.y0)
      .attr("width", d => d.x1 - d.x0)
      .attr("fill",  d => d.group == "virtual" ? "#aaa" : color(d.category === undefined ? d.name : d.category))
    .append("title")
    .text(d => `${d.name}\n${numberFormat(d.value)}`);
  
  const link = sankeyChart.append("g")
    .attr("fill", "none")
    .attr("stroke-opacity", 0.5)
    .selectAll("g")
    .data(layout.links)
    .join("g")
    .style("mix-blend-mode", "multiply");
  /*
  link.append("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke","#aaa")
    .attr("stroke-width", d => Math.max(1, d.width)*0.8);
 */
  const pathData = [];
  paths.forEach((path) => {
    const data = [];
    const pathNodes = path.nodes;
    const pathLinks = path.links;
    const firstNode = pathNodes.slice(0,1)[0];
    const firstLink = pathLinks.slice(0,1)[0];
    const lastNode = pathNodes.slice(-1)[0];
    const lastLink = pathLinks.pop();
    data.push({ x: firstLink.source.x1, y: firstLink.y0, width: firstLink.width });
    pathLinks.forEach((link) => {
      data.push({x: link.target.x0 + (link.target.x1-link.target.x0)/2 , y: link.y1, width: link.width });
    });
    data.push({ x: lastLink.target.x0, y: lastLink.y1, width: lastLink.width });
    pathData.push(data);
  });
  
  //console.log(pathData)
  
  const lineGenerator = line().x( d => {
     return d.x;
  }).y(d => {
    return d.y;
  }).curve(curveCatmullRom.alpha(0));

  /*
  let pathString = lineGenerator(pathData[17]);
  sankeyChart.append('path')
             .attr('d', pathString)
             .style("fill","none")
             .attr("stroke-opacity", 0.5)
             .style("stroke", "#000")
             .attr("stroke-width", d => {
              console.log(d)
              return Math.max(1, 10);
             });
  */

  const smoothPath = sankeyChart.append("g")
                                .selectAll("g")
                                .data(pathData)
                                .join("g")
                                .append("path")
                                //.attr("d", lineGenerator)
                                .attr("d", (d) => linkPath(d))
                                .style("fill","none")
                                .attr("stroke-opacity", 0.5)
                                .attr("stroke-width", d => Math.max(1, Math.max(...d.map(x=>x.width))*0.6))
                                .style("stroke", "steelblue")
 
  
  link.append("title").text(d => `${d.source.name} → ${d.target.name}\n${numberFormat(d.value)}`);
    sankeyChart.append("g")
      .attr("font-family", "sans-serif")
      .attr("font-size", 10)
    .selectAll("text")
    .data(realNodes)
    .join("text")
      .attr("x", d => d.x0 < width / 2 ? d.x1 + 6 : d.x0 - 6)
      .attr("y", d => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
      .text(d => d.name);

  console.log("< LINEAGE CREATED >")
}
export default createLineage
