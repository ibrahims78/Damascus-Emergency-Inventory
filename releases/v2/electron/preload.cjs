const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  version: "1.0.3",
  platform: process.platform,
});