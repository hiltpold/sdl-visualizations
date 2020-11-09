
import {csvParse} from "../contrib/d3-dsv/src/index"

export const csvFiles = ["http://localhost:8080/data/vertices_grouped.csv", "http://localhost:8080/data/edges_grouped.csv"];

export const dslEndpoint = "http://localhost:8080/api/atlas/v2/search/dsl?";
export const lineageEndpoint = "http://localhost:8080/api/atlas/v2/lineage/";

export const fetchCsvAsync = async (url) => {
    let response = await fetch(url);
    let data = await response.text();
    let parsedData = await csvParse(data);
    return parsedData;
}

export const fetchDataFromCsvFiles = (files) => {
    return files.map(async url => await fetchCsvAsync(url));
}

export const makeQueryString = (query) => {
  if(typeof query === "object" && query !== null) {
    return Object.keys(query).map((key) => encodeURIComponent(key) + "=" + encodeURIComponent(query[key])).join("&");
  } else {
    return ""
  }
}

export const makeUrl = (endpoint, queryString) => {
  return endpoint+queryString
}
export const fetchAsync = async (url, username, password) => {
    const newHeaders = new Headers({
        "Authorization": `Basic ${window.btoa(`${username}:${password}`)}`,
        "Content-Type": "application/json"
    })
    try {
        const response = await fetch(url, { headers: newHeaders});
        return response.json();
    } 
    catch (error){
        return error;
    }
}

export default fetchAsync;