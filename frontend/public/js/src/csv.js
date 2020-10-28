
import {csvParse} from "../contrib/d3-dsv/src/index"


export const fileUrls = ["http://localhost:8080/data/vertices_grouped.csv", "http://localhost:8080/data/edges_grouped.csv"];

export const fetchAsync = async (url) => {
    let response = await fetch(url);
    let data = await response.text();
    let parsedData = await csvParse(data);
    return parsedData;
}

export const dataFromUrls = fileUrls.map(async url => {
    return await fetchAsync(url);
});

export default dataFromUrls;