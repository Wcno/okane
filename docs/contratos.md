# Contratos verificables de Okane

Estas precisiones completan la [spec #3](https://github.com/Wcno/okane/issues/3)
y sus tickets. Precisan los 58 casos de uso de [matrices.md](matrices.md).
Los términos se definen en [GLOSSARY.md](../GLOSSARY.md); la explicación de
los Saldos iniciales y el Rendimiento mensual está en el
[ADR 0004](adr/0004-separar-saldos-iniciales-y-rendimiento-mensual.md).

## Identidad y aislamiento

- `webapp` obtiene el Usuario de su sesión o del token personal validado en
  `/api/v1`, elimina cualquier identidad de servicio enviada por el cliente y
  construye una nueva petición interna.
  `api-service` verifica la autenticidad de `webapp` mediante una credencial
  interna o firma; recibir un identificador de Usuario no basta.
- Cada lectura, escritura y referencia a otra entidad se limita al Usuario:
  Cuenta, Categoría, Presupuesto, Pago recurrente, Transferencia y Transacción
  de inversión. Usar el identificador de una entidad ajena devuelve `404` y
  no modifica nada. El mismo criterio rige para filtros y agregados.
- Las rutas financieras de sesión sin sesión devuelven `401`; `/api/v1` exige
  su token aunque exista una cookie. Una petición de sesión que
  cambia datos con CSRF inválido se rechaza en `webapp`. Los errores de
  validación devuelven `400` con campos y mensajes que la interfaz pueda usar.
- Las rutas públicas de autenticación y el estado mínimo `/api/health` son
  excepciones explícitas al requisito de sesión; health no devuelve datos del
  Usuario ni configuración. La lectura de health no permite escrituras.
- Una credencial de servicio falsa o ausente se rechaza incluso en la red
  interna. Las dos bases de datos y `api-service` no publican puertos externos.
- La credencial interna es una clave compartida, configurada por entorno en
  ambos servicios, que `webapp` envía en la cabecera `X-Okane-Service-Key`.
  `api-service` la compara en tiempo constante y responde `403` si falta, no
  coincide o no hay clave configurada. La única ruta de `api-service` que no
  la exige es `/api/health`, porque la comprobación de estado del contenedor
  la consulta sin credencial. Junto a la credencial, `webapp` envía el
  identificador del Usuario autenticado en `X-Okane-User-Id`, un entero positivo;
  `api-service` responde `403` si falta o está mal formado.
  `webapp` copia al reenvío solo `Accept` y `Content-Type`: ni
  cookies, ni tokens, ni cabeceras internas del cliente llegan a `api-service`.
- Si `api-service` no responde, `webapp` contesta `502` e indica qué servicio
  falló. `/health` informa el estado de `webapp` y `webapp-db`; `/api/health`,
  el de `api-service` y `api-db`. Ambos responden `503` si su base no está
  disponible.

## Acceso, sesiones y límites de uso

- El correo se normaliza a minúsculas y es único sin distinguir mayúsculas.
  La contraseña tiene al menos diez caracteres y pasa los validadores estándar
  de Django; se guarda solo su hash y nunca aparece en logs ni respuestas.
- Un inicio de sesión fallido responde igual exista o no el correo.
- Tras cinco intentos fallidos seguidos para un mismo correo o desde un mismo
  origen en quince minutos, `/auth/login` y `/auth/forgot-password` responden
  `429` con `Retry-After` hasta que termine la ventana. Un intento correcto
  posterior a la ventana reinicia la cuenta. El límite no bloquea al Usuario
  de forma permanente ni revela si el correo existe.
- La sesión caduca tras catorce días sin uso. El enlace de restablecimiento
  caduca a la hora de emitirse. Ambos plazos se configuran y documentan.
- En `/auth/forgot-password` cuenta cada solicitud, porque ninguna puede
  distinguirse como fallida sin revelar si el correo existe; su cuenta es
  independiente de la de inicios de sesión, y restablecer la contraseña con un
  enlace reinicia ambas para ese correo y origen. El enlace sirve una sola vez, deja
  de servir al cambiar la contraseña o iniciar sesión, y se construye sobre el
  origen configurado de `webapp`, nunca sobre una cabecera de la petición.
- Restablecer la contraseña cierra todas las sesiones del Usuario. Cambiarla
  exige la contraseña actual, conserva la sesión que hace el cambio y cierra
  las demás.
- `/api/v1` admite hasta 120 peticiones por minuto por token; el exceso recibe
  `429` con `Retry-After` y no consume claves de idempotencia. Los tokens
  inválidos repetidos desde un mismo origen se limitan como los inicios de sesión.
- Estos límites se guardan en `webapp-db`; no requieren un quinto contenedor.

## Listados y calidad de la interfaz

- Todo listado paginado devuelve 50 elementos por defecto y admite hasta 200;
  un tamaño o una página fuera de rango devuelve `400`. La respuesta indica
  el total y cómo pedir la página siguiente.
- Cada pantalla se opera completa con teclado, muestra el foco, y sus controles
  tienen nombre accesible en español. El texto cumple contraste 4.5:1 y ningún
  estado se comunica solo con color, según [DESIGN.md](../DESIGN.md).
- Cada pantalla se verifica a 390 y 1440 px, en tema claro y oscuro, sin
  desplazamiento horizontal.
- Un listado sin datos indica el primer paso para llenarlo. Una falla de red
  o de `api-service` se muestra con un mensaje que dice qué pasó y permite
  reintentar, sin perder lo que el Usuario había escrito.

## Fechas y cantidades

- Las fechas financieras son días de calendario en `America/Panama`. Hoy se
  obtiene de un reloj reemplazable; se admiten fechas pasadas y hoy, nunca
  futuras para Movimientos y Transacciones de inversión.
- Cada Cuenta tiene una fecha de inicio y un Saldo inicial inmutables después
  de crearla. Su tipo también es inmutable: cambiarlo alteraría las reglas de
  los movimientos ya registrados. El Usuario puede corregir el nombre y la
  tasa anual de una Cuenta de ahorro.
- Una operación debe tener fecha igual o posterior al inicio de todas las
  Cuentas implicadas. Para cargar meses anteriores se elige esa fecha de
  inicio al crear la Cuenta, no la fecha en que se está usando la aplicación.
- Montos de Ingresos, Gastos y Transferencias son positivos; comisiones y tasa
  de ahorro admiten cero. Saldos y resultados derivados pueden ser negativos.
  Una compra requiere unidades y precio positivos; un Dividendo, monto positivo.
- Importes monetarios tienen dos decimales; unidades y precios unitarios
  admiten hasta ocho. La API usa cadenas decimales, nunca números binarios de
  punto flotante para efectuar los cálculos financieros.
- Productos y promedios conservan precisión decimal durante el cálculo. El
  efectivo se redondea a centavos con mitades alejadas de cero al registrar la
  operación; ese importe es el que utiliza el Saldo. Se rechaza una operación
  cuyo importe positivo resulte en cero centavos. El promedio no se redondea
  a centavos después de cada compra.
- Un precio manual tiene Usuario, Activo, valor y fecha. Afecta únicamente
  las valoraciones de ese Usuario; nunca modifica las de otra persona.

## Libro de movimientos y Cuentas archivadas

- Una Transferencia es una sola operación atómica: origen y destino son
  distintos, pertenecen al mismo Usuario y cambian por el mismo importe.
  Si algo falla, ninguno de los dos Saldos cambia.
- Editar o eliminar un Movimiento recalcula sus efectos desde su fecha,
  incluido el historial posterior. Las Transacciones de inversión se ordenan
  por fecha y un desempate estable; se muestra ese orden al corregir el pasado.
  Las ventas se validan dentro de la misma transacción que las registra, para
  que dos ventas concurrentes no consuman las mismas unidades.
- Archivar retira una Cuenta de los selectores para operaciones nuevas;
  conserva su Saldo, sus Posiciones y su contribución a los totales históricos
  y actuales. Archivar no crea una salida de dinero ni reduce el Patrimonio.
- Una Cuenta o Categoría con reglas vigentes requiere moverlas o eliminarlas
  antes de archivarla; también exige confirmar o cancelar sus reservas pendientes.
  Las ocurrencias históricas impiden el borrado físico de sus referencias.
  Una Cuenta de inversión no admite Ingresos, Gastos ni Pagos recurrentes.
- El Estado de cuenta empieza por el Saldo inicial con su fecha. Cada línea
  tiene un orden estable, importe con signo y Saldo resultante; su última
  línea coincide con el Saldo consultado por la API de Cuentas.
- `GET /api/expenses/{id}` devuelve un Gasto del Usuario, para abrir sus
  pantallas de edición y eliminación desde un enlace. `GET /api/expenses`
  añade a la paginación `last_used_account_id`: la Cuenta del Gasto registrado
  más recientemente por el Usuario, según el orden de registro y no la fecha del
  Gasto, o `null` si no tiene Gastos. El registro rápido la propone al abrirse.
- `GET /api/transfers/{id}` devuelve una Transferencia del Usuario, con la misma
  forma que el listado, para abrir sus pantallas de edición y eliminación desde
  un enlace; la de otro Usuario responde `404`.

## Pagos recurrentes

- La regla guarda fecha de inicio, monto, Cuenta, Categoría y día mensual.
  El primer vencimiento es el primero igual o posterior al inicio; un día
  inexistente se ajusta al último del mes. No se rellenan meses previos al inicio.
- Antes de responder cifras financieras se materializan las ocurrencias desde
  el inicio hasta el fin del mes actual, incluyendo meses sin uso. Una restricción
  única por regla y mes evita duplicados concurrentes. Se puede reutilizar este
  proceso desde un comando programado, sin agregar contenedores.
- Cada ocurrencia conserva una copia de monto, Cuenta, Categoría, vencimiento y
  fecha de entrada en la reserva. Entra al comienzo de su mes o al inicio de la
  regla si es posterior. Crear o vencer una reserva no crea Gastos ni cambia Saldo.
- Estados: `pending`, `confirmed`, `cancelled`. Solo se puede resolver una
  pendiente. Confirmar revisa monto positivo, Cuenta propia de gastos/ahorro y
  fecha real (hoy o pasada, nunca anterior a su entrada en la reserva ni al inicio
  de la Cuenta). Usa la Categoría conservada, crea un Gasto y libera la reserva
  en una transacción. La fecha propuesta es hoy, no el vencimiento.
- Cancelar libera sin Gasto, con fecha efectiva de hoy. Confirmaciones repetidas
  con idénticos datos devuelven el resultado original; datos distintos, confirmar
  una cancelada o cancelar una confirmada devuelven `409`. Cancelar de nuevo es
  idempotente. Concurrencia entre confirmar y cancelar solo permite un resultado.
- Las pendientes vencidas continúan comprometidas en meses siguientes. Cada
  mes suma las nuevas reservas y el arrastre; no vuelve a contar una ocurrencia
  dentro del mismo corte. Disponible resta solo las de Cuentas de gastos;
  Restante resta las de la Categoría, incluidas las de ahorro, y muestra el arrastre.
- Para el mes actual el corte es hoy; para meses pasados, el último día del mes.
  Se suma una reserva si entró a más tardar al corte, vence a más tardar al cierre de
  ese mes y su resolución efectiva aún no ocurrió al corte. Se guardan tanto la
  fecha efectiva como la fecha de registro de la resolución. Consultar el pasado
  no utiliza la versión actual de una regla ni crea nuevas reglas históricas.
- El Gasto confirmado afecta el mes de su fecha real. Pagar en diciembre una
  reserva de noviembre conserva la reserva en el corte de noviembre y registra
  el Gasto en diciembre. Una confirmación retroactiva recalcula desde su fecha
  efectiva: es una corrección explícita del Usuario, nunca un cambio automático.
- Editar una regla afecta solo ocurrencias no materializadas; eliminarla detiene
  las futuras y conserva todas las existentes, incluidas las pendientes. Antes de
  editar/eliminar se materializa el estado debido, sin omitir meses sin uso.
- Editar o borrar el Gasto confirmado aplica las reglas de Gastos sin reabrir la
  reserva ni borrar su resolución original. La interfaz advierte este efecto y
  conserva el vínculo de auditoría incluso tras el borrado del Gasto.
- Saldo o Disponible negativos se informan, sin bloquear un Gasto válido. No
  existe una opción de Configuración para activar cobros automáticos o bloqueos.

## Presupuestos y Proyección

- La unicidad del Presupuesto es por Usuario, Categoría y mes. Las Categorías
  ajenas o archivadas no se admiten en un Presupuesto nuevo.
- La copia mensual se ejecuta una vez por Usuario y mes actual, en una
  transacción, y solo copia desde el mes calendario inmediatamente anterior
  si el mes actual aún no tiene Presupuestos. Un mes ya personalizado se marca
  como inicializado sin sobrescribir sus datos. Los meses históricos consultados
  no se rellenan automáticamente.
- La inicialización se registra incluso si no hay nada para copiar. Eliminar
  todos los Presupuestos de un mes no vuelve a disparar la copia. Reintentos y
  consultas simultáneas no duplican filas; archivar Categorías las excluye.
- La Proyección usa una tasa anual nominal: tasa mensual = anual / 12.
  El aporte hipotético se incorpora al final de cada mes, después del interés.
  Los meses son enteros positivos y el aporte es no negativo. Se redondean solo
  las salidas; se devuelve la convención junto con el resultado.
- Un mes histórico descuenta los Gastos de ese mes y las reservas pendientes
  al corte, incluido su arrastre, según las fechas de resolución conservadas.
- La Proyección admite Cuenta de ahorro, Cuenta de inversión o portafolio.
  Capital inicial editable no negativo, aporte no negativo, plazo entero positivo,
  de uno a tres escenarios. Una valoración inicial negativa se muestra y exige
  introducir un capital hipotético válido; un precio desconocido no vale cero.
  Predeterminados: capital de la selección, aporte cero, doce meses, tasa cero.
  Ahorro admite tasa no negativa; inversión admite tasa nominal anual mayor que
  −1200% (factor mensual positivo), incluyendo pérdidas. La interfaz expresa
  la tasa en porcentaje y la API como razón decimal (12% = `"0.12"`).
- Cada mes aplica `capital * (1 + annual_rate / 12) + monthly_contribution`.
  Capital aportado = capital inicial + aportes; resultado = capital final menos
  capital aportado. Se conserva precisión interna y se redondean solo salidas,
  incluida cada fila mensual sin realimentar el redondeo al siguiente cálculo.
  Las simulaciones no modifican Cuentas, tasas guardadas ni registros reales.
- El importe diario del Disponible divide entre los días desde hoy hasta el
  último del mes, incluido hoy. El último día divide entre uno; un Disponible
  negativo permanece negativo y nunca causa una división entre cero.

## Vista de Movimientos y preferencias

- `GET /api/movements` agrega `income`, `expense`, `transfer`, `buy`,
  `sell`, `dividend` sin fusionar sus modelos. Cada elemento tiene identidad
  compuesta por tipo e ID, fecha, monto, Cuentas y detalle específico.
- Filtra por tipo, Cuenta y rango de fechas inclusivo. Una Transferencia coincide
  por cualquiera de sus Cuentas y aparece una vez aun cuando ambas coincidan.
  Orden: fecha descendente y desempate estable por tipo e ID; la paginación
  mantiene ese orden. Filtros con referencias ajenas devuelven `404`.
- Las rutas de consulta previas son alias filtrados de `/movements`; sus
  endpoints y formularios especializados siguen disponibles para el curso.
- `/settings` guarda preferencias por Usuario: filtros predeterminados,
  agrupación `date` o `type` y secciones visibles del Panel. Inicialmente
  todos los tipos, mes actual, orden descendente y todas las secciones disponibles.
  El mes actual es relativo, no una fecha congelada al guardar. Los filtros
  explícitos de una URL prevalecen; volver a la vista sin parámetros usa preferencias.
- Ocultar una sección nunca modifica cálculos ni permisos; las advertencias al
  registrar un Gasto siguen visibles. Las preferencias se validan, se conservan
  entre sesiones y se borran al eliminar al Usuario.

## API pública autenticada

- Única entrada externa: `webapp`, bajo `/api/v1`, con
  `Authorization: Bearer <token>`. Rechaza token ausente, inválido o revocado
  con `401` y permiso insuficiente con `403`; una cookie no sustituye al token.
  La identidad del cuerpo o cabeceras del cliente nunca elige al Usuario interno.
- En `/settings/integrations`, mediante sesión y CSRF, se crean, listan y revocan
  tokens. Se eligen `finance:read` y/o `movements:create` explícitamente.
  El secreto aleatorio se muestra solo al crearlo, se almacena únicamente su hash
  en `webapp-db` y nunca se escribe en logs ni URLs. La lista muestra nombre,
  prefijo identificador, permisos, creación y revocación, nunca el secreto.
- Revocar corta las peticiones posteriores; cerrar sesión no revoca tokens.
  Cambiar/restablecer contraseña revoca todos los tokens. Eliminar al Usuario
  bloquea tokens junto con las sesiones antes del borrado financiero.
- Lecturas con `finance:read`: `GET /api/v1/accounts` (incluye Saldos),
  `GET /api/v1/budgets` (incluye gastado, Comprometido y Restante),
  `GET /api/v1/movements`. Se aplican aislamiento, filtros y paginación.
  IDs de Categorías y Activos se obtienen desde la aplicación en esta versión.
- Escritura con `movements:create`: `POST /api/v1/movements` con unión tipada
  por `type`. Campos comunes: `type`, `date`, `description` opcional;
  Ingreso: `account_id, amount`; Gasto añade `category_id`;
  Transferencia: `source_account_id, destination_account_id, amount`;
  compra/venta: `account_id, asset_id, units, unit_price` y `commission` opcional;
  Dividendo: `account_id, asset_id, amount`. Decimales como cadenas.
- Las escrituras invocan las mismas reglas financieras de la aplicación: fechas,
  Cuentas propias existentes, Cuenta de inversión cerrada, validación de unidades
  y atomicidad. No crean Cuentas ni Activos. Registrar un Gasto por API no confirma
  una reserva; esa relación se resuelve explícitamente desde la aplicación.
- `Idempotency-Key` es obligatorio. La clave se delimita por Usuario y operación,
  compartida entre sus tokens. Se guarda huella canónica del contenido y resultado
  en `api-db`, atómicamente con el registro financiero. Reintentos idénticos,
  incluso concurrentes o tras una respuesta perdida, devuelven el original;
  otro contenido con esa clave devuelve `409`. Se conserva durante la vida del
  Usuario, incluso si luego se elimina el registro. Los permisos se verifican
  antes de devolver un resultado guardado. Errores de validación no consumen clave.
- Primera creación: `201`; repetición exitosa: `200`; campo inválido o clave
  ausente: `400`; referencia ajena: `404`. El cuerpo identifica tipo e ID del
  registro. El contrato OpenAPI que entregue el ticket documentará los seis
  esquemas, filtros, paginación, permisos y respuestas con ejemplos verificables.
- El ejemplo de Google Apps Script usa un token guardado en propiedades del
  script y conserva la misma clave para reintentar una operación. No se entrega
  OAuth, sincronización automática, edición/borrado externo ni gestión de reglas.

## Activos, Posiciones y precios

- El ticket #11 incluye la búsqueda `GET /api/investments/assets/search` y
  el catálogo persistido con identidad estable del proveedor y mercado.
  El símbolo no es una clave global ni se acepta texto libre como Activo.
  El ticket #23 añade la actualización automática, no la selección inicial.
- El proveedor se elige al implementar #11 tras comprobar en fuentes oficiales
  sus condiciones y límites. Las pruebas usan un adaptador de prueba. Si el
  proveedor falla, se pueden seleccionar Activos ya conocidos del catálogo;
  si no hay resultados conocidos, la interfaz informa la indisponibilidad.
- En #11, el precio de la última operación conocida es el respaldo de un
  Precio de referencia ausente; se muestra su origen y fecha. El respaldo de
  un cierre usa solo operaciones con fecha igual o anterior a ese cierre.
- El costo promedio se lleva por Cuenta y Activo. Una venta reduce unidades
  y costo por el promedio previo; la próxima compra no mezcla el precio de
  venta con el costo. Una Posición que llega a cero reinicia su costo.
- Una comisión de compra se incorpora al costo; una de venta reduce el
  efectivo recibido. Agrupar un Activo de varias Cuentas suma unidades y
  costos, y calcula un promedio ponderado; no promedia promedios sin pesos.
- El porcentaje de una Posición usa como denominador el valor total de las
  Posiciones, sin efectivo. Con denominador cero el porcentaje no aplica.
  El porcentaje de Rendimiento tampoco aplica si el Aporte neto no es positivo.
- La consulta automática guarda la fecha real del dato y su origen; una
  respuesta tardía no reemplaza un dato manual más reciente por uno anterior.
  Cada cierre histórico usa datos conocidos a esa fecha. Un respaldo estimado
  se identifica como tal; la falta de precio no se presenta como valor cero.

## Patrimonio y Rendimiento por período

- Rendimiento acumulado = efectivo de inversión + valor de Posiciones −
  Aporte neto, incluido el Saldo inicial de inversión.
- Rendimiento de un período = acumulado al cierre − acumulado al inicio.
  Los Aportes entre Cuentas de inversión se cancelan al agregar el portafolio.
- Patrimonio final − Patrimonio inicial = Saldos iniciales incorporados en el
  período + Ahorro neto del período + Rendimiento del período. La interfaz
  muestra la incorporación aparte; no la llama ahorro ni Rendimiento.
- Una Cuenta nueva aparece en su fecha de inicio del registro. El primer punto
  de la serie declara el Patrimonio de apertura; posteriores períodos tienen
  un cierre inicial y final explícitos. El período actual cierra en hoy.
- Se conservan Cuentas archivadas en las valoraciones y se distingue una serie
  reconstruida con precios estimados de una con precios históricos obtenidos.
- `GET /api/net-worth/history` devuelve períodos, fechas de corte, Patrimonio,
  Ahorro neto, Rendimiento del período, incorporación de Saldos iniciales y
  procedencia de los precios. Las cifras del Panel coinciden con esa serie.

## Eliminar un Usuario entre las dos bases

- Exige contraseña actual. Se bloquean nuevas escrituras mientras se elimina
  la información financiera. El borrado interno es autenticado e idempotente.
- Si falla antes de completar el borrado financiero, se conserva el Usuario
  para permitir el reintento. Un resultado incierto se reconcilia antes de
  declarar éxito; una sesión anterior no puede crear datos después del borrado.
- Solo al completar el borrado se elimina el Usuario, se invalidan sus sesiones
  y sus tokens, se borran preferencias e idempotencia, y se libera su correo.
  Cada nuevo módulo incorpora sus datos a este contrato.

## Ejemplos para las pruebas HTTP

| Escenario | Resultado observable |
|---|---|
| Una Cuenta de inversión tiene Aporte neto de $100, valor previo $110 y valor actual $115 | Acumulado $15; Rendimiento del período $5, no $15 |
| Patrimonio de apertura $1,000, Ingreso $100 y Gasto $30, sin inversiones | Cierre $1,070; Ahorro neto $70; Rendimiento $0 |
| Se incorpora otra Cuenta con Saldo inicial de $500 al escenario anterior | Cierre $1,570; incorporación $500; Ahorro neto $70; Rendimiento $0 |
| Se archiva una Cuenta con $500 | El Patrimonio permanece igual y la Cuenta deja de ofrecerse para nuevos registros |
| Disponible: Cuenta de gastos $900, tarjeta −$150 y pagos futuros de gastos $200 | Disponible $550; un pago futuro de ahorro de $50 no lo reduce |
| Materializar o vencer dos veces la misma regla | Una reserva pendiente, ningún Gasto ni cambio de Saldo |
| Saldo $1,000, reserva $100; confirmar por $120 dos veces | Un Gasto; Saldo $880, Comprometido $0, Disponible $880 (antes $900) |
| Presupuesto $300, reserva de noviembre $100 pendiente en diciembre; regla detenida y sin otras reservas; cancelar en diciembre | Noviembre conserva Restante $200; diciembre libera $100 sin Gasto |
| La reserva anterior se paga en diciembre por $120, con Presupuesto $300 | Noviembre conserva Restante $200; diciembre tiene Gasto $120 y Restante $180, sin doble descuento |
| Proyección $1,000, un mes, aporte $100, tasa anual −12% | Capital final $1,090; aportado $1,100; resultado −$10 |
| Reintentar una creación de API con igual clave y contenido | Un registro; otro contenido con la misma clave devuelve `409` |
| Se inicializa un mes, se borran sus Presupuestos y se consulta de nuevo | El mes permanece vacío |
| Compra de 2 unidades a $100, venta de 1 a $150 y compra de 1 a $200, sin comisiones | 2 unidades; costo total $300; promedio $150 |
| Proyección de $1,000 al 12% nominal anual, un mes y aporte final de $100 | Saldo proyectado $1,110; interés $10; sin modificar la Cuenta |
| Se reemplaza una Cuenta propia por un identificador ajeno en una Transferencia | `404`; ninguno de los dos Saldos cambia |
| Seis inicios de sesión fallidos seguidos con el mismo correo | El sexto devuelve `429` con `Retry-After`, con la misma respuesta para un correo inexistente |
| Se pide un listado con tamaño de página 500 | `400`; con tamaño omitido devuelve 50 elementos y el total |

Estas pruebas se escriben en los tickets que implementan cada comportamiento,
por la API HTTP acordada. Esta revisión documenta los criterios; no declara
implementado el backend ni ejecutadas esas futuras pruebas.
