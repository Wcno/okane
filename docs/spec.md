# Especificación de Okane

Estado: **pendiente de revisión del equipo; implementación sin iniciar**.
Esta es la fuente versionada de la spec. El [issue #3](https://github.com/Wcno/okane/issues/3)
coordina su revisión y los tickets derivados enumerados en [plan-de-trabajo.md](plan-de-trabajo.md).

## Idioma y autorización para implementar

La interfaz pública, validaciones y etiquetas accesibles están en español.
El código, identificadores, nombres de archivos fuente, comentarios y
nombres de pruebas se escriben en inglés, según [code-language.md](code-language.md).
Las precisiones de esta revisión, incluidos los ADR 0004 y 0005, se presentan al equipo
antes de implementar. Se conserva el frontend de demostración; ningún ticket
del plan se considera iniciado ni completado por esta preparación.

El flujo es **spec → tickets con criterios y dependencias → revisión del equipo →
decisión de inicio → implementación**. La agenda está en [team-review.md](team-review.md).

## Problem Statement

Una persona asalariada que lleva sus finanzas a mano conoce el saldo de su banco, pero ese número no le dice cuánto puede gastar: parte está comprometida en pagos que aún no vencen y parte la apartó para ahorrar o invertir. Para responder "¿cuánto puedo gastar hasta fin de mes?" tiene que reunir los movimientos de varias cuentas y compararlos con su presupuesto.

Con sus inversiones le pasa algo parecido: ve que su patrimonio subió o bajó, pero no sabe si fue porque ahorró o porque sus acciones y criptomonedas cambiaron de valor, porque el dinero que aportó y lo que este rindió están mezclados.

## Solution

Okane es una aplicación web que reúne el presupuesto mensual y el portafolio de inversión del Usuario. Al abrirla, el Panel le da dos respuestas sin que calcule nada:

1. **Disponible:** cuánto puede gastar hasta fin de mes, que es el Saldo de sus Cuentas de gastos menos lo Comprometido en Ocurrencias de pago pendientes (incluidas las vencidas) vinculadas a esas mismas Cuentas.
2. **Variación del Patrimonio:** cuánto cambió este mes y qué parte se debe al Ahorro neto (Ingresos menos Gastos) y cuál al Rendimiento de ese período. Los Saldos iniciales de Cuentas incorporadas se muestran aparte; no son ahorro ni ganancia.

Toda cifra se puede explicar con lo que el Usuario registró. El sistema informa, no autoriza: acepta un gasto que excede el presupuesto o deja un saldo negativo, y lo señala.

El vocabulario es el de `GLOSSARY.md`. Los 58 casos de uso, con sus rutas y endpoints, están en `docs/matrices.md`.

## User Stories

### Autenticación y usuarios

1. Como visitante, quiero registrarme con mi correo y una contraseña, para empezar a llevar mis finanzas.
2. Como Usuario, quiero iniciar sesión, para acceder solo a mis propios datos.
3. Como Usuario, quiero cerrar sesión y que el acceso se corte de inmediato, para que nadie más use mi sesión en ese dispositivo.
4. Como Usuario que olvidó su contraseña, quiero recibir un correo con un enlace de un solo uso que expira, para recuperar el acceso sin ayuda.
5. Como Usuario, quiero restablecer mi contraseña desde ese enlace, para volver a entrar.
6. Como Usuario, quiero cambiar mi contraseña desde mi perfil, para mantener mi cuenta segura.
7. Como Usuario, quiero eliminar mi usuario escribiendo de nuevo mi contraseña, para que se borren todos mis datos, incluidos los financieros.
8. Como Usuario, quiero que nadie más pueda ver ni modificar mis datos, para confiarle al sistema mi información financiera.

### Cuentas

9. Como Usuario, quiero crear una Cuenta de tipo gastos, ahorro o inversión con su Saldo inicial y fecha de inicio del registro, para reflejar dónde está mi dinero y desde cuándo.
10. Como Usuario, quiero ver mis Cuentas con su Saldo, para saber cuánto tengo en cada una.
11. Como Usuario, quiero que el Saldo se calcule a partir de lo que registré y no se pueda escribir a mano, para poder explicar cada cifra.
12. Como Usuario, quiero editar el nombre de una Cuenta y, en una de ahorro, su tasa de interés anual, para mantenerla al día.
13. Como Usuario con tarjeta de crédito, quiero registrarla como una Cuenta de gastos con Saldo negativo, para que lo que debo reste de lo que puedo gastar.
14. Como Usuario, quiero eliminar una Cuenta que creé por error y que no tiene movimientos, para limpiar mi lista.
15. Como Usuario, quiero que una Cuenta con movimientos se archive en lugar de borrarse, para conservar mi historial.
16. Como Usuario, quiero ver el Estado de cuenta de una Cuenta, para compararlo con el de mi banco y encontrar un error de registro.

### Movimientos

17. Como Usuario, quiero registrar un Gasto con solo el monto y la Categoría, para anotarlo en segundos desde el teléfono.
18. Como Usuario, quiero que la fecha parta en hoy y la Cuenta en la última que usé, para no repetir datos.
19. Como Usuario, quiero registrar un Gasto con fecha pasada, para ponerme al día con lo que no anoté.
20. Como Usuario, quiero que el sistema no acepte un Gasto con fecha futura, para que lo futuro viva solo en los Pagos recurrentes.
21. Como Usuario, quiero que un Gasto se registre aunque exceda el Presupuesto o deje el Saldo en negativo, porque el gasto ya ocurrió.
22. Como Usuario, quiero ver al registrar un Gasto cómo queda el Restante de su Categoría, para conocer la consecuencia.
23. Como Usuario, quiero consultar, editar y eliminar mis Gastos, para corregir errores.
24. Como Usuario, quiero registrar un Ingreso en una Cuenta, para que mi salario y los intereses del banco aumenten mi Saldo.
25. Como Usuario, quiero consultar, editar y eliminar mis Ingresos, para corregir errores.
26. Como Usuario, quiero registrar una Transferencia entre dos de mis Cuentas, para mover dinero al ahorro sin que cuente como gasto.
27. Como Usuario, quiero consultar, editar y eliminar mis Transferencias, para corregir errores.
28. Como Usuario, quiero registrar un Gasto desde cualquier pantalla, para no tener que navegar antes de anotarlo.

### Presupuesto

29. Como Usuario, quiero definir un Presupuesto para una Categoría en un mes, para ponerle un límite a ese gasto.
30. Como Usuario, quiero consultar, editar y eliminar mis Presupuestos, incluidos los de meses pasados, para ajustarlos.
31. Como Usuario, quiero que solo exista un Presupuesto por Categoría y mes, para no tener límites contradictorios.
32. Como Usuario, quiero ver el Restante de cada Categoría, descontando lo gastado y lo Comprometido, para saber cuánto me queda de verdad.
33. Como Usuario, quiero ver marcada como excedida una Categoría cuyo Restante es negativo, para darme cuenta a tiempo.
34. Como Usuario, quiero ver cuánto gasté en una Categoría sin Presupuesto, para decidir si le pongo uno.
35. Como Usuario, quiero que un mes nuevo empiece con los Presupuestos del anterior, para no recrearlos cada mes.
36. Como Usuario, quiero crear, renombrar y archivar mis propias Categorías, para que el presupuesto refleje cómo gasto.
37. Como Usuario, quiero que una Categoría con Gastos se archive y no se borre, para conservar mi historial.

### Pagos recurrentes

38. Como Usuario, quiero crear un Pago recurrente con monto, Categoría, Cuenta y día del mes, para reservar el dinero de mis pagos fijos.
39. Como Usuario, quiero confirmar cada pago realizado para crear su Gasto y liberar la reserva una sola vez, sin confundir un vencimiento con un pago real.
40. Como Usuario, quiero revisar monto, Cuenta y fecha al confirmar un pago, para registrar lo que realmente pagué.
41. Como Usuario, quiero ver las reservas del mes y las vencidas aún pendientes, para conocer todo mi Comprometido aunque cambie el mes.
42. Como Usuario, quiero que un pago del día 31 venza el último día en los meses más cortos, para no perder un pago.
43. Como Usuario, quiero editar o eliminar una regla sin alterar ocurrencias existentes ni Gastos confirmados, para conservar mi pasado y resolver explícitamente los pendientes.

### Panel

44. Como Usuario, quiero ver al entrar mi Disponible hasta fin de mes, para saber cuánto puedo gastar.
45. Como Usuario, quiero ver de qué sale el Disponible (Saldo de las Cuentas de gastos menos lo Comprometido), para confiar en la cifra.
46. Como Usuario, quiero ver cuánto es por día durante los días que quedan del mes, para dosificar mi gasto.
47. Como Usuario, quiero ver mi Patrimonio y su variación del mes separada en Ahorro neto y Rendimiento del período, con las incorporaciones de Saldos iniciales identificadas aparte, para saber a qué se debe.
48. Como Usuario, quiero ver la evolución mensual de mi Patrimonio en un gráfico y en una tabla, para ver la tendencia.
49. Como Usuario, quiero que esa evolución incluya los meses anteriores a que empecé a usar Okane, si registré sus movimientos, para no ver un gráfico vacío.
50. Como Usuario, quiero usar el Panel igual de bien en el teléfono y en la computadora, en tema claro u oscuro.

### Proyección de ahorro e inversión

51. Como Usuario, quiero proyectar una Cuenta de ahorro, una Cuenta de inversión o mi portafolio con capital, tasa anual hipotética, plazo y aporte mensual editables, para planificar una meta.
52. Como Usuario, quiero que la Proyección no cree movimientos ni cambie mi Saldo, para no confundir lo que pasó con lo que podría pasar.

### Portafolio de inversión

53. Como Usuario, quiero fondear mi Cuenta de inversión con una Transferencia, para que cuente como Aporte.
54. Como Usuario, quiero elegir un Activo buscándolo por símbolo o nombre, para no escribir texto libre ni crear duplicados.
55. Como Usuario, quiero registrar la compra de un Activo, incluso en unidades fraccionarias y con comisión opcional, para reflejar lo que hice en mi bróker.
56. Como Usuario, quiero registrar la venta de un Activo, sin poder vender más unidades de las que tengo.
57. Como Usuario, quiero que una compra sin efectivo suficiente se acepte con un aviso, para cargar mi historial sin un orden estricto.
58. Como Usuario, quiero registrar un Dividendo, para que el efectivo de mi Cuenta cuadre con el de mi bróker.
59. Como Usuario, quiero consultar, editar y eliminar mis Transacciones de inversión, y que el sistema rechace un cambio que deje más unidades vendidas que poseídas en algún momento.
60. Como Usuario, quiero ver mis Posiciones con sus unidades, costo promedio, valor y porcentaje del portafolio, agrupadas por Activo.
61. Como Usuario, quiero que el Precio de referencia se actualice solo y poder corregirlo a mano, para no digitar precios a diario.
62. Como Usuario, quiero ver de qué fecha es cada Precio de referencia, para saber qué tan vigente es el valor.
63. Como Usuario, quiero ver el Rendimiento de mi portafolio separado de mi Aporte neto, para saber cuánto gané o perdí de verdad.
64. Como Usuario, quiero un panel de inversiones con el valor total, el Aporte neto, el Rendimiento y la distribución por Activo.

### Movimientos, Configuración e integraciones

65. Como Usuario, quiero cancelar una Ocurrencia de pago pendiente y liberar su reserva sin crear un Gasto.
66. Como Usuario, quiero consultar Ingresos, Gastos, Transferencias, compras, ventas y Dividendos en una sola vista.
67. Como Usuario, quiero filtrar esa vista por tipo, Cuenta y período, viendo cada Transferencia una sola vez.
68. Como Usuario, quiero guardar mis filtros y agrupación preferidos para recuperar mi forma de consultar los datos.
69. Como Usuario, quiero elegir las secciones visibles sin cambiar las reglas financieras ni ocultar las consecuencias al registrar un Gasto.
70. Como Usuario, quiero comparar hasta tres escenarios de Proyección, incluidas rentabilidades negativas para inversiones.
71. Como Usuario, quiero distinguir capital aportado, resultado proyectado y evolución mensual de cada escenario.
72. Como Usuario, quiero crear un token personal con permisos elegidos y ver su secreto una sola vez para integrar mis herramientas.
73. Como Usuario, quiero consultar y revocar mis tokens para controlar el acceso externo a mis datos.
74. Como Usuario, quiero leer mis Cuentas, Saldos, Presupuestos y los seis tipos de registros mediante una API autenticada.
75. Como Usuario, quiero crear esos seis tipos de registros sobre Cuentas existentes mediante la API, con las mismas reglas que la aplicación.
76. Como Usuario, quiero reintentar una creación desde Google Apps Script sin duplicar registros financieros.

## Implementation Decisions

**Arquitectura**

- Cuatro contenedores, fijados por el curso y levantados con un solo archivo de Docker Compose: `webapp` (React servido por Django), `webapp-db`, `api-service` (Django REST) y `api-db`, ambas bases en PostgreSQL.
- El navegador solo habla con `webapp`. Django mantiene la sesión con cookie para la aplicación y autentica tokens personales para `/api/v1`; reenvía cada llamada financiera a `api-service` por la red interna, obteniendo el Usuario de la sesión o del token validado y descartando identidades internas enviadas por el cliente (ADR 0001 y propuesta ADR 0005). `api-service` valida la autenticidad de `webapp` mediante una credencial o firma. Las rutas de autenticación y el estado mínimo `/api/health` son excepciones explícitas al requisito de sesión.
- `api-db` no tiene llave foránea hacia los usuarios: guarda el identificador de Usuario que recibe. Eliminar un Usuario hace que `webapp` pida a `api-service` borrar sus datos.
- Rutas, endpoints y tablas son los de `docs/matrices.md`; los 28 casos originales de la Asignación 5 conservan nombre, ruta y endpoint.

**Módulos de `api-service`**

- *Libro de movimientos:* Cuentas, Ingresos, Gastos, Transferencias y el cálculo del Saldo y del Estado de cuenta. El Saldo nunca se almacena ni se edita: se deriva del saldo inicial y de lo registrado (ADR 0002).
- *Presupuesto:* Categorías, Presupuestos, Pagos recurrentes, y el cálculo de Comprometido, Restante y Disponible.
- *Portafolio:* Activos, Transacciones de inversión, Posiciones con costo promedio, Aporte neto y Rendimiento. La Cuenta de inversión guarda efectivo y solo se fondea por Transferencia (ADR 0003).
- *Cotizaciones:* un adaptador detrás de una interfaz pequeña (buscar un Activo, precio actual, precio de cierre de un mes). Guarda cada Precio de referencia con su fecha; si el servicio falla, se usa el último conocido.
- *Patrimonio:* la serie mensual y su descomposición en Ahorro neto y Rendimiento.
- *Reloj:* la fecha de hoy se obtiene de una sola función reemplazable, en hora de Panamá.

**Reglas de cálculo**

- Disponible = suma de los Saldos de las Cuentas de gastos − Comprometido vinculado a esas mismas Cuentas.
- Comprometido = reservas pendientes con vencimiento hasta el fin del mes consultado, incluidas las atrasadas; se evalúan al corte de ese período.
- Restante = Presupuesto − gastado − Comprometido de la Categoría.
- Rendimiento de una Cuenta de inversión = valor actual (Posiciones + efectivo) − Aporte neto. El saldo inicial de esa Cuenta cuenta como primer Aporte.
- Rendimiento del período = Rendimiento acumulado al cierre − Rendimiento acumulado al inicio.
- Variación mensual del Patrimonio = Saldos iniciales incorporados + Ahorro neto + Rendimiento del período. La incorporación de dinero ya existente se muestra separada; con cobertura constante permanecen los dos componentes originales (ADR 0004).
- Proyección: tasa anual nominal dividida entre 12, capitalización mensual y aporte opcional al final de cada mes. Plazo entero positivo, aporte no negativo y redondeo del resultado final.
- Los importes monetarios usan decimal exacto de dos cifras; unidades y precios unitarios admiten hasta ocho. Se conserva precisión en productos y promedios y se redondea el efectivo al registrar la operación. La API transmite cadenas decimales. Una sola moneda, dólares.

**Comportamiento**

- Cada regla reserva una ocurrencia única por mes, sin crear Gastos ni modificar Saldos. Las consultas recuperan reservas desde el inicio de la regla hasta el cierre del mes actual. Solo confirmar crea el Gasto y libera la reserva atómicamente; cancelar libera sin Gasto. Las pendientes vencidas siguen comprometidas al cambiar de mes. Editar la regla afecta solo ocurrencias aún no materializadas; eliminarla detiene las futuras y conserva las existentes. Los estados y fechas permiten reconstruir cortes históricos según los [contratos](contratos.md).
- El mes actual se inicializa una vez por Usuario; si no tiene Presupuestos, copia los del mes calendario anterior, excepto los de Categorías archivadas. La marca de inicialización se conserva aunque se borren todos los Presupuestos.
- Mientras las Categorías propias no existan, las Categorías son un catálogo fijo del sistema.
- El Usuario se identifica con su correo. El registro no exige verificarlo. En desarrollo los correos se imprimen en la consola.

**Frontend**

- React con TypeScript y Tailwind CSS, siguiendo `DESIGN.md`. Cada pantalla se verifica en teléfono y en PC, en tema claro y oscuro.
- El Panel y la navegación ya existen con datos de ejemplo. Al conectar la API, las reglas de cálculo que hoy viven en el frontend se eliminan: el frontend muestra lo que `api-service` calcula.

**Vista de Movimientos y Configuración**

- Una entrada principal `/movements` reúne los seis tipos con filtros por tipo, Cuenta y período. Una Transferencia aparece una sola vez con origen y destino; el orden descendente por fecha tiene desempate estable y paginación.
- Se conservan las rutas originales: `/expenses`, `/incomes`, `/transfers` y `/investments/transactions` abren la misma vista con su filtro. Formularios y modelos especializados permanecen separados.
- En `/settings`, cada Usuario guarda filtros predeterminados, agrupación por fecha o tipo y secciones visibles. Valores iniciales: todos los tipos, mes actual y fecha descendente. Las preferencias no cambian cálculos, permisos ni confirmación manual de pagos.

**Proyección ampliada**

- Una Cuenta de ahorro parte de su Saldo; una de inversión, de efectivo más Posiciones; el portafolio suma sus Cuentas de inversión sin duplicar Aportes internos. Se muestra fecha y procedencia de la valoración.
- Se comparan de uno a tres escenarios. Capital inicial, aporte mensual, plazo y tasa anual hipotética son editables. Valores iniciales: capital seleccionado, aporte cero, doce meses y tasa cero hasta introducir un supuesto; la tasa de ahorro guardada puede usarse mediante selección explícita.
- Se muestran capital aportado, resultado proyectado y serie mensual con la misma convención nominal anual / 12 y aportes al cierre. Se admiten tasas negativas de inversión según los límites de [contratos](contratos.md). No se crean registros reales.

**API pública autenticada**

- `/api/v1` entra por `webapp`; `api-service` permanece interno y valida la identidad reenviada. Los cuatro contenedores se conservan. Véase la propuesta [ADR 0005](adr/0005-public-api-through-webapp.md).
- Configuración permite crear, listar y revocar tokens personales con permisos `finance:read` y `movements:create`. El secreto se muestra una sola vez y solo se guarda su hash; cada token pertenece a un Usuario.
- La API consulta Cuentas, Saldos, Presupuestos y Movimientos, y crea los seis tipos sobre Cuentas existentes utilizando las mismas reglas de la aplicación. Cada creación exige una clave de idempotencia; un reintento idéntico devuelve el original y otro contenido con la misma clave produce conflicto.
- El ticket de API entrega OpenAPI y un ejemplo para Google Apps Script. Esta preparación especifica el contrato; todavía no publica un servicio operativo.

**Orden de construcción**

Los niveles expresan prioridad de producto; las dependencias imprescindibles pueden adelantarse. La cronología de los 25 tickets se mantiene en el [plan de trabajo](plan-de-trabajo.md). La búsqueda de Activos se entrega en #11; #23 añade la actualización automática de precios.

1. Los 28 casos originales.
2. Lo que la descripción y el feedback acordado prometen: Ingresos, Transferencias, reservas y confirmación de pagos, Panel, Movimientos unificados, preferencias, Proyección de inversiones, API pública y corrección del Precio de referencia.
3. Diferenciadores: Categorías propias, Estado de cuenta, Dividendos, precios automáticos, evolución del Patrimonio. Si falta tiempo, se recorta desde aquí.

## Testing Decisions

Una buena prueba ejercita el comportamiento que el Usuario observa (una petición y su respuesta, o una pantalla), no la estructura interna, y sigue pasando si el código se reorganiza.

Tres puntos de prueba propuestos para revisión del equipo:

1. **API HTTP de `api-service`.** Es el punto principal: todas las reglas financieras se prueban aquí, con peticiones reales contra una base PostgreSQL de prueba y la identidad del Usuario en la petición. Ejemplo: crear dos Cuentas, registrar un Ingreso, un Gasto y un Pago recurrente por vencer, y comprobar el Disponible que devuelve el Panel.
2. **Superficie HTTP de `webapp`.** Registro, inicio y cierre de sesión, recuperación de contraseña, que una petición sin sesión ni token válido no llegue a `api-service`, y que el reenvío lleve la identidad correcta.
3. **Punta a punta en un navegador real.** Unas pocas pruebas que recorren `webapp` y `api-service` juntos por los flujos que definen el producto: registrarse, registrar un Gasto y ver cambiar el Disponible; registrar una compra y ver el Rendimiento.

Dos dependencias se reemplazan en las pruebas: la fecha de hoy (para probar vencimientos y cambios de mes) y el servicio de cotizaciones (para no depender de la red).

Las pruebas incluyen dos Usuarios, referencias ajenas, reintentos y escrituras concurrentes para Transferencias, ventas, Pagos recurrentes y copia de Presupuestos. Los ejemplos de los [contratos verificables](contratos.md) son criterios de aceptación de sus tickets, no resultados ya ejecutados.

No se prueban funciones internas de cálculo por separado ni componentes de React de forma aislada. El frontend conserva las pruebas de formato de dinero.

Antecedente en el repositorio: las pruebas del frontend sobre Disponible, Restante y Patrimonio describen las reglas con ejemplos numéricos; las de `api-service` deben cubrir los mismos casos por su API, y entonces las del frontend se retiran junto con los datos de ejemplo.

La CI ejecuta las pruebas de cada servicio en cada PR.

## Out of Scope

- Sincronización con bancos o brókeres.
- Más de una moneda y conversión de divisas.
- Finanzas compartidas y roles distintos del Usuario.
- Metas de ahorro, importación de archivos del banco y alertas por correo.
- Rendimiento ajustado por tiempo; se usa el rendimiento simple sobre el Aporte neto.
- Pagos recurrentes con frecuencia distinta de la mensual.
- Verificación del correo al registrarse.
- Despliegue en un servidor: se decide después de la entrega.
- Selector manual de tema claro u oscuro; sigue al sistema.
- OAuth, sincronización automática con Google y escrituras externas para editar/eliminar registros o administrar Cuentas, reglas y Presupuestos.
- Predicciones de rentabilidad, proyecciones por Activo y análisis histórico de escenarios.

## Further Notes

- Entrega: diciembre de 2026. Programan los cuatro integrantes.
- En #11 se verifica el proveedor para búsqueda y catálogo; en #23/#24 se verifica su capacidad de obtener precios históricos. Un respaldo usa solo la última Transacción de inversión conocida al cierre, nunca una futura, y señala la estimación. Un precio ausente no se convierte en valor cero.
- Para el uso real hará falta una cuenta de envío de correo; es configuración, no diseño.

## Contratos transversales de la revisión

Los [contratos verificables](contratos.md) precisan aislamiento por Usuario, CSRF, autenticidad de servicio, fechas, cantidades, Cuentas archivadas, borrado entre dos bases, costo promedio, precios manuales por Usuario y conciliación del Patrimonio. Cada ticket incorpora sus criterios comprobables; se conservan las 64 historias previas (con las decisiones revisadas) y se añaden 12: 76 historias y 58 casos de uso, incluidos los 28 originales.

Las tablas de apoyo conservan ocurrencias y sus resoluciones, inicialización mensual, preferencias, tokens e idempotencia; las [matrices](matrices.md) distinguen los diez casos nuevos de sus tablas de apoyo. Las relaciones `Blocked by` se reflejan también como dependencias nativas de GitHub.
