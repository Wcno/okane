---
name: Okane
description: Finanzas personales con interfaz neutra, donde el color pertenece solo a los datos.
colors:
  page: "#f4f4f1"
  surface: "#ffffff"
  surface-2: "#f6f6f3"
  ink: "#131316"
  ink-2: "#55555c"
  ink-3: "#6b6b72"
  line: "#e8e7e2"
  line-strong: "#d4d3cd"
  primary: "#131316"
  on-primary: "#ffffff"
  series: "#2a78d6"
  good: "#006300"
  critical: "#c22f2f"
  cat-0: "#898781"
  cat-1: "#2a78d6"
  cat-2: "#eb6834"
  cat-3: "#1baf7a"
  cat-4: "#eda100"
  cat-5: "#e87ba4"
  cat-6: "#008300"
  cat-7: "#6250d6"
typography:
  display:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "4.25rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.95rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 500
    lineHeight: 1.45
  body:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "Figtree Variable, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.87rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  control: "0.75rem"
  field: "1rem"
  card: "1.25rem"
  sheet: "1.75rem"
  full: "9999px"
spacing:
  row: "0.75rem"
  card-gap: "1rem"
  card-padding: "1.25rem"
  card-padding-wide: "1.5rem"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    height: "2.5rem"
    padding: "0 1.125rem 0 0.875rem"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.full}"
    height: "3rem"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "{spacing.card-padding}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "2.75rem"
    padding: "0 0.875rem"
  nav-item-active:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "2.5rem"
  category-chip:
    rounded: "{rounded.control}"
    size: "2.5rem"
---

# Design System: Okane

## Overview

**Creative North Star: "El color es de tus datos"**

Okane usa a propósito el diseño estándar de las aplicaciones de finanzas personales, ejecutado con el acabado de las mejores del género. La interfaz es neutra: página gris cálido, tarjetas blancas, tinta casi negra. Todo el color de la pantalla pertenece a los datos del Usuario: sus Categorías, la serie de su Patrimonio y los estados que debe atender.

La jerarquía sale del tamaño de las cifras, no de adornos. Cada pantalla tiene una sola cifra dominante y lo demás la explica o la acompaña. La densidad es la de una herramienta que se consulta a diario: filas compactas, mucha información por tarjeta, y aire entre tarjetas.

El sistema rechaza cuatro parecidos, confirmados por el equipo: un banco (frío, corporativo, azul institucional), una aplicación de cripto (fondo negro, neón), un juego (medallas, rachas, confeti) y una hoja de cálculo (tablas densas sin jerarquía).

**Key Characteristics:**

- Interfaz neutra; el color aparece solo en datos y estados.
- Una cifra dominante por pantalla, en la misma tipografía que todo lo demás.
- Tarjetas blancas de esquinas amplias sobre una página gris cálido.
- Acciones primarias en tinta, con forma de píldora.
- Tema claro y oscuro, según el sistema del Usuario, con tonos elegidos para cada uno.
- El teléfono y la computadora son de primera clase: mismas tarjetas, distinta estructura.

## Colors

Neutros cálidos de muy baja saturación para la interfaz, y un conjunto de siete tonos validados para daltonismo reservado a las Categorías.

### Primary

- **Tinta** (`primary`): acciones primarias (botón "Registrar gasto", botón flotante del teléfono), la confirmación emergente y el segmento "Disponible" de la barra segmentada. En tema oscuro se invierte a casi blanco (#f1f0ec) con texto en tinta.

### Secondary

- **Azul de serie** (`series`): la línea y el área del gráfico de Patrimonio, el cursor de texto y la selección. Es la única serie de un gráfico de una sola serie; nunca decora.

### Tertiary

- **Tonos de Categoría** (`cat-1` a `cat-7`, más `cat-0` neutro para "Otros"): la ficha con icono, el medidor y el punto junto al nombre de cada Categoría. En tema oscuro cada tono tiene su propio paso (#3987e5, #d95926, #199e70, #c98500, #d55181, #0ca30c, #9085e9).
- **Verde de variación positiva** (`good`) y **rojo crítico** (`critical`): solo para una variación del Patrimonio y para una Categoría excedida, siempre con icono y texto.

### Neutral

- **Página** (`page`): fondo de la aplicación y de la barra lateral.
- **Superficie** (`surface`): tarjetas, campos, barra inferior y hoja de registro.
- **Superficie hundida** (`surface-2`): bloques dentro de una tarjeta, fichas de icono neutras y estados hover.
- **Tinta** (`ink`), **tinta secundaria** (`ink-2`) y **tinta terciaria** (`ink-3`): texto principal, texto de apoyo y metadatos. Las tres superan 4.5:1 sobre superficie y página.
- **Línea** (`line`) y **línea fuerte** (`line-strong`): bordes de tarjeta y divisores; bordes de campos y botones secundarios.

### Named Rules

**The Data Owns Color Rule.** Ningún elemento de la interfaz (botón, enlace, navegación, borde) lleva un tono. Si algo tiene color, es un dato del Usuario o un estado.

**The Entity Keeps Its Hue Rule.** El tono sigue a la Categoría, no a su posición en una lista. El orden de `cat-1` a `cat-7` es el del conjunto validado y no se reordena ni se amplía; una Categoría adicional usa `cat-0`.

**The Text Stays Ink Rule.** Los montos, nombres y etiquetas van siempre en tinta. Un tono identifica mediante una marca al lado (ficha, punto, barra), nunca tiñendo el texto. La única excepción es un estado con icono: variación del Patrimonio y "Excedida".

## Typography

**Display Font:** Figtree Variable (con system-ui, -apple-system, Segoe UI)
**Body Font:** Figtree Variable (la misma familia)

**Character:** Una sola familia, geométrica y amable, lleva títulos, cifras, botones y datos. La cifra dominante es grande y pesada, no una fuente distinta.

La raíz es de 15px; todos los tamaños están en rem sobre esa base.

### Hierarchy

- **Display** (600, 4.25rem en pantallas anchas y 3.2rem en teléfono, interlineado 1, tracking -0.035em): la cifra dominante de la pantalla. Una por pantalla. El símbolo `$` va al 62% en tinta terciaria y los centavos al 50% en tinta secundaria.
- **Headline** (600, 1.95rem y 1.65rem en teléfono, tracking -0.025em): el título de la página.
- **Cifra secundaria** (600, 2.3rem, tracking -0.03em): el valor principal de una tarjeta que no es la dominante.
- **Title** (500, 1rem): títulos de tarjeta, en tinta secundaria, y nombres de fila, en tinta.
- **Body** (400, 1rem, interlineado 1.45): texto corrido, con un máximo de unos 46 a 60 caracteres por línea.
- **Label** (400, 0.87rem, tinta terciaria): metadatos de fila y leyendas. Los ejes del gráfico usan 11.5px.

### Named Rules

**The Proportional Hero Rule.** Las cifras grandes aisladas usan cifras proporcionales. `tabular-nums` se reserva para montos que se alinean en columna: filas, tablas y ejes.

**The One Family Rule.** No hay fuente de exhibición ni monoespaciada. El énfasis sale del peso (400, 500, 600) y del tamaño.

## Layout

Desde 1024px: barra lateral fija de 248px y contenido con un máximo de 1180px, 40px de margen lateral. El Panel usa una rejilla de 12 columnas con dos zonas, 7 y 5, alineadas arriba; la acción primaria queda arriba a la derecha del contenido.

Por debajo de 1024px: una sola columna con 16px de margen (24px desde 640px), encabezado con el logotipo y una barra inferior fija de 64px con cinco posiciones. La del centro es el botón flotante de registro, elevado 12px sobre la barra. Lo que no cabe en la barra vive en la pantalla "Secciones".

Las tarjetas se separan 16px (20px en pantallas anchas) y tienen 20px de relleno (24px en pantallas anchas). Dentro de una tarjeta, las filas se separan con divisores finos o con 12px de aire. Toda columna de rejilla lleva ancho mínimo cero para que un contenido largo no ensanche la página.

## Elevation & Depth

Híbrido contenido. En tema claro, las tarjetas se apoyan en un borde fino más una sombra ambiental muy suave; en tema oscuro no hay sombra de tarjeta y la profundidad sale del contraste entre página y superficie. Lo que flota sobre el contenido lleva una sombra más marcada en ambos temas.

### Shadow Vocabulary

- **Tarjeta** (`0 1px 2px rgb(19 19 22 / 0.04), 0 10px 28px -16px rgb(19 19 22 / 0.12)`): tarjetas, el elemento activo de la navegación lateral y la opción activa de un control segmentado. Nula en tema oscuro.
- **Flotante** (`0 2px 6px rgb(19 19 22 / 0.08), 0 18px 40px -14px rgb(19 19 22 / 0.28)`): botón flotante, hoja de registro, etiqueta del gráfico y confirmación emergente.

### Named Rules

**The Two Levels Rule.** Solo existen dos niveles: apoyado (tarjeta) y flotante. Una tarjeta nunca contiene otra tarjeta con sombra; lo que va dentro usa superficie hundida.

## Shapes

Esquinas amplias y suaves, en cuatro pasos según el tamaño del elemento: fichas de icono, campos y elementos de navegación (12px); campos grandes y bloques internos (16px); tarjetas (20px); hoja de registro (28px, solo arriba en teléfono). Botones, controles segmentados, medidores y puntos son píldoras o círculos completos.

Los bordes son siempre de 1px. No hay bordes laterales gruesos ni franjas de color como acento.

## Components

### Buttons

- **Shape:** píldora completa (9999px).
- **Primary:** fondo tinta y texto sobre tinta, peso 600; 40px de alto con icono a la izquierda en la cabecera, 48px en formularios.
- **Hover / Focus:** sube 1px al pasar el cursor y se encoge al 98% al presionar, en 150ms. El foco de teclado es un contorno de 2px en tinta, separado 2px.
- **Secondary:** misma forma, fondo superficie, borde de línea fuerte y texto tinta; hover en superficie hundida.

### Chips

- **Ficha de Categoría:** cuadrado de 40px (36px en el formulario) con esquinas de 12px; fondo del tono de la Categoría al 15% y el icono en el tono pleno. Siempre junto al nombre.
- **Opción de Categoría (formulario):** ficha más nombre en fila, en rejilla de dos columnas. Sin elegir: borde de línea. Elegida: borde tinta y fondo de superficie hundida, nombre en peso 600.
- **Control segmentado:** píldora de superficie hundida con 2px de relleno; la opción activa es una píldora de superficie con sombra de tarjeta.

### Cards / Containers

- **Corner Style:** 20px.
- **Background:** superficie.
- **Shadow Strategy:** sombra de tarjeta (ver Elevation & Depth).
- **Border:** 1px de línea.
- **Internal Padding:** 20px; 24px desde 1024px.
- Cada tarjeta abre con su título en tinta secundaria y, si resume algo que se gestiona en otra pantalla, un enlace a la derecha con chevron.

### Inputs / Fields

- **Style:** 44px de alto, esquinas de 12px, borde de línea fuerte sobre superficie. El campo de monto es mayor: esquinas de 16px y cifra a 2rem con el `$` en tinta terciaria.
- **Focus:** borde tinta más un anillo de 2px en tinta al 15%.
- **Error:** borde crítico y un mensaje debajo en crítico que dice qué falta y da un ejemplo.

### Navigation

- **Barra lateral:** grupos con un título pequeño en tinta terciaria; elementos de 40px con icono de 18px. Reposo en tinta secundaria; hover con un velo de tinta al 6%; activo en superficie con sombra de tarjeta y peso 600.
- **Barra inferior:** icono de 21px y etiqueta de 0.72rem; activo en tinta y peso 600, inactivo en tinta terciaria.

### Medidor de Presupuesto

Barra de 8px, píldora. La pista es el tono de la Categoría al 17% sobre superficie; lo gastado va en el tono pleno y lo Comprometido en el tono al 48%, separados 2px. Si la Categoría está excedida, la barra pasa a representar todo lo usado y la parte que sobrepasa el Presupuesto va en crítico, acompañada de la etiqueta "Excedida" con icono.

### Barra segmentada

Barra de 8px que parte un total en sus componentes, con 2px de separación y una leyenda debajo que nombra cada parte con su monto. En el Panel: Saldo en Cuentas de gastos = Disponible (tinta) + Comprometido (tinta al 30%).

### Gráfico de línea

Una serie: línea de 2px con uniones redondeadas, área con degradado del 16% a transparente, punto final de 5px de radio con anillo de 2px del color de la superficie. Rejilla horizontal en línea fina continua; ejes en tinta terciaria con montos compactos ($9K). Al pasar el cursor o recorrer con las flechas, una línea vertical y una etiqueta flotante al lado del punto, nunca encima. Todo gráfico tiene su vista de tabla equivalente.

### Hoja de registro

Hoja inferior a todo el ancho en teléfono y cuadro centrado de 30rem desde 640px. Entra con opacidad y 16px de desplazamiento en unos 200ms; el fondo se oscurece al 42%. Con movimiento reducido no hay transición.

## Do's and Don'ts

### Do:

- **Do** dar a cada pantalla una sola cifra dominante en tamaño Display y abrirla en las partes que la producen.
- **Do** mantener botones, enlaces, navegación y bordes en neutros; el tono es para Categorías, la serie y los estados.
- **Do** acompañar todo color de estado con icono y texto ("Excedida", una flecha de tendencia).
- **Do** verificar cada pantalla a 390px y a 1440px, en tema claro y oscuro, y comprobar que no haya desplazamiento horizontal.
- **Do** usar `tabular-nums` en montos alineados en columna y cifras proporcionales en la cifra dominante.
- **Do** ofrecer la vista de tabla de cada gráfico.
- **Do** animar solo cambios de estado: una cifra que corre a su nuevo valor, un medidor que crece, una fila que se resalta al cambiar.

### Don't:

- **Don't** dar tono a un elemento de la interfaz ni teñir texto con el tono de una Categoría.
- **Don't** agregar un octavo tono de Categoría ni reordenar los siete.
- **Don't** usar fondo negro puro, acentos de neón ni resplandores.
- **Don't** usar azul institucional como color de marca.
- **Don't** agregar medallas, rachas, confeti ni mascotas.
- **Don't** presentar datos como una tabla densa sin una cifra que mande.
- **Don't** poner una tarjeta con sombra dentro de otra, ni usar bordes laterales gruesos como acento.
- **Don't** usar una segunda familia tipográfica, ni texto con degradado.
- **Don't** animar la carga de una página.
