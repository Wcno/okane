# `webapp` es el único punto de entrada; `api-service` no se expone al navegador

El curso exige cuatro contenedores (`webapp`, `webapp-db`, `api-service`, `api-db`), con los usuarios y los datos financieros en bases de datos separadas. Decidimos que el navegador solo hable con `webapp`: Django mantiene la sesión con cookie y reenvía cada llamada `/api/*` a `api-service` por la red interna, indicándole qué Usuario la hace. Así cerrar sesión corta el acceso de inmediato y `api-service` nunca valida credenciales ni queda expuesto.

## Considered Options

- **Token firmado y llamada directa:** `webapp` emite un token al iniciar sesión y React llama a `api-service` directamente. Se descartó porque cerrar sesión no invalida un token ya emitido sin mantener además una lista de revocación, y porque obliga a exponer y proteger dos servicios en lugar de uno.

## Consequences

- `api-db` no puede tener una llave foránea hacia los usuarios: solo guarda el identificador de Usuario que recibe de `webapp`, y confía en él.
- Eliminar un Usuario requiere que `webapp` pida a `api-service` borrar sus datos financieros; la base de datos no lo hace en cascada.
- `api-service` debe rechazar cualquier petición que no venga de `webapp`.
- `api-service` tiene salida a internet, solo de salida, para consultar el servicio de cotizaciones ([ADR 0006](0006-asset-search-provider.md)); sigue sin publicar ningún puerto.

## Extensión

El [ADR 0005](0005-public-api-through-webapp.md) extiende esta entrada única
para clientes externos autenticados con tokens personales. La aplicación sigue
usando sesiones; `api-service` sigue validando únicamente a `webapp`.
