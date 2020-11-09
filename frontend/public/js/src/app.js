import {select} from "../contrib/d3-selection/src/index";

import dataFromUrls from "./csv";
import { createLineage } from "./lineage";

import {viewWidth, viewHeight, username, password} from "./config";
import fetchAsync from "./backend";


const dslQueryParams = {
  typeName: `sdl_action`,
  limit: 100
}

const dslEndpoint = "http://localhost:8080/api/atlas/v2/search/dsl?";
const lineageEndpoint = "http://localhost:8080/api/atlas/v2/lineage/";

const makeQueryString = (query) => {
  if(typeof query === "object" && query !== null) {
    return Object.keys(query).map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(query[key])).join("&");
  } else {
    return ""
  }
}

const makeUrl = (endpoint, queryString) => {
  return endpoint+queryString
}

const dslQuery = makeUrl(dslEndpoint, makeQueryString(dslQueryParams)); 

console.log(dslQuery);

fetchAsync(dslQuery, username, password).then((data) => {
  console.log(data.entities);
  const guids = data.entities.map((x) => x.guid);
  const lineage = guids.map((guid) => {
    return fetchAsync(lineageEndpoint+guid, username, password);
  });
  return Promise.all(lineage);
}).then((lineages) =>{
  console.log(lineages);
  
  const tmpLineage = lineages[1];
  const lu = Object.keys(tmpLineage.guidEntityMap).reduce((acc, id) => {
    acc[id]= tmpLineage.guidEntityMap[id].attributes.qualifiedName;
    return acc;
  }, {});
  console.log(lu);
  const nodeIds = Object.keys(tmpLineage.guidEntityMap);
  const nodes = nodeIds.map((id) => { 
    return {name: lu[id] }
  });

  const links = tmpLineage.relations.map((relation) => {
    return { source: lu[relation.fromEntityId], target: lu[relation.toEntityId], value: 1 }
  });
  console.log(nodes);
  console.log(links);

  createLineage(nodes, links, sankeyChart);
  
}).catch((error) => {
  console.log(error);
});

const rootElement = select("#sdl-lineage-container");

const svg = rootElement
  .append("svg")
  .classed("sdl-lineage-content ", true)
  .attr("viewBox", 0+" "+0+" "+viewWidth+" "+viewHeight)
  .attr("preserveAspectRatio", "xMinYMin meet");

const sankeyChart = svg
 // .append("g")
  .attr("height", viewHeight)
  .attr("width", viewWidth);

const loadData = dataFromUrls;

Promise.all(loadData).then((data) => {
  const nodes = data[0].map( node => ({name: node.name, group: node.group}));
  const links = data[1].map( link => ({source: link.source, target: link.target, value: 1 }));
  /*
  console.log("< NODES >");
  console.log(nodes);
  console.log("< LINKS >");
  console.log(links);
  */
  //createLineage(nodes, links, sankeyChart);

}).catch((error) => {
  console.log(error);
});
