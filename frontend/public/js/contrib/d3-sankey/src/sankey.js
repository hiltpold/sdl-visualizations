import {max, min, sum} from "../../d3-array/src/index";
import insert from "../../d3-selection/src/selection/insert";
import node from "../../d3-selection/src/selection/node";
import {justify} from "./align.js";
import constant from "./constant.js";

import deepClone from "../../../../js/src/clone"

function ascendingSourceBreadth(a, b) {
  return ascendingBreadth(a.source, b.source) || a.index - b.index;
}

function ascendingTargetBreadth(a, b) {
  return ascendingBreadth(a.target, b.target) || a.index - b.index;
}

function ascendingBreadth(a, b) {
  return a.y0 - b.y0;
}

function value(d) {
  return d.value;
}

function defaultId(d) {
  return d.index;
}

function defaultNodes(graph) {
  return graph.nodes;
}

function defaultLinks(graph) {
  return graph.links;
}

function find(nodeById, id) {
  const node = nodeById.get(id);
  if (!node) throw new Error("missing: " + id);
  return node;
}

function computeLinkBreadths({nodes}) {
  for (const node of nodes) {
    let y0 = node.y0;
    let y1 = y0;
    for (const link of node.sourceLinks) {
      link.y0 = y0 + link.width / 2;
      y0 += link.width;
    }
    for (const link of node.targetLinks) {
      link.y1 = y1 + link.width / 2;
      y1 += link.width;
    }
  }
}

export default function Sankey() {
  let x0 = 0, y0 = 0, x1 = 1, y1 = 1; // extent
  let dx = 24; // nodeWidth
  let dy = 8, py; // nodePadding
  let id = defaultId;
  let align = justify;
  let sort;
  let linkSort;
  let nodes = defaultNodes;
  let links = defaultLinks;
  let iterations = 6;
  let nLayers = undefined; 

  function sankey() {
    const graph = {nodes: nodes.apply(null, arguments), links: links.apply(null, arguments)};
    computeNodeLinks(graph);
    computeNodeValues(graph);
    computeNodeDepths(graph);
    //computeNodeDepthsKahn(graph);
    computeNodeLayers(graph);
    normalizeGraph(graph);
    minimizeCrossings(graph);
    computeNodeHeights(graph);
    computeNodeBreadths(graph);
    computeLinkBreadths(graph);
    
    return graph;
  }

  sankey.update = function(graph) {
    computeLinkBreadths(graph);
    return graph;
  };

  sankey.nodeId = function(_) {
    return arguments.length ? (id = typeof _ === "function" ? _ : constant(_), sankey) : id;
  };

  sankey.nodeAlign = function(_) {
    return arguments.length ? (align = typeof _ === "function" ? _ : constant(_), sankey) : align;
  };

  sankey.nodeSort = function(_) {
    return arguments.length ? (sort = _, sankey) : sort;
  };

  sankey.nodeWidth = function(_) {
    return arguments.length ? (dx = +_, sankey) : dx;
  };

  sankey.nodePadding = function(_) {
    return arguments.length ? (dy = py = +_, sankey) : dy;
  };

  sankey.nodes = function(_) {
    return arguments.length ? (nodes = typeof _ === "function" ? _ : constant(_), sankey) : nodes;
  };

  sankey.links = function(_) {
    return arguments.length ? (links = typeof _ === "function" ? _ : constant(_), sankey) : links;
  };

  sankey.linkSort = function(_) {
    return arguments.length ? (linkSort = _, sankey) : linkSort;
  };

  sankey.size = function(_) {
    return arguments.length ? (x0 = y0 = 0, x1 = +_[0], y1 = +_[1], sankey) : [x1 - x0, y1 - y0];
  };

  sankey.extent = function(_) {
    return arguments.length ? (x0 = +_[0][0], x1 = +_[1][0], y0 = +_[0][1], y1 = +_[1][1], sankey) : [[x0, y0], [x1, y1]];
  };

  sankey.iterations = function(_) {
    return arguments.length ? (iterations = +_, sankey) : iterations;
  };

  function computeNodeLinks({nodes, links}) {
    for (const [i, node] of nodes.entries()) {
      node.index = i;
      node.sourceLinks = [];
      node.targetLinks = [];
    }
    const nodeById = new Map(nodes.map((d, i) => [id(d, i, nodes), d]));
    for (const [i, link] of links.entries()) {
      link.index = i;
      let {source, target} = link;
      if (typeof source !== "object") source = link.source = find(nodeById, source);
      if (typeof target !== "object") target = link.target = find(nodeById, target);
      source.sourceLinks.push(link);
      target.targetLinks.push(link);
    }
    if (linkSort != null) {
      for (const {sourceLinks, targetLinks} of nodes) {
        sourceLinks.sort(linkSort);
        targetLinks.sort(linkSort);
      }
    }
  }

  function computeNodeValues({nodes}) {
    for (const node of nodes) {
      node.value = node.fixedValue === undefined
          ? Math.max(sum(node.sourceLinks, value), sum(node.targetLinks, value))
          : node.fixedValue;
    }
  }

  function computeNodeDepthsKahn({nodes}) {
    // calculate in-degree
    nodes.forEach((node) => {
      node.inDegree  = node.targetLinks.length > 0 ? node.targetLinks.length : 0;
      node.depth = 0;
    });   
    // final array that contains topologial sorted nodes
    const sorted = [];
    let visitedNodes = 0;
    // get nodes without in-coming links
    let currentNodes= nodes.filter((node) => node.targetLinks.length === 0);
    console.log(currentNodes.map(x=>x.name));
    while(currentNodes.length > 0) {
      const currentNode = currentNodes.shift();
      visitedNodes += 1;
      sorted.push(currentNode);
      // visit neighboring links and decrease inDegree
      for(const {source, target} of currentNode.sourceLinks) {
        target.inDegree -= 1;
        if(target.inDegree == 0) {
          currentNodes.push(target);
          target.depth = source.depth + 1 ;
        }
      }
    }
    if(visitedNodes > nodes.length) throw new Error("circular link")
  }    

  function getLayers({nodes}) {
    const layers= [];
    const nLayer = max(nodes, d => d.layer)+1;
    for(let k=0; k<nLayer; k++){
      layers.push(nodes.filter(n => n.layer === k));
    }
    if (sort) for (const layer of layers) {
      //console.log(sort)
      layer.sort(sort);
    }

    return layers;
  }

  function removeLinks(links, source, target) {
    if(links.length === 0 || links === undefined) {
      return links;
    } else {
      return links.filter((link)=> {
        return !(link.source.name === source.name && link.target.name === target.name);
      });
    }
  }
  
  function virtualNodeFactory (name, index, depth, group, value, x0, x1, layer) {
    return {name, index, depth, group, value, x0, x1, layer};
  }
  function virtualLinkFactory (source, target, index, value) {
    return { source, target, index, value };
  }
  function insertVirtualNode(graph, source, target, virtualNodeIdx, virtualLinkIdx, x0, x1, layer){
    let virtualNode = {};
    let virtualSourceLink = {};
    let virtualTargetLink = {}; 
    virtualNode = virtualNodeFactory(`virtual_${virtualNodeIdx}`, virtualNodeIdx, source.depth+1, "virtual", 1, x0, x1, layer)
    virtualSourceLink = virtualLinkFactory(virtualNode, target, virtualLinkIdx, 1);
    virtualTargetLink = virtualLinkFactory(source, virtualNode, virtualLinkIdx, 1);
    virtualNode.sourceLinks = [ virtualSourceLink ];
    virtualNode.targetLinks = [ virtualTargetLink ];
    // update local link data structure
    source.sourceLinks.push(virtualTargetLink);
    target.targetLinks.push(virtualSourceLink);
    target.targetLinks = removeLinks(target.targetLinks, source, target);
    source.sourceLinks = removeLinks(source.sourceLinks, source, target);
    //target.layer = target.layer+1;
    target.depth = Math.max(virtualNode.depth+1, target.depth);

    // update graph links and nodes
    graph.links = removeLinks (graph.links, source, target);
    // add virtual node and associated links to the graph 
    graph.nodes.push(virtualNode);            
    graph.links.push(virtualSourceLink);            
    graph.links.push(virtualTargetLink); 
    return virtualNode;           
  }
  //
  // this functions adds virtual nodes and links to the existing graph
  //
  function normalizeGraph(graph) {
    const layers = getLayers(graph)//computeNodeLayers(graph);
    
    let virtualNodeIdx = graph.nodes.length;
    let virtualLinkIdx = graph.links.length;

    const nLayer = layers.length; 
    console.log(`< SANKEY HAS ${nLayer} LAYERS >`)
    // sweep through each layer and add virtual links and nodes
    for(let i=0; i< nLayer-1; i++) {
      console.log(`< LAYER ${i} >`)
      const currentLayer = layers[i];
      const nextLayer = layers[i+1];
      // find nodes, where target is not in the next layer
      for(const source of currentLayer){
        for(const {target} of source.sourceLinks) {
          // check if target is in nextLyer, if not create virtual node and add to next layer
          const x0 = nextLayer[0].x0;
          const x1 = nextLayer[0].x1;
          if(!nextLayer.includes(target)) {
            layers[i+1].push(insertVirtualNode(graph, source, target, virtualNodeIdx++, virtualLinkIdx++, x0, x1, i+1));
          }
        }
      }
    }
    //console.log("GNODE" , graph.nodes);
    //console.log("GLINKS" , graph.links);
    console.log("< GRAPH NORMALIZED >");
  }

  function initOrdering(layers, sortFunction){
    // init ordering
    const firstLayer = layers[0];
    firstLayer.forEach((node, idx) => node.position = idx);
    
    for(let i=0; i<layers.length-1;i++){
      const currentLayer = layers[i];
      let position = 0;
      for(const source of currentLayer) {
        for( const {target} of source.sourceLinks){    
          //console.log(source.name, target.name)
          if(target.position === undefined) {
            target.position = position;
            position+=1;
          }
        }
      }
      if(sortFunction) {
        layers[i] = layers[i].sort(sortFunction);
      }
    }
    return layers;

  }

  //
  // brute-force ..
  //
  function countCrossings(layer1, layer2) {
    let count = 0;
    for(const target of layer2) {
      for(const targetLink of target.targetLinks){
        for(const source of layer1){
          for(const sourceLink of source.sourceLinks) {
            if(targetLink.source === sourceLink.source && targetLink.target === sourceLink.target) {
             continue;
            }
            if((targetLink.source.position > sourceLink.source.position && targetLink.target.position < sourceLink.target.position ) ||
                targetLink.source.position < sourceLink.source.position && targetLink.target.position > sourceLink.target.position ) {
                  count+=1;
            }
          }
        }
      } 
    }
    if(count % 2 !== 0) throw new Error("Edge count must be even!") 
    return count/2; 
  }
  
  function countCrossings2(layer) {
    let links = [];
    // get all links between the two layers
    layer.forEach((node) => {
      links = links.concat(node.targetLinks);
    });
    // sort links lexicographically
    links.sort((l1, l2) => {
      return l1.source.position - l2.source.position || l1.target.position - l2.target.position;
    });
    const targets = links.map((link) => {
      return link.target.position;
    });
    // calculate inversion number
    let inversions = 0;
    for(let i=0;i < targets.length;i++) {
      for(let j=i+1; j < targets.length;j++){
        if(targets[i] > targets[j]) {
          inversions++;
        }
      }
    }
    return inversions;
  }

  function sweepLeftToRight(layers, func) {

  }
  
  function sweepRightToLeft(layers, func) {

  }
  
  function medianValue(node, source=false) {
    let nodes = [];
    if(!source){
      nodes = node.targetLinks.map((link) => link.source.position).sort((pos1, pos2) => pos1.position-pos2.position);
    } else {
      nodes = node.sourceLinks.map((link) => link.target.position).sort((pos1, pos2) => pos1.position-pos2.position);
    }
    const l = nodes.length;
    const m = Math.floor(l / 2);
    if(l === 0){
      return -1;
    } else if (l%2 === 1){
      return nodes[m];
    } else if (l===2) {
      return (nodes[0] + nodes[1]) / 2;
    } else {
      const left = nodes[m-1]-nodes[0];
      const right = nodes[l-1]-nodes[m];
      return (nodes[m-1]*right + nodes[m]*left) / (left+right);
    }
  }

  function minimizeCrossings(graph) {
    sort = (a,b) => {return a.position - b.position}
    const sortFunc = (a,b) => {return a.position - b.position}

    let layers = initOrdering(getLayers(graph), sortFunc);
    let bestOrdering = deepClone(layers);

    // sweep 

    for(let iteration=0;iteration<22;iteration++) {
    
      // median calculation
      if(iteration%2 === 0){
        console.log("< MEDIAN - SWEEP FROM LEFT TO RIGHT >")
        for(let i=1; i<layers.length;i++) {
          //const previousLayer = layers[i-1];
          const currentLayer = layers[i];
          console.log("1: ", currentLayer.map(x=>`${x.name}|${x.median}`));
          
          for(const node of currentLayer){
            node.median = medianValue(node, false)
          }
          const sortedCurrentLayer = currentLayer.sort((a,b) => a.median - b.median);
          console.log("1: ", sortedCurrentLayer.map(x=>`${x.name}|${x.median}`));
          
          // update position according to median
          sortedCurrentLayer.forEach((n,idx) => n.position=idx);
        }
      } else {
        console.log("< MEDIAN - SWEEP FROM RIGHT TO LEFT >")
        for(let i=layers.length-2; i>=0;i--) {
          //const previousLayer = layers[i-1];
          const currentLayer = layers[i];
          console.log("2: ", currentLayer.map(x=>`${x.name}|${x.median}`));
          for(const node of currentLayer){
            node.median = medianValue(node, true)
          }
          const sortedCurrentLayer = currentLayer.sort((a,b) => a.median - b.median);
          console.log("2: ", sortedCurrentLayer.map(x=>`${x.name}|${x.median}`));
          
          // update position according to median
          sortedCurrentLayer.forEach((n,idx) => n.position=idx);
        }
      }
      let crossingBest = 0;
      let crossingCurrent = 0;
      for(let i=1; i<layers.length;i++) {
        crossingCurrent += countCrossings2(layers[i]);
        crossingBest += countCrossings2(bestOrdering[i]);
      }
      console.log(layers);
      console.log("< TOTAL CROSSINGS BEST: ", crossingBest );
      console.log("< TOTAL CROSSINGS CURRENT: ", crossingCurrent );
      if(crossingBest > crossingCurrent) {
        console.log("< SWAP CURRENT WITH BEST >")
        bestOrdering = deepClone(layers);
      }
    }

    graph.nodes = bestOrdering.flat();
    graph.links = graph.nodes.map(node => node.sourceLinks).flat();
    
    console.log("< CROSSING MINIMIZED >");
  }

  function computeNodeDepths({nodes}) {
    const n = nodes.length;
    let current = new Set(nodes);
    let next = new Set;
    let x = 0;
    while (current.size) {
      for (const node of current) {
        node.depth = x;
        for (const {target} of node.sourceLinks) {
          next.add(target);
        }
      }
      if (++x > n) throw new Error("circular link");
      current = next;
      next = new Set;
    }
  }

  function computeNodeHeights({nodes}) {
    const n = nodes.length;
    let current = new Set(nodes);
    let next = new Set;
    let x = 0;
    while (current.size) {
      for (const node of current) {
        node.height = x;
        for (const {source} of node.targetLinks) {
          next.add(source);
        }
      }
      if (++x > n) throw new Error("circular link");
      current = next;
      next = new Set;
    }
  }

  function computeNodeLayers({nodes}) {
    const x = max(nodes, d => d.depth) + 1;
    const kx = (x1 - x0 - dx) / (x - 1);
    const columns = [];
    for (const node of nodes) {
      const i = Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x))));
      node.layer = i;
      node.x0 = x0 + i * kx;
      node.x1 = node.x0 + dx;
      //if (columns[i]) columns[i].push(node);
      //else columns[i] = [node];
    }
    /*
    if (sort) for (const column of columns) {
      column.sort(sort);
    }
    */
    return columns;
  }

  function initializeNodeBreadths(columns) {
    const ky = min(columns, c => (y1 - y0 - (c.length - 1) * py) / sum(c, value));
    for (const nodes of columns) {
      let y = y0;
      for (const node of nodes) {
        node.y0 = y;
        node.y1 = y + node.value * ky;
        y = node.y1 + py;
        for (const link of node.sourceLinks) {
          link.width = link.value * ky;
        }
      }
      y = (y1 - y + py) / (nodes.length + 1);
      for (let i = 0; i < nodes.length; ++i) {
        const node = nodes[i];
        node.y0 += y * (i + 1);
        node.y1 += y * (i + 1);
      }
      reorderLinks(nodes);
    }
  }

  function computeNodeBreadths(graph) {
    //const columns = computeNodeLayers(graph);
    const columns = getLayers(graph);
    //console.log(columns);
    py = Math.min(dy, (y1 - y0) / (max(columns, c => c.length) - 1));
    initializeNodeBreadths(columns);
    /*
    for (let i = 0; i < iterations; ++i) {
      const alpha = Math.pow(0.99, i);
      const beta = Math.max(1 - alpha, (i + 1) / iterations);
      relaxRightToLeft(columns, alpha, beta);
      relaxLeftToRight(columns, alpha, beta);
    }
    */
  }

  // Reposition each node based on its incoming (target) links.
  function relaxLeftToRight(columns, alpha, beta) {
    for (let i = 1, n = columns.length; i < n; ++i) {
      const column = columns[i];
      for (const target of column) {
        let y = 0;
        let w = 0;
        for (const {source, value} of target.targetLinks) {
          let v = value * (target.layer - source.layer);
          y += targetTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        let dy = (y / w - target.y0) * alpha;
        target.y0 += dy;
        target.y1 += dy;
        reorderNodeLinks(target);
      }
      if (sort === undefined) column.sort(ascendingBreadth);
      resolveCollisions(column, beta);
    }
  }

  // Reposition each node based on its outgoing (source) links.
  function relaxRightToLeft(columns, alpha, beta) {
    for (let n = columns.length, i = n - 2; i >= 0; --i) {
      const column = columns[i];
      for (const source of column) {
        let y = 0;
        let w = 0;
        for (const {target, value} of source.sourceLinks) {
          let v = value * (target.layer - source.layer);
          y += sourceTop(source, target) * v;
          w += v;
        }
        if (!(w > 0)) continue;
        let dy = (y / w - source.y0) * alpha;
        source.y0 += dy;
        source.y1 += dy;
        reorderNodeLinks(source);
      }
      if (sort === undefined) column.sort(ascendingBreadth);
      resolveCollisions(column, beta);
    }
  }

  function resolveCollisions(nodes, alpha) {
    const i = nodes.length >> 1;
    const subject = nodes[i];
    resolveCollisionsBottomToTop(nodes, subject.y0 - py, i - 1, alpha);
    resolveCollisionsTopToBottom(nodes, subject.y1 + py, i + 1, alpha);
    resolveCollisionsBottomToTop(nodes, y1, nodes.length - 1, alpha);
    resolveCollisionsTopToBottom(nodes, y0, 0, alpha);
  }

  // Push any overlapping nodes down.
  function resolveCollisionsTopToBottom(nodes, y, i, alpha) {
    for (; i < nodes.length; ++i) {
      const node = nodes[i];
      const dy = (y - node.y0) * alpha;
      if (dy > 1e-6) node.y0 += dy, node.y1 += dy;
      y = node.y1 + py;
    }
  }

  // Push any overlapping nodes up.
  function resolveCollisionsBottomToTop(nodes, y, i, alpha) {
    for (; i >= 0; --i) {
      const node = nodes[i];
      const dy = (node.y1 - y) * alpha;
      if (dy > 1e-6) node.y0 -= dy, node.y1 -= dy;
      y = node.y0 - py;
    }
  }

  function reorderNodeLinks({sourceLinks, targetLinks}) {
    if (linkSort === undefined) {
      for (const {source: {sourceLinks}} of targetLinks) {
        sourceLinks.sort(ascendingTargetBreadth);
      }
      for (const {target: {targetLinks}} of sourceLinks) {
        targetLinks.sort(ascendingSourceBreadth);
      }
    }
  }

  function reorderLinks(nodes) {
    if (linkSort === undefined) {
      for (const {sourceLinks, targetLinks} of nodes) {
        sourceLinks.sort(ascendingTargetBreadth);
        targetLinks.sort(ascendingSourceBreadth);
      }
    }
  }

  // Returns the target.y0 that would produce an ideal link from source to target.
  function targetTop(source, target) {
    let y = source.y0 - (source.sourceLinks.length - 1) * py / 2;
    for (const {target: node, width} of source.sourceLinks) {
      if (node === target) break;
      y += width + py;
    }
    for (const {source: node, width} of target.targetLinks) {
      if (node === source) break;
      y -= width;
    }
    return y;
  }

  // Returns the source.y0 that would produce an ideal link from source to target.
  function sourceTop(source, target) {
    let y = target.y0 - (target.targetLinks.length - 1) * py / 2;
    for (const {source: node, width} of target.targetLinks) {
      if (node === source) break;
      y += width + py;
    }
    for (const {target: node, width} of source.sourceLinks) {
      if (node === target) break;
      y -= width;
    }
    return y;
  }

  return sankey;
}
