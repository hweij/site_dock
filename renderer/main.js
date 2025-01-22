// @ts-check
/// <reference path="../types.d.ts" />
"use strict"

/** @type AppState */
const appState = {
    localSites: []
};

const API = (/** @type any */ (window)).electronAPI;

/** @type (name: string, params: object) => void */
const uiAction = API.uiAction;

async function setMode(mode) {
    const pages = document.querySelectorAll(".page");
    for (const page of pages) {
        if (page.id === mode) {
            page.classList.remove("hidden");
        }
        else {
            page.classList.add("hidden");
        }
    }
}

export function init() {
    initSettings();

    const API = (/** @type any */ (window)).electronAPI;

    const bDownload = /** @type HTMLButtonElement */ (document.getElementById("bDownload"));
    bDownload.onclick = () => API.uiAction("loadRemote");
    const bSettings = /** @type HTMLButtonElement */ (document.getElementById("bSettings"));
    bSettings.onclick = () => setMode("settings");

    // Define handlers for main => renderer actions
    API.onMainAction(
        (action, params) => {
            switch (action) {
                case "setMode":
                    setMode(params.mode);
                    break;
            }
        }
    )

    // Handle state changes
    API.onStateChanges((/** @type AppState */ changes) => {
        console.log("State changed");
        console.log(changes);

        // Local sites
        if (changes.localSites) {
            const sites = changes.localSites;
            console.log("Received local sites in renderer");
            const divLocalSites = /** @type HTMLDivElement */ (document.getElementById("localSites"));
            divLocalSites.innerHTML = "";
            if (sites.length) {
                for (let e of sites) {
                    const line = document.createElement("div");
                    line.className = "site-list-entry";
                    const name = e.name;
                    // const expanded = e.expanded ? "x" : "";
                    // const zipped = e.zipped ? "z" : "";
                    const info = "info";
                    // line.innerHTML = `<div>${name}</div><div>${expanded}</div><div>${zipped}</div><div>${info}</div>`;
                    line.innerHTML = `<div>${name}</div><div>${info}</div>`;
                    divLocalSites.append(line);
                    line.onclick = () => uiAction("launchSite", { name });
                }
            }
            else {
                // No sites, display instructions
                divLocalSites.innerHTML = [
                    "No web apps have been installed yet, install them first, using the button at the bottom of this page.",
                    "&nbsp",
                    "The first time, you will be prompted to enter a URL. Use the one that contains the site archives (as instructed).", "A window will be displayed in which you can select and download a site zip-archive. When the download is started, the site will automatically be added to the list, and you can run the site app.",
                    "&nbsp",
                    "In the settings section, you can change the download URL, and also specify whether apps should be started in full-screen mode",
                    "&nbsp",
                    "To exit fullscreen mode or close the web app, you can either use the close button or press the Escape key."
                ].join("<br/>");
            }
        }

        // Start URL
        if (changes.startURL) {
            (/** @type HTMLInputElement */ (document.getElementById("inputStartURL"))).value = changes.startURL;
        }

        // Start apps in fullscreen mode
        if (changes.startFS) {
            (/** @type HTMLInputElement */ (document.getElementById("cbStartFS"))).checked = changes.startFS;
        }
    });
}

function initSettings() {
    const inputStartURL = /** @type HTMLInputElement */ (document.getElementById("inputStartURL"));
    const cbStartFS = /** @type HTMLInputElement */ (document.getElementById("cbStartFS"));
    const bApplySettings = /** @type HTMLButtonElement */ (document.getElementById("bApplySettings"));
    const bCancelSettings = /** @type HTMLButtonElement */ (document.getElementById("bCancelSettings"));
    bApplySettings.onclick = () => {
        const params = {};
        const url = inputStartURL.value;
        params.url = url;
        params.startFS = cbStartFS.checked;
        uiAction("applySettings", params);
        // Done: go back home
        setMode("home");
    }
    bCancelSettings.onclick = () => {
        inputStartURL.value = appState.startURL || "";
        cbStartFS.checked = appState.startFS || false;
        setMode("home");
    }
}

init();
