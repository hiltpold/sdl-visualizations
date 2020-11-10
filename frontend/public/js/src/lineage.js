
import { sankey, sankeyLinkHorizontal } from "../contrib/d3-sankey/src/index";
import { scaleSequential, scaleOrdinal } from "../contrib/d3-scale/src/index";
import {interpolateViridis} from "../contrib/d3-scale-chromatic/src/index"
import {width, height, numberFormat } from "./config";
import { sankeyLinkPaths } from "./catmullrom";
import getAllPaths from "./path";
import { line, curveCatmullRom }  from "../contrib/d3-shape/src/index";
import catmullRomOpen from "../contrib/d3-shape/src/curve/catmullRomOpen";
import { point } from "../contrib/d3-shape/src/curve/basis";

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

  const tmp = getAllPaths(pairs);
  console.log(tmp);

  const colorGenerator = scaleSequential().domain([1, realNodes.length]).interpolator(interpolateViridis);
  const colorScale = realNodes.map((x,i)=>{return colorGenerator(i)});
  const color = scaleOrdinal(colorScale);
  const node = sankeyChart
    .append("g")
    .selectAll("rect")
    .data(layout.nodes)
      .join("rect")
      .attr("x", d => d.x0)
      .attr("y", d => d.y0)
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
  
  link.append("path")
    .attr("d", sankeyLinkHorizontal())
    .attr("stroke","#aaa")
    .attr("stroke-width", d => Math.max(1, d.width));
  
    console.log(link.select("path"))

  const tmpLine = tmp[0];

  const points = [];
  const pathData = [];
  const last = tmpLine.pop();
  const tmpLine2 = tmpLine.map(n => {
    const link = n.sourceLinks.pop();
    const width = link.width;
    return {x: n.x1, y: n.y0+(n.y1-n.y0)/2, width: width }
  });
  tmpLine2.push({x: last.x1, y: last.y0+(last.y1-last.y0)/2, width: width })
  console.log(tmpLine2);
 // point.
 // const tmp = tmpLine 
 // tmpLine.pop();
  const tmpLinks = tmpLine.map(n => n.sourceLinks).flat();

  console.log("LINKS", tmpLinks)
  console.log("LINE: ", tmp)
  let lineGenerator = line().x( d => {
    console.log(d);
     return d.x;
  }).y(d => {
    console.log(d);
    return d.y;
  }).curve(curveCatmullRom.alpha(0.8));
  let pathString = lineGenerator(tmpLine2);


  console.log("pathString", pathString);
  sankeyChart.append('path').attr('d', pathString)
             .style("stroke-width", d => d.width)
             .style("stroke", "steelblue")
             .style("fill","none")
              .attr("stroke-opacity", 0.5)
    
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
