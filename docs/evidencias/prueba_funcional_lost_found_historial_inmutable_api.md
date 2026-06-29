# Prueba funcional: historial Lost & Found inmutable via API

## Objetivo

Verificar que las entradas del historial de un caso en el modulo Lost & Found
no puedan modificarse ni eliminarse desde la API HTTP, garantizando la
trazabilidad completa del caso.

## Alcance

Superficie validada:

- `GET /api/v1/lost-found/casos/{caso_id}`
- `PATCH /api/v1/lost-found/casos/{caso_id}/historial/{historial_id}`
- `DELETE /api/v1/lost-found/casos/{caso_id}/historial/{historial_id}`

El historial se consulta como parte del detalle del caso. La API rechaza
explicitamente los intentos de mutacion sobre una entrada de historial.

## Resultado esperado

Los intentos de modificacion o eliminacion deben rechazarse con un codigo de
seguridad o metodo no permitido:

- `403 Forbidden`
- `405 Method Not Allowed`

Adicionalmente, el registro historico consultado antes de los intentos debe
permanecer igual al consultado despues.

## Resultado observado

Ejecucion local del test funcional:

```bash
cd apps/backend
python -m pytest tests/test_api/test_lost_found.py -q
```

Resultado:

```text
14 passed
```

Codigos observados:

| Metodo | Ruta | Resultado |
| --- | --- | --- |
| PATCH | `/api/v1/lost-found/casos/{caso_id}/historial/{historial_id}` | 403 |
| DELETE | `/api/v1/lost-found/casos/{caso_id}/historial/{historial_id}` | 403 |

Validacion de inalterabilidad:

- Se consulto el detalle del caso antes de intentar modificar/eliminar el
  historial.
- Se ejecutaron los intentos `PATCH` y `DELETE`.
- Se volvio a consultar el detalle del caso.
- La lista `historial` del detalle posterior fue igual a la lista original.

## Evidencia automatizada

El test queda versionado en:

```text
apps/backend/tests/test_api/test_lost_found.py
```

Caso agregado:

```text
test_lost_found_historial_no_permite_patch_ni_delete_via_api
```

La prueba falla si en el futuro una ruta de historial permite mutaciones o si
el contenido del historial cambia despues de un intento de `PATCH` o `DELETE`.

## Nota de ejecucion

Durante la ejecucion local Pytest reporto un warning al intentar escribir cache
en `.pytest_cache` por permisos del entorno Windows. Este warning no afecto el
resultado de la prueba.
