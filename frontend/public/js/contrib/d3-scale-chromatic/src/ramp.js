import {interpolateRgbBasis} from "../../d3-interpolate/src/index";

export default scheme => interpolateRgbBasis(scheme[scheme.length - 1]);
