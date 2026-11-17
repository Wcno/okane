# Matrices de casos de uso, navegación y trazabilidad

Este documento extiende las matrices de la Asignación 5 (Generalidades del Proyecto Final). Los 28 casos de uso entregados se conservan sin cambios de nombre, ruta ni endpoint, y se agregan 30 casos nuevos, para un total de 58. Esta revisión añade diez casos a los 48 anteriores.

Los términos en mayúscula inicial (Cuenta, Gasto, Presupuesto, Aporte) están definidos en [GLOSSARY.md](../GLOSSARY.md). Las decisiones de arquitectura están en [docs/adr/](adr/).

Los [contratos verificables](contratos.md) precisan identidad, fechas, cálculos
e idempotencia sin cambiar estos casos de uso. Los niveles expresan prioridad
de producto: una dependencia imprescindible puede adelantarse de nivel.

## Cómo leer la columna "Origen"

| Marca | Significado | Orden de construcción |
|---|---|---|
| **A5** | Caso de uso original de la Asignación 5 | Nivel 1: se construye primero |
| **N2** | Caso nuevo que cumple algo que la descripción del proyecto promete | Nivel 2 |
| **N3** | Caso nuevo que diferencia al producto | Nivel 3: se recorta primero si falta tiempo |

## Matriz de casos de uso

| Grupo | A5 | N2 | N3 | Total |
|---|---|---|---|---|
| Autenticación y usuarios | 7 | | | 7 |
| Gestión de cuentas | 4 | | 1 | 5 |
| Gestión de categorías | | | 4 | 4 |
| Gestión de presupuestos | 4 | | | 4 |
| Gestión de gastos | 4 | | | 4 |
| Gestión de ingresos | | 4 | | 4 |
| Gestión de transferencias | | 4 | | 4 |
| Pagos recurrentes | | 6 | | 6 |
| Panel | | 1 | | 1 |
| Proyección | 1 | 1 | | 2 |
| Portafolio de inversión | 8 | 1 | 1 | 10 |
| Vista de Movimientos | | 1 | | 1 |
| Configuración | | 1 | | 1 |
| API pública y tokens | | 5 | | 5 |
| **Total** | **28** | **24** | **6** | **58** |

El único actor de todos los casos es el Usuario; sus scripts actúan con su token y sus permisos. Los diez casos nuevos se cuentan una sola vez aunque un caso exponga varios endpoints.

## Matriz de interfaces y navegación

### Autenticación y usuarios

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Registrar usuario | `/register` | A5 |
| Iniciar sesión | `/login` | A5 |
| Solicitar recuperación de contraseña | `/forgot-password` | A5 |
| Restablecer contraseña | `/reset-password/:token` | A5 |
| Cambiar contraseña | `/profile/change-password` | A5 |
| Cerrar sesión | `/logout` | A5 |
| Eliminar usuario | `/profile/delete` | A5 |

### Gestión de cuentas

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar cuentas | `/accounts` | A5 |
| Crear cuenta | `/accounts/create` | A5 |
| Editar cuenta | `/accounts/:id/edit` | A5 |
| Eliminar cuenta | `/accounts/:id/delete` | A5 |
| Consultar estado de cuenta | `/accounts/:id/statement` | N3 |

### Gestión de categorías

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar categorías | `/categories` | N3 |
| Crear categoría | `/categories/create` | N3 |
| Editar categoría | `/categories/:id/edit` | N3 |
| Archivar categoría | `/categories/:id/archive` | N3 |

### Gestión de presupuestos

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar presupuestos | `/budgets` | A5 |
| Crear presupuesto | `/budgets/create` | A5 |
| Editar presupuesto | `/budgets/:id/edit` | A5 |
| Eliminar presupuesto | `/budgets/:id/delete` | A5 |

### Gestión de gastos

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar gastos | `/expenses` | A5 |
| Registrar gasto | `/expenses/create` | A5 |
| Editar gasto | `/expenses/:id/edit` | A5 |
| Eliminar gasto | `/expenses/:id/delete` | A5 |

### Gestión de ingresos

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar ingresos | `/incomes` | N2 |
| Registrar ingreso | `/incomes/create` | N2 |
| Editar ingreso | `/incomes/:id/edit` | N2 |
| Eliminar ingreso | `/incomes/:id/delete` | N2 |

### Gestión de transferencias

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar transferencias | `/transfers` | N2 |
| Registrar transferencia | `/transfers/create` | N2 |
| Editar transferencia | `/transfers/:id/edit` | N2 |
| Eliminar transferencia | `/transfers/:id/delete` | N2 |

### Pagos recurrentes

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar pagos recurrentes | `/recurring-payments` | N2 |
| Crear pago recurrente | `/recurring-payments/create` | N2 |
| Editar pago recurrente | `/recurring-payments/:id/edit` | N2 |
| Eliminar pago recurrente | `/recurring-payments/:id/delete` | N2 |
| Confirmar ocurrencia de pago | `/recurring-payments/occurrences/:id/confirm` | N2 |
| Cancelar ocurrencia de pago | `/recurring-payments/occurrences/:id/cancel` | N2 |

### Panel

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar panel | `/dashboard` | N2 |

El Panel es la pantalla a la que llega el Usuario al iniciar sesión.

### Proyección

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Proyectar saldo de ahorro | `/savings/projection` | A5 |
| Proyectar inversión y comparar escenarios | `/investments/projection` | N2 |

### Portafolio de inversión

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar dashboard de inversiones | `/investments/dashboard` | A5 |
| Registrar compra de activos | `/investments/transactions/buy` | A5 |
| Registrar venta de activos | `/investments/transactions/sell` | A5 |
| Registrar dividendo | `/investments/transactions/dividend` | N3 |
| Consultar posiciones de inversión | `/investments/positions` | A5 |
| Consultar transacciones de inversión | `/investments/transactions` | A5 |
| Editar transacción de inversión | `/investments/transactions/:id/edit` | A5 |
| Eliminar transacción de inversión | `/investments/transactions/:id/delete` | A5 |
| Consultar rendimiento del portafolio | `/investments/performance` | A5 |
| Corregir precio de referencia | `/investments/assets/:id/price` | N2 |

### Movimientos, Configuración e integraciones

| Caso de uso | Pantalla / Ruta | Origen |
|---|---|---|
| Consultar vista de Movimientos | `/movements` | N2 |
| Configurar preferencias visuales | `/settings` | N2 |
| Consultar tokens personales | `/settings/integrations` | N2 |
| Crear token personal | `/settings/integrations` | N2 |
| Revocar token personal | `/settings/integrations` | N2 |
| Consultar datos mediante API pública | Cliente externo del Usuario | N2 |
| Crear registro mediante API pública | Cliente externo del Usuario | N2 |

La navegación principal ofrece Movimientos, no una pestaña por cada tipo.
Las rutas `/expenses`, `/incomes`, `/transfers` e
`/investments/transactions` se conservan como alias con filtros de esa vista.
Los formularios especializados conservan sus rutas. Ambas entradas de Proyección
usan el mismo comparador con la selección correspondiente.

## Matriz de trazabilidad

### Contenedores

| Contenedor | Nombre Docker | Tecnología | Responsabilidad |
|---|---|---|---|
| WebApp | `webapp` | React + Django | Interfaz web, autenticación, gestión de usuarios y reenvío de las llamadas `/api/*` |
| BD WebApp | `webapp-db` | PostgreSQL | Almacenamiento de usuarios, credenciales, sesiones, tokens y preferencias visuales |
| API Service | `api-service` | Django REST | Procesamiento de cuentas, categorías, presupuestos, movimientos, pagos recurrentes, proyecciones e inversiones |
| BD API | `api-db` | PostgreSQL | Almacenamiento de información financiera y transacciones |

El navegador y los clientes externos solo se comunican con `webapp`, que autentica la sesión o el token de `/api/v1` y reenvía las llamadas financieras a `api-service` por la red interna ([ADR 0001](adr/0001-webapp-como-unico-punto-de-entrada.md)). La columna "Docker" indica, igual que en la Asignación 5, qué contenedores procesan y almacenan el caso de uso.

### Autenticación y usuarios

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Registrar usuario | Sí | `POST /auth/register` | `users` | webapp, webapp-db | A5 |
| Iniciar sesión | Sí | `POST /auth/login` | `users` | webapp, webapp-db | A5 |
| Solicitar recuperación de contraseña | Sí | `POST /auth/forgot-password` | `users` | webapp, webapp-db | A5 |
| Restablecer contraseña | Sí | `POST /auth/reset-password` | `users` | webapp, webapp-db | A5 |
| Cambiar contraseña | Sí | `PUT /auth/password` | `users` | webapp, webapp-db | A5 |
| Cerrar sesión | Sí | `POST /auth/logout` | `sessions` | webapp, webapp-db | A5 |
| Eliminar usuario | Sí | `DELETE /users/me` | `users` | webapp, webapp-db | A5 |

Las pantallas de esta sección consultan además `GET /auth/session`, que no es un caso de uso propio.
Devuelve quién inició sesión (o `null` si nadie) y el token CSRF que el navegador envía en cada escritura, porque la cookie CSRF es HttpOnly.
Es una de las rutas de autenticación exceptuadas del requisito de sesión.

### Gestión de cuentas

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar cuentas | Sí | `GET /api/accounts` | `accounts` | api-service, api-db | A5 |
| Crear cuenta | Sí | `POST /api/accounts` | `accounts` | api-service, api-db | A5 |
| Editar cuenta | Sí | `PUT /api/accounts/{id}` | `accounts` | api-service, api-db | A5 |
| Eliminar cuenta | Sí | `DELETE /api/accounts/{id}` | `accounts` | api-service, api-db | A5 |
| Consultar estado de cuenta | Sí | `GET /api/accounts/{id}/statement` | `incomes`, `expenses`, `transfers`, `investment_transactions` | api-service, api-db | N3 |

### Gestión de categorías

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar categorías | Sí | `GET /api/categories` | `categories` | api-service, api-db | N3 |
| Crear categoría | Sí | `POST /api/categories` | `categories` | api-service, api-db | N3 |
| Editar categoría | Sí | `PUT /api/categories/{id}` | `categories` | api-service, api-db | N3 |
| Archivar categoría | Sí | `POST /api/categories/{id}/archive` | `categories` | api-service, api-db | N3 |

### Gestión de presupuestos

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar presupuestos | Sí | `GET /api/budgets`, `GET /api/budgets/{id}` | `budgets` | api-service, api-db | A5 |
| Crear presupuesto | Sí | `POST /api/budgets` | `budgets` | api-service, api-db | A5 |
| Editar presupuesto | Sí | `PUT /api/budgets/{id}` | `budgets` | api-service, api-db | A5 |
| Eliminar presupuesto | Sí | `DELETE /api/budgets/{id}` | `budgets` | api-service, api-db | A5 |

### Gestión de gastos

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar gastos | Sí | `GET /api/expenses`, `GET /api/expenses/{id}` | `expenses` | api-service, api-db | A5 |
| Registrar gasto | Sí | `POST /api/expenses` | `expenses` | api-service, api-db | A5 |
| Editar gasto | Sí | `PUT /api/expenses/{id}` | `expenses` | api-service, api-db | A5 |
| Eliminar gasto | Sí | `DELETE /api/expenses/{id}` | `expenses` | api-service, api-db | A5 |

### Gestión de ingresos

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar ingresos | Sí | `GET /api/incomes`, `GET /api/incomes/{id}` | `incomes` | api-service, api-db | N2 |
| Registrar ingreso | Sí | `POST /api/incomes` | `incomes` | api-service, api-db | N2 |
| Editar ingreso | Sí | `PUT /api/incomes/{id}` | `incomes` | api-service, api-db | N2 |
| Eliminar ingreso | Sí | `DELETE /api/incomes/{id}` | `incomes` | api-service, api-db | N2 |

### Gestión de transferencias

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar transferencias | Sí | `GET /api/transfers` | `transfers` | api-service, api-db | N2 |
| Registrar transferencia | Sí | `POST /api/transfers` | `transfers` | api-service, api-db | N2 |
| Editar transferencia | Sí | `PUT /api/transfers/{id}` | `transfers` | api-service, api-db | N2 |
| Eliminar transferencia | Sí | `DELETE /api/transfers/{id}` | `transfers` | api-service, api-db | N2 |

### Pagos recurrentes

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar pagos recurrentes | Sí | `GET /api/recurring-payments`, `GET /api/recurring-payments/{id}`, `GET /api/recurring-payments/occurrences/{id}` | `recurring_payments` | api-service, api-db | N2 |
| Crear pago recurrente | Sí | `POST /api/recurring-payments` | `recurring_payments` | api-service, api-db | N2 |
| Editar pago recurrente | Sí | `PUT /api/recurring-payments/{id}` | `recurring_payments` | api-service, api-db | N2 |
| Eliminar pago recurrente | Sí | `DELETE /api/recurring-payments/{id}` | `recurring_payments` | api-service, api-db | N2 |
| Confirmar ocurrencia de pago | Sí | `POST /api/recurring-payments/occurrences/{id}/confirm` | `recurring_payment_occurrences`, `expenses` | api-service, api-db | N2 |
| Cancelar ocurrencia de pago | Sí | `POST /api/recurring-payments/occurrences/{id}/cancel` | `recurring_payment_occurrences` | api-service, api-db | N2 |

### Panel

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar panel | Sí | `GET /api/dashboard` | `accounts`, `budgets`, `expenses`, `incomes`, `transfers`, `recurring_payments` | api-service, api-db | N2 |

### Proyección

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Proyectar saldo de ahorro | Sí | `GET /api/savings/projection` | `accounts` | api-service, api-db | A5 |
| Proyectar inversión y comparar escenarios | Sí | `POST /api/investments/projection` (cálculo sin persistir) | `accounts`, `investment_transactions`, `asset_prices` | api-service, api-db | N2 |

### Portafolio de inversión

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar dashboard de inversiones | Sí | `GET /api/investments/dashboard` | `investment_transactions` | api-service, api-db | A5 |
| Registrar compra de activos | Sí | `POST /api/investments/transactions/buy` | `investment_transactions` | api-service, api-db | A5 |
| Registrar venta de activos | Sí | `POST /api/investments/transactions/sell` | `investment_transactions` | api-service, api-db | A5 |
| Registrar dividendo | Sí | `POST /api/investments/transactions/dividend` | `investment_transactions` | api-service, api-db | N3 |
| Consultar posiciones de inversión | Sí | `GET /api/investments/positions` | `investment_transactions` | api-service, api-db | A5 |
| Consultar transacciones de inversión | Sí | `GET /api/investments/transactions` | `investment_transactions` | api-service, api-db | A5 |
| Editar transacción de inversión | Sí | `PUT /api/investments/transactions/{id}` | `investment_transactions` | api-service, api-db | A5 |
| Eliminar transacción de inversión | Sí | `DELETE /api/investments/transactions/{id}` | `investment_transactions` | api-service, api-db | A5 |
| Consultar rendimiento del portafolio | Sí | `GET /api/investments/performance` | `investment_transactions` | api-service, api-db | A5 |
| Corregir precio de referencia | Sí | `PUT /api/investments/assets/{id}/price` | `asset_prices` | api-service, api-db | N2 |

### Movimientos, Configuración e integraciones

| Caso de uso | WebApp | API | BD | Docker | Origen |
|---|---|---|---|---|---|
| Consultar vista de Movimientos | Sí | `GET /api/movements` | `incomes`, `expenses`, `transfers`, `investment_transactions` | api-service, api-db | N2 |
| Configurar preferencias visuales | Sí | `GET, PUT /api/settings/preferences` | `user_preferences` | webapp, webapp-db | N2 |
| Consultar tokens personales | Sí | `GET /api/settings/tokens` | `personal_access_tokens` | webapp, webapp-db | N2 |
| Crear token personal | Sí | `POST /api/settings/tokens` | `personal_access_tokens` | webapp, webapp-db | N2 |
| Revocar token personal | Sí | `DELETE /api/settings/tokens/{id}` | `personal_access_tokens` | webapp, webapp-db | N2 |
| Consultar datos mediante API pública | Entrada autenticada | `GET /api/v1/accounts`, `GET /api/v1/budgets`, `GET /api/v1/movements` | Tablas financieras anteriores | webapp, api-service, ambas BD | N2 |
| Crear registro mediante API pública | Entrada autenticada | `POST /api/v1/movements` | Tablas financieras, `idempotency_records` | webapp, api-service, ambas BD | N2 |

Las rutas de Configuración se resuelven en `webapp` con sesión y CSRF.
La API pública exige token personal; no es acceso anónimo. Los contratos
tipados, permisos y respuestas se detallan en [contratos.md](contratos.md).

## Tablas

| Tabla | Base de datos | Qué guarda | Origen |
|---|---|---|---|
| `users` | webapp-db | Usuarios y credenciales | A5 |
| `sessions` | webapp-db | Sesiones activas | A5 |
| `user_preferences` | webapp-db | Presentación y filtros por Usuario | Apoyo N2 |
| `personal_access_tokens` | webapp-db | Hash, permisos y ciclo de vida de tokens | Apoyo N2 |
| `idempotency_records` | api-db | Clave por Usuario/operación, huella y resultado original | Apoyo N2 |
| `accounts` | api-db | Cuentas, con su tipo, saldo inicial y, en las de ahorro, la tasa de interés anual | A5 |
| `budgets` | api-db | Presupuestos: una Categoría, un mes y un límite | A5 |
| `expenses` | api-db | Gastos | A5 |
| `investment_transactions` | api-db | Compras, ventas y dividendos | A5 |
| `incomes` | api-db | Ingresos | N2 |
| `transfers` | api-db | Transferencias entre dos Cuentas | N2 |
| `recurring_payments` | api-db | Pagos recurrentes | N2 |
| `assets` | api-db | Activos registrados, con su símbolo y tipo | N2 |
| `asset_prices` | api-db | Precios de referencia por Activo y fecha | N2 |
| `categories` | api-db | Categorías de cada Usuario | N3 |
| `recurring_payment_occurrences` | api-db | Reserva única por regla y mes, datos originales, estado, fechas de resolución y vínculo al Gasto confirmado | Apoyo N2 |
| `budget_months` | api-db | Inicialización mensual por Usuario, incluso cuando el mes termina sin Presupuestos | Apoyo N3 |

No existen tablas de saldos ni de posiciones: ambos se calculan a partir de lo registrado ([ADR 0002](adr/0002-el-saldo-se-deriva-de-los-movimientos.md)). Por eso varios casos originales leen más tablas que la que lista su fila; la columna "BD" conserva la tabla principal, como en la Asignación 5.

Mientras `categories` no exista (nivel 3), las Categorías son un catálogo fijo definido por el sistema.

Los Precios de referencia manuales son propios de cada Usuario; la identidad
de un Activo distingue proveedor y mercado además del símbolo. Las Cuentas
conservan la fecha de inicio de su Saldo inicial. Las tablas de apoyo aseguran
que los reintentos no dupliquen Gastos ni repongan Presupuestos eliminados.

## Funciones de apoyo sin caso de uso propio

| Función | Dónde aparece | API | Origen |
|---|---|---|---|
| Buscar un Activo en el servicio de cotizaciones | Registrar compra de activos | `GET /api/investments/assets/search` | N2 |
| Materialización de reservas de Pagos recurrentes, sin crear Gastos | Consultas financieras y comando programable | Sin endpoint público propio | N2 |
| Actualización automática del Precio de referencia | Automática | Sin endpoint; `api-service` consulta el servicio externo | N3 |
| Evolución mensual del Patrimonio | Consultar panel | `GET /api/net-worth/history` | N3 |
| Registro rápido de un Gasto desde cualquier pantalla | Todas las pantallas | `POST /api/expenses` | N3 |
| Copia de los Presupuestos del mes anterior a un mes nuevo | Automática | Sin endpoint | N3 |

## Cambios de comportamiento en los casos originales

Estos casos conservan su nombre, ruta y endpoint, pero las decisiones de diseño precisan qué hacen:

| Caso de uso | Precisión |
|---|---|
| Crear cuenta | El saldo inicial se fija aquí. En una Cuenta de inversión cuenta como su primer Aporte. |
| Editar cuenta | No permite cambiar el Saldo; este se corrige registrando o corrigiendo movimientos. |
| Eliminar cuenta | Solo borra una Cuenta sin movimientos. Si los tiene, la archiva y conserva su historial. |
| Registrar gasto | Exige monto, Categoría y Cuenta. La fecha empieza en hoy y la descripción es opcional, de hasta 140 caracteres. Se acepta aunque exceda el Presupuesto o deje el Saldo en negativo. No se permite sobre una Cuenta de inversión ni archivada. |
| Editar gasto | Exige la fecha además de los campos de registrar. Se permite sobre una Cuenta archivada mientras el Gasto siga en ella; moverlo a una Cuenta archivada o de inversión se rechaza. Ambos Saldos se recalculan. |
| Eliminar gasto | Se permite aunque su Cuenta esté archivada. El Saldo de la Cuenta se recalcula. |
| Crear presupuesto | Solo puede existir un Presupuesto por Categoría y mes. |
| Registrar compra de activos | Descuenta efectivo de una Cuenta de inversión. Se acepta sin efectivo suficiente, con un aviso. |
| Registrar venta de activos | No puede superar las unidades que hay en la Posición. |
| Editar y eliminar transacción de inversión | Se rechazan si dejan, en algún momento del historial, más unidades vendidas que poseídas. |
| Eliminar usuario | Borra también todos los datos financieros del Usuario en `api-service`. Exige volver a escribir la contraseña. |

La búsqueda de Activos se entrega con la primera compra y venta (ticket #11).
La actualización automática de precios llega después (ticket #23). Los
Saldos iniciales y el Rendimiento de cada período siguen el
[ADR 0004](adr/0004-separar-saldos-iniciales-y-rendimiento-mensual.md).
