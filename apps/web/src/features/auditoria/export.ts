import type { EventoAuditoria } from "./types";

function escapeCsvCell(value: string): string {
  const safe = value.replace(/\"/g, '""');
  return `"${safe}"`;
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function buildAuditoriaCsv(eventos: EventoAuditoria[]): string {
  const header = ["fecha", "tipo", "actor", "accion", "detalle"];
  const rows = eventos.map((ev) => [
    ev.timestamp,
    ev.tipo,
    ev.actor,
    ev.accion,
    ev.detalle,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(String(cell))).join(","))
    .join("\n");
}

export function downloadAuditoriaCsv(eventos: EventoAuditoria[]): void {
  const csv = buildAuditoriaCsv(eventos);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, "auditoria-safecampus.csv");
}

export function buildAuditoriaExcelTable(eventos: EventoAuditoria[]): string {
  const rows = eventos
    .map(
      (ev) => `
      <tr>
        <td>${ev.timestamp}</td>
        <td>${ev.tipo}</td>
        <td>${ev.actor}</td>
        <td>${ev.accion}</td>
        <td>${ev.detalle}</td>
      </tr>`,
    )
    .join("");

  return `
    <table>
      <thead>
        <tr>
          <th>Fecha</th>
          <th>Tipo</th>
          <th>Actor</th>
          <th>Accion</th>
          <th>Detalle</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

export function downloadAuditoriaExcel(eventos: EventoAuditoria[]): void {
  const table = buildAuditoriaExcelTable(eventos);
  const html = `
    <html>
      <head><meta charset="UTF-8" /></head>
      <body>${table}</body>
    </html>`;

  const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8;" });
  triggerDownload(blob, "auditoria-safecampus.xls");
}
