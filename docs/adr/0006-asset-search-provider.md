# La búsqueda de Activos usa Twelve Data detrás de un adaptador

Para elegir un Activo sin texto libre, `api-service` consulta el servicio de cotizaciones **Twelve Data** (`GET https://api.twelvedata.com/symbol_search`) y guarda lo que encuentra en un catálogo propio. La identidad de un Activo es proveedor, mercado y símbolo: el mercado es el código MIC que devuelve el proveedor (o el nombre de la bolsa cuando no existe, como en criptomonedas). El proveedor queda detrás de `investments/quotes.py`, de modo que cambiarlo no toca modelos ni pantallas, y las pruebas lo sustituyen.

Verificado el 2026-11-16 en las páginas oficiales del proveedor:

- **Límites del plan gratuito (Basic):** 8 créditos por minuto y 800 por día; una búsqueda cuesta 1 crédito (twelvedata.com/pricing y twelvedata.com/docs/discovery/symbol-search).
- **Campos útiles:** `symbol`, `instrument_name`, `exchange`, `mic_code`, `instrument_type`, `country`, `currency`.
- **Condiciones (twelvedata.com/terms):** el plan gratuito excluye el uso comercial, limita el uso a fines internos y exige autorización expresa para mostrar los datos a terceros. Okane es un proyecto del curso con uso propio de sus integrantes; antes de abrirlo al público habrá que contratar un plan o cambiar de proveedor.
- **Clave:** se pide una clave gratuita (`TWELVE_DATA_API_KEY`). Sin clave, o si el proveedor falla o se agota el límite, la búsqueda ofrece solo los Activos que el catálogo ya conoce y la interfaz informa la indisponibilidad.

## Considered Options

- **Alpha Vantage:** devuelve la región, pero el plan gratuito permite solo 25 consultas por día, insuficiente incluso para una persona.
- **Finnhub:** 60 consultas por minuto, pero la búsqueda no identifica el mercado de cada resultado.
- **Yahoo Finance no oficial:** sin contrato ni garantías de estabilidad.

## Consequences

- La interfaz busca al enviar la búsqueda, no en cada tecla, para respetar los 8 créditos por minuto.
- `api-service` necesita salida a internet, que se concede con una red solo de salida; ningún puerto se publica.
- El precio de la última operación sigue siendo el respaldo del Precio de referencia; la actualización automática de precios (#23) usa `GET /time_series` del mismo proveedor (`interval=1day`, `outputsize=1`): un crédito por Activo con operaciones, a 8 por minuto, una vez al día y sin repetirse por Usuario. Si se agotan los créditos, la ejecución se detiene y se conserva el último cierre. Limitación: solo se guarda el último cierre de cada ejecución, no una serie histórica.
- `QUOTES_PROVIDER=sample` sirve un catálogo fijo de seis Activos, sin red ni clave, para probar la aplicación y para las pruebas de navegador; `.env.example` lo trae activo. Para Activos reales se cambia a `twelvedata` y se configura la clave.
