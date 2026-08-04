import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";

const catalog = JSON.parse(
  await readFile(new URL("../public/data/sources.v1.json", import.meta.url), "utf8")
);
const timeoutMs = Number(process.env.WASTE_GUIDE_SOURCE_TIMEOUT_MS || 15000);
const maxAttempts = Math.min(
  5,
  Math.max(1, Number(process.env.WASTE_GUIDE_SOURCE_MAX_ATTEMPTS || 5))
);
const failures = [];
const sourceCheckUserAgent = "MilosApps-Waste-Guide-Source-Check/0.1 (+manual editorial verification)";

function retryableStatus(error) {
  const status = Number(/^HTTP (\d{3})$/.exec(error.message)?.[1]);
  return !status || status === 408 || status === 429 || status >= 500;
}

function curlFailureIsTransient(error) {
  const status = Number(/^curl HTTP (\d{3})$/.exec(error.message)?.[1]);
  return !status || status === 408 || status === 429 || status >= 500;
}

function checkWithCurl(source) {
  const nullDevice = process.platform === "win32" ? "NUL" : "/dev/null";
  const statusText = execFileSync(
    "curl",
    [
      "--location",
      "--ipv4",
      "--silent",
      "--show-error",
      "--output",
      nullDevice,
      "--write-out",
      "%{http_code}",
      "--max-time",
      String(Math.max(1, Math.ceil(timeoutMs / 1000))),
      "--user-agent",
      sourceCheckUserAgent,
      source.url
    ],
    { encoding: "utf8", timeout: timeoutMs + 5000 }
  ).trim();
  const status = Number(statusText.slice(-3));
  if (!Number.isInteger(status) || status < 200 || status >= 400) {
    throw new Error(`curl HTTP ${statusText || "unbekannt"}`);
  }
  return status;
}

async function checkSource(source) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(source.url, {
        method: "GET",
        redirect: "follow",
        signal: controller.signal,
        headers: {
          "user-agent": sourceCheckUserAgent
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`OK ${source.id} ${response.status} ${response.url}`);
      await response.body?.cancel();
      return;
    } catch (error) {
      const retry = attempt < maxAttempts && retryableStatus(error);
      if (!retry) {
        try {
          const status = checkWithCurl(source);
          console.log(`OK ${source.id} ${status} ${source.url} (curl fallback)`);
        } catch (curlError) {
          const fetchMessage = error.name === "AbortError" ? "Zeitüberschreitung" : error.message;
          const message = `${source.id}: fetch ${fetchMessage}; curl ${curlError.message}`;
          failures.push({
            message,
            evidenceEligible: retryableStatus(error) && curlFailureIsTransient(curlError)
          });
          console.error(`FEHLER ${source.id} ${message}`);
        }
        return;
      }
      console.warn(`RETRY ${source.id} ${attempt}/${maxAttempts}: ${error.message}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    } finally {
      clearTimeout(timer);
    }
  }
}

const queue = [...catalog.sources];
const workers = Array.from({ length: Math.min(5, queue.length) }, async () => {
  while (queue.length > 0) {
    const source = queue.shift();
    await checkSource(source);
  }
});
await Promise.all(workers);

if (failures.length > 0) {
  console.error(`\n${failures.length} Quellenprüfung(en) fehlgeschlagen.`);
  const onlyTransientFailures = failures.every((failure) => failure.evidenceEligible);
  if (onlyTransientFailures) {
    console.error(
      "Alle Fehler sind Transport-, Rate-Limit- oder Serverfehler; unveränderte frühere Online-Evidenz darf separat geprüft werden."
    );
    process.exitCode = 2;
  } else {
    console.error("Mindestens eine Quelle lieferte einen endgültigen Clientfehler; frühere Evidenz darf nicht wiederverwendet werden.");
    process.exitCode = 1;
  }
} else {
  console.log(`\n${catalog.sources.length} amtliche Quellen erreichbar.`);
}
