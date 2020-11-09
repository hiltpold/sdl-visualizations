
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