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
        ];
        if (validChannels.includes(channel)) {
            ipcRenderer.send(channel, data);
        }
    },
});