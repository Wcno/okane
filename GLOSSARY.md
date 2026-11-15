# Okane

Sistema de gestión de finanzas personales para una persona asalariada que registra sus movimientos a mano. Existe para responder dos preguntas con más claridad y menos esfuerzo que cualquier otra herramienta: cuánto puedo gastar hasta fin de mes, y a qué se debe la variación de mi patrimonio.

## Language

### Personas

**Usuario**:
La persona que inicia sesión y es dueña exclusiva de todos sus datos financieros. Es el único actor del sistema.
_Avoid_: Cuenta de usuario, cliente, administrador

### Dinero y cuentas

**Cuenta**:
Un contenedor de dinero que pertenece a un Usuario, de tipo gastos, ahorro o inversión. Una tarjeta de crédito es una Cuenta de gastos con Saldo negativo.
_Avoid_: Cuenta de usuario, billetera, perfil

**Cuenta de inversión**:
Una Cuenta que guarda efectivo y Posiciones. El dinero solo entra o sale de ella por Transferencia, y dentro de ella solo actúan las Transacciones de inversión; no admite Ingresos, Gastos ni Pagos recurrentes.
_Avoid_: Bróker, portafolio, cartera

**Cuenta archivada**:
Una Cuenta con movimientos que el Usuario ya no usa: no se ofrece para registrar nada nuevo, pero su historial se conserva. Solo una Cuenta sin movimientos puede eliminarse de verdad.
_Avoid_: Cuenta cerrada, cuenta inactiva, cuenta eliminada

**Saldo**:
El dinero que hay en una Cuenta en un momento dado. Resulta de su saldo inicial, sus Movimientos y, en una Cuenta de inversión, sus Transacciones de inversión; nunca se escribe a mano, y puede ser negativo.
_Avoid_: Balance, monto disponible

**Saldo inicial**:
El dinero que ya existía en una Cuenta al empezar a llevar su registro, con una fecha de inicio. Incorporarlo explica un cambio en la cobertura del Patrimonio, no un Ingreso ni una ganancia de inversión.
_Avoid_: Ingreso inicial, ganancia inicial, ajuste de saldo

**Movimiento**:
Todo lo que cambia un Saldo sin ser una operación sobre un Activo: un Ingreso, un Gasto o una Transferencia.
_Avoid_: Transacción, operación, registro

**Vista de Movimientos**:
La consulta conjunta de Ingresos, Gastos, Transferencias y Transacciones de inversión, distinguibles por tipo, Cuenta y fecha. Una Transferencia aparece una sola vez, con sus dos Cuentas.
_Avoid_: Pestaña por tipo, libro único

**Ingreso**:
Dinero que entra a una Cuenta desde fuera del sistema, como un salario o el interés que paga un banco. No lleva Categoría ni cuenta contra un Presupuesto.
_Avoid_: Depósito, abono, entrada

**Gasto**:
Dinero que sale de una Cuenta, asignado a exactamente una Categoría. Se acepta siempre, aunque exceda su Presupuesto, no tenga uno o deje el Saldo en negativo.
_Avoid_: Egreso, compra, transacción

**Transferencia**:
Dinero que se mueve entre dos Cuentas del mismo Usuario. No es Gasto ni Ingreso, no lleva Categoría y no afecta ningún Presupuesto ni el Patrimonio.
_Avoid_: Traspaso, movimiento interno

**Estado de cuenta**:
La lista cronológica de todo lo que cambió el Saldo de una Cuenta.
_Avoid_: Historial, extracto, listado de movimientos

**Proyección**:
Un cálculo hipotético para una Cuenta de ahorro, una Cuenta de inversión o el portafolio completo, a partir de capital, aporte mensual, plazo y tasa anual supuesta. Permite comparar escenarios sin cambiar los registros reales.
_Avoid_: Simulación, pronóstico, estimado

### Presupuesto

**Categoría**:
Una clase de gasto propia de un Usuario, como Alimentación o Transporte. Parte de un catálogo inicial que el Usuario puede ampliar, renombrar y archivar; una Categoría con Gastos nunca se borra.
_Avoid_: Rubro, etiqueta, tipo de gasto

**Presupuesto**:
El límite de gasto de una sola Categoría en un mes concreto. El total presupuestado de un mes es la suma de sus Presupuestos, no una entidad propia. Un mes nuevo hereda como punto de partida los Presupuestos del anterior.
_Avoid_: Plan mensual, presupuesto total, límite

**Pago recurrente**:
Una regla mensual de monto, Categoría, Cuenta y día que reserva dinero para cada vencimiento. Solo la confirmación del Usuario convierte una de sus ocurrencias en un Gasto.
_Avoid_: Suscripción, pago automático, débito

**Ocurrencia de pago**:
Un vencimiento concreto de un Pago recurrente, pendiente, confirmado o cancelado. Mientras esté pendiente mantiene su reserva aunque haya vencido; confirmarlo registra el pago real y cancelarlo libera la reserva.
_Avoid_: Gasto automático, cobro automático

**Comprometido**:
La suma de las reservas pendientes con vencimiento hasta el cierre del mes consultado, incluidas las vencidas de meses anteriores. Se libera al confirmar o cancelar cada Ocurrencia de pago.
_Avoid_: Gasto realizado, saldo descontado

**Restante**:
Lo que queda por gastar en una Categoría en el mes: su Presupuesto menos lo gastado y menos lo Comprometido en esa Categoría. Si es negativo, la Categoría está excedida.
_Avoid_: Disponible por categoría, saldo del presupuesto

**Disponible**:
El dinero que el Usuario puede gastar hasta fin de mes: la suma de los Saldos de sus Cuentas de gastos menos lo Comprometido que saldrá de esas mismas Cuentas. No incluye ahorro, inversión ni ingresos que aún no llegan.
_Avoid_: Saldo disponible, dinero libre, restante

### Inversión

**Activo**:
Una acción (incluye fondos cotizados) o una criptomoneda elegida del catálogo del servicio de cotizaciones. Su identidad distingue también el mercado o proveedor para evitar confundir Activos con el mismo símbolo.
_Avoid_: Instrumento, título, ticker, moneda

**Transacción de inversión**:
Una operación sobre un Activo dentro de una Cuenta de inversión: compra, venta o Dividendo. Nunca se dice "transacción" a secas.
_Avoid_: Transacción, operación, orden, movimiento

**Dividendo**:
Efectivo que un Activo paga a la Cuenta de inversión que lo posee. Cuenta como Rendimiento.
_Avoid_: Ingreso, interés, recompensa

**Posición**:
Las unidades de un Activo que hay en una Cuenta de inversión, con su costo promedio. El mismo Activo en dos Cuentas son dos Posiciones.
_Avoid_: Tenencia, inversión, holding

**Precio de referencia**:
El último precio conocido de un Activo, con su fecha. Se obtiene de un servicio de cotizaciones y el Usuario puede corregirlo.
_Avoid_: Precio actual, cotización, precio de mercado

**Aporte**:
Una Transferencia hacia una Cuenta de inversión; el saldo inicial de esa Cuenta cuenta como su primer Aporte. El Aporte neto es la suma de los Aportes menos los retiros.
_Avoid_: Depósito, capital, fondeo

**Rendimiento**:
Lo que las inversiones ganaron o perdieron: de forma acumulada, el valor actual de una Cuenta de inversión (Posiciones más efectivo) menos su Aporte neto. El Rendimiento de un mes es la diferencia entre el acumulado al cierre de ese mes y el acumulado al cierre anterior.
_Avoid_: Ganancia, retorno, utilidad, plusvalía

### Patrimonio

**Patrimonio**:
Todo lo que el Usuario tiene: la suma de los Saldos de todas sus Cuentas más el valor de todas sus Posiciones.
_Avoid_: Riqueza, capital, valor neto

**Panel**:
La pantalla a la que llega el Usuario al iniciar sesión, que reúne el Disponible, el Restante por Categoría, los Saldos, las reservas pendientes y vencidas y la evolución del Patrimonio. Es distinta del panel de inversiones.
_Avoid_: Dashboard, inicio, resumen

**Ahorro neto**:
Los Ingresos menos los Gastos de un mes. Junto con el Rendimiento de ese mes, explica la variación del Patrimonio una vez separadas las incorporaciones de Saldos iniciales.
_Avoid_: Ahorro, excedente, flujo
