export const fcdsYearOptions = [
  "السنة الأولى",
  "السنة الثانية",
  "السنة الثالثة",
  "السنة الرابعة",
] as const;

export function fcdsYearForSemester(semester: number): string | null {
  if (!Number.isInteger(semester) || semester < 1 || semester > 8) return null;
  return fcdsYearOptions[Math.floor((semester - 1) / 2)] ?? null;
}

/**
 * The 36 required courses in the 2019 Computing and Data Sciences study plan,
 * numbered in plan order while the real course codes are pending.
 * University/program electives and summer training are intentionally omitted.
 */
export function fcdsSemesterForTemporaryCode(code: string): number | null {
  const normalized = code.trim();
  if (!/^\d{1,2}$/.test(normalized)) return null;

  const temporaryCode = Number(normalized);
  if (!Number.isInteger(temporaryCode) || temporaryCode < 1 || temporaryCode > 36) return null;

  if (temporaryCode <= 6) return 1;
  if (temporaryCode <= 12) return 2;
  if (temporaryCode <= 17) return 3;
  if (temporaryCode <= 22) return 4;
  if (temporaryCode <= 25) return 5;
  if (temporaryCode <= 28) return 6;
  if (temporaryCode <= 32) return 7;
  return 8;
}
