/** Engine for `simulation` blocks: a tiny state machine driven by content data. */
type Val = string | number | boolean;
export type SimState = Record<string, Val>;
export type SimCondition = Record<string, Val | Val[]>;
export type SimOp = { set: Record<string, Val> } | { inc: string } | { nextLetter: string };

export function matches(state: SimState, when: SimCondition = {}): boolean {
  return Object.entries(when).every(([k, v]) => (Array.isArray(v) ? v.includes(state[k]) : state[k] === v));
}

/** A → B → ... → Z → AA (Windchill-style revision letters). */
export function nextLetter(v: string): string {
  if (!v) return "A";
  const chars = v.split("");
  let i = chars.length - 1;
  while (i >= 0) {
    if (chars[i] !== "Z") {
      chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
      return chars.join("");
    }
    chars[i] = "A";
    i--;
  }
  return "A" + chars.join("");
}

export function applyOps(state: SimState, ops: SimOp[]): SimState {
  let s = { ...state };
  for (const op of ops) {
    if ("set" in op) s = { ...s, ...op.set };
    else if ("inc" in op) s[op.inc] = Number(s[op.inc] ?? 0) + 1;
    else if ("nextLetter" in op) s[op.nextLetter] = nextLetter(String(s[op.nextLetter] ?? ""));
  }
  return s;
}

/** Replaces {field} placeholders with state values. */
export function fill(template: string, state: SimState): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(state[k] ?? ""));
}
