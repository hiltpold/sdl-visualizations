import {select} from "../contrib/d3-selection/src/index";

import { createLineage } from "./lineage";

import {viewWidth, viewHeight, username, password} from "./config";
import fetchAsync, {fetchDataFromCsvFiles, csvFiles, makeUrl, makeQueryString, dslEndpoint, lineageEndpoint} from "./backend";


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


const dslQueryParams = {
  typeName: `sdl_action`,
  limit: 100
}

const dslQuery = makeUrl(dslEndpoint, makeQueryString(dslQueryParams)); 

console.log(dslQuery);

const createLineageFromAtlas = () => {
  fetchAsync(dslQuery, username, password).then((data) => {
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
    const nodeIds = Object.keys(tmpLineage.guidEntityMap);
    const nodes = nodeIds.map((id) => { 
      return {name: lu[id] }
    });

    const links = tmpLineage.relations.map((relation) => {
      return { source: lu[relation.fromEntityId], target: lu[relation.toEntityId], value: 1 }
    });

    //console.log("< NODES >");
    //console.log(nodes);
    //console.log("< LINKS >");
    //console.log(links);
    
    createLineage(nodes, links, sankeyChart);
    
  }).catch((error) => {
    console.log(error);
  });
} 

const createLineageFromCsvFiles = () => {
  Promise.all(fetchDataFromCsvFiles(csvFiles)).then((data) => {
    const nodes = data[0].map( node => ({name: node.name, group: node.group}));
    const links = data[1].map( link => ({source: link.source, target: link.target, value: 1 }));
    
    //console.log("< NODES >");
    //console.log(nodes);
    //console.log("< LINKS >");
    //console.log(links);

    createLineage(nodes, links, sankeyChart);
  }).catch((error) => {
    console.log(error);
  });
}

createLineageFromAtlas();
//createLineageFromCsvFiles();
