# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

---

## [1.7.0] - 2026-07-04

### Añadido

- **Tamaño de etiqueta configurable**: nueva sección "Etiquetas de impresión" en Ajustes para elegir el rollo cargado en la impresora NIIMBOT D110 — 12x40mm (original), 14x30mm o 15x30mm. La D110 soporta hasta 15mm de ancho de cabezal; un rollo más ancho imprime un QR más grande, más fácil de leer con celulares con cámara vieja/de baja calidad. La sección muestra una vista previa en vivo con datos de ejemplo. Nuevo `lib/labelSizes.ts`; `printInventoryLabelCanvas` (`lib/generateInventoryLabel.ts`) calcula las dimensiones del canvas a partir del tamaño elegido en vez de tenerlas fijas.
- **"Facturar efectivo" configurable**: nuevo toggle en Ajustes → AFIP. Antes la regla de "el efectivo nunca se factura" estaba fija en el código — pensando en que esto podría escalar a otros comercios que sí necesiten facturar todo, ahora es opcional por cuenta (apagado por default, mismo comportamiento de siempre). Afecta tanto qué se muestra como facturable en la UI (`lib/invoiceablePayments.ts`) como el monto real que se manda a ARCA (`convex/queries/sales.ts::getTransactionInternal`, la fuente de verdad del importe facturado — no confía en lo que calcula el cliente).

- **Oferta de facturar al confirmar una venta**: si la venta tiene algo no-efectivo para facturar (el efectivo nunca se factura — mismo criterio que "Facturar" en Historial, no hace falta clienta cargada), aparece un aviso persistente "¿Facturar esta venta?" con un botón — no se auto-abre ni se auto-cierra, es 100% opcional cada vez. Al tocarlo, abre el mismo `FacturarModal` de siempre. El modal ahora también muestra un resumen (clienta si hay, productos, medios de pago) antes de emitir, no solo el total — mejora que aplica también al "Facturar" ya existente en Historial.

- **Detalle de factura con 3 formas de compartir**: la fila de "Factura emitida" en Historial ahora abre un modal (`components/sales/InvoiceDetailModal.tsx`) con: "Ver PDF adentro de la app" (visor inline vía `<iframe>` con blob URL, no existía antes), "Compartir a [clienta]" (si la venta ya tiene clienta vinculada, abre directo su chat de WhatsApp — `lib/whatsappLink.ts` arma la URL `wa.me` a partir del teléfono guardado — y deja el PDF listo para adjuntar), y "Compartir a nueva clienta" (busca o carga una clienta ahí mismo, la vincula a la venta con la nueva mutation `linkClientToTransaction`, y sigue el mismo camino de WhatsApp). "Anular (NC)" se mudó adentro de este modal, como acción secundaria al final — antes competía visualmente con "Compartir".

- **Vista previa antes de imprimir**: "Imprimir etiqueta" ahora muestra primero la imagen exacta de la etiqueta (QR + precio + nombre) en un modal con Confirmar/Cancelar, en vez de imprimir directo — evita gastar una etiqueta física por un error de tipeo. `components/inventory/LabelPreviewModal.tsx`, `hooks/useAteneaConvex.ts::previewInventoryLabel`.
- **Nombre en 2 líneas en la etiqueta**: si el nombre del producto no entra en 1 línea, prueba en 2 achicando la fuente dinámicamente antes de truncar con "…" (`lib/generateInventoryLabel.ts`).
- **Impresión por USB/Serial solo en desarrollo**: botón "USB (test)" en el menú del lápiz, gateado por `import.meta.env.DEV` (no existe en el build de producción), para probar la impresora conectada por cable a la compu sin depender de un celular. Permitió detectar y corregir 2 bugs reales del pipeline de impresión (protocolo D110M mal detectado, y la imagen se mandaba sin rotar al cabezal — salía cortada y solo el QR). `lib/niimbotPrint.ts`.
- **Elegir talle y cantidad de copias al imprimir**: la vista previa deja elegir el talle (si el producto tiene stock en más de uno) y cuántas copias imprimir — por defecto, tantas como stock tenga ese talle. El talle elegido se imprime en la etiqueta ("TALLE 38") arriba del precio.
- **QR por talle**: el código que codifica el QR pasa a ser `{código de producto}-{talle}` en vez de solo el código de producto — al escanear la etiqueta en Ingresos, el talle se autoselecciona en vez de tener que elegirlo a mano. `item.barcode` no cambia (compatibilidad total con etiquetas viejas ya impresas, que siguen escaneando igual que antes). Nuevo `lib/inventoryLabelCode.ts` (`composeInventoryLabelCode`/`parseInventoryLabelCode`).
- **Trackeo de etiquetas emitidas por talle**: nuevo campo `labelsPrinted` en `inventory` (talle → timestamp del último talle impreso/compartido). La vista previa marca con un check los talles que ya tienen etiqueta emitida y preselecciona por defecto el primero que le falta — reimprimir cualquier talle sigue siempre disponible. Nueva mutation `markInventoryLabelPrinted`.
- **Nombre de fantasía en la factura**: nuevo campo opcional en Ajustes → AFIP. ARCA exige que la razón social (nombre legal, el monotributo es a título personal) figure en la factura, pero permite sumar el nombre del negocio al lado — como nuestro PDF es propio (no el oficial de AFIP), se imprime como título principal arriba de la razón social, que sigue apareciendo siempre debajo. `convex/schema.ts` (`afipConfig.nombreFantasia`), `lib/generateFacturaPdf.ts`.
- **Indicador de versión + botón de actualización manual**: pie de página en Ajustes con la versión actual (`__APP_VERSION__`, inyectada en build time desde `package.json` vía `vite.config.ts`) y un botón "Buscar actualización". Atenea no usa Service Worker (se sacó a propósito por el incidente de bandwidth de Netlify — ver `index.tsx`), así que el botón no tiene con quién "negociar" una actualización como en una PWA típica: limpia cualquier Cache Storage residual y navega a la misma URL con un parámetro nuevo, forzando que el navegador la pida de cero — pensado para el caso de iOS donde la PWA instalada a veces no revalida sola. `components/settings/AppUpdateFooter.tsx`.

### Cambiado

- **Talle en la etiqueta reubicado**: pasó de tener su propia línea arriba del precio a ser un badge chico en la esquina superior derecha, en la misma línea que el precio — libera una línea entera para el nombre del producto.
- **Topbar simplificado**: se sacó el ícono de logo al lado del nombre y el botón de "Salir" (se mudó a Ajustes, ver abajo). Los botones de Clientas y Configuración se agrandaron a `min-w-[44px] min-h-[44px]` — eran chicos para tocar en mobile.
- **Cerrar sesión pasó a Ajustes**: nuevo botón de ancho completo al final del menú principal (`components/settings/LogoutButton.tsx`), con confirmación antes de salir.
- **Historial: lápiz con menú Editar/Borrar**: los botones separados "Borrar" y "Corregir" se unificaron en un solo botón de lápiz que abre un menú desplegable — mismo patrón ya usado en Stock. "Cambio" y "Facturar" quedan igual.
- **"AFIP" pasó a decir "ARCA" en toda la app**: el organismo se renombró en la vida real (Decreto 953/2024, noviembre 2024) — Administración Federal de Ingresos Públicos ahora es Agencia de Recaudación y Control Aduanero. Se actualizaron los 11 textos visibles en Ajustes, Fiscal y Reportes. Excepción intencional: la URL de verificación del QR en la factura (`afip.gob.ar/fe/qr`) se deja igual — confirmado que ese dominio sigue siendo el vigente para la verificación de comprobantes, aunque el organismo ya se llame ARCA.
- **"Contadoras" pasó a decir "Usuarios"**: cambio solo de texto en Ajustes (menú, formulario de alta, badges) — pensando en que a futuro puede haber otros tipos de cuenta (empleados) además de la contadora. El sistema de roles por debajo no cambió (sigue siendo `owner`/`accountant`); esto queda para cuando haya una necesidad concreta de un rol distinto.

---

## [1.6.0] - 2026-07-02

### Añadido

- **Agente de voz para carga de inventario**: nuevo modo `"inventory"` del asistente conversacional (`convex/assistant/chat.ts`), con su propio prompt y set de tools (`convex/assistant/tools.ts`) separado del asistente de ventas. Botón de micrófono violeta en Stock (`InventoryVoiceAgent.tsx`) — ella describe la prenda con sus palabras, el agente arma la propuesta (categoría/subcategoría/material/talles/precio) y pide confirmación en un cartelito antes de guardar nada, igual que el flujo de ventas ya existente. Tabla `assistantInventoryProposals` con `kind: "create" | "update"`.
- **Tool `list_size_options`**: el agente de voz consulta los talles válidos reales por categoría (`inventoryConstants.ts` → `getSizeOptionsForCategory`) en vez de asumir un rango de memoria — corrige un bug real donde "del 36 al 44" se cargó como 36,37,38...44 (impares que no existen) en vez de 36,38,40,42,44. La data categoría→sistema de talles, que estaba duplicada en 3 lugares del código (una copia ni se usaba), quedó consolidada en una sola fuente.
- **Impresión térmica directa a la NIIMBOT D110/D110M** (`lib/niimbotPrint.ts`, `lib/generateInventoryLabel.ts`): botón "Imprimir etiqueta" en el menú del lápiz de cada producto.
  - Bluetooth (Web Bluetooth) como vía principal — filtro de dispositivos permisivo (`acceptAllDevices`) porque el filtro por defecto de la librería no encontraba el modelo real.
  - Detección automática del protocolo de impresión real (`D110` vs `D110M_V4`) vía `getPrintTaskType()` — el device real es un D110_M, que habla un protocolo de imagen distinto al D110 común.
  - En iPhone (Safari/WebKit no implementa Web Bluetooth) cae automáticamente al flujo de compartir la etiqueta como imagen a la app oficial de Niimbot.
  - Impresión por USB/Serial (Web Serial) como vía de testing — solo visible corriendo `npm run dev` (gateada por `import.meta.env.DEV`, confirmado que el build de producción la elimina del bundle).
  - Etiqueta rediseñada al tamaño real del rollo (40x12mm, apaisada): QR + precio + nombre en 2 líneas con achique dinámico de fuente y truncado como último recurso, todo en negro puro (la impresora es monocromática).
- **Campo "Detalle" libre en inventario**: texto opcional para lo que no entra en categoría/subcategoría/material (tela puntual, estampado, con qué combina), usado tanto por el wizard táctil como por el agente de voz.
- **`OptionPicker`** (`components/inventory/OptionPicker.tsx`): componente compartido (variantes grid/chips) que reemplaza los `<select>` nativos tanto en el wizard de alta como en los filtros de Stock.

### Cambiado

- **Layout de la app a flexbox** (`h-[100dvh] flex-col`, `<main>` como único contenedor con scroll) en vez de nav con `position: fixed` — corrige que la barra inferior se rompiera y quedara flotando a mitad de pantalla en iOS al abrir/cerrar el teclado (PWA instalada).
- **Card de inventario reorganizada**: de 4 botones visibles a 2 (etiqueta QR + lápiz) más un menú desplegable (Editar / Historial / Imprimir etiqueta / Eliminar) — doble confirmación para eliminar, sin long-press.
- **Ajustes segmentado en menú navegable**: `SettingsView.tsx` pasó de un solo scroll de ~900 líneas con 6 secciones siempre expandidas a un menú tipo lista (ícono + título + descripción) que abre cada sección por separado, con botón de volver. Contadoras/Monotributo/AFIP quedaron como componentes autónomos en `components/settings/`.
- **Transcripción de voz con vocabulario de dominio**: el prompt de Whisper (`convex/assistant/transcribe.ts`) incluye vocabulario de indumentaria para reducir errores de reconocimiento (ej. "jean" se transcribía como "Shin").
- **Reglas de interpretación en el agente de voz**: precios dictados como números chicos se interpretan como miles ("treinta y ocho" = $38.000), y talles se validan contra `list_size_options` en vez de un rango fijo hardcodeado.

### Notas

- La impresión por Bluetooth quedó confirmada funcionando en Android, Windows de escritorio (Chrome) y iPhone (vía el navegador alternativo Bluefy, ya que Safari/WebKit no soporta Web Bluetooth). El flujo de compartir a la app de Niimbot sigue como respaldo en iPhone con Safari/Chrome normales.

---

## [1.5.1] - 2026-04-08

### Añadido

- **Exportación Excel en la sección Fiscal (contadora)**: Botón junto al selector de año que genera `Reporte_Fiscal_{año}.xlsx` con SheetJS (`xlsx`). Hoja **Cobros**: 12 meses + fila anual (Efectivo, Transferencia, Débito, Crédito, Total sin ef., Total, Facturado, Dif. sin facturar). Hoja **Monotributo**: categorías visibles con tope anual, cuota mensual, acumulado digital, margen y % del tope.

---

## [1.5.0] - 2026-04-08

### Añadido

- **Sección Fiscal en la vista de la contadora**: Cuarta sección en la sidebar (`AccountantFiscal.tsx`) con dos vistas:
  - **Cuadro de cobros mensual**: tabla de 12 filas (ene-dic) × 9 columnas (Período, Efectivo, Transferencia, Débito, Crédito, Total sin ef, Total, Facturado, Dif sin facturar). Los cobros se computan agrupando ventas por `client_number` para no doble-contar `payment_details`. Vale se excluye intencionalmente. Selector de año con chevrons. Footer con totales anuales sobre fondo `bg-slate-900`.
  - **Categorías de monotributo**: 4 cards horizontales mostrando la categoría actual del owner + las 3 siguientes. Cada card tiene tope de facturación anual, margen disponible (con barra de progreso ámbar/rojo según porcentaje), y monto mensual a pagar (`totalGoods`). La actual queda destacada en `bg-slate-900` con badge "Actual".
- **Facturado mensual editable**: Click en una celda de "Facturado" abre un input que parsea formato AR (`1.234.567,89`). Se guarda en la nueva tabla `monthlyBilling` vía `upsertMonthlyBilling`. El % sin facturar se calcula automáticamente como `(total_sin_ef − facturado) / total_sin_ef * 100`.
- **Schema Convex `monotributoCategories`**: Tabla per-user con 12 campos por categoría (letra, orden, tope de facturación, superficie, electricidad, alquiler, precio unitario, impuesto servicios/muebles, sipa, obra social, totales). Índices `by_userId` y `by_userId_letter`.
- **Schema Convex `monthlyBilling`**: Tabla per-user con `yearMonth` (formato `YYYY-MM`) y `facturado` (número). Índice compuesto `by_userId_yearMonth`.
- **Campo `monotributoCategory` en `profiles`**: Letra de la categoría actual de la dueña (opcional). La contadora la lee vía `getEffectiveUserId`.
- **Queries Convex `monotributo.ts`**: `listCategories`, `getCurrentCategory`, `listMonthlyBilling` (todas vía `getEffectiveUserId` para soporte de la contadora).
- **Mutations Convex `monotributo.ts`**: `seedDefaultCategories` (owner only, idempotente, hardcodea las 11 categorías AFIP A-K con los valores 2026), `updateCategory` (owner only), `setCurrentCategory` (owner only), `upsertMonthlyBilling` (owner o contadora vía `getEffectiveUserId`).
- **Sección "Monotributo" en `SettingsView.tsx`**: Nueva tarjeta para la dueña con botón "Inicializar valores AFIP", selector de categoría actual (botones A-K), y lista editable de las 11 categorías con click-to-edit del tope anual y monto mensual.

### Notas

- La sección Fiscal es exclusiva del desktop view de la contadora (`AccountantDesktopView` ≥ 1180px). El sidebar ahora tiene 4 entradas: Resumen, Movimientos, Reporte, Fiscal.
- Vale como medio de pago se excluye del cuadro de cobros porque representa saldo a favor previo, no un cobro real del período.

---

## [1.4.0] - 2026-04-08

### Añadido

- **Vista de escritorio para la dueña**: Nuevo `OwnerDesktopView` (`components/owner/OwnerDesktopView.tsx`) que envuelve los 7 componentes mobile existentes en un shell con sidebar de navegación + topbar sticky. Se activa cuando `userRole === 'owner'` y viewport ≥ 1180px. Las 7 secciones (Ingresos, Gastos, Historial, Stock, Reporte, Clientas, Configuración) están accesibles desde el sidebar con sus colores semánticos del bottom-nav móvil. El estado `activeTab` existente se reutiliza como section state — cero duplicación. El toast de confirmación se preserva en desktop via fragment wrapper.
- **Selector de período compartido para la contadora**: Nuevo `components/accountant/sharedPeriod.tsx` con `PeriodSelector`, `getPeriodRange` y `getPeriodLabel`. Tres modos `[Mes] [Año] [Todo]` + navegador de mes con chevrons (mismo patrón que `StatsHeader.tsx:43-58`). En modo `Mes` los chevrons cambian de mes en mes; en modo `Año` cambian de año en año; en `Todo` el navegador desaparece. Si se hace click a un chevron desde modo `Todo`, vuelve automáticamente a `Mes`.
- **Filas expandibles en `AccountantLedger`**: Click en una fila despliega un panel `bg-slate-50` con detalle. Para ventas: lista de productos (con cantidad, talle, descuento del 10% tachado) en una columna y pills coloreadas de medios de pago en otra (reusa `PAYMENT_COLORS` de `SalesList.tsx`). Las pills muestran cuotas y código de vale cuando aplican. Para gastos: categoría, descripción completa y card de Factura A discriminada cuando corresponde. Solo una fila puede estar expandida a la vez.
- **Card "Cobros por medio de pago" en `AccountantOverview`**: Desglose agregado de los cobros del período por medio de pago. Cada método se muestra con su pill coloreada, porcentaje del total y barra de progreso horizontal. La agregación deduplica por `client_number` para no doble-contar las múltiples filas de una transacción.
- **Indicador de medio de pago en bitácora**: La sección "Actividad reciente" del Resumen ahora muestra un dot coloreado a la izquierda de cada operación con el primer medio de pago, y `· N medios` cuando la venta se cobró con múltiples métodos.

### Cambiado

- **Sistema de período de la contadora unificado**: Las 3 secciones (Resumen, Movimientos, Reporte) ahora usan el mismo `PeriodSelector` con el mismo state model (`mode: PeriodMode`, `selectedMonth: Date`). Antes cada sección tenía su propio set de chips (`mtd/lastm/ytd/all` en Overview/Ledger, `mtd/lastm/q/ytd/all` en Analysis).
- **Gráficos anclados al mes seleccionado**: El chart de "últimos 6 meses" en `AccountantOverview` y el de "12 meses" en `AccountantAnalysis` ahora se anclan a `selectedMonth` (en modo `month` y `ytd`) en lugar de a `now`. En modo `all` siguen anclados a hoy.
- **Filtros de fecha en Movimientos reemplazados**: Los inputs `dateFrom`/`dateTo` se reemplazaron por el `PeriodSelector`. El filtro `Todo/Ingresos/Egresos` y el buscador se mantienen.
- **Modo Trimestre quitado de `AccountantAnalysis`**: Para mantener consistencia con las otras 2 secciones de la contadora. La navegación quarter-by-quarter se cubre clickeando 3 veces el chevron de mes.

### Notas

- Cero cambios en el código del owner mobile, en Convex, en hooks o en types. El UI del owner mobile, la vista mobile de la contadora y el `AccountantDesktopView` v1.3.0 siguen funcionando intactos en sus respectivos viewports.

---

## [1.3.0] - 2026-04-08

### Añadido

- **Vista de escritorio para contadoras**: Layout dedicado con sidebar de navegación que se activa en pantallas ≥ 1180px cuando el usuario tiene rol `accountant`. Incluye tres secciones:
  - **Resumen**: hero card con ganancia operativa del período, KPIs (ingresos brutos, egresos, operaciones, ticket promedio), gráfico de tendencia de 6 meses y feed de actividad reciente.
  - **Movimientos**: cards de totales (ingresos, egresos, saldo neto), buscador, filtros por tipo y rango de fechas, y tabla de transacciones con sales agrupadas por `client_number` y pills de estado (Ingreso/Egreso/Devolución).
  - **Reporte**: hero con resultado del ejercicio, estado de resultados (margen bruto, COGS, gastos operativos), KPIs de margen % y facturado A, curva anual de 12 meses con tooltips, y composición de egresos por rubro con barras horizontales.
- Layout responsive: en pantallas < 1180px la contadora sigue viendo el bottom-nav móvil existente sin cambios.

### Corregido

- **Login de contadora con `InvalidAccountId`**: La normalización del email (lowercase + trim) se aplicaba solo al crear la cuenta en `createAccountant`, pero no al iniciar sesión en `LoginView`. Si el teclado del celular capitalizaba la primera letra o agregaba un espacio al final, la búsqueda en `authAccounts` fallaba. Ahora `LoginView` normaliza el email antes de pasarlo al provider Password.

---

## [1.2.0] - 2026-04-03

### Añadido

- **Sistema de contadoras**: El owner puede crear cuentas de contadora desde Settings con email y contraseña, sin signup público.
- **Vista restringida para contadoras**: Las contadoras ven solo Movimientos (ingresos + egresos del negocio) y Reportes, sin acceso a gastos personales, inventario, clientes ni configuración.
- **Auto-creación de perfil**: Al primer login se crea el perfil automáticamente; el primer usuario es owner, los demás quedan pendientes de aprobación.
- **Pantalla de espera para usuarios pendientes**: Usuarios no asignados ven una pantalla indicando que su cuenta está pendiente.
- **Scoping de datos para contadoras**: Las contadoras ven los datos del owner asignado via `getEffectiveUserId`.

### Cambiado

- **Navegación de contadoras**: Incluye botones de Movimientos y Reporte.
- **Backend migrado de Supabase a Convex**: Auth, userId estable y deploy a producción.

### Corregido

- **Contadora no podía acceder**: Faltaba el perfil en la tabla `profiles` tras la migración desde Supabase.
- **Estabilización de userId en Convex auth**: Formato del identificador consistente entre sesiones.

---

## [1.0.0] - 2025-03-01

### Corregido

- **Ventas/gastos del último día del mes**: Las ventas y gastos del día 28 de febrero (y cualquier último día de mes) no aparecían en el historial. `endOfMonth` se calculaba a las 00:00:00 en lugar de 23:59:59.999.

### Añadido

- **Compra de dólares**: Categoría dedicada con campos USD + ARS + cotización, estadísticas en Reporte → Personal, descripción opcional.
- **Configuración de días abiertos**: En Ajustes se pueden marcar qué días abre el local; el gráfico de tendencia solo muestra esos días.
- **Categorías de gastos**: Expensas, Luz, Agua, Gas, ABL, Internet, Tarjeta de crédito.
- **Autocompletado por palabras clave**: Al escribir en la descripción (ej. "agua", "fibertel", "visa") se sugiere la categoría automáticamente.
- **Estadística de compra de dólares**: En Reporte → Personal: total USD, total ARS, cotización promedio y detalle por compra.
- **Total sin compra USD**: En Distribución de gastos (vista personal) se muestra el total descontando las compras de dólares.
- **Persistencia de filtros**: Búsqueda y mes seleccionado en Historial (Ingresos y Egresos) se guardan entre sesiones.
- **Retorno tras editar gasto**: Al guardar un gasto editado, se vuelve a Historial → Egresos.
- **Tooltip en gráfico de tendencia**: Al pasar el mouse se muestra el día de la semana (ej. "Lunes 2/3").
- **Sin año en gráfico**: Se quitó el año del eje X de la tendencia.

### Cambiado

- **Formulario de gastos**: Un solo campo de descripción; al detectar "100 dolares" o elegir Compra de dólares aparecen los campos USD/ARS debajo.
- **Monto total oculto en compra de dólares**: No se muestra el campo "Monto total" cuando la categoría es Compra de dólares (ya se completa en Pagaste en ARS).
- **Compra de dólares primero**: La categoría aparece primera en el grid de categorías personales.
- **Orden en Reporte personal**: Distribución de gastos antes de Compra de dólares.
- **Overflow de números**: Ajustes para que totales ARS y cotización no se desborden en pantallas chicas.
