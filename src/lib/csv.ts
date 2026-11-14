export type RosterRow = { name: string; email: string };

/**
 * Quote-aware CSV parser for roster import, including escaped double quotes
 * and CRLF. Data is validated again in trusted Cloud Functions.
 */
export function parseCsv(data: string): string[][] {
  const rows: string[][] = [];
  let cells: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    if (quoted) {
      if (char === '"' && data[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"' && !field) {
      quoted = true;
    } else if (char === ",") {
      cells.push(field.trim());
      field = "";
    } else if (char === "\n") {
      cells.push(field.trim());
      rows.push(cells);
      cells = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }
  if (quoted) throw new Error("Unterminated quoted field in CSV.");
  if (field || cells.length) {
    cells.push(field.trim());
    rows.push(cells);
  }
  return rows.filter(row => row.some(v => v.length));
}
export function parseRosterCsv(data: string): RosterRow[] {
  const records = parseCsv(data.replace(/^\uFEFF/, ""));
  if (records.length < 2) throw new Error("CSV needs a header and at least one student.");
  const headers = records[0].map(x => x.toLowerCase().replace(/\s+/g, " ").trim());
  const nameIdx = headers.findIndex(x => ["name", "student name", "full name"].includes(x));
  const emailIdx = headers.findIndex(x => ["email", "email address", "school email", "e-mail"].includes(x));
  if (nameIdx === -1 || emailIdx === -1)
    throw new Error("CSV headers must include Name and Email.");
  return records.slice(1).map((row, i) => {
    const name = row[nameIdx]?.trim() || "";
    const email = row[emailIdx]?.trim() || "";
    if (!name || !email) throw new Error("Missing name or email on CSV data row " + (i + 2));
    return { name, email };
  });
}
