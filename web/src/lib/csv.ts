/** Tiny CSV builder with proper escaping. */

export type CsvCell = string | number | boolean | null | undefined;

function escape(cell: CsvCell): string {
  if (cell === null || cell === undefined) return "";
  const s = String(cell);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function buildCsv(headers: string[], rows: CsvCell[][]): string {
  const out: string[] = [];
  out.push(headers.map(escape).join(","));
  for (const r of rows) out.push(r.map(escape).join(","));
  return out.join("\n");
}

export function downloadCsv(filename: string, content: string) {
  // BOM so Excel opens UTF-8 correctly
  const blob = new Blob(["﻿" + content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
