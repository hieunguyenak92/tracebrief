# Tracebrief

**Convierte una captura HAR en un informe de red que puedas revisar antes de compartir.**

Orden de las solicitudes, errores HTTP, peticiones lentas y rutas repetidas, sin copiar las URL, cabeceras, cookies ni cuerpos de la captura al informe. Funciona localmente en el navegador o la terminal. Sin cuenta, clave API, backend ni paquetes de terceros.

[English](README.md) · [Tiếng Việt](README.vi.md) · [한국어](README.ko.md) · [日本語](README.ja.md) · [**Español**](README.es.md) · [Português (Brasil)](README.pt-BR.md) · [简体中文](README.zh-CN.md) · [ไทย](README.th.md) · [Français](README.fr.md)

[Privacidad](docs/PRIVACY.md) · [Alternativas](docs/COMPARISON.md) · [Cómo contribuir](CONTRIBUTING.md)

**[Probar la demo en vivo](https://hieunguyenak92.github.io/tracebrief/)**

![Tracebrief mostrando una captura de red ficticia](docs/demo.jpg)

## Pruébalo

Requiere **Node.js 22 o posterior**. Desde una copia del repositorio:

```sh
git clone https://github.com/hieunguyenak92/tracebrief.git
cd tracebrief
npm run dev
```

Abre **http://localhost:4173**, carga la demo ficticia o arrastra un archivo `.har` a la página. Revisa la cascada de solicitudes y exporta un informe. No hay dependencias que instalar.

Para obtener un único archivo que puedas abrir sin servidor:

```sh
npm run build
```

Abre `dist/index.html` en el navegador. Usa una copia local de confianza cuando trabajes con capturas privadas. El HAR original permanece en tu dispositivo: la aplicación no lo sube ni lo conserva entre cargas de la página.

## Qué ofrece

- Una cascada de solicitudes con filtros para errores HTTP o de red, solicitudes de al menos un segundo y solicitudes repetidas.
- Un recuento de las categorías de datos descartadas, para entender qué deja fuera la exportación.
- Markdown para una incidencia o un asistente de programación con IA, un informe HTML independiente y metadatos HAR reconstruidos. La CLI también exporta metadatos JSON.
- El mismo núcleo de análisis en el navegador y la CLI. Las mediciones desconocidas siguen figurando como desconocidas.

Una solicitud se considera repetida cuando, después de la primera aparición, tiene el mismo método, origen y ruta. La agrupación ignora los parámetros de consulta. Las repeticiones pueden ser intencionadas. Una solicitud lenta es una observación, no un diagnóstico de la causa.

## Qué se comparte

Tracebrief **construye un informe nuevo a partir de metadatos permitidos**. No modifica el archivo original ni intenta adivinar qué cadenas contienen secretos.

| Se conserva | Se omite o sustituye |
| --- | --- |
| Orden, inicio relativo, duración y tiempos de espera y recepción | Las fechas absolutas pasan a ser desplazamientos; las fechas del HAR reconstruido parten del 1 de enero de 1970 |
| Códigos de estado válidos, tamaños en bytes, métodos estándar y categorías de contenido fijas | La URL, el host, la ruta, los parámetros y el fragmento originales se sustituyen por alias opacos de origen y ruta |
| Agrupación por origen y ruta | Se omiten cabeceras, cookies, cuerpos de solicitud y respuesta y campos personalizados |

Por ejemplo, una URL se exporta como `https://origin-1.invalid/route-2`. Los alias solo relacionan solicitudes dentro de ese análisis; no son nombres reales de endpoints. Puedes mostrar las URL originales con una opción explícita de **visualización local**. Nunca se incluyen en una exportación.

**Revisa cada archivo exportado.** Los tiempos, tamaños, códigos de estado y patrones de solicitudes todavía pueden ser sensibles. Tracebrief no garantiza que desaparezca toda información personal ni convierte una captura en anónima. El HAR reconstruido no permite reproducir la sesión ni investigar problemas de contenido o autenticación. Consulta el [contrato de privacidad](docs/PRIVACY.md).

## CLI

Sin servidor ni acceso a la red:

```sh
node bin/tracebrief.js public/samples/demo.har --format markdown
node bin/tracebrief.js capture.har --format html --output report.html
node bin/tracebrief.js capture.har --format har --output reconstructed.har
node bin/tracebrief.js capture.har --format json --output metadata.json
```

El formato predeterminado es Markdown y se escribe en la salida estándar. Consulta las opciones con `--help`. Los archivos existentes no se sobrescriben: elige una ruta nueva. Guarda las capturas privadas fuera de la copia del repositorio.

## Cómo capturar un HAR

1. Abre las herramientas de desarrollo del navegador y el panel de red, normalmente llamado **Network**.
2. Reproduce el problema y utiliza la opción del panel para exportar un HAR.
3. Abre el archivo guardado en una copia local de confianza de Tracebrief.
4. Examina el informe y las categorías descartadas. Revisa el archivo exportado antes de enviarlo.

Chrome ya ofrece una exportación HAR saneada que excluye determinadas cabeceras sensibles. Tracebrief añade una vista de intercambio deliberadamente limitada que también descarta los endpoints y cuerpos originales. Las capturas completas pueden contener credenciales y datos personales. Consulta la [referencia de Network de Chrome](https://developer.chrome.com/docs/devtools/network/reference) y la [comparación](docs/COMPARISON.md).

## Límites

- Hasta **50 MiB** de JSON HAR y **20.000 entradas** por captura.
- Solo se conservan metadatos numéricos válidos dentro de los límites admitidos. Los campos ausentes o inválidos se señalan o aparecen como desconocidos.
- No captura tráfico en directo, no reproduce sesiones, no relaciona alias entre capturas ni explica automáticamente por qué falló una solicitud.
- Eliminar endpoints y cuerpos reduce el detalle disponible para depurar. Usa DevTools o un canal privado de confianza cuando necesites esa información.
- La versión 0.1 es una primera entrega. Se agradecen pruebas en combinaciones de navegador y sistema operativo distintas de las verificadas.

## Desarrollo

```sh
npm test
npm run lint
npm run build
```

Estructura del código: `public/core.js` contiene el análisis y los exportadores; `public/app.js`, las interacciones del navegador; y `bin/tracebrief.js`, la CLI. Los scripts de desarrollo y compilación utilizan la biblioteca estándar de Node.js.

Para informar de un error, prepara una reproducción mínima con datos **ficticios**. Nunca adjuntes un HAR de producción, un token de acceso, datos de clientes ni un endpoint privado a una incidencia pública. [Guía de contribución](CONTRIBUTING.md) · [Política de seguridad](SECURITY.md).

## Licencia

[MIT](LICENSE).
