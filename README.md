# Banish

Extensión de Chrome que **cierra automáticamente los popups molestos** —modales de
newsletter, banners de cookies, muros de _«inicia sesión para continuar»_ y demás
overlays— **en los sitios que tú elijas**.

Es **opt-in por sitio** a propósito: solo actúa donde la actives, así nunca rompe
una página por sorpresa. Para los sitios típicos no necesitas saber nada técnico:
activas el **Modo genérico** y listo. Para los casos rebeldes, eliges el elemento
con un **clic** —sin escribir una sola línea de CSS.

Todo ocurre en tu navegador: **no hay servidores, ni telemetría, ni cuentas**.

---

## Funcionalidades

- **Modo genérico** — una lista curada de **+100 selectores** cierra los popups más
  comunes (cookies, newsletter, paywalls) sin configurar nada.
- **Picker visual 🎯** — pulsa un botón, haz clic sobre el popup en la página y
  Banish genera el selector por ti. Dos modos: _botón de cerrar_ (clic) y
  _overlay_ (eliminar).
- **Selectores manuales** (avanzado) — añade tus propios selectores CSS por sitio.
- **Reactivar scroll** — recupera el scroll cuando un overlay bloquea la página.
- **Se aplica al instante** — al guardar, los cambios surten efecto en la pestaña
  activa sin recargar.
- **Interruptor global** — apaga toda la extensión con un clic sin perder tu
  configuración.
- **Gestor de sitios** — revisa y quita en un toque todos los sitios donde está
  activa.
- **Caza popups con retraso** — un `MutationObserver` detecta los modales que
  aparecen segundos después de cargar la página.

---

## Cómo funciona

Banish inyecta un _content script_ ligero en las páginas que actives. Ahí:

1. Lee tu regla para ese dominio (selectores propios y/o **Modo genérico**).
2. A los **botones de cerrar** les da clic; a los **overlays** los elimina del DOM;
   y, si lo pides, **reactiva el scroll**.
3. Mantiene un `MutationObserver` durante ~20 s para atrapar popups que aparezcan
   más tarde.

El **picker** genera selectores estables priorizando, en este orden: `#id` único →
atributos accesibles (`aria-label`, `data-testid`, …) → clases legibles
(descartando las autogeneradas tipo `css-1q2w3e`) → una ruta con `:nth-of-type`
como último recurso.

No usa librerías externas en tiempo de ejecución; solo `jsdom` para los tests.

---

## Instalación (modo desarrollador)

Mientras la extensión no esté publicada en la Chrome Web Store, se instala
manualmente cargando la carpeta como extensión sin empaquetar.

1. **Descarga el proyecto**

   Clona el repositorio o descárgalo como ZIP y descomprímelo:

   ```bash
   git clone https://github.com/NNeshz/banish
   ```

   > No necesitas instalar dependencias para usar la extensión. La carpeta
   > `node_modules/` solo se usa para los tests.

2. **Abre la página de extensiones de Chrome**

   En la barra de direcciones escribe:

   ```
   chrome://extensions
   ```

   (También funciona en Edge con `edge://extensions` y en Brave con
   `brave://extensions`.)

3. **Activa el modo desarrollador**

   Pulsa el interruptor **«Modo de desarrollador»** en la esquina superior derecha.

4. **Carga la extensión**

   Haz clic en **«Cargar descomprimida»** (_Load unpacked_) y selecciona la carpeta
   del proyecto (la que contiene `manifest.json`).

5. **Listo**

   La extensión aparecerá en la lista. Fija el icono en la barra para acceder
   rápido desde el botón de la barra de herramientas (🧩).

---

## Cómo usarla

Abre cualquier página con popups y haz clic en el icono de **Banish**.

### 1. Activar en un sitio

Marca **«Activar en este sitio»**. La extensión solo actúa en los dominios que
actives explícitamente.

### 2. Modo genérico (lo más fácil)

Marca también **«Modo genérico»**. Banish probará su lista de +100 selectores
comunes y cerrará la mayoría de cookie banners, modales de newsletter y paywalls
**sin que escribas nada**. Es la opción recomendada para usuarios no técnicos.

### 3. Elegir con el picker 🎯

Si algún popup se resiste:

- Pulsa **«🎯 Botón de cerrar»** y haz clic sobre la _✕_ del popup, **o**
- Pulsa **«🎯 Overlay»** y haz clic sobre el fondo que quieres eliminar.

El popup se cierra para que interactúes con la página; al hacer clic, Banish genera
el selector, lo guarda, activa el sitio y te lo confirma. Pulsa **Esc** para
cancelar.

### 4. Selectores manuales (avanzado)

En los cuadros de texto puedes añadir tus propios selectores CSS (uno por línea):

- **Botones de cerrar** → se les da clic.
- **Overlays a eliminar** → se borran del DOM.

### 5. Gestionar sitios

Despliega **«Sitios activos»** para ver todos los dominios donde Banish está
activo y quitarlos con un toque.

---

## Modo genérico: qué cubre

El Modo genérico incluye selectores para los frameworks y patrones más extendidos:

- **Consentimiento de cookies** — OneTrust, Cookiebot, TrustArc, Didomi,
  Usercentrics, CookieYes, Osano, Complianz, Iubenda, Klaro, tarteaucitron, Civic,
  Quantcast, Google Funding Choices y más.
- **Botones de cerrar** — por `aria-label`/`title` en varios idiomas (inglés,
  español, francés, alemán, italiano, portugués, neerlandés, polaco, ruso) y por
  clases habituales (`.modal-close`, `.btn-close`, `.popup-close`, …).
- **Plugins de popup/lightbox** — Magnific Popup, Fancybox, Popup Maker,
  Squarespace, Mailchimp, Privy, OptinMonster, Sumo, Klaviyo.

Los selectores de _clic_ son seguros (si no es un popup, normalmente no pasa nada);
los de _eliminar_ son patrones inequívocos de overlay. Como todo es opt-in por
sitio, ante un falso positivo basta con desactivar el Modo genérico en ese dominio.

---

## Privacidad

Banish **no envía datos a ningún servidor**. Tu configuración (qué sitios y qué
selectores) se guarda con `chrome.storage.sync`, que la sincroniza con tu propia
cuenta de Chrome. Los permisos que pide son los mínimos para funcionar:

- `storage` — guardar tus reglas.
- Acceso a las páginas — para detectar y cerrar los popups en los sitios que
  actives.

---

## Páginas restringidas

Por seguridad, Chrome no permite ejecutar extensiones en algunas páginas. Banish
no funcionará en:

- Páginas internas del navegador (`chrome://`, `edge://`, `about:`).
- La Chrome Web Store.
- Páginas `view-source:` y otras extensiones.

> Para probar el banco de pruebas local (`test/popups.html`) sirve la carpeta con
> `npx http-server` o `python3 -m http.server`, o activa **«Permitir acceso a URLs
> de archivos»** en los detalles de la extensión.

---

## Desarrollo

Requiere [Node.js](https://nodejs.org/).

```bash
npm install        # instala dependencias de test (jsdom)
npm run validate   # comprueba la sintaxis del manifest y los scripts
npm test           # tests unitarios (node:test)
npm run check      # validate + test
```

### Estructura

| Archivo / carpeta    | Función                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `manifest.json`      | Configuración de la extensión (Manifest V3).                               |
| `lib.js`             | Funciones puras + lista de selectores del **Modo genérico** (`GENERIC_RULE`). |
| `selector.js`        | Generación de selectores CSS estables para el picker.                      |
| `content.js`         | Cierra/elimina popups en la página, el picker y el `MutationObserver`.     |
| `popup.html` / `popup.js` | Interfaz (tema oscuro): activar sitio, modo genérico, picker y selectores. |
| `test/`              | Tests (`node:test` + `jsdom`) y banco de pruebas (`popups.html`).          |

### Tests

- `test/lib.test.js` — lógica pura (validación de ids, clases estables, fusión de
  reglas, parseo).
- `test/selector.test.js` — `generateSelector` de punta a punta sobre DOM real con
  `jsdom`.

---

## Próximamente

- **Contador de popups cerrados** en el icono.
- **Importar/Exportar** reglas para respaldo y para compartir configuraciones.
- **Soporte de iframes y Shadow DOM** en el picker.
- Publicación en la **Chrome Web Store** para instalación con un solo clic, sin
  modo desarrollador.
