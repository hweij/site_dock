//@ts-check

const goButton = /** @type HTMLButtonElement */ (document.getElementById("goButton"));
const reloadButton = /** @type HTMLButtonElement */ (document.getElementById("reloadButton"));
const addressField = /** @type HTMLInputElement */ (document.getElementById("addressField"));

// API for communicating with the main process
// @ts-ignore
const API = window.electronAPI;

const sendURL = () => {
    console.log(addressField.value);
    API.setURL(addressField.value)
};
goButton.onclick = sendURL;
addressField.onchange = sendURL;

reloadButton.onclick = () => API.reloadURL();

API.onSetURL(url => addressField.value = url);
