
export const fetchAsync = async (url) => {
    let response = await fetch(url);
    let data = await response.text();
    let parsedData = await  JSON.parse(data);
    return parsedData;
}

export default dataFromUrls;