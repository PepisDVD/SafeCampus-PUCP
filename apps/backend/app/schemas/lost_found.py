from datetime import datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.core.constants import EstadoCasoLF, EstadoCustodia, EstadoMatchLF, MotivoCierreLF, TipoCasoLF
from app.schemas.incidente import UsuarioMini, ZonaCount


class CategoriaLfItem(BaseModel):
    id: str
    nombre: str
    descripcion: str | None = None
    icono: str | None = None
    activa: bool = True
    es_perecible: bool = False
    metadatos_schema: dict[str, Any] | None = None


class CategoriaLfCreate(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=1000)
    icono: str | None = Field(default=None, max_length=50)
    activa: bool = True
    es_perecible: bool = False
    metadatos_schema: dict[str, Any] | None = None


class CasoLfCreateInput(BaseModel):
    tipo: TipoCasoLF
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10, max_length=4000)
    categoria_id: str
    subcategoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str = Field(min_length=3, max_length=255)
    fecha_evento: datetime
    hora_aproximada: time | None = None
    foto_url: str | None = Field(default=None, max_length=1000)
    foto_adicional_urls: list[str] = Field(default_factory=list, max_length=3)
    color_principal: str | None = Field(default=None, max_length=50)
    marca: str | None = Field(default=None, max_length=100)
    etiquetas: list[str] = Field(default_factory=list, max_length=10)
    contacto_info: str | None = Field(default=None, max_length=255)
    latitud: float | None = None
    longitud: float | None = None


class CasoLfCreated(BaseModel):
    id: str
    codigo: str
    estado: EstadoCasoLF
    created_at: datetime
    matches_generados: int = 0


class CasoLfListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    codigo: str
    tipo: TipoCasoLF
    estado: EstadoCasoLF
    titulo: str
    descripcion: str
    categoria_id: str | None = None
    categoria_nombre: str | None = None
    subcategoria: str | None = None
    lugar_referencia: str | None = None
    fecha_evento: datetime | None = None
    foto_url: str | None = None
    color_principal: str | None = None
    marca: str | None = None
    conteo_comentarios: int = 0
    ultimo_comentario: str | None = None
    ultimo_comentario_at: datetime | None = None
    reportante: UsuarioMini | None = None
    created_at: datetime


class CasoLfListResponse(BaseModel):
    items: list[CasoLfListItem]
    total: int
    next_cursor: datetime | None = None


class HistorialLfItem(BaseModel):
    id: str
    estado_anterior: EstadoCasoLF | None = None
    estado_nuevo: EstadoCasoLF
    accion: str
    comentario: str | None = None
    ejecutado_por: UsuarioMini | None = None
    created_at: datetime


class ComentarioLfItem(BaseModel):
    id: str
    caso_id: str
    parent_id: str | None = None
    autor: UsuarioMini | None = None
    contenido: str
    visible: bool
    motivo_ocultamiento: str | None = None
    puede_eliminar: bool = False
    created_at: datetime
    updated_at: datetime


class ComentarioLfCreateInput(BaseModel):
    contenido: str = Field(min_length=2, max_length=2000)
    parent_id: str | None = None


class CasoLfDetail(CasoLfListItem):
    reportante: UsuarioMini | None = None
    contacto_info: str | None = None
    foto_adicional_urls: list[str] = []
    etiquetas: list[str] = []
    motivo_cierre: MotivoCierreLF | None = None
    observaciones_cierre: str | None = None
    latitud: float | None = None
    longitud: float | None = None
    updated_at: datetime
    historial: list[HistorialLfItem] = []
    comentarios: list[ComentarioLfItem] = []


class MatchLfItem(BaseModel):
    id: str
    caso_perdido_id: str
    caso_encontrado_id: str
    score_total: float
    score_detalle: dict[str, Any]
    estado: EstadoMatchLF
    caso_contraparte: CasoLfListItem | None = None
    created_at: datetime


class MatchLfResponderInput(BaseModel):
    confirmar: bool
    comentario: str | None = Field(default=None, max_length=1000)


class CasoLfEstadoUpdate(BaseModel):
    estado: EstadoCasoLF
    comentario: str | None = Field(default=None, max_length=2000)
    motivo_cierre: MotivoCierreLF | None = None
    observaciones_cierre: str | None = Field(default=None, max_length=2000)


class CasoLfFotosInput(BaseModel):
    foto_url: str | None = Field(default=None, max_length=1000)
    foto_adicional_urls: list[str] = Field(default_factory=list, max_length=3)


class CancelarCasoLfInput(BaseModel):
    observaciones: str | None = Field(default=None, max_length=1000)


class CustodiaLfCreateInput(BaseModel):
    ubicacion_custodia: str = Field(min_length=2, max_length=255)
    observaciones: str | None = Field(default=None, max_length=2000)
    es_perecible: bool | None = None


class CustodiaLfUpdateInput(BaseModel):
    ubicacion_custodia: str | None = Field(default=None, max_length=255)
    observaciones: str | None = Field(default=None, max_length=2000)


class CustodiaLfItem(BaseModel):
    id: str
    caso_id: str
    codigo: str | None = None
    titulo: str | None = None
    estado: EstadoCustodia
    ubicacion_custodia: str
    observaciones: str | None = None
    es_perecible: bool
    fecha_recepcion: datetime
    fecha_vencimiento: datetime
    reclamante_id: str | None = None
    metodo_verificacion: str | None = None
    created_at: datetime
    updated_at: datetime


class CustodiaLfListResponse(BaseModel):
    items: list[CustodiaLfItem]
    total: int
    page: int
    per_page: int


class DevolucionLfInput(BaseModel):
    reclamante_id: str
    metodo_verificacion: str = Field(min_length=2, max_length=100)
    observaciones: str | None = Field(default=None, max_length=2000)


class DescarteLfInput(BaseModel):
    motivo: str = Field(min_length=3, max_length=1000)
    destino_descarte: str | None = Field(default=None, max_length=150)
    observaciones: str | None = Field(default=None, max_length=2000)


class ComentarioVisibilidadInput(BaseModel):
    visible: bool
    motivo: str | None = Field(default=None, max_length=1000)


class ParticipacionLfInput(BaseModel):
    suscrito: bool
    marcar_leido: bool = False


class ConfiguracionLfItem(BaseModel):
    key: str
    value: dict[str, Any]
    descripcion: str | None = None
    updated_at: datetime


class ConfiguracionLfUpdateInput(BaseModel):
    value: dict[str, Any]
    descripcion: str | None = Field(default=None, max_length=1000)


class KpisLfResponse(BaseModel):
    total_casos: int
    abiertos: int
    en_custodia: int
    cerrados: int
    tasa_recuperacion: float
    matches_sugeridos: int
    matches_confirmados: int
    custodias_por_vencer: int
    por_zona: list[ZonaCount] = []
