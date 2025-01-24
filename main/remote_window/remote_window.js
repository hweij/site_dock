//@ts-check

import * as path from "path";

import { BrowserWindow, ipcMain, WebContentsView } from "electron";

/** Current remote URL */
var currentURL = "";

export class RemoteWindow extends BrowserWindow {
    /** @type WebContentsView */
    vAddress;

    /** @type WebContentsView */
    vContent;

    onFinishLoad = () => {
        console.log("Finished load!");
        const url = this.vContent.webContents.getURL();
        console.log(url);
    }

    updateLayout = () => {
        const bounds = this.contentView.getBounds();
        this.vAddress.setBounds({ x: 0, y: 0, width: bounds.width, height: 40 });
        this.vContent.setBounds({ x: 0, y: 40, width: bounds.width, height: bounds.height - 40 });
    }

    constructor(parent) {
        super({
            width: 800,
            height: 700,
            autoHideMenuBar: true,
            title: "Remote sites",
            // modal: true,
            parent: parent,
            show: false
        });

        this.vAddress = new WebContentsView({
            webPreferences: {
                preload: path.join(import.meta.dirname, 'preload.js')
            }
        });
        this.contentView.addChildView(this.vAddress);
        this.vAddress.webContents.loadFile(path.join(import.meta.dirname, 'addressbar.html'));

        this.vContent = new WebContentsView();
        this.contentView.addChildView(this.vContent);

        this.vContent.webContents.addListener('did-finish-load', this.onFinishLoad);

        this.on("resize", this.updateLayout);
        this.updateLayout();
    }

    /**
     *
     * @param {string} url
     */
    loadAndShow(url) {
        this.show();
        if (url !== currentURL) {
            this.setURL(url);
            currentURL = url;
        }
    }

    /**
     * Set URL
     * @param {string} url
     */
    setURL(url) {
        this.vAddress.webContents.send("set-url", url);
        this.vContent.webContents.loadURL(url);
    }

    /**
     * Add download handler
     * @param {(event: Electron.Event, item: Electron.DownloadItem, webContents: Electron.WebContents) => void} cb
     */
    addDownloadHandler(cb) {
        this.vContent.webContents.session.on('will-download', cb);
    }
}

// Handler for "set-url" message from renderer process
ipcMain.on('set-url', doSetURL);

// Handler for "reload-url" message from renderer process
ipcMain.on('reload-url', doReloadURL);

/**
 * @param {Electron.IpcMainEvent} event
 * @param {string} url
 */
function doSetURL(event, url) {
    // Process URL to ensure it is valid
    console.log(`Setting URL ${url}`);
    const webContents = event.sender;
    if (!url.startsWith("https://") && !url.startsWith("http://")) {
        url = `https://${url}`;
    }
    try {
        url = new URL(url).href;
        console.log(`Corrected URL: ${url}`);
        const win = BrowserWindow.fromWebContents(webContents);
        if (win instanceof RemoteWindow) {
            win.setURL(url);
        }
    } catch (err) {
        console.error(`Invalid URL: ${url}`)
    }
}

function doReloadURL(event) {
    doSetURL(event, currentURL);
}