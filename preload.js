const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
    send: (channel, data) => {
        const validChannels = [
            "resize-window",
            "drag-start",
            "dragging",
            "drag-end",
            "simulate-switch",
            "switch-hold-start",
            "switch-hold-end",
            "install-update"
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
    onUpdate: (channel, callback) => {
        const validReceive = [
            'checking-for-update',
            'update-available',
            'update-not-available',
            'download-progress',
            'update-downloaded',
            'update-error'
        ];
        if (validReceive.includes(channel)) {
            ipcRenderer.on(channel, (event, data) => callback(data));
        }
    }
});