import { realpathSync } from "node:fs";
import { resolve, relative, isAbsolute } from "node:path";
export function inside(base: string, target: string) {
  try {
    const root = realpathSync.native(base),
      actual = realpathSync.native(resolve(root, target)),
      part = relative(root, actual);
    return (
      !isAbsolute(part) &&
      part !== ".." &&
      !part.startsWith(".." + (process.platform === "win32" ? "\\" : "/"))
    );
  } catch {
    return false;
  }
}
export function toolDecision(
  cwd: string,
  docsOnly: boolean,
  name: string,
  input: any,
) {
  if (name === "StructuredOutput") return "pass";
  if (name === "mcp__lab__get_note" || name === "mcp__lab__collector")
    return "pass";
  if (name !== "Read" || typeof input.file_path !== "string") return "deny";
  // Use canonical path segments, not startsWith(DOCS): docs-private is a sibling.
  const root = docsOnly ? resolve(cwd, "docs") : cwd;
  return inside(root, input.file_path) ? "pass" : "deny";
}
