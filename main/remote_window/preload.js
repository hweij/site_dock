// @ts-check

const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld('electronAPI', {
    setURL: (url) => ipcRenderer.send('set-url', url),
    /** @type (cb: (customData: string) => void) => void */
    onSetURL: (cb) => {
        ipcRenderer.on('set-url', (event, customData) => cb(customData));
    }
})
