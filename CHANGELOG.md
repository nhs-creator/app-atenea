# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

_(Los cambios futuros se documentan aquí hasta el próximo release.)_

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
