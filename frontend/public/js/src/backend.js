
export const fetchAsync = async (url, username, password) => {
    const response = await fetch(url, { headers: new Headers({"Authorization": `Basic ${window.btoa(`${username}:${password}`)}`})});
    return response.json();
}

export default fetchAsync;