import type { YamlWalkthrough, YamlWalkthroughSection } from "@/types";

const yamlFiles = import.meta.glob(
  "/content-source/yaml-walkthroughs/**/*.yaml",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

const walkthroughFiles = import.meta.glob(
  "/content-source/yaml-walkthroughs/**/*.md",
  { query: "?raw", import: "default", eager: true },
) as Record<string, string>;

export const yamlWalkthroughs: YamlWalkthrough[] = buildWalkthroughs();

function buildWalkthroughs(): YamlWalkthrough[] {
  const result: YamlWalkthrough[] = [];

  for (const [yamlPath, yamlContent] of Object.entries(yamlFiles)) {
    const stem = stemFromPath(yamlPath);
    const folder = folderFromPath(yamlPath);
    const mdPath = yamlPath.replace(/\.yaml$/, ".md");
    const md = walkthroughFiles[mdPath];

    if (!md) continue;

    const { frontmatter, sections } = parseWalkthroughMd(md);
    const why = sections.find((s) => s.title === "Varför")?.body.trim() ?? "";
    const examPoints = parseExamPoints(
      sections.find((s) => s.title === "Tentapunkter")?.body ?? "",
    );
    const walkthroughSections = sections.filter(
      (s) => s.title !== "Varför" && s.title !== "Tentapunkter",
    );

    const filenameRaw = String(frontmatter["filename"] ?? "");
    const filename = filenameRaw || stem.replace(/^\d+-/, "") + ".yaml";
    const source = (frontmatter["source"] === "chas-challenge"
      ? "chas-challenge"
      : "lecture") as "lecture" | "chas-challenge";

    result.push({
      id: stem,
      title: String(frontmatter["title"] ?? stem),
      source,
      sourceLabel: String(
        frontmatter["sourceLabel"] ??
          (source === "lecture" ? "Lektion" : "Eget projekt"),
      ),
      chapterId:
        typeof frontmatter["chapterId"] === "number"
          ? (frontmatter["chapterId"] as number)
          : null,
      filename,
      yaml: yamlContent.trim(),
      why,
      sections: walkthroughSections,
      examPoints,
    });

    void folder;
  }

  return result.sort(orderWalkthroughs);
}

function orderWalkthroughs(a: YamlWalkthrough, b: YamlWalkthrough): number {
  if (a.source !== b.source) {
    return a.source === "lecture" ? -1 : 1;
  }
  return a.id.localeCompare(b.id);
}

function stemFromPath(path: string): string {
  const segments = path.split("/");
  const last = segments[segments.length - 1] ?? "";
  return last.replace(/\.(yaml|md)$/, "");
}

function folderFromPath(path: string): string {
  const segments = path.split("/");
  return segments[segments.length - 2] ?? "";
}

type ParsedMd = {
  frontmatter: Record<string, string | number>;
  sections: YamlWalkthroughSection[];
};

function parseWalkthroughMd(raw: string): ParsedMd {
  const { frontmatter, body } = extractFrontmatter(raw);
  const sections = splitH1Sections(body);
  return { frontmatter, sections };
}

function extractFrontmatter(raw: string): {
  frontmatter: Record<string, string | number>;
  body: string;
} {
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!m) return { frontmatter: {}, body: raw };
  const fm: Record<string, string | number> = {};
  for (const line of (m[1] ?? "").split("\n")) {
    const km = line.match(/^([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*(.+)$/);
    if (!km) continue;
    const key = km[1] as string;
    const value = (km[2] ?? "").trim();
    fm[key] = parseValue(value);
  }
  return { frontmatter: fm, body: raw.slice(m[0].length) };
}

function parseValue(v: string): string | number {
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (/^".*"$/.test(v)) return v.slice(1, -1);
  if (/^'.*'$/.test(v)) return v.slice(1, -1);
  return v;
}

function splitH1Sections(body: string): YamlWalkthroughSection[] {
  const lines = body.split("\n");
  const sections: YamlWalkthroughSection[] = [];
  let current: YamlWalkthroughSection | null = null;
  let inFence = false;

  for (const line of lines) {
    if (line.startsWith("```")) {
      inFence = !inFence;
      if (current) current.body += line + "\n";
      continue;
    }
    if (!inFence && line.startsWith("# ")) {
      if (current) sections.push(current);
      current = { title: line.slice(2).trim(), body: "" };
      continue;
    }
    if (current) current.body += line + "\n";
  }
  if (current) sections.push(current);

  return sections.map((s) => ({ ...s, body: s.body.trim() }));
}

function parseExamPoints(body: string): string[] {
  const points: string[] = [];
  for (const line of body.split("\n")) {
    const m = line.match(/^[-*]\s+(.+)$/);
    if (m) points.push((m[1] ?? "").trim());
  }
  return points;
}
