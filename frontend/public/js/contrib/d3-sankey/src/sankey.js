import {max, min, sum} from "../../d3-array/src/index";
import insert from "../../d3-selection/src/selection/insert";
import node from "../../d3-selection/src/selection/node";
import {justify} from "./align.js";
import constant from "./constant.js";

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
    normalizeGraph(graph);
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

  function removeLinks(links, source, target) {
    if(links.length === 0 || links === undefined) {
      return links;
    } else {
      return links.filter((link)=> {
        return !(link.source.name === source.name && link.target.name === target.name);
      });
    }
  }
  
  function virtualNodeFactory (name, index, depth, height, group, value) {
    return {name, index, depth, group, value };
  }
  function virtualLinkFactory (source, target, index, value) {
    return { source, target, index, value };
  }
  function insertVirtualNode(graph, source, target, virtualNodeIdx, virtualLinkIdx){
    let virtualNode = {};
    let virtualSourceLink = {};
    let virtualTargetLink = {}; 
    virtualNode = virtualNodeFactory(`virtual_${virtualNodeIdx}`, virtualNodeIdx, source.depth+1, target.height+1, "virtual", 1)
    virtualSourceLink = virtualLinkFactory(virtualNode, target, virtualLinkIdx, 1);
    virtualTargetLink = virtualLinkFactory(source, virtualNode, virtualLinkIdx, 1);
    virtualNode.sourceLinks = [ virtualSourceLink ];
    virtualNode.targetLinks = [ virtualTargetLink ];
    
    // update local link data structure
    source.sourceLinks.push(virtualTargetLink);
    target.targetLinks.push(virtualSourceLink);
    target.targetLinks = removeLinks(target.targetLinks, source, target);
    source.sourceLinks = removeLinks(source.sourceLinks, source, target);
    
    target.depth = Math.max(virtualNode.depth+1, target.depth);
    target.height = Math.max(virtualNode.height+1, source.depth);

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
  function normalizeGraph(graph){
    //const layers = computeNodeLayers(graph);
    // compute layers
    // TODO: make better layer calculation
    const layers= [];
    const nLayer = max(graph.nodes, d => d.depth) + 1;
    for(let k=0; k<nLayer; k++){
      layers.push(graph.nodes.filter(n => n.depth === k));
    }

    let virtualNodeIdx = graph.nodes.length;
    let virtualLinkIdx = graph.links.length;

    console.log(`< SANKEY HAS ${nLayer} LAYERS >`)
    
    // swipe through each layer
    for(let i=0; i< nLayer-1; i++) {
      console.log(`LAYER ${i} ------------------------------------------------------------`)
      const currentLayer = layers[i];
      const nextLayer = layers[i+1];
      // find nodes, where target is not in the next layer
      for(const source of currentLayer){
        for(const {target} of source.sourceLinks) {
          // check if target is in nextLyer
          if(!nextLayer.includes(target)) {
            layers[i+1].push(insertVirtualNode(graph, source, target, virtualNodeIdx++, virtualLinkIdx++));
          }
        }
      }
      console.log("---------------------------------------------------------------------");
    }

    console.log("GNODE" , graph.nodes);
    //console.log("GLINKS" , graph.links);
    
    console.log("< GRAPH NORMALIZED >");
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

  function getNodeLyers({nodes}) {
    const layers= [];
    const nLayer = max(nodes, d => d.depth) + 1;
    for(let k=0; k < nLayer; k++){
      layers.push(graph.nodes.filter(n => n.layer === k));
    }
    return layers;
  }

  function computeNodeLayers({nodes}) {
    const x = max(nodes, d => d.depth) + 1;
    const kx = (x1 - x0 - dx) / (x - 1);
    const columns = new Array(x);
    for (const node of nodes) {
      const i = Math.max(0, Math.min(x - 1, Math.floor(align.call(null, node, x))));
      node.layer = i;
      node.x0 = x0 + i * kx;
      node.x1 = node.x0 + dx;
      if (columns[i]) columns[i].push(node);
      else columns[i] = [node];
    }
    if (sort) for (const column of columns) {
      column.sort(sort);
    }
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
      //reorderLinks(nodes);
    }
  }

  function computeNodeBreadths(graph) {
    const columns = computeNodeLayers(graph);
    py = Math.min(dy, (y1 - y0) / (max(columns, c => c.length) - 1));
    initializeNodeBreadths(columns);
    for (let i = 0; i < iterations; ++i) {
      const alpha = Math.pow(0.99, i);
      const beta = Math.max(1 - alpha, (i + 1) / iterations);
      //relaxRightToLeft(columns, alpha, beta);
      //relaxLeftToRight(columns, alpha, beta);
    }
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
