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
