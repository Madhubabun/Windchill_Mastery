import fs from "node:fs";
import path from "node:path";
import type { Lesson } from "@wm/core";

const DIR = path.join(process.cwd(), "src/generated/lessons");

/** Build-time only: reads a compiled lesson. Returns null for lessons not written yet. */
export function readLesson(id: string): Lesson | null {
  const file = path.join(DIR, `${id}.json`);
  return fs.existsSync(file) ? (JSON.parse(fs.readFileSync(file, "utf8")) as Lesson) : null;
}
