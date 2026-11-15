# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

React con TypeScript y Tailwind CSS en el frontend, compilado y servido por Django desde el contenedor `webapp`. Django REST en `api-service`. PostgreSQL en ambas bases de datos. Todo se levanta con Docker Compose. El frontend, Django, Django REST y los cuatro contenedores vienen fijados por el documento del curso; TypeScript y Tailwind los eligió el equipo.

## Users

Una persona asalariada en Panamá que registra sus movimientos a mano, porque no hay sincronización bancaria abierta, y que invierte en acciones y criptomonedas a través de un bróker externo. Usa el teléfono y la computadora por igual: ambos tamaños son de primera clase, ninguno es la versión reducida del otro.

Los primeros usuarios reales son los cuatro integrantes del equipo, con sus propias finanzas.

## Product Purpose

Okane reúne el presupuesto mensual y el portafolio de inversión de una persona en un solo lugar. Existe para responder dos preguntas con más claridad y menos esfuerzo que cualquier otra herramienta:

1. ¿Cuánto puedo gastar hasta fin de mes?
2. ¿A qué se debe la variación de mi patrimonio?

Tiene éxito si el Usuario obtiene las dos respuestas al abrir la aplicación, sin calcular nada, y si registrar un gasto le toma segundos.

## Positioning

Cada cifra que Okane muestra se puede explicar con lo que el Usuario registró. El Saldo nunca se escribe a mano: sale del Saldo inicial y los movimientos. El dinero aportado a las inversiones se separa con exactitud de lo que estas ganaron o perdieron, porque todo Aporte es una Transferencia. La variación del Patrimonio de un mes se explica con el Ahorro neto y el Rendimiento de ese mes; incorporar Saldos iniciales de Cuentas se muestra por separado, sin presentarlo como una ganancia.

## Operating Context

- El registro es manual o mediante integraciones autenticadas iniciadas por el Usuario. La rapidez para anotar un Gasto es un criterio de diseño de primer nivel.
- El sistema informa, no autoriza: acepta gastos que exceden el presupuesto y saldos negativos, y lo señala.
- Una sola moneda, dólares estadounidenses. La interfaz está en español.
- El Usuario contrasta sus cifras con las de su banco y su bróker; el Estado de cuenta existe para eso.

## Capabilities and Constraints

- 58 casos de uso, definidos con sus rutas y endpoints en `docs/matrices.md`. Los 28 originales del documento del curso se construyen primero.
- El vocabulario es el de `GLOSSARY.md` y es obligatorio en la interfaz: Disponible, Restante, Comprometido, Aporte, Rendimiento, Patrimonio, Ahorro neto. No se usan los sinónimos que el glosario descarta.
- Los Pagos recurrentes reservan dinero, incluso vencido, hasta confirmar o cancelar cada ocurrencia; no registran Gastos automáticamente.
- Una vista reúne los seis tipos de registros y permite filtrar; Configuración personaliza su presentación sin cambiar reglas financieras.
- La Proyección compara escenarios de ahorro e inversión. La API pública autenticada permite lectura y creación con tokens personales, también desde Google Apps Script.
- Estas capacidades están especificadas para revisión, todavía no implementadas.
- Las decisiones de arquitectura están en `docs/adr/`.
- Las reglas de fechas, precisión, concurrencia y cálculo por período se precisan en `docs/contratos.md`.
- Sin decidir: el proveedor de cotizaciones para acciones, y si el servicio gratuito entrega precios históricos para reconstruir la evolución del Patrimonio.

## Brand Commitments

- El nombre en pantalla es **Okane** ("dinero" en japonés).
- No existen logotipo, colores ni tipografía previos.
- El equipo eligió a propósito el diseño estándar de las aplicaciones de finanzas personales, ejecutado al máximo nivel, en lugar de un mundo visual propio. La vara de calidad es **Copilot Money**: Okane debe poder ponerse a su lado sin desentonar, sin copiar su identidad.
- Los estilos se escriben con Tailwind CSS.
- Un resultado bien terminado se sentiría equivocado si pareciera: un banco (frío, corporativo, institucional), una aplicación de cripto (fondo negro, neón, invitación a especular), un juego (medallas, rachas, confeti, mascotas) o una hoja de cálculo (tablas densas sin jerarquía).

## Evidence on Hand

- No hay datos reales todavía ni backend en funcionamiento. Todo dato que se muestre durante el desarrollo es de ejemplo.
- No hay testimonios, cifras de uso ni clientes; no deben inventarse.

## Product Principles

1. **Las dos respuestas primero.** Lo que no ayuda a responder una de las dos preguntas no ocupa el primer plano.
2. **Toda cifra es explicable.** Ningún número aparece sin que el Usuario pueda llegar a los registros que lo producen.
3. **Informar, no autorizar.** Okane nunca bloquea un registro verdadero; señala la consecuencia.
4. **Registrar cuesta segundos.** Cada campo obligatorio de más es un gasto que se queda sin anotar.
5. **El pasado no cambia solo.** Lo que ya ocurrió solo se modifica cuando el Usuario lo corrige.
