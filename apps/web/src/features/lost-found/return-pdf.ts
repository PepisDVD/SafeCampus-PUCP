import type { CustodiaLf } from "./types";
import { estadoLabel, formatDateTimePe } from "./presentation";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const LEFT = 48;
const TOP = 780;
const LINE_HEIGHT = 16;
const MAX_LINES_PER_PAGE = 43;
const BODY_CHARS = 92;
const HEADING_CHARS = 72;

type PdfLine = {
  text: string;
  kind?: "title" | "section" | "body";
};

export function buildReturnedCustodyPdf(custodia: CustodiaLf) {
  const lines = buildReturnPdfLines(custodia);
  return new Blob([createPdf(lines)], { type: "application/pdf" });
}

export function buildReturnPdfFilename(custodia: CustodiaLf) {
  const code = sanitizeFilename(custodia.codigo ?? custodia.caso_id ?? custodia.id);
  return `devolucion-${code}.pdf`;
}

export function buildReturnPdfLines(custodia: CustodiaLf): string[] {
  const trace = parseReturnTrace(custodia.observaciones);
  return [
    "Constancia de devolucion Lost & Found",
    "",
    "Identificacion del registro",
    `Caso: ${custodia.codigo ?? custodia.caso_id}`,
    `Objeto: ${custodia.titulo ?? "Objeto encontrado"}`,
    `Estado: ${estadoLabel(custodia.estado)}`,
    `Ubicacion de custodia: ${custodia.ubicacion_custodia}`,
    `Recepcion: ${formatDateTimePe(custodia.fecha_recepcion)}`,
    `Vencimiento de custodia: ${formatDateTimePe(custodia.fecha_vencimiento)}`,
    custodia.fecha_devolucion
      ? `Fecha de devolucion: ${formatDateTimePe(custodia.fecha_devolucion)}`
      : `Fecha de devolucion: ${formatDateTimePe(custodia.updated_at)}`,
    "",
    ...sectionLines("Caso y objeto", [
      trace.fields["Caso"],
      trace.fields["Objeto"],
      trace.fields["Caso relacionado"],
    ]),
    ...sectionLines("Persona reclamante", [
      trace.fields["Reclamante"] ?? `Reclamante ID: ${custodia.reclamante_id ?? "No registrado"}`,
      trace.fields["Documento/Codigo"],
      trace.fields["Correo"],
      trace.fields["Telefono"],
    ]),
    ...sectionLines("Verificacion", [
      trace.fields["Metodos de verificacion"] ?? `Metodo de verificacion: ${custodia.metodo_verificacion ?? "No registrado"}`,
      trace.fields["Evidencia manual"],
      trace.fields["Detalle de verificacion"],
    ]),
    ...sectionLines("Entrega", [
      trace.fields["Entrega"],
      trace.fields["Responsable"],
      trace.fields["Punto de entrega"],
      trace.fields["Estado al devolver"],
      trace.confirmacion,
    ]),
    ...sectionLines("Evidencias", [
      trace.fields["Evidencia de entrega"],
      trace.fields["Otra evidencia"],
      trace.fields["Imagenes adjuntas"],
    ]),
    ...sectionLines("Observaciones finales", [
      trace.fields["Observaciones adicionales"],
      ...trace.extras,
    ], "Sin observaciones adicionales registradas."),
    "",
    "Generado desde SafeCampus PUCP para trazabilidad operativa.",
  ];
}

export function downloadReturnedCustodyPdf(custodia: CustodiaLf) {
  const blob = buildReturnedCustodyPdf(custodia);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildReturnPdfFilename(custodia);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function createPdf(sourceLines: string[]) {
  const logicalLines = sourceLines.flatMap((line, index): PdfLine[] => {
    const kind = index === 0 ? "title" : isSectionHeading(line, sourceLines[index - 1]) ? "section" : "body";
    const maxChars = kind === "section" ? HEADING_CHARS : BODY_CHARS;
    return wrapLine(line, maxChars).map((text) => ({ text, kind }));
  });
  const pages = chunk(logicalLines, MAX_LINES_PER_PAGE);
  const objects: string[] = [];
  const pageObjectIds = pages.map((_, index) => 3 + index * 2);
  const contentObjectIds = pages.map((_, index) => 4 + index * 2);

  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageId = pageObjectIds[index]!;
    const contentId = contentObjectIds[index]!;
    objects[pageId] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> /F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> >> >> /Contents ${contentId} 0 R >>`;
    const stream = buildPageStream(pageLines, index + 1, pages.length);
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return pdf;
}

function buildPageStream(lines: PdfLine[], page: number, totalPages: number) {
  const commands = [
    "BT",
    `/F1 9 Tf ${LEFT} 34 Td (${escapePdfText(`Pagina ${page} de ${totalPages}`)}) Tj`,
    "ET",
    "BT",
    `${LEFT} ${TOP} Td`,
  ];

  lines.forEach((line, index) => {
    const font = line.kind === "title" || line.kind === "section" ? "F2" : "F1";
    const size = line.kind === "title" ? 16 : line.kind === "section" ? 12 : 10;
    if (index > 0) commands.push(`0 -${LINE_HEIGHT} Td`);
    commands.push(`/${font} ${size} Tf (${escapePdfText(line.text)}) Tj`);
  });

  commands.push("ET");
  return commands.join("\n");
}

function wrapLine(line: string, maxChars: number) {
  if (!line.trim()) return [""];
  const words = line.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (!current) {
      current = word;
      return;
    }
    if (`${current} ${word}`.length <= maxChars) {
      current = `${current} ${word}`;
      return;
    }
    lines.push(current);
    current = word;
  });
  if (current) lines.push(current);
  return lines;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks.length ? chunks : [[]];
}

function isSectionHeading(line: string, previous?: string) {
  return Boolean(line && previous === "");
}

function sectionLines(title: string, values: Array<string | undefined>, fallback?: string) {
  const content = values.filter((value): value is string => Boolean(value?.trim()));
  return ["", title, ...(content.length ? content : fallback ? [fallback] : [])];
}

function parseReturnTrace(observaciones?: string | null) {
  const trace: { fields: Record<string, string | undefined>; extras: string[]; confirmacion?: string } = {
    fields: {},
    extras: [],
  };
  const lines = observaciones?.trim().split(/\r?\n/).map((line) => line.trim()).filter(Boolean) ?? [];

  lines.forEach((line) => {
    if (line === "Registro de devolucion") return;
    if (line === "Recepcion confirmada por la persona reclamante.") {
      trace.confirmacion = line;
      return;
    }
    const separator = line.indexOf(":");
    if (separator === -1) {
      trace.extras.push(line);
      return;
    }
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim();
    trace.fields[key] = `${key}: ${value}`;
  });

  if (lines.length === 0) {
    trace.extras.push("Sin observaciones de devolucion registradas.");
  }

  return trace;
}

function escapePdfText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function sanitizeFilename(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "") || "custodia";
}
