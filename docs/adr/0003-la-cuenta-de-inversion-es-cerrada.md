# La Cuenta de inversión guarda efectivo y solo se fondea por Transferencia

Para separar con exactitud el dinero que el Usuario puso de lo que sus inversiones ganaron, decidimos que cada compra y venta descuente o devuelva efectivo en una Cuenta de inversión, y que el dinero solo entre o salga de esa Cuenta por Transferencia. Así un Aporte es siempre una Transferencia, y el Rendimiento es el valor actual de la Cuenta menos su Aporte neto, sin ambigüedad.

## Considered Options

- **Transacciones de inversión sin efectivo:** registrar compras y ventas sin vincularlas a una Cuenta. Se descartó porque el dinero invertido no saldría de ningún Saldo y el Patrimonio lo contaría dos veces o ninguna.
- **Permitir Ingresos directos a la Cuenta de inversión:** ahorra un paso al fondear desde fuera. Se descartó porque ese dinero contaría a la vez como Ahorro neto y como Rendimiento.

## Consequences

- Fondear un bróker con dinero que viene de fuera del sistema toma dos pasos: un Ingreso a otra Cuenta y una Transferencia.
- Una Cuenta de inversión no admite Ingresos, Gastos ni Pagos recurrentes, aunque las demás Cuentas sí.
- Lo que un Activo paga en efectivo se registra como Dividendo, no como Ingreso, y cuenta como Rendimiento.
