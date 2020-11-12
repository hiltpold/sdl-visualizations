import { format } from "../contrib/d3-format/src/index";
import { scaleSequential, scaleOrdinal } from "../contrib/d3-scale/src/index";
import {interpolateViridis} from "../contrib/d3-scale-chromatic/src/index"

// logical dimensions of svg viewbox
export const viewWidth = window.innerWidth;
export const viewHeight = window.innerHeight;
export const margin = 10;
export const spaceBetweenEdges = 6;
export const width = viewWidth
export const height = viewHeight;

export const numberFormat = format(",.0f");

export const username = "admin";
export const password = "admin";

export const ITERATIONS = 10;