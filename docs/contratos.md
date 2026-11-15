# Contratos verificables de Okane

Estas precisiones completan la [spec #3](https://github.com/Wcno/okane/issues/3)
y sus tickets. Mantienen los 48 casos de uso de [matrices.md](matrices.md).
Los términos se definen en [GLOSSARY.md](../GLOSSARY.md); la explicación de
los Saldos iniciales y el Rendimiento mensual está en el
[ADR 0004](adr/0004-separar-saldos-iniciales-y-rendimiento-mensual.md).

## Identidad y aislamiento

- `webapp` obtiene el Usuario de su sesión, elimina cualquier identidad de
  servicio enviada por el navegador y construye una nueva petición interna.
  `api-service` verifica la autenticidad de `webapp` mediante una credencial
  interna o firma; recibir un identificador de Usuario no basta.
- Cada lectura, escritura y referencia a otra entidad se limita al Usuario:
  Cuenta, Categoría, Presupuesto, Pago recurrente, Transferencia y Transacción
  de inversión. Usar el identificador de una entidad ajena devuelve `404` y
  no modifica nada. El mismo criterio rige para filtros y agregados.
- Las peticiones financieras sin sesión devuelven `401`; una petición que
  cambia datos con CSRF inválido se rechaza en `webapp`. Los errores de
  validación devuelven `400` con campos y mensajes que la interfaz pueda usar.
- Las rutas públicas de autenticación y el estado mínimo `/api/health` son
  excepciones explícitas al requisito de sesión; health no devuelve datos del
  Usuario ni configuración. La lectura de health no permite escrituras.
- Una credencial de servicio falsa o ausente se rechaza incluso en la red
  interna. Las dos bases de datos y `api-service` no publican puertos externos.

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
- Una Cuenta o Categoría con Pagos recurrentes vigentes requiere moverlos o
  eliminarlos antes de archivarla. Una Cuenta de inversión no admite Ingresos,
  Gastos ni Pagos recurrentes.
- El Estado de cuenta empieza por el Saldo inicial con su fecha. Cada línea
  tiene un orden estable, importe con signo y Saldo resultante; su última
  línea coincide con el Saldo consultado por la API de Cuentas.

## Pagos recurrentes

- La regla conserva su fecha de inicio. Su primer vencimiento es el primero
  igual o posterior a esa fecha; un día inexistente se ajusta al último día
  del mes. Editar la regla se aplica a los vencimientos aún no generados.
- El procesamiento crea como máximo una ocurrencia por regla y mes, incluso
  con peticiones concurrentes o reintentos. La ocurrencia y su Gasto se guardan
  en una transacción. El registro de ocurrencia se conserva aunque se elimine
  el Gasto: volver a procesar no vuelve a cobrarlo en el registro.
- Antes de devolver Saldos, Restante, Disponible o Patrimonio se procesan los
  vencimientos hasta hoy. Recuperarse tras días sin abrir la aplicación genera
  las ocurrencias debidas desde el inicio de la regla, sin duplicados.
- El despliegue proporciona un comando de procesamiento reutilizable desde
  un programador de tareas; una consulta financiera también pone el estado
  al día. No se necesita un quinto contenedor para cumplir el curso.
- Comprometido suma los vencimientos futuros del mes, ya descontados los
  generados. Disponible cuenta solo los vinculados a Cuentas de gastos;
  Restante incluye los de la Categoría aunque salgan de una Cuenta de ahorro.
  Los pagos de ahorro se muestran aparte: no reservan dinero de gastos.
- Un Gasto generado conserva la fecha del vencimiento. Editarlo o borrarlo
  afecta las cifras como cualquier Gasto y conserva la marca de generación.

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
  Los meses son enteros positivos y el aporte es no negativo. Se redondea solo
  el resultado final; se devuelve la convención junto con el resultado.
- Un mes histórico descuenta solo Gastos y vencimientos de ese período; no usa
  Pagos recurrentes actuales para rehacer automáticamente el pasado.
- El importe diario del Disponible divide entre los días desde hoy hasta el
  último del mes, incluido hoy. El último día divide entre uno; un Disponible
  negativo permanece negativo y nunca causa una división entre cero.

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
  y se libera su correo. Cada nuevo módulo incorpora sus datos a este contrato.

## Ejemplos para las pruebas HTTP

| Escenario | Resultado observable |
|---|---|
| Una Cuenta de inversión tiene Aporte neto de $100, valor previo $110 y valor actual $115 | Acumulado $15; Rendimiento del período $5, no $15 |
| Patrimonio de apertura $1,000, Ingreso $100 y Gasto $30, sin inversiones | Cierre $1,070; Ahorro neto $70; Rendimiento $0 |
| Se incorpora otra Cuenta con Saldo inicial de $500 al escenario anterior | Cierre $1,570; incorporación $500; Ahorro neto $70; Rendimiento $0 |
| Se archiva una Cuenta con $500 | El Patrimonio permanece igual y la Cuenta deja de ofrecerse para nuevos registros |
| Disponible: Cuenta de gastos $900, tarjeta −$150 y pagos futuros de gastos $200 | Disponible $550; un pago futuro de ahorro de $50 no lo reduce |
| Dos procesamientos de la misma regla mensual, incluso después de borrar su Gasto | Una ocurrencia; no se genera un segundo Gasto |
| Se inicializa un mes, se borran sus Presupuestos y se consulta de nuevo | El mes permanece vacío |
| Compra de 2 unidades a $100, venta de 1 a $150 y compra de 1 a $200, sin comisiones | 2 unidades; costo total $300; promedio $150 |
| Proyección de $1,000 al 12% nominal anual, un mes y aporte final de $100 | Saldo proyectado $1,110; interés $10; sin modificar la Cuenta |
| Se reemplaza una Cuenta propia por un identificador ajeno en una Transferencia | `404`; ninguno de los dos Saldos cambia |

Estas pruebas se escriben en los tickets que implementan cada comportamiento,
por la API HTTP acordada. Esta revisión documenta los criterios; no declara
implementado el backend ni ejecutadas esas futuras pruebas.
