import {calendar} from "./time.js";
import {utcFormat} from "../../d3-time-format/src/index";
import {utcYear, utcMonth, utcWeek, utcDay, utcHour, utcMinute, utcSecond, utcMillisecond} from "../../d3-time/src/index";
import {initRange} from "./init.js";

export default function utcTime() {
  return initRange.apply(calendar(utcYear, utcMonth, utcWeek, utcDay, utcHour, utcMinute, utcSecond, utcMillisecond, utcFormat).domain([Date.UTC(2000, 0, 1), Date.UTC(2000, 0, 2)]), arguments);
}
