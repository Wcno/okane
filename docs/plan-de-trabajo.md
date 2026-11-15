# Cronología de implementación de Okane

La [spec #3](https://github.com/Wcno/okane/issues/3) agrupa estos 22 tickets.
El orden de esta tabla es una secuencia válida, no la obligación de trabajar en
serie: cualquier ticket cuyos bloqueos estén terminados puede avanzar en paralelo.
Los números de issue son identificadores, no posiciones cronológicas.

Esta revisión mantiene los 48 casos de uso y precisa sus
[contratos verificables](contratos.md). Las dependencias representan requisitos
funcionales, incluidos los que deban adelantarse respecto del nivel de producto.

| Orden sugerido | Issue | Requiere |
|---:|---|---|
| 1 | [#4 — Esqueleto de los cuatro contenedores](https://github.com/Wcno/okane/issues/4) | — |
| 2 | [#5 — Registro, inicio y cierre de sesión](https://github.com/Wcno/okane/issues/5) | #4 |
| 3 | [#7 — Cuentas con Saldo derivado](https://github.com/Wcno/okane/issues/7) | #5 |
| 4 | [#6 — Recuperar, restablecer y cambiar contraseña](https://github.com/Wcno/okane/issues/6) | #5 |
| 5 | [#8 — Gastos con Categorías fijas](https://github.com/Wcno/okane/issues/8) | #7 |
| 6 | [#10 — Proyección de ahorro](https://github.com/Wcno/okane/issues/10) | #7 |
| 7 | [#11 — Compra y venta de Activos, y Posiciones](https://github.com/Wcno/okane/issues/11) | #7 |
| 8 | [#14 — Eliminar usuario](https://github.com/Wcno/okane/issues/14) | #7 |
| 9 | [#15 — Ingresos](https://github.com/Wcno/okane/issues/15) | #7 |
| 10 | [#16 — Transferencias y Aportes](https://github.com/Wcno/okane/issues/16) | #7 |
| 11 | [#17 — Pagos recurrentes y Comprometido](https://github.com/Wcno/okane/issues/17) | #8 |
| 12 | [#12 — Consultar, editar y eliminar Transacciones de inversión](https://github.com/Wcno/okane/issues/12) | #11 |
| 13 | [#13 — Panel de inversiones y Rendimiento](https://github.com/Wcno/okane/issues/13) | #11, #16 |
| 14 | [#9 — Presupuestos y Restante](https://github.com/Wcno/okane/issues/9) | #17 |
| 15 | [#21 — Estado de cuenta](https://github.com/Wcno/okane/issues/21) | #8, #12, #15, #16 |
| 16 | [#22 — Dividendos y comisiones](https://github.com/Wcno/okane/issues/22) | #12, #13 |
| 17 | [#23 — Actualización automática de Precios de referencia](https://github.com/Wcno/okane/issues/23) | #13 |
| 18 | [#18 — Panel conectado a la API](https://github.com/Wcno/okane/issues/18) | #9, #15 |
| 19 | [#20 — Categorías propias](https://github.com/Wcno/okane/issues/20) | #9 |
| 20 | [#19 — Pruebas de punta a punta en navegador](https://github.com/Wcno/okane/issues/19) | #18, #13 |
| 21 | [#24 — Evolución del Patrimonio](https://github.com/Wcno/okane/issues/24) | #18, #22, #23 |
| 22 | [#25 — Copia de Presupuestos al cambiar de mes](https://github.com/Wcno/okane/issues/25) | #20 |

## Precisiones del orden

- Después de #7 pueden avanzar Gastos, Proyección, compra y venta, eliminación
  de Usuario, Ingresos y Transferencias en paralelo.
- #9 espera a #17 para probar el Restante con Comprometido real, no con un cero
  provisional. #18 hereda ese requisito mediante #9.
- #11 incluye la selección y búsqueda de Activos desde la primera compra.
  #23 entrega la actualización automática y no bloquea el catálogo inicial.
- #13 espera a #16 para medir Aportes y retiros reales. #19 añade el flujo de
  compra y Rendimiento a las pruebas de navegador.
- #21 espera a los cuatro tipos de registros que su Estado de cuenta debe
  mostrar. #22 incorpora Dividendos y comisiones a esas consultas al llegar.
- #24 espera al Panel, Dividendos/comisiones y cotizaciones para reconciliar la
  evolución del Patrimonio con datos completos. #25 espera las Categorías
  propias para excluir las archivadas al copiar Presupuestos.

## Estado al preparar esta revisión

Todos los tickets #4–#25 estaban abiertos el 2026-11-15. Los PR previos #1,
#2 y #26 siguen abiertos; los checks de frontend y convenciones pasaban, y el
job de despliegue estaba omitido. La implementación del backend aún no existe:
esta revisión define el trabajo y sus dependencias, no marca tickets terminados.

Para comenzar a implementar, el primer ticket disponible es **#4**. La decisión
sobre integrar los PR previos, proteger `main` y activar Pages sigue separada de
esta revisión de especificaciones.
