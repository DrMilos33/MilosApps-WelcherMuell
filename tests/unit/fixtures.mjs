import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);

export async function loadJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), "utf8"));
}

export async function loadCatalogs() {
  const [items, sources, regions] = await Promise.all([
    loadJson("public/data/waste-items.v1.json"),
    loadJson("public/data/sources.v1.json"),
    loadJson("public/data/regions.v1.json")
  ]);
  return { items, sources, regions };
}
