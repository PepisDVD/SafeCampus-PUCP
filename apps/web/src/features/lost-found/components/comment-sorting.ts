import type { ComentarioLf } from "../types";

export type CommentSort = "recientes" | "destacados";

export const COMMENT_SORT_OPTIONS: { value: CommentSort; label: string }[] = [
  { value: "recientes", label: "Más recientes" },
  { value: "destacados", label: "Más destacados" },
];

/**
 * Ordena los comentarios raíz: fijados primero, luego por prioridad de etiqueta
 * (alta/media destacadas), y finalmente según el criterio elegido.
 */
export function sortRootComments(comments: ComentarioLf[], sort: CommentSort): ComentarioLf[] {
  return [...comments].sort((a, b) => {
    if (Boolean(b.fijado) !== Boolean(a.fijado)) return b.fijado ? 1 : -1;
    const prioridad = (b.tag_prioridad ?? 0) - (a.tag_prioridad ?? 0);
    if (prioridad !== 0) return prioridad;
    if (sort === "destacados") {
      const destacados = (b.destacados ?? 0) - (a.destacados ?? 0);
      if (destacados !== 0) return destacados;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

/** Filtra por etiquetas seleccionadas (vacío = todas). Trata `null` como GENERAL. */
export function filterByTags(comments: ComentarioLf[], tags: string[]): ComentarioLf[] {
  if (tags.length === 0) return comments;
  return comments.filter((c) => tags.includes(c.tag ?? "GENERAL"));
}
