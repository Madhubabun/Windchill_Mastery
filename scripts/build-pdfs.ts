/**
 * Renders each module cheat sheet to a downloadable PDF (apps/web/out/pdf/<module>-cheatsheet.pdf).
 * Needs a Chromium for Playwright: set CHROMIUM_PATH, or install browsers with `npx playwright install chromium`.
 */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { serve, CHROMIUM } from "./lib-static";

const ROOT = path.resolve(import.meta.dirname, "..");
const OUT = path.join(ROOT, "apps/web/out");
const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, "apps/web/src/generated/catalog.json"), "utf8"));

const { url, close } = await serve(OUT);
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();
fs.mkdirSync(path.join(OUT, "pdf"), { recursive: true });
for (const m of catalog.modules.filter((x: { cheatsheet?: unknown }) => x.cheatsheet)) {
  await page.goto(`${url}/cheatsheet/${m.slug}/`, { waitUntil: "networkidle" });
  await page.emulateMedia({ media: "print", colorScheme: "light" });
  const file = path.join(OUT, "pdf", `${m.slug}-cheatsheet.pdf`);
  await page.pdf({ path: file, format: "A4", printBackground: true, margin: { top: "0", bottom: "0", left: "0", right: "0" } });
  console.log(`📄 ${path.relative(ROOT, file)}`);
}
await browser.close();
close();
