/** Renders apps/web/public/icon.svg into PWA and Android launcher PNGs. Run once after changing the logo. */
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright-core";
import { CHROMIUM } from "./lib-static";

const ROOT = path.resolve(import.meta.dirname, "..");
const svg = fs.readFileSync(path.join(ROOT, "apps/web/public/icon.svg"), "utf8");
const browser = await chromium.launch({ executablePath: CHROMIUM });
const page = await browser.newPage();

async function render(file: string, size: number, opts: { bg?: string; scale?: number } = {}) {
  const inner = Math.round(size * (opts.scale ?? 1));
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;width:${size}px;height:${size}px;display:grid;place-items:center;background:${opts.bg ?? "transparent"}">
    <div style="width:${inner}px;height:${inner}px">${svg.replace("<svg ", `<svg width="${inner}" height="${inner}" `)}</div></body></html>`);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  await page.screenshot({ path: file, omitBackground: !opts.bg });
  console.log(path.relative(ROOT, file));
}

for (const s of [48, 72, 96, 144, 192, 512]) await render(path.join(ROOT, `apps/web/public/icons/icon-${s}.png`), s);
await render(path.join(ROOT, "apps/web/public/icons/maskable-512.png"), 512, { bg: "#5B3DF5", scale: 0.8 });
const densities: Record<string, number> = { mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 };
for (const [d, s] of Object.entries(densities)) await render(path.join(ROOT, `apps/android/res/mipmap-${d}/ic_launcher.png`), s);
// Small white notification icon (status bar icons must be single-colour).
await page.setViewportSize({ width: 96, height: 96 });
await page.setContent(`<html><body style="margin:0"><svg width="96" height="96" viewBox="0 0 48 48" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"><path d="M24 6l16 9v18L24 42 8 33V15z"/><path d="M24 24l16-9M24 24v18M24 24L8 15"/></svg></body></html>`);
fs.mkdirSync(path.join(ROOT, "apps/android/res/drawable-xhdpi"), { recursive: true });
await page.screenshot({ path: path.join(ROOT, "apps/android/res/drawable-xhdpi/ic_notification.png"), omitBackground: true });
await browser.close();
