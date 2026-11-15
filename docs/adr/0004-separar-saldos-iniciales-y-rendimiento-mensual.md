# Separar los Saldos iniciales y usar el Rendimiento del período

La fórmula del Rendimiento de una Cuenta de inversión es acumulada; sumarla
directamente al Ahorro neto mensual cuenta de nuevo las ganancias de meses
anteriores. La variación mensual usa la diferencia entre los Rendimientos
acumulados de ambos cierres. Incorporar una Cuenta que ya tenía dinero se
muestra por separado como Saldo inicial: ese dinero no se ganó durante el mes.

Se conserva una fecha de inicio del registro por Cuenta. Su Saldo inicial se
incorpora una vez en esa fecha, también al reconstruir el pasado. Con ello:

`Patrimonio final − Patrimonio inicial = Saldos iniciales incorporados + Ahorro neto + Rendimiento del período`.

## Considered Options

- **Llamar Rendimiento a toda diferencia no explicada por Ingresos y Gastos:**
  haría aparecer como ganancia el dinero que ya estaba en una Cuenta recién
  incorporada y escondería errores del registro.
- **Reescribir el Patrimonio anterior al incorporar una Cuenta:** evita un
  componente adicional, pero cambia meses anteriores y supone que el dinero
  ya existía en fechas que el Usuario no indicó.

## Consequences

- Con cobertura constante, permanecen los dos componentes originales:
  Ahorro neto y Rendimiento del período. Los Saldos iniciales incorporados se
  muestran aparte.
- La fecha de inicio no puede ser posterior al primer Movimiento o Transacción
  de inversión de la Cuenta. Se pide antes de cargar su historial; la creación
  técnica de la Cuenta puede ocurrir después.
- Cada cierre usa un precio conocido a esa fecha; si faltan datos históricos
  se informa la limitación en vez de utilizar un precio futuro.
