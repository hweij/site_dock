//@ts-check
/// <reference path="../types.d.ts" />

import * as path from "path";
import { BrowserWindow } from "electron";

export class RemoteWindow2 extends BrowserWindow {
    /** Directory for site download and installation */
    sitesDir = "";
    /** Current remote URL */
    currentURL = "";
    /** @type {(b: DownloadResult) => void} */
    onReady;

    /**
     * @param { BrowserWindow} parent
     * @param {string} sitesDir
     * @param {(res: DownloadResult) => void} onReady
     */
    constructor(parent, sitesDir, onReady) {
        super({
            width: 800,
            height: 700,
            autoHideMenuBar: true,
            title: "Remote sites",
            parent: parent,
            show: false
        });
        this.sitesDir = sitesDir;
        this.onReady = onReady;
        this.webContents.session.on('will-download', this.onDownload.bind(this));
    }

    /**
     * Set URL
     * @param {string} url
     */
    setURL(url) {
        if (url !== this.currentURL) {
            this.webContents.loadURL(url);
            this.currentURL = url;
        }
    }

    /**
     *
     * @param {Electron.Event} _event
     * @param {Electron.DownloadItem} item
     * @param {Electron.WebContents} _webContents
     */
    onDownload(_event, item, _webContents) {
        const fileName = item.getFilename();
        const dlPath = path.resolve(this.sitesDir, fileName);
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
            const success = (state === 'completed');
            if (success) {
                console.log('Downloaded successfully');
            } else {
                console.log(`Download failed: ${state}`)
            }
            this.onReady({ success, file: dlPath });
        })
    }
}
