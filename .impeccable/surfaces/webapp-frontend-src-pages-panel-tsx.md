---
version: 1
slug: "webapp-frontend-src-pages-panel-tsx"
primary_target: "webapp/frontend/src/pages/Panel.tsx"
related_targets: ["webapp/frontend/src/components/AppShell.tsx"]
---

# Panel (`/dashboard`) y estructura de navegación

Scope: la pantalla de inicio tras iniciar sesión y el armazón de navegación que comparten las 48 pantallas. Visitor mode: Operate.

Audience and job: el Usuario abre Okane, en el teléfono o en la PC, para saber cuánto puede gastar hasta fin de mes y por qué cambió su Patrimonio; desde aquí registra un Gasto. Datos de ejemplo mientras `api-service` no exista. Vocabulario obligatorio: GLOSSARY.md.

Unresolved: tema claro/oscuro sigue al sistema, sin selector; las demás rutas muestran una página "aún no construida".

## Direction contract

THESIS: El Panel responde las dos preguntas del producto, cada una como una cifra abierta en sus partes. Rechaza la fila de cuatro indicadores iguales: hay una sola cifra dominante, el Disponible, y todo lo demás la explica o la acompaña.

OWN-WORLD: El estándar de la categoría, a la altura de Copilot Money. Página gris neutro cálido; tarjetas blancas de radio 20px con borde fino; acciones primarias en tinta casi negra; Figtree en todo, con cifras grandes proporcionales. El color pertenece solo a los datos: siete tonos validados para las Categorías (ficha con icono y medidor), una línea azul para el Patrimonio, verde y rojo únicamente para variaciones y para "excedido".

STORY: El Usuario ve cuánto puede gastar, de qué sale esa cifra, cuánto le queda en cada Categoría y por qué se movió su Patrimonio. Luego registra un Gasto.

FIRST VIEWPORT: Escritorio 1440: barra lateral de 248px; título con el mes; a la izquierda, 7 columnas, la tarjeta del Disponible con la cifra a 64px, el monto por día y una barra segmentada (Saldo de Cuentas de gastos = Disponible + Comprometido), y debajo el Restante por Categoría; a la derecha, 5 columnas, Patrimonio con su variación del mes explicada y su gráfico. "Registrar gasto" arriba a la derecha. Móvil 390: la cifra a 48px es lo primero; barra inferior con el botón + al centro.

SIGNATURE INTERACTION: Registrar un Gasto recalcula a la vista el Disponible y el Restante de su Categoría: la cifra corre hasta su nuevo valor y el medidor crece.

FORM: canon, el estándar de la categoría, elegido por el Usuario en la página de decisión (no es una posición de la lista propia); seed key 50821216.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
