# Novedades de Atenea Finanzas

## v1.5.1 — 8 de abril de 2026

### Nuevo: Descargar el cuadro fiscal en Excel

En la misma pantalla donde la contadora ve el año fiscal completo, ahora puede **bajar un archivo de Excel** con un solo toque.

- El archivo incluye **mes por mes** todos los cobros por medio de pago, los totales, lo cargado como facturado y la diferencia sin facturar, más una **fila con el resumen del año completo**.
- También trae una segunda parte con el **encuadre de monotributo** que estaba viendo en pantalla (topes, margen y porcentaje usado), para archivarlo o compartirlo sin copiar números a mano.

---

## v1.5.0 — 8 de abril de 2026

### Nuevo: Cuadro fiscal para la contadora

La contadora tiene una nueva sección llamada **Fiscal** en su panel lateral con todo lo que necesita para hacer el control mensual y planificar el monotributo.

- **Cuadro de cobros mensual**: una tabla con los 12 meses del año mostrando, para cada mes, cuánto se cobró por efectivo, transferencia, débito y crédito por separado, más el total con y sin efectivo. Se puede navegar entre años con las flechas.
- **Facturado manual**: en cada mes hay un campo editable donde la contadora carga lo que ya se facturó. La app calcula automáticamente cuánto queda sin facturar y qué porcentaje del cobro digital del mes representa esa diferencia.
- **Totales anuales** al pie de la tabla con todo lo cobrado y lo facturado en el año.
- **Tarjetas de monotributo**: cuatro tarjetas que muestran la categoría actual de la dueña y las tres siguientes, con el tope de facturación anual de cada una, cuánto margen queda hasta llegar al tope (o cuánto se excedió, si pasó), una barra de progreso visual y el monto mensual del monotributo a pagar en cada categoría.

### Nuevo: Configuración del monotributo para la dueña

En **Configuración**, la dueña tiene una nueva sección **Monotributo** para administrar la escala AFIP que usa la contadora.

- Botón para cargar las 11 categorías oficiales AFIP (A a K) con los valores actuales 2026 de un solo click.
- Selector visual para marcar en qué categoría está actualmente.
- Lista editable de todas las categorías: tocando el lápiz se puede actualizar el tope anual o el monto mensual de cualquier escalón. Útil cuando AFIP actualiza los valores y hay que reflejarlos.
- La categoría actual queda resaltada en verde.

---

## v1.4.0 — 8 de abril de 2026

### Nuevo: Vista de escritorio para la dueña

La app ahora también funciona como una experiencia de escritorio completa cuando la abrís desde la computadora.

- Panel lateral fijo con acceso directo a las 7 secciones: Ingresos, Gastos, Historial, Stock, Reporte, Clientas y Configuración.
- Cada sección sigue funcionando exactamente igual que en el celular, pero centrada y con más respiro alrededor en pantallas grandes.
- En el celular sigue viendo el menú inferior de siempre — el escritorio se activa automáticamente cuando la pantalla es lo suficientemente ancha.

### Nuevo: La contadora puede navegar mes por mes

En las tres secciones que ve la contadora (Resumen, Movimientos y Reporte) hay un selector de período renovado.

- Tres modos rápidos: **Mes**, **Año** y **Todo**.
- En modo **Mes**, dos flechas permiten ir al mes anterior o siguiente sin perder de vista la información del período.
- En modo **Año**, las flechas avanzan o retroceden de año en año.
- Los gráficos de tendencia se actualizan automáticamente para mostrar los meses anteriores al período elegido.

### Nuevo: La contadora puede ver el detalle de cada operación

En la sección **Movimientos**, ahora se puede hacer click en cualquier fila para ver el detalle completo:

- En las ventas: la lista de productos vendidos (con cantidad, talle y descuento aplicado si lo hubo) y los medios de pago usados con el monto exacto que se cobró por cada uno. Si la venta se pagó en cuotas o con un vale, también se muestra.
- En los gastos: la categoría, la descripción completa y, si tiene factura A, el monto discriminado.

### Nuevo: Cobros por medio de pago en el Resumen

La contadora tiene una nueva tarjeta en el Resumen que muestra cómo se cobró el dinero del período: cuánto entró por efectivo, transferencia, débito, crédito y vales, con el porcentaje y el monto de cada medio.

Además, en la lista de últimas operaciones aparece un punto de color al lado de cada venta que indica de un vistazo cómo se cobró.

---

## v1.3.0 — 8 de abril de 2026

### Nuevo: Vista de escritorio para contadoras

Las contadoras ahora tienen una experiencia diseñada para trabajar desde la computadora, no solo del celular.

- Panel lateral con acceso directo a Resumen, Movimientos y Reporte.
- En **Resumen**: ganancia operativa del período, totales de ingresos y gastos, cantidad de operaciones, ticket promedio y un gráfico con la tendencia de los últimos 6 meses.
- En **Movimientos**: tabla completa con todos los ingresos y egresos, buscador, filtro por rango de fechas y separación visual entre ventas, gastos y devoluciones. Cada venta se muestra agrupada como una sola operación, no producto por producto.
- En **Reporte**: estado de resultados con margen bruto, gráfico anual de 12 meses con detalle al pasar el cursor, y desglose de los gastos por rubro ordenados por importancia.
- En el celular sigue viendo la misma vista táctil de antes; el escritorio se activa solo cuando la pantalla es lo suficientemente grande.

### Corregido

- Las contadoras ya pueden iniciar sesión sin importar si el teclado del celular capitaliza la primera letra del email o agrega un espacio al final.
