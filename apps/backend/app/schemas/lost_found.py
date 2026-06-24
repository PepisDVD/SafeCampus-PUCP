from datetime import datetime, time
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.core.constants import EstadoCasoLF, EstadoCustodia, EstadoMatchLF, MotivoCierreLF, TipoCasoLF
from app.schemas.incidente import UsuarioMini, ZonaCount


class MotivoCierreLfItem(BaseModel):
    id: str
    codigo: str
    nombre: str
    descripcion: str | None = None
    clase_cierre: str
    requiere_observacion: bool = False
    requiere_validacion_entrega: bool = False
    activo: bool = True
    orden_visual: int = 0
    codigo_bloqueado: bool = False


class MotivoCierreLfCreate(BaseModel):
    codigo: str = Field(min_length=2, max_length=80, pattern=r"^[A-Z][A-Z0-9_]*$")
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str | None = Field(default=None, max_length=1000)
    clase_cierre: str = Field(pattern=r"^(DEVOLUCION|DESCARTE|ADMINISTRATIVO)$")
    requiere_observacion: bool = False
    requiere_validacion_entrega: bool = False
    activo: bool = True
    orden_visual: int = Field(default=0, ge=0, le=9999)

    @field_validator("nombre")
    @classmethod
    def _nombre_no_vacio(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return value

    @field_validator("descripcion")
    @classmethod
    def _normalizar_descripcion(cls, value: str | None) -> str | None:
        value = value.strip() if value else None
        return value or None

    @model_validator(mode="after")
    def _validacion_entrega_solo_devolucion(self) -> "MotivoCierreLfCreate":
        if self.requiere_validacion_entrega and self.clase_cierre != "DEVOLUCION":
            raise ValueError("La validacion de entrega solo aplica a motivos de devolucion.")
        return self


class CategoriaLfItem(BaseModel):
    id: str
    codigo: str
    nombre: str
    descripcion: str | None = None
    icono: str | None = None
    activa: bool = True
    es_perecible: bool = False
    orden_visual: int = 0
    metadatos_schema: dict[str, Any] | None = None


class CategoriaLfCreate(BaseModel):
    codigo: str | None = Field(default=None, max_length=60)
    nombre: str = Field(min_length=2, max_length=100)
    descripcion: str | None = Field(default=None, max_length=1000)
    icono: str | None = Field(default=None, max_length=50)
    activa: bool = True
    es_perecible: bool = False
    orden_visual: int = Field(default=0, ge=0)
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
    metadatos: dict[str, Any] = Field(default_factory=dict)
    contacto_info: str | None = Field(default=None, max_length=255)
    latitud: float | None = None
    longitud: float | None = None


class CasoLfUpdateInput(BaseModel):
    """Edición de datos descriptivos de un caso (no cambia tipo ni estado)."""
    titulo: str = Field(min_length=3, max_length=200)
    descripcion: str = Field(min_length=10, max_length=4000)
    categoria_id: str
    subcategoria: str | None = Field(default=None, max_length=100)
    lugar_referencia: str = Field(min_length=3, max_length=255)
    fecha_evento: datetime
    hora_aproximada: time | None = None
    color_principal: str | None = Field(default=None, max_length=50)
    marca: str | None = Field(default=None, max_length=100)
    etiquetas: list[str] = Field(default_factory=list, max_length=10)
    metadatos: dict[str, Any] = Field(default_factory=dict)
    contacto_info: str | None = Field(default=None, max_length=255)
    latitud: float | None = None
    longitud: float | None = None


class CasoCierreInput(BaseModel):
    """Cierre/reapertura administrativa de un hilo."""
    cerrar: bool


class CasoVisibilidadInput(BaseModel):
    """Ocultar/mostrar un hilo para la comunidad."""
    oculto: bool


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
    metadatos: dict[str, Any] = {}
    oculto: bool = False
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
    motivo_cierre_id: str | None = None
    motivo_cierre_id: str | None = None
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


class MatchingConfigItem(BaseModel):
    umbral: float = Field(ge=0, le=1)
    version: int = 1


class MatchingConfigUpdateInput(BaseModel):
    umbral: float = Field(ge=0, le=1, description="Umbral de sugerencia entre 0.00 y 1.00.")


class CustodiaPoliticaItem(BaseModel):
    dias_maximos_custodia: int
    dias_alerta_vencimiento: int
    dias_recordatorio_previo: int
    horas_maximas_perecibles: int
    horas_alerta_perecible: int
    version: int = 1


POLITICA_CUSTODIA_LIMITS = {
    "dias_maximos_custodia": (1, 365),
    "dias_alerta_vencimiento": (0, 90),
    "dias_recordatorio_previo": (0, 90),
    "horas_maximas_perecibles": (1, 168),
    "horas_alerta_perecible": (0, 72),
}


class CustodiaPoliticaUpdateInput(BaseModel):
    dias_maximos_custodia: int = Field(
        ge=POLITICA_CUSTODIA_LIMITS["dias_maximos_custodia"][0],
        le=POLITICA_CUSTODIA_LIMITS["dias_maximos_custodia"][1],
    )
    dias_alerta_vencimiento: int = Field(
        ge=POLITICA_CUSTODIA_LIMITS["dias_alerta_vencimiento"][0],
        le=POLITICA_CUSTODIA_LIMITS["dias_alerta_vencimiento"][1],
    )
    dias_recordatorio_previo: int = Field(
        ge=POLITICA_CUSTODIA_LIMITS["dias_recordatorio_previo"][0],
        le=POLITICA_CUSTODIA_LIMITS["dias_recordatorio_previo"][1],
    )
    horas_maximas_perecibles: int = Field(
        ge=POLITICA_CUSTODIA_LIMITS["horas_maximas_perecibles"][0],
        le=POLITICA_CUSTODIA_LIMITS["horas_maximas_perecibles"][1],
    )
    horas_alerta_perecible: int = Field(
        ge=POLITICA_CUSTODIA_LIMITS["horas_alerta_perecible"][0],
        le=POLITICA_CUSTODIA_LIMITS["horas_alerta_perecible"][1],
    )

    @model_validator(mode="after")
    def _coherencia(self) -> "CustodiaPoliticaUpdateInput":
        if self.dias_alerta_vencimiento >= self.dias_maximos_custodia:
            raise ValueError("Los días para marcar 'Por vencer' deben ser menores a los días máximos de custodia.")
        if self.dias_recordatorio_previo >= self.dias_maximos_custodia:
            raise ValueError("Los días previos de recordatorio deben ser menores a los días máximos de custodia.")
        if self.horas_alerta_perecible >= self.horas_maximas_perecibles:
            raise ValueError("Las horas de alerta de perecibles deben ser menores a las horas máximas de custodia.")
        return self


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
