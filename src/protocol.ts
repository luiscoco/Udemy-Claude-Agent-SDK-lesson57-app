export const MODES = [
  "clean",
  "weak",
  "rules",
  "guard",
  "dontask",
  "hardened",
  "toolpoison",
  "isolation",
  "retest",
] as const;
export type Mode = (typeof MODES)[number];
export type RunConfig = { mode: Mode };
export type LabEvent = { type: string; [key: string]: any };
export function validateConfig(value: any): RunConfig {
  if (
    !value ||
    Object.keys(value).some((k) => k !== "mode") ||
    !MODES.includes(value.mode)
  )
    throw new Error("Choose a listed fake-canary security experiment.");
  return { mode: value.mode };
}
