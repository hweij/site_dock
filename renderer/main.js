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

async function setMode(mode) {
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

        // Apply changes to the state
        Object.assign(appState, changes);

        // Local sites
        if (changes.localSites) {
            const sites = changes.localSites;
            console.log("Received local sites in renderer");
            const divLocalSites = /** @type HTMLDivElement */ (document.getElementById("localSites"));
            divLocalSites.innerHTML = "";
            if (sites.length) {
                for (let e of sites) {
                    const name = e.name;
                    const bInfo = EL("div", "info", "info");
                    const bDelete = EL("div", "delete", "delete");
                    const entryOptions = EL("div", "entry-options", bInfo, bDelete);
                    const line = EL("div", "site-list-entry", name, entryOptions);

                    divLocalSites.append(line);
                    line.onclick = () => uiAction("launchSite", { name });
                    bInfo.onclick = (evt) => { evt.stopPropagation(); uiAction("infoSite", { name }); };
                    // bDelete.onclick = (evt) => { evt.stopPropagation(); uiAction("deleteSite", { name }); showDialog(`Delete app ${name}?`) };
                    bDelete.onclick = (evt) => { evt.stopPropagation(); showDialog(`Delete app ${name}?`, () => uiAction("deleteSite", { name })) };
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
        applySettingsChanges(changes);
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

/**
 * Apply changes in state to settings fields
 * @param {AppState} changes
 */
function applySettingsChanges(changes) {
    // Start URL
    if (changes.startURL) {
        (/** @type HTMLInputElement */ (document.getElementById("inputStartURL"))).value = changes.startURL;
    }

    // Start apps in fullscreen mode
    if (changes.startFS) {
        (/** @type HTMLInputElement */ (document.getElementById("cbStartFS"))).checked = changes.startFS;
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
