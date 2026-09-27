import * as XLSX from "xlsx";

export type ParsedSpreadsheet = {
  headers: string[];
  rows: Record<string, string>[];
};

const MAX_ROWS = 20000;

/**
 * Parses an uploaded .xlsx/.xls/.csv file's first sheet into headers + string rows.
 * Cell values are coerced to strings so downstream mapping/validation is uniform.
 */
export function parseSpreadsheet(buffer: ArrayBuffer): ParsedSpreadsheet {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { headers: [], rows: [] };

  const sheet = workbook.Sheets[sheetName];
  const raw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false, defval: "" });

  if (raw.length === 0) return { headers: [], rows: [] };

  const headers = raw[0].map((h, i) => (h === undefined || h === null || String(h).trim() === "" ? `Column ${i + 1}` : String(h).trim()));

  const rows: Record<string, string>[] = [];
  for (const line of raw.slice(1, MAX_ROWS + 1)) {
    const row: Record<string, string> = {};
    let hasValue = false;
    headers.forEach((header, i) => {
      const cell = line[i];
      const value = cell === undefined || cell === null ? "" : String(cell).trim();
      if (value) hasValue = true;
      row[header] = value;
    });
    if (hasValue) rows.push(row);
  }

  return { headers, rows };
}
