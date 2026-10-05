/**
 * Catches a common YAML trap in flow style ({ a: x, b: y } and [x, y]): an unquoted comma
 * splits text into a new item or a stray `key: null`. Run by the content build.
 */
import fs from "node:fs";
import path from "node:path";
import { parse } from "yaml";

export function lintYaml(file: string): string[] {
  const out: string[] = [];
  const data = parse(fs.readFileSync(file, "utf8"));
  const walk = (o: unknown, at: string) => {
    if (Array.isArray(o)) o.forEach((x, i) => walk(x, `${at}[${i}]`));
    else if (o && typeof o === "object")
      for (const [k, v] of Object.entries(o)) {
        if (v === null) out.push(`${at}.${k}: empty value. If this came from a comma inside { ... } or [ ... ], quote that text.`);
        walk(v, `${at}.${k}`);
      }
    else if (typeof o === "string") {
      const open = (o.match(/\(/g) ?? []).length;
      const close = (o.match(/\)/g) ?? []).length;
      if (open !== close) out.push(`${at}: unbalanced brackets in "${o.slice(0, 60)}". A comma inside [ ... ] may have split it; quote the text.`);
    }
  };
  walk(data, path.basename(file));
  return out;
}
