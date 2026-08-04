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

function shouldRetry(error) {
  const status = Number(/^HTTP (\d{3})$/.exec(error.message)?.[1]);
  return !status || status === 408 || status === 429 || status >= 500;
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
          "user-agent": "MilosApps-Waste-Guide-Source-Check/0.1 (+manual editorial verification)"
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      console.log(`OK ${source.id} ${response.status} ${response.url}`);
      await response.body?.cancel();
      return;
    } catch (error) {
      const retry = attempt < maxAttempts && shouldRetry(error);
      if (!retry) {
        failures.push(`${source.id}: ${error.name === "AbortError" ? "Zeitüberschreitung" : error.message}`);
        console.error(`FEHLER ${source.id} ${failures.at(-1)}`);
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
  process.exitCode = 1;
} else {
  console.log(`\n${catalog.sources.length} amtliche Quellen erreichbar.`);
}
