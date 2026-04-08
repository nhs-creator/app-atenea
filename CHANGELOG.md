# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

_(Los cambios futuros se documentan aquí hasta el próximo release.)_

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
