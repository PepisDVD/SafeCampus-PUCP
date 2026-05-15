"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Textarea,
} from "@safecampus/ui-kit";
import { Archive, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { lostFoundClient } from "../client";
import { estadoLabel, estadoLfTone, tipoLabel } from "../presentation";
import type { CasoLfDetail } from "../types";

export function LostFoundThreadDetail({ initialCase }: { initialCase: CasoLfDetail }) {
  const [caso, setCaso] = useState(initialCase);
  const [comment, setComment] = useState("");
  const [operativo, setOperativo] = useState("");
  const [custodia, setCustodia] = useState("");
  const [isPending, startTransition] = useTransition();

  const reload = async () => setCaso(await lostFoundClient.detalle(caso.id));

  const sendComment = () => {
    if (!comment.trim()) return;
    startTransition(async () => {
      await lostFoundClient.comentar(caso.id, comment.trim());
      await reload();
      setComment("");
    });
  };

  const moderateComment = (id: string, visible: boolean) => {
    startTransition(async () => {
      await lostFoundClient.moderarComentario(id, visible, visible ? "Restaurado por supervision" : "Ocultado por moderacion");
      await reload();
      toast.success(visible ? "Comentario restaurado" : "Comentario ocultado");
    });
  };

  const changeState = (estado: string) => {
    startTransition(async () => {
      await lostFoundClient.cambiarEstado(caso.id, estado, operativo || undefined);
      await reload();
      toast.success("Estado actualizado");
    });
  };

  const createCustody = () => {
    if (!custodia.trim()) return;
    startTransition(async () => {
      await lostFoundClient.registrarCustodia(caso.id, {
        ubicacion_custodia: custodia.trim(),
        observaciones: operativo || undefined,
      });
      await reload();
      setCustodia("");
      toast.success("Custodia registrada");
    });
  };

  return (
    <div className="space-y-5 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">{caso.titulo}</h1>
        <p className="text-sm text-slate-500">{caso.codigo} · {caso.lugar_referencia}</p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader><CardTitle>Publicacion</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {caso.foto_url && <img src={caso.foto_url} alt="" className="aspect-video w-full rounded-lg object-cover" />}
            {caso.foto_adicional_urls.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {caso.foto_adicional_urls.map((url) => (
                  <img key={url} src={url} alt="" className="aspect-video w-full rounded-lg object-cover" />
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={estadoLfTone[caso.estado]}>{estadoLabel(caso.estado)}</Badge>
              <Badge variant="secondary">{tipoLabel(caso.tipo)}</Badge>
              {caso.categoria_nombre && <Badge variant="outline">{caso.categoria_nombre}</Badge>}
            </div>
            <p className="text-sm text-slate-700">{caso.descripcion}</p>
            <p className="text-sm text-slate-500">Reportante: {caso.reportante?.nombre_completo ?? "Usuario"}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Gestion operativa</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Textarea value={operativo} onChange={(e) => setOperativo(e.target.value)} placeholder="Nota operativa" />
            <Select onValueChange={changeState}>
              <SelectTrigger><SelectValue placeholder="Cambiar estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="EN_REVISION">En revision</SelectItem>
                <SelectItem value="CONFIRMADO">Confirmado</SelectItem>
                <SelectItem value="CERRADO">Cerrar</SelectItem>
              </SelectContent>
            </Select>
            <Input value={custodia} onChange={(e) => setCustodia(e.target.value)} placeholder="Ubicacion de custodia" />
            <Button className="w-full" onClick={createCustody} disabled={isPending}>
              <Archive className="mr-2 h-4 w-4" />
              Registrar custodia
            </Button>

            <aside className="rounded-lg border bg-slate-50 p-4">
              <p className="text-sm font-semibold text-slate-950">Resumen del hilo</p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Comentarios</dt><dd className="font-medium">{caso.comentarios.length}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Estado</dt><dd className="font-medium">{estadoLabel(caso.estado)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Tipo</dt><dd className="font-medium">{tipoLabel(caso.tipo)}</dd></div>
                <div className="flex justify-between gap-3"><dt className="text-slate-500">Lugar</dt><dd className="text-right font-medium">{caso.lugar_referencia}</dd></div>
              </dl>
            </aside>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5" />Hilo de conversacion</CardTitle></CardHeader>
        <CardContent>
          <div className="mx-auto max-w-3xl space-y-3">
            <div className="flex gap-2">
              <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Responder en el hilo" />
              <Button onClick={sendComment} disabled={isPending}>Enviar</Button>
            </div>

            {caso.comentarios.map((item) => (
              <div key={item.id} className="flex gap-3 rounded-lg border bg-white p-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={item.autor?.avatar_url ?? undefined} />
                  <AvatarFallback>{initials(item.autor?.nombre_completo)}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium">{item.autor?.nombre_completo ?? "Usuario"}</p>
                    <span className="text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</span>
                    <Badge variant={item.visible ? "secondary" : "outline"} className="ml-auto">{item.visible ? "Visible" : "Oculto"}</Badge>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-slate-700">{item.contenido}</p>
                  <div className="mt-3">
                    <Button size="sm" variant="outline" onClick={() => moderateComment(item.id, !item.visible)}>
                      {item.visible ? "Ocultar" : "Restaurar"}
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            {caso.comentarios.length === 0 && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-slate-500">Este hilo aun no tiene comentarios.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function initials(name?: string | null) {
  return (name ?? "U").split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}
