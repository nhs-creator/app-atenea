# Lecciones técnicas aprendidas

Gotchas concretos encontrados trabajando en este proyecto que no son obvios leyendo el código — para no volver a perder tiempo redescubriéndolos.

---

## Web Bluetooth / Web Serial no existen en iOS

Safari en iOS/iPadOS **nunca implementó la Web Bluetooth API ni la Web Serial API**, en ninguna versión — y como Apple obliga a todo navegador de la App Store a usar WebKit, esto incluye a "Chrome" y "Edge" para iPhone también (son WebKit por dentro). No es un bug de filtro ni de conexión: `navigator.bluetooth`/`navigator.serial` directamente no existen ahí.

Chequeá con `!!(navigator as any).bluetooth` / `!!(navigator as any).serial` antes de intentar conectar, para poder ofrecer una alternativa en vez de un error confuso.

**Workarounds reales, de más a menos práctico:**
1. **[Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055)** (o WebBLE) — navegador de terceros para iOS con su propio stack de Bluetooth. Abrir la PWA ahí en vez de Safari puede hacer que el código de Web Bluetooth ya escrito funcione sin cambios. Confirmado funcionando con la impresora NIIMBOT.
2. **Fallback de compartir/descargar** — generar la imagen/archivo y mandarlo por `navigator.share()` a la app nativa correspondiente (ver `lib/niimbotPrint.ts` + `hooks/useAteneaConvex.ts::printInventoryLabel`).
3. **Puente por red local** — un dispositivo siempre encendido (ESP32, Raspberry Pi, u otro Android) corriendo código nativo (sin restricción de navegador) que reciba pedidos por HTTP/WiFi y los reenvíe por Bluetooth. Más trabajo, pero funciona para cualquier navegador.
4. **Capacitor** (envolver la PWA como app nativa) — Bluetooth anda porque es código nativo, no web. Requiere cuenta de Apple Developer (u$s99/año) + Xcode + TestFlight/App Store. Android en cambio permite instalar un APK compilado directo, sin cuenta ni tienda.

## Convex: dev y prod son deployments separados

`npx convex deploy` **solo empuja a producción**. El servidor local (`npm run dev`, usado por el preview) habla con un deployment de **dev** totalmente distinto (ver `.env.local` → `VITE_CONVEX_URL`). Después de cualquier cambio en `convex/`, correr también:

```bash
npx convex dev --once
```

Si no, el preview local tira errores como `ArgumentValidationError` por validators desactualizados aunque prod ya esté al día.

## NIIMBOT: modelos D110 vs D110M hablan protocolos distintos

`@mmote/niimbluelib` tiene tareas de impresión separadas por modelo (`D110`, `D110M_V4`, `B1`, etc. — ver `printTasks` en `print_tasks/index.ts`). Pasar el nombre incorrecto a `newPrintTask()` **no tira error** — la impresora acepta la conexión y alimenta papel (parece que "funciona") pero descarta los datos de imagen por venir en el formato equivocado, y sale en blanco.

El nombre de dispositivo Bluetooth es una pista (`D110_M-...` = variante M). Para no adivinar, usar `client.getPrintTaskType()` después de conectar — detecta el modelo/protocolo real a partir de la info que ya se leyó del dispositivo.

## NIIMBOT: `ImageEncoder.encodeCanvas` necesita rotación para cabezales angostos

El cabezal térmico es físicamente angosto y fijo (ancho del rollo — acá 12mm/~96px), y el papel avanza en la otra dirección (largo variable — acá 40mm/~320px). Si el canvas se dibuja apaisado (320×96, para que se vea bien en pantalla), hay que pasarle `printDirection: 'left'` a `encodeCanvas()` (es el default de la librería) para que rote 90° y el ancho de pantalla se mapee al avance de papel, no al cabezal. Usar `'top'` (sin rotar) manda las 320 columnas directo al cabezal de 96 — solo imprime la porción que cae dentro de esas primeras columnas y corta el resto.

## NIIMBOT: filtro de Bluetooth por defecto demasiado restrictivo

La librería arma su propio filtro para `navigator.bluetooth.requestDevice()` (nombre que empieza con la letra de un modelo conocido, o UUID de servicio específico). Si el dispositivo real anuncia otro nombre, no aparece en el selector. Forzar `acceptAllDevices: true` (monkey-parcheando `requestDevice` durante la conexión) muestra cualquier Bluetooth cercano — ver `lib/niimbotPrint.ts::connectWithPermissiveFilter`.

Relacionado: un dispositivo BLE que ya está **emparejado a nivel sistema operativo** tiende a aparecer mucho más fácil en un escaneo nuevo — los periféricos BLE suelen dejar de anunciarse una vez conectados/vinculados a un central específico. Si "no aparece en la lista", probar emparejarlo primero desde la Configuración de Bluetooth del sistema (no hace falta que sea la app del fabricante).

## Vite: `import.meta.env.DEV` necesita `vite/client` en tsconfig

Este proyecto no lo tenía en `tsconfig.json` → `compilerOptions.types` (solo tenía `"node""`). Sin eso, TypeScript no reconoce `import.meta.env` aunque funcione en runtime. Agregar `"vite/client"` al array de `types`.

Patrón útil: gatear una feature con `import.meta.env.DEV &&` la oculta completamente del bundle de producción (confirmado con `npm run build` + grep sobre el bundle) — sirve para botones de testing que nunca deberían llegar a producción.

## Convención de lockfile: `bun.lock`, no `package-lock.json`

`npm install` genera un `package-lock.json` que no es el que usa este proyecto. Si eso pasa: `git restore --staged package-lock.json && rm package-lock.json && bun install`.

## Disciplina de CHANGELOG

`docs/VERSIONING.md` documenta que **antes de cada commit que cambie código o funcionalidad hay que actualizar `CHANGELOG.md`** (sección `[Unreleased]`). Es fácil de olvidar en medio de una sesión larga — más vale actualizarlo commit a commit que dejarlo para reconstruir al final.
