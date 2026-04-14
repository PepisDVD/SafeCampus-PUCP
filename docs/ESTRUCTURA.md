<!-- 📁 docs/ESTRUCTURA.md -->
<!-- 🎯 Documentación del mapeo entre la arquitectura C4 y la estructura de carpetas del código. -->

# Estructura del Proyecto SafeCampus PUCP

## Mapeo Arquitectura C4 → Código

### Contenedores (C2)

| Contenedor C4 | Carpeta | Tech |
|---|---|---|
| API Backend SafeCampus | `apps/backend/` | Python + FastAPI |
| Frontend Comunidad (PWA) | `apps/web/` → `(comunidad)/` | Next.js |
| Frontend Web Operativo | `apps/web/` → `(operativo)/` + `(admin)/` | Next.js |
| Frontend Operador | `apps/mobile/` | React Native + Expo |
| Base de Datos Operacional | `infra/db/` + `alembic/` | PostgreSQL + PostGIS |

### Componentes del Backend (C3)

| Componente C3 | Archivo |
|---|---|
| Capa de API | `app/api/v1/*.py` |
| Recepción Omnicanal | `app/services/recepcion_omnicanal_service.py` |
| Gestión de Incidentes | `app/services/incidente_service.py` |
| Flujo de Casos | `app/services/flujo_casos_service.py` |
| Orquestador de Clasificación | `app/services/clasificacion_service.py` |
| Fábrica de Prompts | `app/llm/fabrica_prompts.py` |
| Normalizador LLM | `app/llm/normalizador.py` |
| Motor de Reglas | `app/llm/motor_reglas.py` |
| Lost & Found | `app/services/lost_found_service.py` |
| Acompañamiento Seguro | `app/services/acompanamiento_service.py` |
| Dashboard y Consultas | `app/services/dashboard_service.py` |
| Gestión Usuarios | `app/services/usuario_service.py` |
| Auditoría | `app/services/auditoria_service.py` |
| Notificaciones | `app/services/notificacion_service.py` |

### Modelo de Datos (9 esquemas, 29 tablas)

| Esquema PostgreSQL | Modelo | Tablas |
|---|---|---|
| `sc_users` | `models/sc_users.py` | usuario, rol, permiso, usuario_rol, rol_permiso, dispositivo_usuario, sesion |
| `sc_omnicanal` | `models/sc_omnicanal.py` | canal_reporte, reporte_entrante |
| `sc_incidentes` | `models/sc_incidentes.py` | incidente, historial_incidente, evidencia, comentario_incidente, ubicacion_incidente, asignacion_recurso |
| `sc_clasificacion` | `models/sc_clasificacion.py` | clasificacion_incidente |
| `sc_notificaciones` | `models/sc_notificaciones.py` | notificacion |
| `sc_kpi` | `models/sc_kpi.py` | kpi_operativo |
| `sc_lost_found` | `models/sc_lost_found.py` | caso_lost_found, categoria_objeto, historial_caso_lf |
| `sc_acompanamiento` | `models/sc_acompanamiento.py` | acompanamiento_seguro, ubicacion_trayecto, alerta_acompanamiento, evento_acompanamiento |
| `sc_auditoria` | `models/sc_auditoria.py` | registro_auditoria |

### Convenciones de Nomenclatura

| Elemento | Convención | Ejemplo |
|---|---|---|
| Tablas BD | snake_case singular | `incidente`, `reporte_entrante` |
| Columnas BD | snake_case descriptivo | `fecha_creacion`, `operador_asignado_id` |
| Claves primarias | `id` (UUID v4) | `id` |
| Claves foráneas | `<entidad>_id` | `usuario_id`, `incidente_id` |
| ENUMs BD | snake_case | `estado_incidente`, `nivel_severidad` |
| Valores ENUM | UPPER_SNAKE_CASE | `EN_EVALUACION`, `CRITICO` |
| Esquemas BD | prefijo `sc_` | `sc_incidentes`, `sc_users` |
| Componentes React | PascalCase | `IncidentCard`, `SeverityBadge` |
| Hooks React | prefijo `use` camelCase | `useIncidentes`, `useAuth` |
| Funciones Python | snake_case | `crear_incidente`, `get_by_id` |
| Clases Python | PascalCase | `IncidenteService`, `IncidenteCreate` |
| Endpoints API | sustantivos plural | `/api/v1/incidentes`, `/api/v1/usuarios` |
| Schemas Pydantic | PascalCase + sufijo | `IncidenteCreate`, `IncidenteResponse` |
