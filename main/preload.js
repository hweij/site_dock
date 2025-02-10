// @ts-check

const { contextBridge, ipcRenderer, webUtils } = require('electron/renderer')

contextBridge.exposeInMainWorld('electronAPI', {
    // UI-actions: renderer => main
    // Parameters are action-specific and are always specified as properties of the params object.
    uiAction: (action, params) => ipcRenderer.send('ui-action', action, params),

    /**
     * Gives full path for a file.
     * Note: we need this since security prevents directly getting the path from the file in the renderer.
     *
     * @param {File} file
     */
    getFullPath: (file) => {
        return webUtils.getPathForFile(file);
    },

    // Main action: main => renderer
    // Defines a callback to be executed by the renderer.
    onMainAction: (cb) => {
        ipcRenderer.on('main-action', (event, action, params) => cb(action, params));
    },

    // State changes: main => renderer
    // Informs the UI of state changes in the main process.
    // Only changes are passed, so current state is stored in the renderer as well.
    onStateChanges: (cb) => {
        ipcRenderer.on('app-state', (event, appState) => cb(appState));
    }
})
