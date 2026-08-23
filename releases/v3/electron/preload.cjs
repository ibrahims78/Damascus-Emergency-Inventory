const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  version: "3.0.5",
  platform: process.platform,
});