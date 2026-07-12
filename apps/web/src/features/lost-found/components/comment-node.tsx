"use client";

import Image from "next/image";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  RoleBadge,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  toast,
} from "@safecampus/ui-kit";
import { ChevronDown, ChevronUp, Eye, EyeOff, ImageIcon, Pencil, Pin, PinOff, Reply, Settings2, Star, Trash2, X } from "lucide-react";
import { DEFAULT_TAG, type LfCommentTag, tagMeta } from "../presentation";
import type { ComentarioLf } from "../types";
import { formatLimaDateTime } from "@/lib/lima-date";

const ACCEPT_IMAGES = "image/jpeg,image/png,image/webp,image/heic,image/gif";
const MAX_IMAGES = 3;

type FotoAdjunta = { file: File; previewUrl: string };

export type CommentCallbacks = {
  onReply: (parentId: string, texto: string, archivos: File[], tag?: string | null) => Promise<boolean>;
  onEdit: (id: string, texto: string) => Promise<boolean>;
  onModerate: (id: string, visible: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onPin: (id: string, fijar: boolean) => Promise<void>;
  onReact: (id: string) => Promise<void>;
};

/** Composer reutilizable: texto + hasta 3 imágenes + etiqueta opcional. */
export function CommentComposer({
  placeholder,
  disabled,
  isPending,
  submitLabel = "Enviar",
  initialText = "",
  allowImages = true,
  tags,
  onSubmit,
  onCancel,
}: {
  placeholder: string;
  disabled?: boolean;
  isPending?: boolean;
  submitLabel?: string;
  initialText?: string;
  allowImages?: boolean;
  tags?: LfCommentTag[];
  onSubmit: (texto: string, archivos: File[], tag?: string | null) => Promise<boolean>;
  onCancel?: () => void;
}) {
  const [texto, setTexto] = useState(initialText);
  const [tag, setTag] = useState<string>(DEFAULT_TAG);
  const [fotos, setFotos] = useState<FotoAdjunta[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const fotosRef = useRef<FotoAdjunta[]>([]);

  useEffect(() => {
    fotosRef.current = fotos;
  }, [fotos]);
  useEffect(() => () => fotosRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl)), []);

  const handleFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    const images = selected.filter((f) => f.type.startsWith("image/"));
    if (images.length !== selected.length) toast.error("Solo se permiten archivos de imagen.");
    if (images.length === 0) {
      event.target.value = "";
      return;
    }
    const nuevos = images.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setFotos((current) => {
      const combinado = [...current, ...nuevos];
      if (combinado.length > MAX_IMAGES) toast.error(`Solo puedes adjuntar hasta ${MAX_IMAGES} imágenes.`);
      combinado.slice(MAX_IMAGES).forEach((item) => URL.revokeObjectURL(item.previewUrl));
      return combinado.slice(0, MAX_IMAGES);
    });
    event.target.value = "";
  };

  const removeFoto = (index: number) => {
    setFotos((current) => {
      const target = current[index];
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((_, idx) => idx !== index);
    });
  };

  const submit = async () => {
    const value = texto.trim();
    if (value.length < 2) {
      toast.error("El comentario debe tener al menos 2 caracteres.");
      return;
    }
    const selectedTag = tags ? (tag === DEFAULT_TAG ? null : tag) : undefined;
    const ok = await onSubmit(value, fotos.map((f) => f.file), selectedTag);
    if (ok) {
      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl));
      setFotos([]);
      setTexto("");
      setTag(DEFAULT_TAG);
    }
  };

  return (
    <div className="space-y-2 rounded-lg border bg-white p-2">
      <Textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={2}
        maxLength={2000}
        className="resize-none"
      />
      {tags && tags.length > 0 && (
        <Select value={tag} onValueChange={setTag} disabled={disabled}>
          <SelectTrigger className="w-full sm:w-72" aria-label="Etiqueta del comentario">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {tags.map((t) => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
      {fotos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {fotos.map((foto, index) => (
            <div key={foto.previewUrl} className="relative h-16 w-16 overflow-hidden rounded-md border bg-slate-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.previewUrl} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFoto(index)}
                className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white"
                aria-label="Quitar imagen"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {allowImages && (
            <>
              <input ref={fileRef} type="file" accept={ACCEPT_IMAGES} multiple hidden onChange={handleFiles} />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={disabled || fotos.length >= MAX_IMAGES}
                onClick={() => fileRef.current?.click()}
              >
                <ImageIcon className="mr-1 h-4 w-4" />
                Imagen {fotos.length > 0 ? `(${fotos.length}/${MAX_IMAGES})` : ""}
              </Button>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onCancel && (
            <Button type="button" size="sm" variant="outline" onClick={onCancel} disabled={isPending}>
              Cancelar
            </Button>
          )}
          <Button type="button" size="sm" onClick={submit} disabled={disabled || isPending || texto.trim().length < 2}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Imágenes diferidas: skeleton + botón "Mostrar"; carrusel si hay más de una. */
function CommentImages({ imagenes }: { imagenes: string[] }) {
  const [shown, setShown] = useState(false);
  if (!imagenes.length) return null;

  if (!shown) {
    return (
      <div className="mt-2 space-y-2">
        <div className="flex gap-2">
          {imagenes.slice(0, MAX_IMAGES).map((url) => (
            <Skeleton key={url} className="h-20 w-28 rounded-md" />
          ))}
        </div>
        <Button size="sm" variant="outline" onClick={() => setShown(true)}>
          <ImageIcon className="mr-1 h-4 w-4" />
          {imagenes.length > 1 ? `Mostrar imágenes (${imagenes.length})` : "Mostrar imagen"}
        </Button>
      </div>
    );
  }

  if (imagenes.length === 1) {
    return (
      <div className="relative mt-2 aspect-video w-full max-w-md overflow-hidden rounded-lg border bg-slate-50">
        <Image src={imagenes[0]!} alt="" fill unoptimized className="object-contain" />
      </div>
    );
  }

  return (
    <div className="mt-2 max-w-md px-10">
      <Carousel className="w-full" opts={{ loop: true }}>
        <CarouselContent>
          {imagenes.map((url) => (
            <CarouselItem key={url}>
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border bg-slate-50">
                <Image src={url} alt="" fill unoptimized className="object-contain" />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </div>
  );
}

function initials(name?: string | null) {
  return (name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

export function CommentNode({
  comment,
  childrenMap,
  depth,
  maxDepth,
  manageMode,
  canComment,
  isPending,
  tags,
  callbacks,
}: {
  comment: ComentarioLf;
  childrenMap: Map<string, ComentarioLf[]>;
  depth: number;
  maxDepth: number;
  manageMode: boolean;
  canComment: boolean;
  isPending: boolean;
  tags?: LfCommentTag[];
  callbacks: CommentCallbacks;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  // Las respuestas inician contraídas para no cargar todo el hilo de una vez.
  const [repliesOpen, setRepliesOpen] = useState(false);

  const replies = childrenMap.get(comment.id) ?? [];
  const canReply = canComment && !comment.eliminado && depth + 1 < maxDepth;
  const tagInfo = comment.tag && comment.tag !== DEFAULT_TAG ? tagMeta(comment.tag) : null;

  return (
    <div className={depth > 0 ? "border-l border-slate-200 pl-3 sm:pl-4" : ""}>
      <div className={`flex gap-3 rounded-lg border bg-white p-3 ${comment.fijado ? "border-sky-200 ring-1 ring-sky-100" : ""}`}>
        <Avatar className="h-9 w-9">
          <AvatarImage src={comment.autor?.avatar_url ?? undefined} />
          <AvatarFallback>{initials(comment.autor?.nombre_completo)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{comment.autor?.nombre_completo ?? "Usuario"}</p>
            {comment.autor?.rol ? <RoleBadge role={comment.autor.rol} /> : null}
            <span className="text-xs text-slate-500">
              {formatLimaDateTime(comment.created_at, {
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              }, comment.created_at)}
            </span>
            {comment.fijado && (
              <Badge variant="outline" className="border-sky-200 bg-sky-50 text-sky-700"><Pin className="mr-1 h-3 w-3" />Fijado</Badge>
            )}
            {tagInfo && (
              <Badge variant="outline" className={tagInfo.badgeClassName}>{tagInfo.label}</Badge>
            )}
            {comment.eliminado && (
              <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700">Eliminado</Badge>
            )}
            {!comment.visible && !comment.eliminado && (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">Oculto</Badge>
            )}
          </div>

          {editOpen ? (
            <div className="mt-2">
              <CommentComposer
                placeholder="Editar comentario"
                submitLabel="Guardar"
                initialText={comment.contenido}
                allowImages={false}
                isPending={isPending}
                onSubmit={async (texto) => {
                  const ok = await callbacks.onEdit(comment.id, texto);
                  if (ok) setEditOpen(false);
                  return ok;
                }}
                onCancel={() => setEditOpen(false)}
              />
            </div>
          ) : (
            <>
              <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${comment.eliminado ? "italic text-slate-400" : "text-slate-700"}`}>
                {comment.contenido}
              </p>
              {!comment.eliminado && <CommentImages imagenes={comment.imagenes ?? []} />}
            </>
          )}

          {!editOpen && !comment.eliminado && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {canReply && (
                <Button size="sm" variant="ghost" onClick={() => setReplyOpen((v) => !v)}>
                  <Reply className="mr-1 h-4 w-4" />
                  Responder
                </Button>
              )}
              <Button
                size="sm"
                variant={comment.reaccionado ? "secondary" : "ghost"}
                onClick={() => void callbacks.onReact(comment.id)}
                disabled={isPending || !comment.puede_reaccionar}
                aria-pressed={comment.reaccionado}
                title={comment.puede_reaccionar ? "Destacar" : "No puedes destacar este comentario"}
              >
                <Star className={`mr-1 h-4 w-4 ${comment.reaccionado ? "fill-amber-400 text-amber-500" : ""}`} />
                Destacar{comment.destacados ? ` · ${comment.destacados}` : ""}
              </Button>
              {comment.puede_fijar && (
                <Button size="sm" variant="ghost" onClick={() => void callbacks.onPin(comment.id, !comment.fijado)} disabled={isPending}>
                  {comment.fijado ? <PinOff className="mr-1 h-4 w-4" /> : <Pin className="mr-1 h-4 w-4" />}
                  {comment.fijado ? "Quitar fijado" : "Fijar"}
                </Button>
              )}
              {manageMode && comment.puede_editar && (
                <Button size="sm" variant={actionsOpen ? "secondary" : "outline"} onClick={() => setActionsOpen((v) => !v)}>
                  <Settings2 className="mr-1 h-4 w-4" />
                  Gestionar
                </Button>
              )}
            </div>
          )}

          {manageMode && actionsOpen && comment.puede_editar && !editOpen && (
            <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-slate-50 p-2">
              {!comment.eliminado && (
                <Button size="sm" variant="outline" onClick={() => { setEditOpen(true); setActionsOpen(false); }} disabled={isPending}>
                  <Pencil className="mr-1 h-4 w-4" />
                  Editar
                </Button>
              )}
              {!comment.eliminado && (
                <Button size="sm" variant="outline" onClick={() => callbacks.onModerate(comment.id, !comment.visible)} disabled={isPending}>
                  {comment.visible ? <EyeOff className="mr-1 h-4 w-4" /> : <Eye className="mr-1 h-4 w-4" />}
                  {comment.visible ? "Ocultar" : "Mostrar"}
                </Button>
              )}
              {!comment.eliminado && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                  onClick={() => {
                    if (window.confirm("¿Eliminar este comentario? Las respuestas se conservarán.")) {
                      void callbacks.onDelete(comment.id);
                    }
                  }}
                  disabled={isPending}
                >
                  <Trash2 className="mr-1 h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          )}

          {replyOpen && canReply && (
            <div className="mt-3">
              <CommentComposer
                placeholder="Escribe una respuesta…"
                submitLabel="Responder"
                isPending={isPending}
                tags={tags}
                onSubmit={async (texto, archivos, tag) => {
                  const ok = await callbacks.onReply(comment.id, texto, archivos, tag);
                  if (ok) setReplyOpen(false);
                  return ok;
                }}
                onCancel={() => setReplyOpen(false)}
              />
            </div>
          )}
        </div>
      </div>

      {replies.length > 0 && (
        <div className="mt-3 space-y-3">
          <Button size="sm" variant="ghost" className="text-slate-600" onClick={() => setRepliesOpen((v) => !v)}>
            {repliesOpen ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
            {repliesOpen ? "Ocultar respuestas" : `Mostrar ${replies.length} respuesta${replies.length > 1 ? "s" : ""}`}
          </Button>
          {repliesOpen && replies.map((child) => (
            <CommentNode
              key={child.id}
              comment={child}
              childrenMap={childrenMap}
              depth={depth + 1}
              maxDepth={maxDepth}
              manageMode={manageMode}
              canComment={canComment}
              isPending={isPending}
              tags={tags}
              callbacks={callbacks}
            />
          ))}
        </div>
      )}
    </div>
  );
}
