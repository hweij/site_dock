//@ts-check
/// <reference path="../types.d.ts" />

import * as path from "path";
import { BrowserWindow, WebContentsView } from "electron";

const infoHTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
        body {
            height: 100vh;
            overflow: hidden;
            font-family: Arial, Helvetica, sans-serif;
            font-weight: bold;
            padding: 0px;
            margin: 0px;
            color: #ffffff;
            background-color: #1A5276;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            padding-left: 10px;
            animation-name: pulse;
            animation-duration: 1.5s;
            animation-iteration-count: infinite;
        }
        @keyframes pulse {
            0%,
            100% {
                background-color: #1A5276;
            }

            50% {
                background-color: #2980B9;
            }
        }
    </style>
  </head>
  <body>
    To add a web-app, select a zip-file and download it.
  </body>
</html>`;

export class RemoteWindow extends BrowserWindow {
    /** @type WebContentsView */
    vInfo;

    /** @type WebContentsView */
    vContent;

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

        this.vInfo = new WebContentsView();
        this.contentView.addChildView(this.vInfo);
        this.vInfo.webContents.loadURL(`data:text/html;charset=UTF-8,${encodeURIComponent(infoHTML)}`);

        this.vContent = new WebContentsView();
        this.contentView.addChildView(this.vContent);
        this.vContent.webContents.session.on('will-download', this.onDownload.bind(this));

        this.on("resize", this.updateLayout);
        this.updateLayout();
    }

    updateLayout = () => {
        const bounds = this.contentView.getBounds();
        this.vInfo.setBounds({ x: 0, y: 0, width: bounds.width, height: 40 });
        this.vContent.setBounds({ x: 0, y: 40, width: bounds.width, height: bounds.height - 40 });
    }

    /**
     * Set URL
     * @param {string} url
     */
    setURL(url) {
        if (url !== this.currentURL) {
            this.vContent.webContents.loadURL(url);
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

        item.on('updated', (_event, state) => {
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
