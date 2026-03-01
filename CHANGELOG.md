# Changelog

Todos los cambios notables del proyecto se documentan en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/).

---

## [Unreleased]

_(Los cambios futuros se documentan aquí hasta el próximo release.)_

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
