// @ts-check

/// <reference path="./types.d.ts" />

import { app, BrowserWindow, globalShortcut, ipcMain, Menu, WebContentsView } from 'electron';
import * as path from 'path';
import * as fs from "fs";
import * as unzipper from 'unzipper';

import { getLocalSites, initDataPaths } from './main/local_data.js';
import { getSettings, saveSettings } from './main/settings.js';
import { RemoteWindow } from './main/remote_window/remote_window.js';

/** @type BrowserWindow */
var winMain;

/** @type RemoteWindow */
var remoteWindow;

/** @type BrowserWindow */
var winApp;

/** If set to true, the remote window will allow closing (see close event on remote window) */
var appClosing = false;

const sitesDir = initDataPaths();

var settings;

/**
 * Stores all data that is synchronized between main and renderer.
 * On changes, partial updates are sent to the renderer.
 * @type AppState
 */
const appState = {
}

/**
 * Stores previous app state to detect changes.
 * @type AppState
 */
const prevAppState = {
}

/**
 *
 * @param {boolean} b
 */
function showAppWindow(b) {
    if (b) {
        winApp.show();
        winApp.setFullScreen(appState.startFS || false);
    }
    else {
        // If fullscreen, restore, else hide window
        if (winApp.fullScreen) {
            winApp.setFullScreen(false);
        }
        else {
            winApp.hide();
        }
    }
}

export function createWindow() {
    createMainWindow();
    createRemoteWindow();
    createAppWindow();

    // UI-action
    ipcMain.on('ui-action', (_evt, action, params) => {
        console.log(`UI-action: ${action}`);
        console.log(JSON.stringify(params));
        switch (action) {
            case "loadRemote":
                loadRemote();
                break;
            case "launchSite":
                console.log(`Launching site ${params.name}`);
                launchSite(params.name);
                break;
            case "applySettings":
                // Start URL
                settings.startURL = params.url;
                appState.startURL = params.url;
                // Start in fullscreen option
                settings.startFS = params.url;
                appState.startFS = params.startFS;
                saveSettings();
                syncState();
                break;
            default:
                console.error(`Undefined action: ${action}`);
        }
    });
}

app.whenReady().then(async () => {
    // Load settings
    settings = await getSettings();
    // Get remote URL
    appState.startURL = settings.startURL;
    appState.startFS = Boolean(settings.startFS);
    // Load local sites
    appState.localSites = await getLocalSites();
    globalShortcut.register('Escape', () => {
        showAppWindow(false);
    })
    createWindow()
})

function loadRemote() {
    /** @type string */
    const url = settings.startURL || "";
    if (url.length) {
        remoteWindow.loadAndShow(url);
    }
    else {
        winMain.webContents.send("main-action", "setMode", { mode: "settings" });
    }
}

function createMainWindow() {
    winMain = new BrowserWindow({
        width: 800,
        height: 600,
        title: "Zidelok",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(import.meta.dirname, 'main', 'preload.js')
        }
    });

    winMain.loadFile("./renderer/index.html");

    winMain.webContents.on("dom-ready", () => refreshLocalSites());

    // When closing the main window, also close the other windows
    winMain.on('close', evt => {
        appClosing = true;
        remoteWindow.close();
        winApp.close();
    });
}

function createRemoteWindow() {
    remoteWindow = new RemoteWindow(winMain);

    // Only hide the window, unless explicitly indicated to close it
    remoteWindow.on('close', evt => {
        if (!appClosing) {
            evt.preventDefault();
            remoteWindow.hide();
        }
    });

    remoteWindow.addDownloadHandler((event, item, webContents) => {
        const fileName = item.getFilename();
        const dlPath = path.resolve(sitesDir, fileName);
        const dirName = path.parse(fileName).name;
        const dlDir = path.resolve(sitesDir, dirName);
        console.log("DOWNLOAD CALLBACK");
        // Set the save path, making Electron not to prompt a save dialog.
        item.setSavePath(dlPath);
        console.log(`Set save path to ${item.getSavePath()}`);

        item.on('updated', (event, state) => {
            if (state === 'interrupted') {
                console.log('Download is interrupted but can be resumed')
            } else if (state === 'progressing') {
                if (item.isPaused()) {
                    console.log('Download is paused')
                } else {
                    console.log(`Received bytes: ${item.getReceivedBytes()}`)
                }
            }
        })
        item.once('done', async (event, state) => {
            if (state === 'completed') {
                console.log('Downloaded successfully');
                // Successful download: unzip the file into the same directory (unzipper)
                await extractSite(dirName);
                await refreshLocalSites();
            } else {
                console.log(`Download failed: ${state}`)
            }
            remoteWindow.hide();
        })
    });
}

function createAppWindow() {
    winApp = new BrowserWindow({
        width: 1280,
        height: 720,
        autoHideMenuBar: true,
        title: "App",
        show: false
    });

    // Only hide the window, unless explicitly indicated to close it
    winApp.on('close', evt => {
        if (!appClosing) {
            evt.preventDefault();
            showAppWindow(false);
        }
    });
}

async function refreshLocalSites() {
    appState.localSites = await getLocalSites();
    syncState();
}

/**
 * Extract site (remove existing one if present)
 * @param {string} name
 */
async function extractSite(name) {
    const dir = path.resolve(sitesDir, name);
    cleanDirectory(dir);
    const zipFile = dir + ".zip";
    const directory = await unzipper.Open.file(zipFile);
    await directory.extract({ path: dir });
    console.log("Unzip complete");
}

/**
 * Launch a local site
 * @param name string
 */
async function launchSite(name) {
    const dir = path.resolve(sitesDir, name);
    const indexHTML = path.resolve(dir, "index.html");
    let success = fs.existsSync(indexHTML);
    if (!success) {
        // Site has not been extracted yet, try to do that
        const zipFile = path.join(sitesDir, name + ".zip");
        if (fs.existsSync(zipFile)) {
            console.log("Extracting site..");
            await extractSite(name);
            await refreshLocalSites();
            success = true;
        }
        else {
            console.error(`Cannot find site ${name} or archive ${zipFile}`);
        }
    }
    if (success) {
        showAppWindow(true);
        winApp.loadFile(indexHTML);
    }
}

/**
 * Clean/create directoy
 * @param {string} dir
 */
async function cleanDirectory(dir) {
    if (fs.existsSync(dir)) {
        await fs.promises.rm(dir, { recursive: true });
    }
    await fs.promises.mkdir(dir);
}

/**
 * Synchronize state by sending changes to renderer.
 */
function syncState() {
    // Find differences
    /** @type AppState */
    const changes = {};
    let n = 0;
    for (const [k, v] of Object.entries(appState)) {
        if (prevAppState[k] !== v) {
            changes[k] = v;
            prevAppState[k] = v;
            n++;
        }
    }
    if (n > 0) {
        winMain.webContents.send("app-state", changes);
        console.log(`Sent ${n} changes to renderer`);
    }
    else {
        console.log("No changes detected");
    }
}