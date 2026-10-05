/**
 * Validates /content and compiles it for the apps.
 *
 *   npm run content          validate + write apps/web/src/generated/*
 *   npm run content:check    validate only (CI / authors)
 *
 * Errors stop the build. Warnings (e.g. fewer than 3 teaching modalities) are printed.
 */
import fs from "node:fs";
import path from "node:path";
import { parse as parseYaml } from "yaml";
import { Marked } from "marked";
import { z } from "zod";
import {
  ChangelogFile,
  Curriculum,
  GlossaryEntry,
  LessonFile,
  ModuleStyleFile,
  MODALITY_OF,
  type Catalog,
  type LearningPath,
  type Lesson,
  type LessonKind,
  type LessonSummary,
  type Module,
  type SearchDoc,
  type Section,
} from "../packages/core/src/index";

const ROOT = path.resolve(import.meta.dirname, "..");
const CONTENT = path.join(ROOT, "content");
const OUT = path.join(ROOT, "apps/web/src/generated");
const checkOnly = process.argv.includes("--check");

const errors: string[] = [];
const warnings: string[] = [];

function readYaml<T>(file: string, schema: z.ZodType<T>): T | null {
  const rel = path.relative(ROOT, file);
  let raw: unknown;
  try {
    raw = parseYaml(fs.readFileSync(file, "utf8"));
  } catch (e) {
    errors.push(`${rel}: YAML error: ${(e as Error).message}`);
    return null;
  }
  const res = schema.safeParse(raw);
  if (!res.success) {
    for (const issue of res.error.issues) errors.push(`${rel}: ${issue.path.join(".") || "(root)"}: ${issue.message}`);
    return null;
  }
  return res.data;
}

// ---------------------------------------------------------------------------
// Markdown
// ---------------------------------------------------------------------------

// Glossary terms may be split across several files in content/glossary/.
const glossaryDir = path.join(CONTENT, "glossary");
const glossaryRaw = fs
  .readdirSync(glossaryDir)
  .filter((f) => f.endsWith(".yaml"))
  .sort()
  .flatMap((f) => readYaml(path.join(glossaryDir, f), z.array(GlossaryEntry)) ?? []);
for (const [i, g] of glossaryRaw.entries())
  if (glossaryRaw.findIndex((x) => x.id === g.id) !== i) errors.push(`content/glossary: duplicate term id "${g.id}"`);
const glossaryById = new Map(glossaryRaw.map((g) => [g.id, g]));
const marked = new Marked({ gfm: true, breaks: false });
let currentFile = "";

function glossaryLinks(src: string): string {
  return src.replace(/\[\[([a-z0-9-]+)(?:\|([^\]]+))?\]\]/g, (_, id: string, text?: string) => {
    const g = glossaryById.get(id);
    if (!g) {
      errors.push(`${currentFile}: unknown glossary term [[${id}]]`);
      return text ?? id;
    }
    return `<a class="gloss" href="/glossary/#${id}" data-term="${id}">${text ?? g.term}</a>`;
  });
}
const md = (s: string) => (marked.parse(glossaryLinks(s)) as string).trim();
const mdInline = (s: string) => (marked.parseInline(glossaryLinks(s)) as string).trim();

const BLOCK_MD = new Set(["md", "detail", "real", "definition", "goal", "intro", "expected", "explanation", "result", "description"]);
const INLINE_MD = new Set(["prompt", "caption"]);

/** Recursively renders markdown fields to HTML. `steps` of an exercise are inline markdown strings. */
function renderMarkdown(v: unknown, key = ""): unknown {
  if (typeof v === "string") {
    if (BLOCK_MD.has(key)) return md(v);
    if (INLINE_MD.has(key)) return mdInline(v);
    return v;
  }
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" && key === "steps" ? mdInline(x) : renderMarkdown(x)));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v)) out[k] = renderMarkdown(val, k);
    return out;
  }
  return v;
}

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/&[a-z#0-9]+;/gi, " ").replace(/\s+/g, " ").trim();

// ---------------------------------------------------------------------------
// Semantic checks a schema can't express
// ---------------------------------------------------------------------------

function checkLesson(l: z.infer<typeof LessonFile>, rel: string, kind: LessonKind) {
  const modalities = new Set(l.blocks.map((b) => MODALITY_OF[b.type]).filter(Boolean));
  if (kind === "lesson" && modalities.size < 3) warnings.push(`${rel}: only ${modalities.size} teaching modalities (aim for 3–4)`);
  if (!l.blocks.some((b) => b.type === "quiz" || b.type === "flashcards" || b.type === "scenario"))
    warnings.push(`${rel}: no quiz, flashcards or scenario to check understanding`);
  l.blocks.forEach((b, i) => {
    const at = `${rel}: blocks[${i}] (${b.type})`;
    if (b.type === "quiz") {
      b.questions.forEach((q, qi) => {
        if (q.kind === "single" && (q.answer < 0 || q.answer >= q.options.length)) errors.push(`${at}: question ${qi} answer out of range`);
        if (q.kind === "multi" && q.answers.some((a) => a < 0 || a >= q.options.length)) errors.push(`${at}: question ${qi} answers out of range`);
      });
    }
    if (b.type === "diagram" || b.type === "animation") {
      const ids = new Set(b.diagram.nodes.map((n) => n.id));
      for (const e of b.diagram.edges) if (!ids.has(e.from) || !ids.has(e.to)) errors.push(`${at}: edge ${e.from}->${e.to} references a missing node`);
      if (b.type === "animation")
        b.chapters.forEach((c, ci) => {
          for (const id of [...(c.show ?? []), ...c.highlight]) if (!ids.has(id)) errors.push(`${at}: chapter ${ci} references missing node "${id}"`);
          for (const f of c.flow) {
            const [a, z2] = f.split(">");
            if (!b.diagram.edges.some((e) => (e.from === a && e.to === z2) || (e.bidirectional && e.from === z2 && e.to === a)))
              errors.push(`${at}: chapter ${ci} flow "${f}" is not an edge`);
          }
        });
    }
    if (b.type === "scenario") {
      const ids = new Set(b.nodes.map((n) => n.id));
      if (!ids.has(b.start)) errors.push(`${at}: start "${b.start}" missing`);
      for (const n of b.nodes) {
        for (const c of n.choices) if (c.next && !ids.has(c.next)) errors.push(`${at}: node "${n.id}" choice → missing "${c.next}"`);
        if (!n.choices.length && !n.outcome) errors.push(`${at}: node "${n.id}" has no choices and no outcome`);
      }
    }
    if (b.type === "simulation") {
      const fields = new Set(Object.keys(b.initial));
      for (const a of b.actions) for (const k of Object.keys(a.when)) if (!fields.has(k)) errors.push(`${at}: action "${a.id}" checks unknown field "${k}"`);
      for (const g of b.goals) for (const k of Object.keys(g.when)) if (!fields.has(k)) errors.push(`${at}: goal checks unknown field "${k}"`);
    }
  });
}

// ---------------------------------------------------------------------------
// Build
// ---------------------------------------------------------------------------

const curriculum = readYaml(path.join(CONTENT, "curriculum.json"), Curriculum);
const changelog = readYaml(path.join(CONTENT, "changelog.yaml"), ChangelogFile);
if (!curriculum || !changelog) {
  console.error(errors.map((e) => `❌ ${e}`).join("\n"));
  process.exit(1);
}

// Index lesson files on disk by id.
const lessonFiles = new Map<string, string>();
const lessonsDir = path.join(CONTENT, "lessons");
for (const dir of fs.existsSync(lessonsDir) ? fs.readdirSync(lessonsDir) : []) {
  for (const f of fs.readdirSync(path.join(lessonsDir, dir))) {
    if (!f.endsWith(".yaml")) continue;
    const id = f.replace(/\.yaml$/, "");
    if (!id.startsWith(dir + "-")) errors.push(`content/lessons/${dir}/${f}: file must live in the folder of its module (${id.slice(0, 3)})`);
    lessonFiles.set(id, path.join(lessonsDir, dir, f));
  }
}
const usedFiles = new Set<string>();

const modules: Module[] = [];
const lessons: Lesson[] = [];
const search: SearchDoc[] = [];

type Outline = {
  id: string;
  slug: string;
  kind: LessonKind;
  title: string;
  level: LessonSummary["level"];
  minutes: number;
  roles: LessonSummary["roles"];
  objectives: string[];
  prerequisites: string[];
  modalities: string[];
  passMark?: number;
};

function compile(outline: Outline, mod: { id: string; slug: string; order: number; title: string }, sectionId?: string): LessonSummary {
  const base: LessonSummary = {
    ...outline,
    key: outline.id,
    moduleId: mod.id,
    moduleSlug: mod.slug,
    sectionId,
    href: `/learn/${mod.slug}/${outline.slug}/`,
    available: false,
    hasQuiz: false,
    flashcardCount: 0,
  };
  const file = lessonFiles.get(outline.id);
  if (!file) return base;
  usedFiles.add(outline.id);
  const rel = path.relative(ROOT, file);
  currentFile = rel;
  const lf = readYaml(file, LessonFile);
  if (!lf) return base;
  if (lf.id !== outline.id) errors.push(`${rel}: id "${lf.id}" must match the file name`);
  checkLesson(lf, rel, outline.kind);
  const summary: LessonSummary = {
    ...base,
    title: lf.title ?? base.title,
    subtitle: lf.subtitle,
    minutes: lf.minutes ?? base.minutes,
    objectives: lf.objectives ?? base.objectives,
    available: true,
    version: lf.version,
    updated: lf.updated,
    modalities: [...new Set(lf.blocks.map((b) => MODALITY_OF[b.type]).filter((x): x is string => !!x))],
    hasQuiz: lf.blocks.some((b) => b.type === "quiz"),
    flashcardCount: lf.blocks.reduce((n, b) => n + (b.type === "flashcards" ? b.cards.length : 0), 0),
  };
  const blocks = renderMarkdown(lf.blocks) as Lesson["blocks"];
  const versionNotes = lf.versionNotes.map((n) => ({ versions: n.versions, md: md(n.md) }));
  lessons.push({ ...summary, versionNotes, tags: lf.tags, blocks });
  const text = stripHtml(JSON.stringify(blocks).replace(/"[a-zA-Z]+":/g, " ").replace(/[{}[\]",]/g, " "));
  search.push({
    id: summary.id,
    kind: "lesson",
    title: summary.title,
    text: `${summary.subtitle ?? ""} ${summary.objectives.join(" ")} ${lf.tags.join(" ")} ${text}`.slice(0, 8000),
    href: summary.href,
    meta: `Module ${mod.order} · ${summary.minutes} min`,
  });
  return summary;
}

for (const m of curriculum.modules) {
  const styleFile = path.join(CONTENT, "modules", `${m.id}.yaml`);
  const style = fs.existsSync(styleFile) ? readYaml(styleFile, ModuleStyleFile) : null;
  const mod = { id: m.id, slug: m.slug, order: m.order, title: m.title };
  const sections: Section[] = m.sections.map((s) => {
    const items = s.lessons.map((l) =>
      compile(
        { id: l.id, slug: l.slug, kind: "lesson", title: l.title, level: l.level, minutes: l.durationMinutes, roles: l.roles, objectives: l.objectives, prerequisites: l.prerequisites, modalities: l.modalities },
        mod,
        s.id,
      ),
    );
    if (s.checkpoint) {
      const levels = s.lessons.map((l) => l.level);
      items.push(
        compile(
          {
            id: s.checkpoint.id,
            slug: `${s.id.split("-")[1]}-checkpoint`,
            kind: "checkpoint",
            title: `Checkpoint: ${s.title}`,
            level: levels[levels.length - 1] ?? "beginner",
            minutes: s.checkpoint.durationMinutes,
            roles: [...new Set(s.lessons.flatMap((l) => l.roles))],
            objectives: [`Score ${Math.round(s.checkpoint.passMark * 100)}% or more on ${s.checkpoint.questions} questions about ${s.title.toLowerCase()}`],
            prerequisites: s.lessons.map((l) => l.id),
            modalities: ["quiz", "flash"],
            passMark: s.checkpoint.passMark,
          },
          mod,
          s.id,
        ),
      );
    }
    return { id: s.id, title: s.title, summary: s.summary, items };
  });
  let capstone: Module["capstone"];
  if (m.capstone) {
    const c = m.capstone;
    const summary = compile(
      {
        id: c.id,
        slug: "capstone",
        kind: "capstone",
        title: c.title,
        level: m.levels[m.levels.length - 1],
        minutes: c.durationMinutes,
        roles: [...new Set(m.sections.flatMap((s) => s.lessons.flatMap((l) => l.roles)))],
        objectives: c.tasks,
        prerequisites: m.sections.map((s) => s.id),
        modalities: ["scen"],
      },
      mod,
    );
    capstone = { ...summary, brief: c.brief, tasks: c.tasks };
  }
  const all = [...sections.flatMap((s) => s.items), ...(capstone ? [capstone] : [])];
  const compiled: Module = {
    id: m.id,
    slug: m.slug,
    order: m.order,
    title: m.title,
    summary: m.summary,
    tagline: style?.tagline,
    levels: m.levels,
    theme: style?.theme ?? (["violet", "blue", "teal", "amber", "rose", "indigo", "emerald", "slate"] as const)[(m.order - 1) % 8],
    icon: style?.icon ?? "book-open",
    sections,
    capstone,
    badge: m.badge,
    cheatsheet: style?.cheatsheet,
    totalMinutes: all.reduce((a, l) => a + l.minutes, 0),
    availableCount: all.filter((l) => l.available).length,
    totalCount: all.length,
  };
  modules.push(compiled);
  search.push({
    id: `module:${m.id}`,
    kind: "module",
    title: `${m.order}. ${m.title}`,
    text: `${m.summary} ${m.sections.map((s) => `${s.title} ${s.summary} ${s.lessons.map((l) => l.title).join(" ")}`).join(" ")}`,
    href: `/learn/${m.slug}/`,
    meta: `${compiled.availableCount}/${compiled.totalCount} lessons ready`,
  });
}

for (const id of lessonFiles.keys()) if (!usedFiles.has(id)) errors.push(`content/lessons: ${id}.yaml has no matching id in curriculum.json`);

// Resolve path units: "m01" (module), "m03-s01" (section), "m03-cap" (capstone).
const byModule = new Map(modules.map((m) => [m.id, m]));
function resolveUnit(unit: string, pathId: string): string[] {
  const m = byModule.get(unit.slice(0, 3));
  if (!m) {
    errors.push(`content/curriculum.json: path "${pathId}" unit "${unit}" → unknown module`);
    return [];
  }
  if (unit === m.id) return [...m.sections.flatMap((s) => s.items.map((l) => l.id)), ...(m.capstone ? [m.capstone.id] : [])];
  if (unit.endsWith("-cap")) return m.capstone ? [m.capstone.id] : [];
  const s = m.sections.find((x) => x.id === unit);
  if (!s) {
    errors.push(`content/curriculum.json: path "${pathId}" unit "${unit}" → unknown section`);
    return [];
  }
  return s.items.map((l) => l.id);
}
const allById = new Map(modules.flatMap((m) => [...m.sections.flatMap((s) => s.items), ...(m.capstone ? [m.capstone] : [])]).map((l) => [l.id, l]));
const paths: LearningPath[] = curriculum.paths.map((p) => {
  const required = [...new Set(p.requiredUnits.flatMap((u) => resolveUnit(u, p.id)))];
  const optional = [...new Set(p.optionalUnits.flatMap((u) => resolveUnit(u, p.id)))].filter((id) => !required.includes(id));
  return {
    id: p.id,
    role: p.role,
    title: p.title,
    summary: p.summary,
    targetLevel: p.targetLevel,
    requiredUnits: p.requiredUnits,
    optionalUnits: p.optionalUnits,
    required,
    optional,
    estimatedMinutes: p.estimatedMinutes ?? required.reduce((a, id) => a + (allById.get(id)?.minutes ?? 0), 0),
    certificate: p.certificate,
  };
});

currentFile = "content/glossary";
const glossary = glossaryRaw
  .map((g) => {
    for (const r of g.related) if (!glossaryById.has(r)) errors.push(`content/glossary: "${g.id}" related → unknown "${r}"`);
    return { ...g, definition: md(g.definition) };
  })
  .sort((a, b) => a.term.localeCompare(b.term));
for (const g of glossary) search.push({ id: `glossary:${g.id}`, kind: "glossary", title: g.term, text: `${g.plain} ${g.aka.join(" ")} ${stripHtml(g.definition)}`, href: `/glossary/#${g.id}`, meta: "Glossary" });

for (const w of warnings) console.warn(`⚠️  ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`❌ ${e}`);
  console.error(`\n${errors.length} content error(s).`);
  process.exit(1);
}

const catalog: Catalog = {
  contentVersion: changelog.contentVersion,
  builtAt: new Date().toISOString(),
  roles: curriculum.roles,
  levels: curriculum.levels,
  modules,
  paths,
  glossary,
  changelog: changelog.entries,
};

const total = modules.reduce((a, m) => a + m.totalCount, 0);
console.log(`✅ ${lessons.length}/${total} lessons written across ${modules.length} modules, ${glossary.length} glossary terms, ${paths.length} paths (content v${catalog.contentVersion})`);

if (!checkOnly) {
  fs.mkdirSync(path.join(OUT, "lessons"), { recursive: true });
  for (const old of fs.readdirSync(path.join(OUT, "lessons"))) fs.rmSync(path.join(OUT, "lessons", old));
  fs.writeFileSync(path.join(OUT, "catalog.json"), JSON.stringify(catalog));
  fs.writeFileSync(path.join(OUT, "search.json"), JSON.stringify(search));
  for (const l of lessons) fs.writeFileSync(path.join(OUT, "lessons", `${l.id}.json`), JSON.stringify(l));
  console.log(`   wrote ${path.relative(ROOT, OUT)}/`);
}
