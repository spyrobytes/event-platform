/**
 * Escape a field for CSV output
 * Handles commas, quotes, and newlines
 */
export function escapeCSVField(field: string | number | null | undefined): string {
  if (field === null || field === undefined) {
    return "";
  }

  const str = String(field);

  // If the field contains comma, quote, or newline, wrap in quotes and escape existing quotes
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a CSV string from headers and rows
 */
export function generateCSV(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const headerLine = headers.map(escapeCSVField).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSVField).join(","));

  return [headerLine, ...dataLines].join("\r\n");
}

/**
 * Format a date for CSV export
 */
export function formatDateForCSV(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }

  const d = typeof date === "string" ? new Date(date) : date;
  return d.toISOString();
}
