# El Saldo se deriva de los movimientos; nunca se guarda ni se edita a mano

El documento del proyecto solo contemplaba gastos, de modo que un saldo solo podía bajar o corregirse editando la Cuenta. Decidimos que el Saldo sea siempre el resultado del saldo inicial más los Ingresos, Gastos, Transferencias y Transacciones de inversión registrados, y que "Editar cuenta" no permita cambiarlo. El objetivo del producto es que el Usuario pueda explicar cada cifra a partir de lo que registró; un saldo editable rompe esa explicación.

## Considered Options

- **Saldo editable en la Cuenta:** no requiere los casos de uso de Ingreso ni de Transferencia. Se descartó porque el saldo dejaría de coincidir con los movimientos y el Ahorro neto y la variación del Patrimonio no podrían calcularse.

## Consequences

- Para corregir un Saldo hay que registrar o corregir un movimiento; no existe un ajuste directo.
- Editar o eliminar un movimiento antiguo cambia el Saldo actual y el Patrimonio de todos los meses posteriores.
- Una Cuenta con movimientos no se elimina, se archiva: borrarla alteraría el historial.
