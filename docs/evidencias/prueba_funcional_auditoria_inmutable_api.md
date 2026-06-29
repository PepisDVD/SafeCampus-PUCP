# Prueba funcional: auditoria inmutable via API

## Objetivo

Verificar que las entradas del modulo de auditoria no puedan crearse,
modificarse ni eliminarse desde la API HTTP.

## Alcance

Superficie validada:

- `POST /api/v1/admin/auditoria`
- `PUT /api/v1/admin/auditoria/{id}`
- `PATCH /api/v1/admin/auditoria/{id}`
- `DELETE /api/v1/admin/auditoria/{id}`

Las rutas de lectura existentes (`GET /api/v1/admin/auditoria` y catalogos
relacionados) no forman parte de esta prueba porque son la superficie esperada
del modulo.

## Resultado esperado

La API debe rechazar cualquier intento de mutacion de auditoria. Se considera
valido:

- `405 Method Not Allowed` cuando existe la ruta base, pero el metodo no esta
  permitido.
- `404 Not Found` cuando no existe una ruta de mutacion por identificador.

## Resultado observado

Ejecucion local del test funcional:

```bash
cd apps/backend
python -m pytest tests/test_api/test_admin_auditoria_inmutable.py -q
```

Resultado:

```text
4 passed
```

Codigos observados:

| Metodo | Ruta | Resultado |
| --- | --- | --- |
| POST | `/api/v1/admin/auditoria` | 405 |
| PUT | `/api/v1/admin/auditoria/{id}` | 404 |
| PATCH | `/api/v1/admin/auditoria/{id}` | 404 |
| DELETE | `/api/v1/admin/auditoria/{id}` | 404 |

## Evidencia automatizada

El test queda versionado en:

```text
apps/backend/tests/test_api/test_admin_auditoria_inmutable.py
```

La prueba falla si en el futuro se agrega una ruta de mutacion que responda con
un codigo distinto a `404` o `405`, lo que ayuda a detectar regresiones en la
inmutabilidad de `sc_auditoria.registro_auditoria` via API.
