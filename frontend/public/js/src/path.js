
import {linkHorizontal} from "../contrib/d3-shape/src/index";
import {path} from "../contrib/d3-path/src/index";

function horizontalSource(d) {
  return [d.source.x1, d.y0];
}

function horizontalTarget(d) {
  return [d.target.x0, d.y1];
}
const controlPoints = (a, b, c) => {
  if (!a || !c) return b;
  return {
    x: b.x + (c.x - a.x) * .1,
    y: b.y + (c.y - a.y) * .1
  };
}
export const linkPath = (points) => {
   const context = path(); 
   const firstPoint = points[0];
   context.moveTo(firstPoint.x, firstPoint.y);
   const tmp = points.slice(1,-1);
   //context.bezierCurveTo(x0 = (x0 + x1) / 2, y0, x0, y1, x1, y1);
   const cp = [];
   for(let k=0;k<points.length;k++){
      cp.push(controlPoints(points[k-1], points[k], points[k+1]));
   }
   for(let i=0; i<points.length-1;i++){
      //console.log("CP", cp[i])
      context.bezierCurveTo((points[i].x+points[i+1].x)/2, points[i].y, points[i].x, points[i+1].y, points[i+1].x, points[i+1].y);
      //context.bezierCurveTo((cp[i].x+cp[i+1].x)/2, cp[i].y, cp[i].x, cp[i+1].y, cp[i+1].x, cp[i+1].y);
   }
   tmp.forEach((point) => {
      //context.lineTo(point.x,point.y);
      //context.bezierCurveTo(x0, y0 = (y0 + y1) / 2, x1, y0, x1, y1);
   });
   //console.log(context);
   return context;
}
const getPath = (source, target) => {
   let path = [];
   let links = [];
   let stack = [];
   stack.push(source);
   while(stack.length > 0) {
      let currentNode = stack.pop();
      if(currentNode === target){
         path.push(currentNode);
         let predecessor = target.predecessor;
         while(predecessor){
            path.push(predecessor);
            links.push(predecessor.sourceLinks.filter((l) => l.target.name === currentNode.name)[0]);
            currentNode = predecessor;
            predecessor = predecessor.predecessor;
         }
         path.forEach(n => delete n.predecessor);
         return { nodes: path.reverse(), links: links.reverse() };

      }

      currentNode.sourceLinks.forEach((link) => {
         link.target.predecessor = currentNode;
         if(link.target, link.target.group !== "virtual" || (link.target.endpoint !== undefined && link.target.endpoint === target)) {
            stack.push(link.target);
         }
      });
   }
   return path;
}

const getAllPaths = (pairs) => {
   let paths = [];
   pairs.forEach((pair) => {
      const source = pair.source;
      const target = pair.target;
      const path = getPath(source, target);
      paths.push(path);
   });
   return paths;
}
export default getAllPaths;

