# README – Levantamiento RBAC de SafeCampus PUCP

## 1. Propósito del documento
Este documento presenta un levantamiento funcional-tecnico orientado a RBAC (Role-Based Access Control) para SafeCampus PUCP, construido a partir de la evidencia disponible en el frontend y en documentos funcionales incluidos en el repositorio.

Su objetivo es servir como insumo base para construir la matriz de permisos del sistema, diferenciando de forma explicita:
- permisos observados directamente en interfaces,
- permisos inferidos razonablemente por navegacion y flujo de pantallas,
- permisos sustentados por documento funcional.

Este levantamiento no modela logica de backend ni enforcement real de seguridad; se limita a lo verificable con la evidencia disponible.

## 2. Fuentes analizadas
Se revisaron las siguientes fuentes:

- Frontend visual (React + rutas por layout):
  - `src/app/routes.ts`
  - `src/app/pages/Login.tsx`
  - `src/app/pages/pwa/*`
  - `src/app/pages/operador/*`
  - `src/app/pages/web/*`
- Layouts y navegacion por rol/aplicacion:
  - `src/app/pages/pwa/PWALayout.tsx`
  - `src/app/pages/operador/OperadorLayout.tsx`
  - `src/app/pages/web/WebLayout.tsx`
- Pantallas y acciones operativas:
  - PWA comunidad: `PWAHome`, `PWAReportar`, `PWAMisCasos`, `PWALostFound`, `PWAAcompanamiento`, `PWAPerfil`
  - Operador movil: `OperadorDashboard`, `OperadorIncidentes`, `OperadorMapa`, `OperadorPerfil`
  - Web operativa/administrativa: `WebDashboard`, `WebCasos`, `WebKPIs`, `WebWhatsApp`, `WebAdmin`
- Componentes de datos mock (evidencia de estados, historiales, auditoria, integraciones, chats):
  - `src/app/data/mockData.ts`
- Documentos funcionales encontrados:
  - `src/imports/pasted_text/gestion-usuarios-seguridad.md` (casos de uso funcionales)
  - `README.md` (arquitectura de interfaces por ruta)
  - `README_GUI_STANDARDS.md` (estandar GUI, contexto de separacion de interfaces)

## 3. Roles base identificados
| Rol base | Proposito dentro del sistema | Evidencia encontrada | Comentarios |
|---|---|---|---|
| Usuario de la comunidad | Reportar incidentes, consultar estado de casos, usar Lost & Found y Acompanamiento Seguro | `src/app/pages/Login.tsx` (perfil estudiante/docente/personal -> `/pwa`), `src/app/routes.ts` (rutas `/pwa/*`), pantallas `src/app/pages/pwa/*` | Observado en UI. Control de permiso real no verificable por ausencia de backend.
| Operador de seguridad | Atencion tactica de incidentes, gestion operativa, mapa, actualizaciones de caso | `src/app/pages/Login.tsx` (perfil operador -> `/operador`), `src/app/routes.ts` (`/operador/*`), `src/app/pages/operador/*` | Observado en UI. Incluye acciones criticas visibles: escalar, asignar, marcar resuelto, notas.
| Supervisor de seguridad | Supervisar operaciones, consultar casos, ver dashboard y KPIs, intervenir en canales operativos | `src/app/pages/Login.tsx` (perfil supervisor -> `/web`), `src/app/pages/web/WebLayout.tsx`, `WebDashboard.tsx`, `WebCasos.tsx`, `WebKPIs.tsx`, `WebWhatsApp.tsx` | Observado en UI para capacidades operativas y analiticas. Aprobacion formal de cierres: inferida/documental.
| Administrador del sistema | Gestionar usuarios, roles/permisos, integraciones y auditoria | `src/app/pages/Login.tsx` (perfil admin -> `/web/admin`), `src/app/pages/web/WebAdmin.tsx` (tabs Usuarios, Roles y Permisos, Integraciones, Auditoria) | Observado en UI. Matriz de permisos en `WebAdmin.tsx` es evidencia de intencion RBAC en frontend.

## 4. Módulos funcionales identificados
| Modulo | Descripcion funcional RBAC | Evidencia en frontend/documento | Roles que aparentemente interactuan |
|---|---|---|---|
| Autenticacion y perfil | Inicio de sesion institucional y acceso por perfil; consulta de datos de cuenta | `Login.tsx`, `routes.ts`, `PWAPerfil.tsx`, `OperadorPerfil.tsx`, `WebLayout.tsx`; documento: `gestion-usuarios-seguridad.md` 3.1.1.1 y 3.1.1.3 | Comunidad, Operador, Supervisor, Admin |
| Gestion de incidentes y expediente unico | Registro, seguimiento, historial, asignacion, escalamiento, resolucion y cierre | `PWAReportar.tsx`, `PWAMisCasos.tsx`, `OperadorIncidentes.tsx`, `WebCasos.tsx`, `mockData.ts`; documento 3.1.2.* | Comunidad, Operador, Supervisor, Admin |
| Dashboard georreferenciado operativo | Visualizacion de incidentes en mapa, feed operativo, filtros y estado | `OperadorMapa.tsx`, `OperadorDashboard.tsx`, `WebDashboard.tsx`; documento 3.1.3.1 | Operador, Supervisor (Admin con acceso de supervision global en UI web) |
| KPIs y reportes | Consulta de indicadores (FRT/TMR/volumen/SLA) y exportacion | `WebKPIs.tsx`, `mockData.ts` (`kpiCards`, `incidentsBy*`); documento 3.1.3.2 y 3.1.3.3 | Supervisor, Admin |
| Alertas y notificaciones | Notificaciones de incidentes/estado y alertas de campus/emergencia | `PWAHome.tsx` (alerta campus, notificaciones), `PWAPerfil.tsx`, `PWAAcompanamiento.tsx`, `OperadorDashboard.tsx`; documento 3.1.2.6 y 3.1.4.5 | Comunidad, Operador, Supervisor (Admin: consulta/monitor tecnico inferido) |
| Lost & Found | Registro de objeto perdido/encontrado, busqueda y filtros por categoria/estado | `PWALostFound.tsx`, `mockData.ts` (`mockLostFound`); documento 3.1.4.1 a 3.1.4.3 | Comunidad; Operador/Admin para cierre (documental), Supervisor como consulta (inferido) |
| Acompanamiento seguro | Inicio de trayecto, monitoreo temporal, SOS, alerta automatica por vencimiento | `PWAAcompanamiento.tsx`; documento 3.1.4.4 y 3.1.4.5 | Comunidad (uso principal), Operador/Supervisor para atencion de alerta (inferido + documental) |
| Integraciones / WhatsApp | Atencion omnicanal: bot, toma de control humano, asignacion/reasignacion, cierre de chat | `WebWhatsApp.tsx`, `mockData.ts` (`whatsappChats`), `WebAdmin.tsx` (tab Integraciones); documento 3.1.2.1 y 3.1.3.4 | Operador, Supervisor, Admin |
| Gestion de usuarios y seguridad | Alta/edicion/consulta de usuarios, asignacion de rol, matriz de permisos | `WebAdmin.tsx` (tabs Usuarios y Roles y Permisos), `mockData.ts` (`mockUsers`, `permissionsMatrix`); documento 3.1.1.2 y 3.1.1.4 | Admin (principal), Supervisor (consulta de auditoria) |
| Auditoria | Consulta de trazas de acciones criticas y cambios de configuracion | `WebAdmin.tsx` (tab Auditoria), `mockData.ts` (`auditLog`); documento 3.1.1.2, 3.1.3.4 | Admin (principal), Supervisor (consulta) |

## 5. Inventario de acciones visibles o inferibles por módulo
| Modulo | Accion | Evidencia del frontend | Tipo de evidencia | Observacion |
|---|---|---|---|---|
| Autenticacion y perfil | Seleccionar rol de acceso | `Login.tsx` (tarjetas de rol con `path`) | Observada | Enrutamiento visual por rol; no hay validacion de credenciales real.
| Autenticacion y perfil | Iniciar sesion institucional | `Login.tsx` boton "Iniciar sesion con PUCP SSO" | Observada | El flujo es mock (navegacion por `navigate`), sin backend.
| Autenticacion y perfil | Cerrar sesion | `PWAPerfil.tsx`, `OperadorPerfil.tsx`, `WebLayout.tsx` | Observada | Retorna a `/`.
| Gestion de incidentes y expediente unico | Registrar incidente | `PWAReportar.tsx` (wizard tipo-detalle-ubicacion) | Observada | Incluye severidad, evidencia opcional, ubicacion y envio.
| Gestion de incidentes y expediente unico | Consultar historial de incidente | `PWAMisCasos.tsx`, `OperadorIncidentes.tsx`, `WebCasos.tsx` | Observada | Historial en timeline y detalle.
| Gestion de incidentes y expediente unico | Asignar caso | `OperadorIncidentes.tsx` boton "Asignar" | Observada | No se observa validacion de politica de asignacion.
| Gestion de incidentes y expediente unico | Escalar caso | `OperadorIncidentes.tsx` y `WebCasos.tsx` boton "Escalar" | Observada | Requiere definicion de reglas de escalamiento en backend.
| Gestion de incidentes y expediente unico | Marcar resuelto / cerrar caso | `OperadorIncidentes.tsx` ("Marcar como resuelto"), `WebCasos.tsx` ("Cerrar caso") | Observada | Diferencia resuelto/cerrado existe en estados mock.
| Gestion de incidentes y expediente unico | Registrar nota / comentario | `OperadorIncidentes.tsx` ("Agregar nota"), `WebCasos.tsx` ("Agregar comentario") | Observada | Persistencia no verificable sin API.
| Gestion de incidentes y expediente unico | Reasignar / transferir atencion | `WebWhatsApp.tsx` (Asignar/Reasignar/Tomar control), `OperadorIncidentes.tsx` (Asignar) | Inferida | Transferencia de conversacion y/o caso sugerida por UI.
| Dashboard georreferenciado y operativo | Visualizar mapa de incidentes | `OperadorMapa.tsx`, `WebDashboard.tsx` | Observada | Capas y marcadores por severidad.
| Dashboard georreferenciado y operativo | Filtrar por severidad/estado | `OperadorMapa.tsx`, `WebCasos.tsx`, `WebDashboard.tsx` | Observada | Filtros UI funcionales con datos mock.
| Dashboard georreferenciado y operativo | Consultar detalle desde tablero | `WebDashboard.tsx` (feed/tabla), `OperadorMapa.tsx` (seleccion de marcador) | Observada | Flujo de drill-down visible.
| KPIs y reportes | Ver KPIs operativos | `WebKPIs.tsx` | Observada | Tarjetas y graficos (FRT, TMR, SLA, volumen).
| KPIs y reportes | Exportar reporte CSV/PDF | `WebKPIs.tsx` botones Exportar | Observada | Generacion real de archivo no verificable.
| Alertas y notificaciones | Ver notificaciones de casos | `PWAPerfil.tsx` (lista de notificaciones), `PWAHome.tsx` (contador) | Observada | Sin configuracion de canal real.
| Alertas y notificaciones | Emitir alerta SOS | `PWAHome.tsx`, `PWAAcompanamiento.tsx`, `OperadorDashboard.tsx` | Observada | Existe boton SOS y modal de emergencia.
| Lost & Found | Registrar objeto perdido/encontrado | `PWALostFound.tsx` (formulario con tipo/categoria/fecha/foto) | Observada | Cierre de caso no aparece como accion explicita en esta vista.
| Lost & Found | Buscar/filtrar objetos | `PWALostFound.tsx` (busqueda + filtros tipo/categoria) | Observada | Incluye estado activo/cerrado en tarjetas.
| Lost & Found | Cerrar caso de objeto | Documento `gestion-usuarios-seguridad.md` 3.1.4.3 | Sustentada por documento | No hay boton de cierre visible en frontend revisado.
| Acompanamiento seguro | Iniciar acompanamiento | `PWAAcompanamiento.tsx` (configurar destino/duracion e iniciar) | Observada | Requiere permisos de ubicacion (mensaje UI).
| Acompanamiento seguro | Finalizar trayecto | `PWAAcompanamiento.tsx` ("Llegue segura") | Observada | Cancela monitoreo.
| Acompanamiento seguro | Alerta automatica por vencimiento | `PWAAcompanamiento.tsx` estado `alerta` por timeout | Observada | Simulada en frontend.
| Integraciones / WhatsApp | Tomar control humano de chat | `WebWhatsApp.tsx` (accion "Tomar control") | Observada | Permite transicion bot -> agente.
| Integraciones / WhatsApp | Asignar/Reasignar conversacion | `WebWhatsApp.tsx` (modal de asignacion) | Observada | Equivale a transferir atencion operativa.
| Integraciones / WhatsApp | Cerrar conversacion | `WebWhatsApp.tsx` (accion "Cerrar chat") | Observada | Marca estado `cerrado`.
| Integraciones / WhatsApp | Escalar prioridad de chat | `WebWhatsApp.tsx` (cambio de prioridad y "Marcar prioridad alta") | Observada | Sin reglas de aprobacion visibles.
| Gestion de usuarios y seguridad | Crear usuario | `WebAdmin.tsx` ("Nuevo usuario" + formulario) | Observada | Persistencia real no verificable.
| Gestion de usuarios y seguridad | Editar usuario | `WebAdmin.tsx` (icono editar por fila) | Observada | Flujo completo de edicion no desplegado.
| Gestion de usuarios y seguridad | Gestionar roles y permisos | `WebAdmin.tsx` tab "Roles y Permisos" | Observada + sustentada por documento | Matriz UI visible; enforcement no verificable.
| Auditoria | Consultar auditoria de acciones | `WebAdmin.tsx` tab "Auditoria" + `mockData.ts` (`auditLog`) | Observada | Exportacion/descarga de auditoria no visible.

## 6. Matriz preliminar RBAC
| Modulo | Accion | Usuario de la comunidad | Operador de seguridad | Supervisor de seguridad | Administrador del sistema | Nivel de certeza | Evidencia / comentario |
|---|---|---|---|---|---|---|---|
| Autenticacion y perfil | Iniciar sesion | Si | Si | Si | Si | Alta | `Login.tsx` con perfiles y rutas.
| Autenticacion y perfil | Seleccionar perfil/rol de acceso | Si | Si | Si | Si | Alta | `Login.tsx` tarjetas por rol.
| Autenticacion y perfil | Ver perfil propio | Si | Si | Parcial | Parcial | Media | `PWAPerfil.tsx` y `OperadorPerfil.tsx`; en web se infiere por avatar/layout.
| Gestion de incidentes | Registrar incidente | Si | Si | Parcial | Parcial | Media | `PWAReportar.tsx`; en roles internos se infiere por botones/flujo.
| Gestion de incidentes | Consultar estado e historial | Si | Si | Si | Parcial | Alta | `PWAMisCasos.tsx`, `OperadorIncidentes.tsx`, `WebCasos.tsx`.
| Gestion de incidentes | Asignar/reasignar incidente | No verificable | Si | Si | Parcial | Media | Asignar en operador; supervisor/admin inferidos por web y docs.
| Gestion de incidentes | Escalar incidente | No | Si | Si | Parcial | Alta | Botones "Escalar" en operador/web.
| Gestion de incidentes | Registrar nota/comentario | Parcial | Si | Si | Parcial | Alta | Nota/comentario en `OperadorIncidentes.tsx` y `WebCasos.tsx`.
| Gestion de incidentes | Marcar resuelto/cerrar | No | Si | Si | Parcial | Alta | "Marcar como resuelto" y "Cerrar caso" observados.
| Dashboard georreferenciado | Ver mapa de incidentes | No | Si | Si | Parcial | Alta | `OperadorMapa.tsx`, `WebDashboard.tsx`.
| Dashboard georreferenciado | Filtrar panel/casos | Parcial | Si | Si | Si | Alta | Filtros visibles en operador y web.
| KPIs y reportes | Consultar KPIs | No | No | Si | Si | Alta | `WebKPIs.tsx` y matriz en `WebAdmin.tsx`.
| KPIs y reportes | Exportar reporte | No | No | Si | Si | Alta | Botones CSV/PDF en `WebKPIs.tsx`.
| Alertas y notificaciones | Ver notificaciones | Si | Parcial | Parcial | Parcial | Media | PWA observado; en otros roles es inferido.
| Alertas y notificaciones | Emitir alerta SOS/emergencia | Si | Si | Parcial | No verificable | Media | `PWAAcompanamiento.tsx`, `OperadorDashboard.tsx`.
| Lost & Found | Registrar objeto perdido/encontrado | Si | Parcial | Parcial | Parcial | Alta | `PWALostFound.tsx`; cierre operativo en documento.
| Lost & Found | Buscar objetos | Si | Si | Si | Si | Media | UI en PWA; para otros roles inferido por rol operativo.
| Lost & Found | Cerrar caso | No verificable | Parcial | Parcial | Si | Baja | Documento 3.1.4.3; no accion visible en vistas revisadas.
| Acompanamiento seguro | Iniciar monitoreo de trayecto | Si | No | No | No | Alta | `PWAAcompanamiento.tsx`.
| Acompanamiento seguro | Atender alerta de trayecto | No | Si | Si | No verificable | Media | Inferido por flujo de seguridad + documento 3.1.4.5.
| Integraciones / WhatsApp | Tomar control de chat | No | Si | Si | Si | Alta | `WebWhatsApp.tsx`.
| Integraciones / WhatsApp | Reasignar/transferir chat | No | Si | Si | Si | Alta | `WebWhatsApp.tsx` modal asignacion.
| Integraciones / WhatsApp | Cerrar chat | No | Si | Si | Si | Alta | `WebWhatsApp.tsx`.
| Gestion de usuarios y seguridad | Crear/editar usuarios | No | No | No | Si | Alta | `WebAdmin.tsx` tab Usuarios.
| Gestion de usuarios y seguridad | Gestionar roles/permisos | No | No | No | Si | Alta | `WebAdmin.tsx` tab Roles y Permisos + doc 3.1.1.2.
| Auditoria | Consultar log de auditoria | No | No | Si | Si | Alta | `WebAdmin.tsx` tab Auditoria + `mockData.ts`.
| Integraciones tecnicas | Monitorear estado de servicios | No | No | Parcial | Si | Alta | `WebAdmin.tsx` tab Integraciones + doc 3.1.3.4.

## 7. Control de acceso por módulo
| Modulo | Usuario de la comunidad | Operador de seguridad | Supervisor de seguridad | Administrador del sistema |
|---|---|---|---|---|
| Autenticacion y perfil | Acceso operativo | Acceso operativo | Acceso operativo | Acceso operativo |
| Gestion de incidentes y expediente | Acceso operativo (registro/seguimiento propio) | Acceso operativo | Acceso total operativo-supervision | Acceso de consulta / administracion (inferido) |
| Dashboard georreferenciado | Sin acceso | Acceso operativo | Acceso total | Acceso de consulta |
| KPIs y reportes | Sin acceso | Sin acceso | Acceso total | Acceso total |
| Alertas y notificaciones | Acceso operativo | Acceso operativo | Acceso operativo/consulta | Acceso de consulta (tecnico) |
| Lost & Found | Acceso operativo | Acceso operativo (parcial) | Acceso de consulta (inferido) | Acceso total (documental para cierre) |
| Acompanamiento seguro | Acceso total | Sin acceso directo de uso | Acceso de consulta/atencion (inferido) | Sin acceso |
| Integraciones / WhatsApp | Sin acceso | Acceso operativo | Acceso total operativo-supervision | Acceso total |
| Gestion de usuarios y seguridad | Sin acceso | Sin acceso | Sin acceso | Acceso total |
| Auditoria | Sin acceso | Sin acceso | Acceso de consulta | Acceso total |

## 8. Control de acceso por acción
| Grupo de acciones | Rol | Visualizar | Ejecutar | Modificar | Cerrar | Aprobar | Administrar |
|---|---|---|---|---|---|---|---|
| Incidentes (expediente) | Usuario de la comunidad | Si (sus casos) | Si (registrar) | Parcial (agregar info, no validado) | No | No | No |
| Incidentes (expediente) | Operador de seguridad | Si | Si | Si (nota/estado/asignacion) | Si (resuelto/cierre operativo) | Parcial (escalamiento sin aprobacion explicita) | No |
| Incidentes (expediente) | Supervisor de seguridad | Si | Si | Si | Si | Parcial/Si (segun politica, documental) | No |
| Incidentes (expediente) | Administrador del sistema | Si | Parcial | Parcial | Parcial | No verificable | Si (configuracion global) |
| KPIs y reportes | Usuario de la comunidad | No | No | No | No | No | No |
| KPIs y reportes | Operador de seguridad | No | No | No | No | No | No |
| KPIs y reportes | Supervisor de seguridad | Si | Si (exportar) | Parcial (filtros) | No | No | No |
| KPIs y reportes | Administrador del sistema | Si | Si (exportar) | Si | No | No | Si |
| WhatsApp omnicanal | Usuario de la comunidad | No | No | No | No | No | No |
| WhatsApp omnicanal | Operador de seguridad | Si | Si (responder/tomar control) | Si (prioridad/asignacion) | Si (cerrar chat) | Parcial (escalamiento de prioridad) | No |
| WhatsApp omnicanal | Supervisor de seguridad | Si | Si | Si | Si | Si (criterio operativo) | Parcial |
| WhatsApp omnicanal | Administrador del sistema | Si | Si | Si | Si | Si | Si |
| Usuarios y seguridad | Usuario de la comunidad | No | No | No | No | No | No |
| Usuarios y seguridad | Operador de seguridad | No | No | No | No | No | No |
| Usuarios y seguridad | Supervisor de seguridad | Parcial (auditoria) | No | No | No | No | No |
| Usuarios y seguridad | Administrador del sistema | Si | Si | Si | Si (desactivar/suspender) | Si | Si |

## 9. Hallazgos relevantes para la matriz RBAC
1. Existe separacion visual de acceso por rol desde el login, con rutas y layouts diferenciados (`/pwa`, `/operador`, `/web`, `/web/admin`), lo cual facilita la definicion de fronteras RBAC por modulo.
2. El frontend ya expone acciones criticas de ciclo de incidente: asignar, escalar, registrar nota/comentario, marcar resuelto y cerrar, con evidencia en pantallas operador y web.
3. La capa administrativa presenta explicitamente una matriz de permisos en UI (`WebAdmin.tsx`, tab "Roles y Permisos"), util como base inicial de politicas RBAC.
4. La omnicanalidad de WhatsApp muestra granularidad de permisos operativos (bot, takeover humano, reasignacion, cierre), relevante para permisos por accion y por canal.
5. El modulo de KPIs/reportes sugiere una separacion clara entre roles operativos de campo y roles de supervision/administracion.
6. Lost & Found y Acompanamiento Seguro se observan como capacidades centradas en comunidad, con atencion posterior por seguridad inferida desde flujos operativos.
7. Se observan registros de auditoria y monitoreo de integraciones en la interfaz admin, lo que respalda controles de trazabilidad y gobierno de acceso.

## 10. Vacíos o límites de la evidencia
1. No hay backend ni base de datos en el repositorio analizado, por lo que no es posible verificar enforcement real de permisos, politicas de autorizacion ni restricciones por token/sesion.
2. La autenticacion mostrada en login es de naturaleza visual/mock (`navigate` por rol), por lo que la validacion institucional, recuperacion de claims y resolucion de permisos son No verificables con la evidencia disponible.
3. Varias acciones observadas en interfaz (crear usuario, editar usuario, exportar reportes, cerrar casos/chats) no permiten confirmar persistencia ni reglas transaccionales.
4. El control por propiedad del dato (ejemplo: "solo mis casos" vs "todos los casos") aparece parcialmente en UI, pero sin garantias de seguridad del lado servidor.
5. La aprobacion formal de cierres/escalamientos y jerarquias de validacion se encuentra parcialmente documentada, pero no se observa implementacion tecnica verificable.
6. Para Lost & Found, el cierre de casos esta sustentado por documento funcional, pero no se evidencia accion explicita de cierre en las pantallas revisadas.
7. No se observan politicas de denegacion de acceso en tiempo de ejecucion (guardias de ruta con verificacion real, middleware, RBAC backend), solo separacion por navegacion visual.
8. No se dispone de ERS/BPMN completo en el repositorio actual; por tanto, algunas decisiones de granularidad (aprobar vs cerrar vs administrar) permanecen en nivel inferido o documental.
