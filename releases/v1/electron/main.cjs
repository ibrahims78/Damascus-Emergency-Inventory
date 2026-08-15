const { app, BrowserWindow, dialog } = require("electron");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { URL } = require("node:url");

const RELEASE_VERSION = "1.0.0";
const API_BASE_URL = process.env.DAMASCUS_API_URL || "http://127.0.0.1:8080";
const WEB_ROOT = path.resolve(__dirname, "../app/web");

let desktopWindow;
let localServer;

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".gif": "image/gif",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

function isApiPath(pathname) {
  return pathname === "/api" || pathname.startsWith("/api/");
}

function readRequestBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => resolve(Buffer.concat(chunks)));
    request.on("error", reject);
  });
}

function copyHeaders(headers) {
  const copied = {};
  for (const [name, value] of headers.entries()) {
    if (!["connection", "content-length", "transfer-encoding"].includes(name)) {
      copied[name] = value;
    }
  }
  return copied;
}

async function proxyApi(request, response) {
  try {
    const requestUrl = new URL(request.url, "http://127.0.0.1");
    const targetUrl = new URL(requestUrl.pathname + requestUrl.search, API_BASE_URL);
    const headers = { ...request.headers };
    delete headers.host;
    delete headers.connection;

    const method = request.method || "GET";
    const body =
      method === "GET" || method === "HEAD" ? undefined : await readRequestBody(request);
    const upstream = await fetch(targetUrl, {
      method,
      headers,
      body: body && body.length > 0 ? body : undefined,
    });

    response.writeHead(upstream.status, copyHeaders(upstream.headers));
    if (method === "HEAD") {
      response.end();
      return;
    }

    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch (error) {
    console.error("API proxy error:", error);
    const payload = JSON.stringify({
      error: "The desktop app could not reach the API server.",
      details: error instanceof Error ? error.message : String(error),
    });
    response.writeHead(502, {
      "content-type": "application/json; charset=utf-8",
      "content-length": Buffer.byteLength(payload),
    });
    response.end(payload);
  }
}

function resolveStaticFile(pathname) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const relativePath = decodedPath.replace(/^\/+/, "");
  const candidate = path.resolve(WEB_ROOT, relativePath || "index.html");
  if (candidate !== WEB_ROOT && !candidate.startsWith(`${WEB_ROOT}${path.sep}`)) {
    return null;
  }

  if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
    return candidate;
  }

  if (!path.extname(candidate)) {
    return path.join(WEB_ROOT, "index.html");
  }

  return null;
}

function serveStatic(request, response) {
  const requestUrl = new URL(request.url, "http://127.0.0.1");
  const filePath = resolveStaticFile(requestUrl.pathname);
  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
    response.end("Not found");
    return;
  }

  const extension = path.extname(filePath).toLowerCase();
  const contentType = contentTypes[extension] || "application/octet-stream";
  const stat = fs.statSync(filePath);
  response.writeHead(200, {
    "content-type": contentType,
    "content-length": stat.size,
    "cache-control": extension === ".html" ? "no-cache" : "public, max-age=31536000, immutable",
  });

  if (request.method === "HEAD") {
    response.end();
    return;
  }

  fs.createReadStream(filePath).pipe(response);
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      const pathname = new URL(request.url, "http://127.0.0.1").pathname;
      if (isApiPath(pathname)) {
        void proxyApi(request, response);
        return;
      }
      serveStatic(request, response);
    });

    localServer.once("error", reject);
    localServer.listen(0, "127.0.0.1", () => {
      const address = localServer.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not determine the desktop server port."));
        return;
      }
      resolve(address.port);
    });
  });
}

async function createWindow() {
  if (!fs.existsSync(path.join(WEB_ROOT, "index.html"))) {
    throw new Error("The bundled web application is missing. Run `pnpm run prepare-web` first.");
  }

  const port = await startLocalServer();
  desktopWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    backgroundColor: "#f8fafc",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  desktopWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription) => {
    console.error(`Desktop page failed to load (${errorCode}): ${errorDescription}`);
  });
  desktopWindow.on("closed", () => {
    desktopWindow = undefined;
  });
  await desktopWindow.loadURL(`http://127.0.0.1:${port}/`);
}

app.whenReady().then(async () => {
  try {
    await createWindow();
  } catch (error) {
    console.error(error);
    await dialog.showMessageBox({
      type: "error",
      title: "Damascus Emergency Inventory",
      message: "تعذر تشغيل تطبيق سطح المكتب.",
      detail: error instanceof Error ? error.message : String(error),
    });
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  localServer?.close();
});

app.setAboutPanelOptions({
  applicationName: "Damascus Emergency Inventory",
  applicationVersion: RELEASE_VERSION,
  version: RELEASE_VERSION,
  copyright: "Damascus Emergency Inventory",
});