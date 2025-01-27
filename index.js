// @ts-check
/// <reference path="./types.d.ts" />

import { app, BrowserWindow, dialog, globalShortcut, ipcMain, Menu, WebContentsView } from 'electron';
import * as path from 'path';
import * as fs from "fs";
import * as unzipper from 'unzipper';

import { getLocalSites, initDataPaths } from './main/local_data.js';
import { getSettings, saveSettings } from './main/settings.js';
import { RemoteWindow } from './main/remote_window/remote_window.js';
import { RemoteWindow2 } from './main/remote_window.js';

/** @type BrowserWindow */
var winMain;

/** @type RemoteWindow */
/** @type RemoteWindow2 */
var remoteWindow;

/** @type BrowserWindow */
var winApp;

/** @type BrowserWindow */
var winInfo;

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
    createInfoWindow();

    // UI-action
    ipcMain.on('ui-action', (_evt, action, params) => {
        // console.log(`UI-action: ${action}`);
        // console.log(JSON.stringify(params));
        switch (action) {
            case "loadRemote":
                loadRemote();
                break;
            case "loadLocal":
                loadLocal();
                break;
            case "launchSite":
                console.log(`Launching site ${params.name}`);
                launchSite(params.name);
                break;
            case "infoSite":
                console.log(`Info about site ${params.name}`);
                infoSite(params.name);
                break;
            case "deleteSite":
                console.log(`Deleting site ${params.name}`);
                deleteSite(params.name);
                break;
            case "applySettings":
                // Start URL
                settings.startURL = params.url;
                appState.startURL = params.url;
                // Start in fullscreen option
                settings.startFS = params.startFS;
                appState.startFS = params.startFS;
                saveSettings();
                syncState();
                break;
            case "closeApplication":
                appClosing = true;
                remoteWindow.close();
                winApp.close();
                winInfo.close();
                winMain.close();
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
        remoteWindow.show();
        remoteWindow.setURL(url);
    }
    else {
        winMain.webContents.send("main-action", "setMode", { mode: "settings" });
    }
}

function createMainWindow() {
    winMain = new BrowserWindow({
        width: 640,
        height: 700,
        title: "Site dock",
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(import.meta.dirname, 'main', 'preload.js')
        }
    });

    winMain.loadFile("./renderer/index.html");

    winMain.webContents.on("dom-ready", () => refreshLocalSites());

    // When closing the main window, also close the other windows
    winMain.on('close', evt => {
        if (!appClosing) {
            evt.preventDefault();
            // Send a close request to the reneder. The renderer can than decide to grant it or not.
            winMain.webContents.send("main-action", "closeRequest");
        }
    });
}

function createRemoteWindow() {
    /**
     * @param {DownloadResult} res
     */
    async function onDownloadReady(res) {
        if (res.success) {
            const dirName = path.parse(res.file).name;
            await extractSite(dirName);
            await refreshLocalSites();
        }
        remoteWindow.hide();
    }

    remoteWindow = new RemoteWindow2(winMain, sitesDir, onDownloadReady);
    // remoteWindow = new RemoteWindow(winMain);

    // Only hide the window, unless explicitly indicated to close it
    remoteWindow.on('close', evt => {
        if (!appClosing) {
            evt.preventDefault();
            remoteWindow.hide();
        }
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

function createInfoWindow() {
    winInfo = new BrowserWindow({
        width: 600,
        height: 800,
        autoHideMenuBar: true,
        title: "Info",
        show: false
    });

    // Only hide the window, unless explicitly indicated to close it
    winInfo.on('close', evt => {
        if (!appClosing) {
            evt.preventDefault();
            winInfo.hide();
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
 * Delete a local site
 * @param name string
 */
async function deleteSite(name) {
    const dir = path.resolve(sitesDir, name);
    const zipFile = path.join(sitesDir, name + ".zip");
    if (fs.existsSync(dir)) {
        await fs.promises.rm(dir, { recursive: true });
    }
    if (fs.existsSync(zipFile)) {
        await fs.promises.rm(zipFile);
    }
    await refreshLocalSites();
}

/**
 * Show site info
 * @param name string
 */
async function infoSite(name) {
    const infoFile = path.resolve(sitesDir, name, "app_info/index.html");
    if (fs.existsSync(infoFile)) {
        winInfo.loadFile(infoFile);
        winInfo.show();
    }
    else {
        console.log(`No info available on app ${name}`);
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

async function loadLocal() {
    const res = await openFile();
    if (!res.canceled) {
        const sourceFile = res.filePaths[0];
        if (sourceFile.endsWith(".zip")) {
            const fName = path.parse(sourceFile).base;
            const destFile = path.resolve(sitesDir, fName);
            await fs.promises.copyFile(sourceFile, destFile);
            console.log(`Copied file ${sourceFile} to ${destFile}`);
            refreshLocalSites();
        }
        else {
            console.log(`File ${sourceFile} is not a valid zip-archive`);
        }
    }
}

async function openFile() {
    const dial = dialog;

    const res = await dial.showOpenDialog(winMain, {
        properties: ['openFile']
    });

    return res;
}