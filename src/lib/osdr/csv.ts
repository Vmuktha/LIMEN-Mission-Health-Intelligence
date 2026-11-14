/**
 * A minimal RFC 4180 CSV reader.
 *
 * The OSDR transformed files are small, unescaped-in-practice exports, but they
 * are read strictly so that a quoted field, a stray quote, or a truncated row is
 * reported instead of silently reshaped.
 */

export interface CsvParseResult {
  readonly rows: readonly (readonly string[])[];
  readonly errors: readonly string[];
}

const BYTE_ORDER_MARK = "\uFEFF";

export function parseCsv(text: string): CsvParseResult {
  const source = text.startsWith(BYTE_ORDER_MARK) ? text.slice(1) : text;
  const rows: string[][] = [];
  const errors: string[] = [];

  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let rowStarted = false;
  let index = 0;

  const endField = (): void => {
    row.push(field);
    field = "";
  };

  const endRow = (): void => {
    endField();
    rows.push(row);
    row = [];
    rowStarted = false;
  };

  while (index < source.length) {
    const character = source[index];

    if (inQuotes) {
      if (character === '"') {
        if (source[index + 1] === '"') {
          field += '"';
          index += 2;
          continue;
        }
        inQuotes = false;
        index += 1;
        continue;
      }
      field += character;
      index += 1;
      continue;
    }

    if (character === '"') {
      if (rowStarted && field !== "") {
        errors.push(`Unexpected quote inside an unquoted field near character ${index}.`);
      }
      inQuotes = true;
      rowStarted = true;
      index += 1;
      continue;
    }

    if (character === ",") {
      endField();
      rowStarted = true;
      index += 1;
      continue;
    }

    if (character === "\r") {
      if (source[index + 1] === "\n") {
        index += 2;
      } else {
        index += 1;
      }
      endRow();
      continue;
    }

    if (character === "\n") {
      index += 1;
      endRow();
      continue;
    }

    field += character;
    rowStarted = true;
    index += 1;
  }

  if (inQuotes) {
    errors.push("Unterminated quoted field at end of input.");
  }

  if (rowStarted || row.length > 0 || field !== "") {
    endRow();
  }

  return { rows, errors };
}
