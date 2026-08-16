import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import feedbackWorker from "../feedback-worker/src/worker.js";

const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
const host = process.env.WASTE_GUIDE_HOST || "127.0.0.1";
const port = 4318;
if (process.env.WASTE_GUIDE_PORT && Number(process.env.WASTE_GUIDE_PORT) !== port) {
  console.error(`Welcher Müll? nutzt fest den reservierten DEV-/E2E-Port ${port}.`);
  process.exit(1);
}
const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json; charset=utf-8"
};

const localFeedbackRows = new Map();
const localFeedbackDb = {
  prepare() {
    return {
      bind(...values) {
        return {
          async run() {
            const [id, createdAt, environment, contentVersion, itemId, itemName, reason, comment, searchQuery, language, resultUrl] = values;
            if (!localFeedbackRows.has(id)) {
              localFeedbackRows.set(id, {
                id,
                createdAt,
                environment,
                contentVersion,
                itemId,
                itemName,
                reason,
                comment,
                searchQuery,
                language,
                resultUrl,
                reviewState: "new"
              });
            }
            return { success: true };
          }
        };
      }
    };
  }
};

async function readBody(request, maximum = 8192) {
  const chunks = [];
  let length = 0;
  for await (const chunk of request) {
    length += chunk.length;
    if (length > maximum) throw new Error("Request body is too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function forwardFeedback(request, response, url) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (Array.isArray(value)) value.forEach((part) => headers.append(name, part));
    else if (value !== undefined) headers.set(name, value);
  }
  const body = request.method === "GET" || request.method === "HEAD" ? undefined : await readBody(request);
  const workerUrl = new URL(url);
  workerUrl.pathname = url.pathname === "/api/feedback" ? "/v1/feedback" : url.pathname.replace(/^\/api\/feedback/, "");
  const workerRequest = new Request(workerUrl, { method: request.method, headers, body });
  const workerResponse = await feedbackWorker.fetch(workerRequest, {
    APP_ENVIRONMENT: "DEV",
    PRODUCTION_APPROVED: "false",
    ALLOWED_RESULT_BASES: `http://${host}:${port}/`,
    FEEDBACK_DB: localFeedbackDb,
    REPORT_LIMIT: { limit: async () => ({ success: true }) }
  });
  response.writeHead(workerResponse.status, Object.fromEntries(workerResponse.headers.entries()));
  response.end(Buffer.from(await workerResponse.arrayBuffer()));
}

function resolveRequestPath(pathname) {
  const decoded = decodeURIComponent(pathname);
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const candidate = normalize(join(repositoryRoot, relative));
  if (candidate !== repositoryRoot && !candidate.startsWith(`${repositoryRoot}${sep}`)) return null;
  if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  return null;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url || "/", `http://${request.headers.host || `${host}:${port}`}`);

  if (url.pathname === "/healthz") {
    response.writeHead(200, {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    });
    response.end(JSON.stringify({
      status: "ok",
      appKey: "waste-guide",
      environment: "DEV",
      contentVersion: "2026.08.09-1",
      productionApproved: false
    }));
    return;
  }

  if (url.pathname === "/api/feedback" || url.pathname === "/api/feedback/healthz") {
    try {
      await forwardFeedback(request, response, url);
    } catch (error) {
      response.writeHead(500, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
      response.end(JSON.stringify({ status: "error" }));
      console.error("Lokaler Feedbackadapter ist fehlgeschlagen.", error);
    }
    return;
  }

  if (url.pathname === "/__test/feedback" && request.method === "GET") {
    response.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
    response.end(JSON.stringify([...localFeedbackRows.values()]));
    return;
  }

  const filePath = resolveRequestPath(url.pathname);
  if (!filePath) {
    response.writeHead(404, { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" });
    response.end("Nicht gefunden");
    return;
  }

  response.writeHead(200, {
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "geolocation=(), camera=(), microphone=()",
    "content-security-policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"
  });
  createReadStream(filePath).pipe(response);
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} ist bereits belegt. Der waste-guide-DEV wurde nicht gestartet.`);
    process.exitCode = 1;
    return;
  }
  throw error;
});

server.listen(port, host, () => {
  console.log(`Welcher Müll? DEV läuft auf http://${host}:${port}/`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);
