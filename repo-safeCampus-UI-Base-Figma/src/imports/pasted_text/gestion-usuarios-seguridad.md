3.1.1 Gestión de usuarios y seguridad
3.1.1.1 Iniciar sesión con credenciales institucionales
Actor principal: Usuario de la comunidad / Operador / Supervisor / Administrador
Propósito: Permitir el acceso seguro al sistema mediante autenticación institucional.
Flujo básico:
1. El usuario accede a la pantalla o canal de autenticación.
2. El sistema redirige al proveedor de identidad institucional o solicita la validación correspondiente.
3. El usuario ingresa sus credenciales.
4. El sistema valida la identidad, recupera el rol y habilita la sesión.
5. El sistema redirige al usuario al módulo autorizado por su perfil.
Flujos de excepción / alternos:
1. Si las credenciales son inválidas, el sistema muestra un mensaje de error y permite reintentar.
2. Si el usuario no cuenta con permisos habilitados, el sistema deniega el acceso e informa la causa.
Precondiciones: El usuario posee una cuenta institucional válida.
Postcondiciones: Usuario autenticado con sesión activa y permisos cargados.
3.1.1.2 Gestionar roles y permisos
Actor principal: Administrador del sistema
Propósito: Asignar, actualizar o revocar roles y permisos de acceso de acuerdo con el perfil operativo del usuario.
Flujo básico:
1. El administrador accede al módulo de gestión de usuarios.
2. El sistema muestra la lista de usuarios y sus roles vigentes.
3. El administrador selecciona un usuario y edita el rol o permisos disponibles.
4. El sistema valida la consistencia de la asignación.
5. El sistema guarda los cambios y registra la operación en auditoría.
Flujos de excepción / alternos:
1. Si el administrador intenta asignar un rol incompatible o inexistente, el sistema rechaza la operación.
2. Si se cancela la acción antes de guardar, el sistema no altera la configuración vigente.
Precondiciones: Administrador autenticado con privilegios de configuración.
Postcondiciones: Permisos actualizados y registro de auditoría generado.
3.1.1.3 Visualizar perfil de usuario
Actor principal: Usuario autenticado
Propósito: Permitir que cada usuario consulte sus datos básicos, rol y medios de contacto registrados.
Flujo básico:
1. El usuario accede a la opción de perfil.
2. El sistema recupera la información asociada a la cuenta autenticada.
3. El sistema muestra los datos de identificación, rol y canales habilitados.
Flujos de excepción / alternos:
1. Si la información no puede recuperarse temporalmente, el sistema informa la indisponibilidad y permite reintentar.
Precondiciones: Usuario autenticado.
Postcondiciones: El usuario visualiza su información vigente.
3.1.1.4 Consultar usuarios por criterios
Actor principal: Administrador del sistema
Propósito: Buscar usuarios por nombre, rol, estado o identificador institucional para fines de gestión.
Flujo básico:
1. El administrador accede al módulo de consulta.
2. El sistema muestra filtros de búsqueda por nombre, rol y estado.
3. El administrador aplica criterios y ejecuta la búsqueda.
4. El sistema muestra la lista de resultados coincidentes.
Flujos de excepción / alternos:
1. Si no existen coincidencias, el sistema informa que no se encontraron resultados.
2. Si los filtros son inválidos, el sistema solicita corregir la consulta.
Precondiciones: Administrador autenticado.
Postcondiciones: Resultados de búsqueda mostrados según criterio.
3.1.2 Gestión de incidentes omnicanal
3.1.2.1 Registrar incidente
Actor principal: Usuario de la comunidad
Propósito: Permitir el registro de incidentes desde web, móvil o mensajería, consolidándolos en un ticket único.
Flujo básico:
1. El usuario inicia un reporte desde alguno de los canales habilitados.
2. El sistema solicita la información mínima necesaria: descripción, ubicación y evidencia cuando aplique.
3. El usuario completa y envía el reporte.
4. El sistema normaliza la información recibida.
5. El sistema crea el ticket, registra el canal de origen y almacena el expediente inicial.
6. El sistema confirma la recepción del reporte al usuario.
Flujos de excepción / alternos:
1. Si faltan datos obligatorios, el sistema solicita completarlos antes de registrar el incidente.
2. Si el canal externo falla durante el envío, el sistema informa la incidencia y evita registros parciales duplicados.
Precondiciones: Usuario autenticado o canal habilitado disponible según política del MVP.
Postcondiciones: Incidente registrado con identificador único y estado inicial.
3.1.2.2 Consultar estado e historial del incidente
Actor principal: Usuario de la comunidad / Operador / Supervisor
Propósito: Permitir la consulta del estado actual, historial y evidencias asociadas a un incidente.
Flujo básico:
1. El usuario accede a la consulta de incidentes o al detalle de un ticket.
2. El sistema valida que el usuario tenga permisos sobre el caso consultado.
3. El sistema muestra estado actual, marcas de tiempo, comentarios y evidencias registradas.
Flujos de excepción / alternos:
1. Si el usuario no tiene permisos para consultar el caso, el sistema deniega el acceso.
2. Si el identificador no existe, el sistema informa que el incidente no fue encontrado.
Precondiciones: Existencia de un ticket registrado.
Postcondiciones: Información del expediente mostrada de acuerdo con permisos.
3.1.2.3 Clasificar y priorizar incidente
Actor principal: Sistema SafeCampus PUCP
Propósito: Clasificar automáticamente el incidente por categoría y severidad utilizando IA asistida por reglas.
Flujo básico:
1. El sistema recibe un incidente recién registrado o actualizado.
2. El módulo de clasificación procesa la descripción, canal, evidencias textuales y contexto disponible.
3. El sistema asigna una categoría y un nivel de severidad preliminar.
4. El sistema aplica reglas de negocio para validar o ajustar la clasificación.
5. El sistema marca el caso como listo para atención o derivación.
Flujos de excepción / alternos:
1. Si la confianza del resultado es insuficiente, el sistema deriva el caso a revisión humana.
2. Si el servicio de IA no responde, el sistema aplica reglas de respaldo y registra el evento.
Precondiciones: Incidente registrado.
Postcondiciones: Incidente clasificado y priorizado con trazabilidad del resultado.
3.1.2.4 Gestionar incidente por operador
Actor principal: Operador de seguridad
Propósito: Evaluar el incidente, asignar recursos y actualizar su estado operativo hasta su resolución.
Flujo básico:
1. El operador recibe una alerta de nuevo incidente en el tablero.
2. El operador revisa ubicación, severidad, evidencias y contexto.
3. El operador asigna recursos o coordina acciones con las áreas correspondientes.
4. El operador actualiza el estado del caso según el avance de la atención.
5. El sistema registra cada cambio de estado y la acción ejecutada.
Flujos de excepción / alternos:
1. Si el incidente requiere escalamiento, el operador deriva el caso al supervisor o protocolo definido.
2. Si el reporte necesita más información, el operador lo marca como pendiente y el sistema notifica al reportante.
Precondiciones: Operador autenticado y caso disponible para gestión.
Postcondiciones: Incidente actualizado con trazabilidad completa de atención.
3.1.2.5 Cerrar incidente
Actor principal: Operador de seguridad / Supervisor de seguridad
Propósito: Registrar la resolución final del incidente y completar el cierre del expediente.
Flujo básico:
1. El operador accede al detalle de un caso en atención.
2. El operador registra la resolución, acciones tomadas y observaciones finales.
3. El sistema valida que el caso cumpla las condiciones de cierre.
4. El sistema cambia el estado a cerrado o resuelto.
5. El sistema conserva el historial como evidencia del caso.
Flujos de excepción / alternos:
1. Si faltan datos mínimos de resolución, el sistema impide el cierre.
2. Si el incidente requiere validación superior, el sistema mantiene el caso a la espera de aprobación del supervisor.
Precondiciones: Incidente atendido o marcado como resuelto operativamente.
Postcondiciones: Expediente cerrado con resolución documentada.
3.1.2.6 Notificar eventos del incidente
Actor principal: Tiempo / Sistema SafeCampus PUCP
Propósito: Enviar confirmaciones y notificaciones automáticas sobre cambios relevantes del ciclo de vida del incidente.
Flujo básico:
1. El sistema detecta un evento que requiere notificación.
2. El sistema identifica canal y destinatario correspondientes.
3. El sistema genera el mensaje con estado, referencia y contenido mínimo.
4. El sistema envía la notificación y registra el intento.
Flujos de excepción / alternos:
1. Si el canal de notificación falla, el sistema reintenta según política definida y registra el error.
2. Si el usuario no tiene un medio habilitado, el sistema conserva la notificación en historial del caso.
Precondiciones: Existencia de un cambio de estado o evento notificable.
Postcondiciones: Usuario y/u operadores informados del evento correspondiente.
3.1.3 Gestión operativa y analítica
3.1.3.1 Visualizar dashboard georreferenciado
Actor principal: Operador de seguridad / Supervisor de seguridad
Propósito: Permitir la visualización en mapa de los incidentes, su estado y la situación operativa del campus.
Flujo básico:
1. El usuario accede al tablero operativo.
2. El sistema carga el mapa del campus y la capa de incidentes.
3. El usuario aplica filtros por estado, severidad, tipo o zona.
4. El sistema actualiza la visualización y permite consultar el detalle de cada caso.
Flujos de excepción / alternos:
1. Si no hay incidentes para los filtros aplicados, el sistema muestra el tablero sin resultados y conserva los controles de filtrado.
2. Si la capa geográfica no puede cargarse, el sistema informa la limitación y mantiene la consulta tabular.
Precondiciones: Usuario autenticado con permisos de operación o supervisión.
Postcondiciones: Tablero cargado con la información disponible según filtro.
3.1.3.2 Consultar KPIs operativos
Actor principal: Supervisor de seguridad 
Propósito: Visualizar indicadores de desempeño como FRT, TMR, volumen de incidentes y distribución por estado o zona.
Flujo básico:
1. El usuario accede al módulo de KPIs.
2. El sistema calcula o recupera los indicadores para el rango seleccionado.
3. El sistema muestra tarjetas, tablas o gráficos con los resultados.
4. El usuario puede aplicar filtros temporales o por categoría.
Flujos de excepción / alternos:
1. Si no existen datos suficientes para el período consultado, el sistema informa la falta de información estadística.
Precondiciones: Datos históricos disponibles y usuario autorizado.
Postcondiciones: Indicadores mostrados para análisis operativo.
3.1.3.3 Exportar reportes de incidentes
Actor principal: Supervisor de seguridad / Administrador del sistema
Propósito: Generar exportaciones de incidentes y métricas para análisis posterior.
Flujo básico:
1. El usuario accede a la opción de reportes.
2. El sistema muestra filtros de fecha, estado, zona, severidad y tipo.
3. El usuario configura la consulta y solicita la generación del reporte.
4. El sistema compila la información y genera el archivo de salida.
5. El sistema habilita la descarga del reporte.
Flujos de excepción / alternos:
1. Si la consulta excede los límites permitidos, el sistema solicita refinar el filtro.
2. Si ocurre un error durante la exportación, el sistema informa la falla y permite reintentar.
Precondiciones: Usuario autenticado con permisos de consulta analítica.
Postcondiciones: Archivo de reporte generado y disponible para descarga.
3.1.3.4 Monitorear integraciones y servicios
Actor principal: Administrador del sistema
Propósito: Supervisar el estado operativo de integraciones, servicios internos y eventos críticos del entorno de prueba.
Flujo básico:
1. El administrador accede al módulo de monitoreo técnico.
2. El sistema muestra el estado de integraciones clave, colas, servicios y notificaciones recientes.
3. El administrador consulta alertas o errores detectados.
4. El sistema presenta el detalle del evento y su marca de tiempo.
Flujos de excepción / alternos:
1. Si una integración crítica presenta fallo, el sistema genera una alerta visible para el administrador.
2. Si no existe información reciente, el sistema lo indica como estado no verificado.
Precondiciones: Administrador autenticado.
Postcondiciones: Estado técnico del sistema visualizado para seguimiento.
3.1.4 Gestión comunitaria
3.1.4.1 Registrar caso de Lost & Found
Actor principal: Usuario de la comunidad
Propósito: Registrar un objeto perdido o encontrado con foto y metadatos relevantes.
Flujo básico:
1. El usuario accede al módulo Lost & Found.
2. El sistema solicita tipo de registro, categoría, descripción, lugar, fecha y fotografía.
3. El usuario completa la información y envía el caso.
4. El sistema valida los datos, registra el caso y asigna un identificador.
5. El sistema confirma el registro al usuario.
Flujos de excepción / alternos:
1. Si la imagen o los datos mínimos no cumplen validación, el sistema solicita corregir la información antes del envío.
Precondiciones: Usuario autenticado.
Postcondiciones: Caso Lost & Found registrado y disponible para consulta.
3.1.4.2 Buscar y dar seguimiento a objetos
Actor principal: Usuario de la comunidad
Propósito: Permitir la búsqueda y consulta de objetos perdidos o encontrados por filtros y palabras clave.
Flujo básico:
1. El usuario accede a la búsqueda de casos.
2. El sistema muestra filtros por categoría, lugar, fecha y texto libre.
3. El usuario aplica los criterios deseados.
4. El sistema lista los resultados y permite ver el detalle de cada caso.
Flujos de excepción / alternos:
1. Si no existen coincidencias, el sistema informa que no se hallaron resultados.
Precondiciones: Existencia de casos registrados en el módulo.
Postcondiciones: Resultados mostrados al usuario según filtro.
3.1.4.3 Cerrar caso de Lost & Found
Actor principal: Operador de seguridad / Administrador / Usuario autorizado según política
Propósito: Registrar la devolución, descarte o cierre administrativo de un caso de objeto perdido o encontrado.
Flujo básico:
1. El usuario autorizado accede al detalle del caso.
2. El sistema muestra el historial y el estado vigente.
3. El usuario registra el motivo de cierre.
4. El sistema actualiza el estado del caso y conserva la trazabilidad.
Flujos de excepción / alternos:
1. Si el caso ya se encuentra cerrado, el sistema impide una actualización de cierre adicional.
Precondiciones: Caso Lost & Found existente.
Postcondiciones: Caso marcado como cerrado con motivo registrado.
3.1.4.4 Iniciar acompañamiento seguro
Actor principal: Usuario de la comunidad
Propósito: Iniciar un trayecto acompañado mediante compartición periódica de ubicación y un temporizador de seguimiento.
Flujo básico:
1. El usuario accede al módulo de acompañamiento seguro.
2. El sistema solicita destino o duración estimada del trayecto.
3. El usuario inicia el acompañamiento.
4. El sistema activa el seguimiento temporal y registra el evento de inicio.
Flujos de excepción / alternos:
1. Si el dispositivo no dispone de permisos de ubicación, el sistema solicita habilitarlos antes de iniciar el trayecto.
Precondiciones: Usuario autenticado y permisos de ubicación habilitados.
Postcondiciones: Trayecto de acompañamiento activo.
3.1.4.5 Emitir alerta durante acompañamiento
Actor principal: Usuario de la comunidad / Tiempo
Propósito: Permitir la emisión de una alerta manual o automática durante un acompañamiento activo.
Flujo básico:
1. El usuario presiona el botón de alerta o el sistema detecta una condición de vencimiento o pérdida de confirmación.
2. El sistema registra la ubicación más reciente y el contexto del trayecto.
3. El sistema notifica al operador de seguridad.
4. El sistema marca el evento como alerta activa para atención inmediata.
Flujos de excepción / alternos:
1. Si la conectividad se pierde, el sistema conserva la última información disponible y registra el evento de desconexión.
2. Si la alerta fue activada por error, el usuario podrá cancelarla solo si la atención aún no ha sido escalada.
Precondiciones: Acompañamiento seguro activo.
Postcondiciones: Alerta registrada y enviada al operador de seguridad.
