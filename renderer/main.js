// @ts-check
/// <reference path="../types.d.ts" />
"use strict"

import { EL } from "./util.js";

/** @type AppState */
const appState = {
    localSites: []
};

const API = (/** @type any */ (window)).electronAPI;

/** @type (name: string, params: object) => void */
const uiAction = API.uiAction;

/**
 * Helper: get full path for file
 *
 * @type (file: File) => string
 */
const getFullPath = API.getFullPath;

var curMode = "home";

async function setMode(mode) {
    curMode = mode;
    const pageID = `page-${mode}`;
    const pages = document.querySelectorAll(".page");
    for (const page of pages) {
        if (page.id === pageID) {
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
    const bLocalApp = /** @type HTMLButtonElement */ (document.getElementById("bLocalApp"));
    bLocalApp.onclick = () => API.uiAction("loadLocal");
    const bSettings = /** @type HTMLButtonElement */ (document.getElementById("bSettings"));
    bSettings.onclick = () => setMode("settings");
    const bHelp = /** @type HTMLButtonElement */ (document.getElementById("bHelp"));
    bHelp.onclick = () => setMode("help");
    const bCloseHelp = /** @type HTMLButtonElement */ (document.getElementById("bCloseHelp"));
    bCloseHelp.onclick = () => setMode("home");
    const selAutoStart = /** @type HTMLSelectElement */(document.getElementById("selAutoStart"));

    // Define handlers for main => renderer actions
    API.onMainAction(
        (action, params) => {
            switch (action) {
                case "setMode":
                    setMode(params.mode);
                    break;
                case "closeRequest":
                    // Close request: if in home page, close application. Otherwise, go to homepage.
                    if (curMode === "home") {
                        uiAction("closeApplication", {});
                    }
                    else {
                        setMode("home");
                    }
                    break
            }
        }
    )

    // Handle state changes
    API.onStateChanges((/** @type AppState */ changes) => {
        console.log("State changed");
        console.log(changes);

        // Apply changes to the state
        Object.assign(appState, changes);

        // Local sites
        if (changes.localSites) {
            const sites = changes.localSites;
            console.log("Received local sites in renderer");
            const divLocalSites = /** @type HTMLDivElement */ (document.getElementById("localSites"));
            divLocalSites.innerHTML = "";
            if (sites.length) {
                // Compose sites list
                for (let e of sites) {
                    const name = e.name;
                    const label = e.info?.name ? e.info.name : name;
                    const bInfo = e.info ? EL("div", "info", "info") : EL("div");
                    const bDelete = EL("div", "delete", "delete");
                    const entryOptions = EL("div", "entry-options", bInfo, bDelete);
                    const line = EL("div", "site-list-entry", label, entryOptions);

                    // TEST TEST image
                    if (e.info?.image) {
                        console.log(`Image for ${name}: ${e.info.image}`);
                        const img = /** @type HTMLImageElement */(EL("img"));
                        img.src = e.info.image;
                        line.appendChild(img);
                    }

                    divLocalSites.append(line);
                    line.onclick = () => uiAction("launchSite", { name });
                    if (e.info) {
                        bInfo.onclick = (evt) => { evt.stopPropagation(); uiAction("infoSite", { name }); };
                    }
                    // bDelete.onclick = (evt) => { evt.stopPropagation(); uiAction("deleteSite", { name }); showDialog(`Delete app ${name}?`) };
                    bDelete.onclick = (evt) => { evt.stopPropagation(); showDialog(`Delete app ${name}?`, () => uiAction("deleteSite", { name })) };
                }
                // Refresh start-app selection
                selAutoStart.options.length = 1;
                for (const site of sites) {
                    console.log(site.name);
                    const option = /** @type HTMLOptionElement */(EL("option", "", site.info?.name || site.name));
                    option.value = site.name;
                    selAutoStart.appendChild(option);
                }
                selAutoStart.value = appState.autoStart || "";
            }
            else {
                // No sites, display instructions
                divLocalSites.innerHTML =
                    `<div class="no-sites-wrapper">
                            <div class="no-sites-text">
                                No web apps have been installed yet.<br />
                                Drop archives (zip-files) here or use the<br />
                                "Add apps" button to add apps.
                            </div>
                            <div class="text-button">&gt;&gt; Instructions</div>
                    </div>`;
                const bi = /** @type HTMLButtonElement */(divLocalSites.querySelector(".text-button"));
                bi.onclick = () => setMode("help");
            }
        }
        applySettingsChanges(changes);
    });

    // Handler drag and drop of sites (zip-archives)
    addDropHandlers(document.getElementById("page-home"));
}

/**
 *
 * @param {HTMLElement | null} el
 */
function addDropHandlers(el) {
    if (el) {
        el.ondragover = (evt) => {
            evt.preventDefault();
            if (evt.dataTransfer) {
                evt.dataTransfer.dropEffect = "copy";
            }
        }
        el.ondrop = (evt) => {
            evt.preventDefault();
            if (evt.dataTransfer) {
                const files = evt.dataTransfer.files;
                const filePaths = [];
                for (const file of files) {
                    const p = getFullPath(file);
                    console.log();
                    filePaths.push(p);
                }
                uiAction("loadSites", { files: filePaths });
            }
        }
    }
}

function initSettings() {
    const inputRemoteURL = /** @type HTMLInputElement */ (document.getElementById("inputRemoteURL"));
    const cbStartFS = /** @type HTMLInputElement */ (document.getElementById("cbStartFS"));
    const selAutoStart = /** @type HTMLSelectElement */(document.getElementById("selAutoStart"));
    const bApplySettings = /** @type HTMLButtonElement */ (document.getElementById("bApplySettings"));
    const bCancelSettings = /** @type HTMLButtonElement */ (document.getElementById("bCancelSettings"));
    bApplySettings.onclick = () => {
        const params = {};
        const url = inputRemoteURL.value.trim();
        params.url = url;
        params.startFS = cbStartFS.checked;
        params.autoStart = selAutoStart.value;
        uiAction("applySettings", params);
        // Done: go back home
        setMode("home");
    }
    bCancelSettings.onclick = () => {
        inputRemoteURL.value = appState.remoteURL || "";
        cbStartFS.checked = appState.startFS || false;
        setMode("home");
    }
    inputRemoteURL.onblur = () => {
        // Trim field on focus lost
        inputRemoteURL.value = inputRemoteURL.value.trim()
    }
}

/**
 * Apply changes in state to settings fields
 * @param {AppState} changes
 */
function applySettingsChanges(changes) {
    // Start URL
    if (changes.remoteURL) {
        (/** @type HTMLInputElement */ (document.getElementById("inputRemoteURL"))).value = changes.remoteURL;
    }

    // Start apps in fullscreen mode
    if (changes.startFS) {
        (/** @type HTMLInputElement */ (document.getElementById("cbStartFS"))).checked = changes.startFS;
    }

    // Auto-start
    if (changes.autoStart) {
        (/** @type HTMLSelectElement */ (document.getElementById("selAutoStart"))).value = changes.autoStart || "";
    }
}


const dialog = /** @type HTMLDialogElement */ (document.getElementById("dialog"));
const bDialogConfirm = /** @type HTMLButtonElement */ (document.getElementById("bDialogConfirm"));
const bDialogCancel = /** @type HTMLButtonElement */ (document.getElementById("bDialogCancel"));
const dialogContent = /** @type HTMLDivElement */ (document.getElementById("dialogContent"));

/**
 *
 * @param {string} text
 * @param {() => void} action
 */
function showDialog(text, action) {
    bDialogConfirm.onclick = () => { action(); hideDialog(); };
    bDialogCancel.onclick = hideDialog;
    dialogContent.innerText = text;
    dialog.showModal();
}

function hideDialog() {
    dialog.close();
}

init();
