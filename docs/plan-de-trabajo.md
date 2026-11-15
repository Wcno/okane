# Cronología de implementación de Okane

La [spec versionada](spec.md), revisada en el [issue #3](https://github.com/Wcno/okane/issues/3),
agrupa **25 tickets, 76 historias y 58 casos de uso** (28 originales, 24 N2 y 6 N3).
**Estado: pendiente de revisión del equipo. La implementación no ha comenzado.**

La revisión de feedback reemplaza los Gastos recurrentes automáticos por reservas
con confirmación manual, unifica Movimientos, amplía Proyección y añade
preferencias visuales y API pública autenticada. Los contratos están en
[contratos.md](contratos.md); el ADR 0005 está propuesto para revisión.

El orden es una secuencia válida, no la obligación de trabajar en serie:
cualquier ticket cuyos bloqueos estén terminados puede avanzar en paralelo.
Los números de issue son identificadores, no posiciones cronológicas.

| Orden sugerido | Issue | Requiere |
|---:|---|---|
| 1 | [#4 — Esqueleto de los cuatro contenedores](https://github.com/Wcno/okane/issues/4) | — |
| 2 | [#5 — Registro, inicio y cierre de sesión](https://github.com/Wcno/okane/issues/5) | #4 |
| 3 | [#7 — Cuentas con Saldo derivado](https://github.com/Wcno/okane/issues/7) | #5 |
| 4 | [#6 — Recuperar, restablecer y cambiar contraseña](https://github.com/Wcno/okane/issues/6) | #5 |
| 5 | [#8 — Gastos con Categorías fijas](https://github.com/Wcno/okane/issues/8) | #7 |
| 6 | [#11 — Compra y venta de Activos, y Posiciones](https://github.com/Wcno/okane/issues/11) | #7 |
| 7 | [#14 — Eliminar usuario](https://github.com/Wcno/okane/issues/14) | #7 |
| 8 | [#15 — Ingresos](https://github.com/Wcno/okane/issues/15) | #7 |
| 9 | [#16 — Transferencias y Aportes](https://github.com/Wcno/okane/issues/16) | #7 |
| 10 | [#17 — Pagos recurrentes: reservas y confirmación manual](https://github.com/Wcno/okane/issues/17) | #8 |
| 11 | [#12 — Consultar, editar y eliminar Transacciones de inversión](https://github.com/Wcno/okane/issues/12) | #11 |
| 12 | [#13 — Panel de inversiones y Rendimiento](https://github.com/Wcno/okane/issues/13) | #11, #16 |
| 13 | [#10 — Proyección de ahorro e inversión con escenarios](https://github.com/Wcno/okane/issues/10) | #13 |
| 14 | [#9 — Presupuestos y Restante](https://github.com/Wcno/okane/issues/9) | #17 |
| 15 | [#21 — Estado de cuenta](https://github.com/Wcno/okane/issues/21) | #8, #12, #15, #16 |
| 16 | [#22 — Dividendos y comisiones](https://github.com/Wcno/okane/issues/22) | #12, #13 |
| 17 | [#23 — Actualización automática de Precios de referencia](https://github.com/Wcno/okane/issues/23) | #13 |
| 18 | [#18 — Panel conectado a la API](https://github.com/Wcno/okane/issues/18) | #9, #15 |
| 19 | [#20 — Categorías propias](https://github.com/Wcno/okane/issues/20) | #9 |
| 20 | [#30 — Vista unificada de Movimientos con filtros](https://github.com/Wcno/okane/issues/30) | #8, #12, #15, #16, #22 |
| 21 | [#31 — Configuración de preferencias visuales por Usuario](https://github.com/Wcno/okane/issues/31) | #30, #18, #14 |
| 22 | [#32 — API pública v1 con tokens personales e idempotencia](https://github.com/Wcno/okane/issues/32) | #5, #9, #30, #6, #14 |
| 23 | [#19 — Pruebas de punta a punta en navegador](https://github.com/Wcno/okane/issues/19) | #18, #13, #10, #31, #32 |
| 24 | [#24 — Evolución del Patrimonio](https://github.com/Wcno/okane/issues/24) | #18, #22, #23 |
| 25 | [#25 — Copia de Presupuestos al cambiar de mes](https://github.com/Wcno/okane/issues/25) | #20 |

## Precisiones del orden

- #9 espera a #17 para calcular Restante con reservas reales, su arrastre y sus
  resoluciones. #18 hereda ese contrato mediante #9.
- #11 incluye la búsqueda y selección de Activos. #23 añade precios automáticos.
- #13 espera a #16 para medir Aportes y retiros. #10 ahora espera a #13 para
  obtener una valoración real de Cuenta de inversión o portafolio completo.
- #21 espera los registros de #8/#12/#15/#16. #22 incorpora Dividendos y comisiones.
- #30 espera esos registros y #22 para mostrar los seis tipos en una vista.
  #31 espera #30 y #18 para guardar filtros y secciones reales del Panel, y #14
  para comprobar que las preferencias se eliminan con el Usuario.
- #32 espera autenticación #5, Presupuestos #9 y los seis tipos agregados en #30.
  También espera #6/#14 para comprobar revocación al cambiar/restablecer contraseña
  y el borrado del Usuario. Crea su sección de tokens en Configuración sin depender
  de las preferencias #31.
- #19 espera Panel, inversiones, Proyección, preferencias y API para comprobar
  los flujos principales en navegador; las combinaciones se prueban por HTTP.
- #24 espera #18/#22/#23 para conciliar el Patrimonio. #25 espera las Categorías
  propias para excluir las archivadas al copiar Presupuestos.
- La prioridad N3 no permite recortar un requisito de N2 sin revisar el alcance:
  #22 es necesario para Movimientos y API con los seis tipos acordados.

## Estado del plan

Hay **46 dependencias técnicas nativas sin ciclos**, reflejadas en la tabla y en
GitHub. Los 25 tickets (#4–#25 y #30–#32) permanecen abiertos con
`needs-team-review`. Esta preparación no implementa funciones ni completa tickets.

Revisar [team-review.md](team-review.md) y registrar la decisión en #3 antes de
empezar. El primer ticket técnico será **#4** solo después de esa autorización.
El estado operativo y las verificaciones se registran en [HANDOFF.md](../HANDOFF.md).
