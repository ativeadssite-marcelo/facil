function escapeCsv(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Exporta linhas para CSV (separador ";" — compatível com Excel pt-BR). */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const content = [headers, ...rows]
    .map(r => r.map(escapeCsv).join(';'))
    .join('\r\n');
  // BOM garante acentuação correta no Excel
  download(new Blob(['\uFEFF' + content], { type: 'text/csv;charset=utf-8;' }), filename);
}

/** Exporta linhas para um arquivo .xls (tabela HTML) que o Excel abre nativamente. */
export function exportToExcel(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const esc = (v: unknown) =>
    String(v ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  const html =
    `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">` +
    `<head><meta charset="utf-8" /></head><body><table border="1">` +
    `<thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead>` +
    `<tbody>${rows
      .map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`)
      .join('')}</tbody></table></body></html>`;
  download(new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' }), filename);
}