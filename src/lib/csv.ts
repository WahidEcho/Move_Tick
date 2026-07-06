function escapeCsv(val: string): string {
  return val.includes(',') || val.includes('"') || val.includes('\n')
    ? `"${val.replace(/"/g, '""')}"`
    : val;
}

/** Builds a CSV string from headers + row arrays (cells are stringified and escaped). */
export function toCSV(headers: string[], rows: unknown[][]): string {
  const headerLine = headers.map(escapeCsv).join(',');
  const bodyLines = rows.map((row) => row.map((cell) => escapeCsv(String(cell ?? ''))).join(','));
  return [headerLine, ...bodyLines].join('\n');
}
