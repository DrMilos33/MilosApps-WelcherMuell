import { readFile } from "node:fs/promises";

const catalog = JSON.parse(
  await readFile(new URL("../public/data/sources.v1.json", import.meta.url), "utf8")
);
const timeoutMs = Number(process.env.WASTE_GUIDE_SOURCE_TIMEOUT_MS || 15000);
const failures = [];

async function checkSource(source) {
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
  } catch (error) {
    failures.push(`${source.id}: ${error.name === "AbortError" ? "Zeitüberschreitung" : error.message}`);
    console.error(`FEHLER ${source.id} ${failures.at(-1)}`);
  } finally {
    clearTimeout(timer);
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
