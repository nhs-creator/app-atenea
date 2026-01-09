# 🏛️ Atenea Finanzas

**Atenea Finanzas** es una aplicación de gestión integral diseñada para boutiques y pequeños negocios textiles. Permite el control total de ventas, gastos, inventario y análisis estratégico en tiempo real, con un enfoque "Offline-First" para asegurar que el negocio nunca se detenga.

---

## 🚀 Funcionalidades Principales

### 1. Gestión de Ventas (Punto de Venta)
- **Registro Ágil**: Carga de ventas vinculadas a productos del inventario.
- **Control de Stock Automático**: Descuenta unidades del inventario por talle al vender y las reintegra al eliminar una venta.
- **Historial Detallado**: Visualización de ventas agrupadas por día y cliente, con filtros por período (mes/semana/día) y medio de pago.
- **Sincronización**: Estado de sincronización en tiempo real con Supabase.

### 2. Control de Inventario
- **Estructura Multidimensional**: Organización por Categoría (ej. Tejidos), Subcategoría (ej. Suéteres) y Material (ej. Lana).
- **Gestión por Talles**: Soporte para sistemas de talles (Letras, Números Ropa, Números Calzado, Único).
- **Alertas de Reposición**: Identificación automática de productos con stock crítico (≤ 3 unidades).
- **Precios Diferenciados**: Gestión de precios de costo y precios de venta para cálculo de márgenes.

### 3. Registro de Gastos
- **Categorización**: Clasificación en Mercadería, Alquiler/Fijos, Impuestos/Servicios y Otros.
- **Gestión Impositiva**: Soporte para Factura A con porcentaje de facturación configurable.
- **Balance de Egresos**: Visualización rápida del total gastado en el período.

### 4. Análisis Estratégico (Dashboard)
- **Métricas Financieras**: Cálculo de Ganancia Bruta (Ventas - Costos) y Beneficio Neto (Ventas - Gastos).
- **Valor de Inventario**: Capital total invertido en mercadería a precio de costo.
- **Rendimiento**: Gráficos de ventas por categoría y desglose por medios de pago.

### 5. Configuración y Personalización
- **Adaptabilidad**: Configuración de categorías, subcategorías y materiales desde la interfaz de Ajustes.
- **Diseño Personalizado**: Sistema de colores por medio de pago y categoría de gasto para identificación rápida.

---

## 🛠️ Stack Tecnológico

- **Frontend**: React 19 (TypeScript) + Vite.
- **Estilos**: Tailwind CSS + Lucide React (Iconos).
- **Base de Datos & Auth**: Supabase (PostgreSQL).
- **PWA**: Service Workers para funcionamiento offline y LocalStorage como fallback de persistencia.

---

## 📂 Estructura del Proyecto

- `/src`: Código fuente principal.
  - `/components`: Componentes modulares (SalesForm, InventoryView, StatsView, etc.).
  - `/lib`: Configuración de clientes externos (Supabase).
  - `/services`: Lógica de persistencia local (storageService).
  - `/types.ts`: Definiciones de interfaces y tipos de datos.
  - `/constants.ts`: Configuraciones maestras y mapas de diseño.
- `/public`: Activos estáticos, manifest de PWA y Service Worker.

---

## 🔄 Flujo de Datos

1. **Acción del Usuario**: Se registra una venta o gasto.
2. **Persistencia Local**: Los datos se guardan inmediatamente en el estado de React y, si es necesario, en `localStorage`.
3. **Sincronización Cloud**: La app intenta persistir el cambio en Supabase.
4. **Actualización UI**: Los reportes y el inventario se recalculan instantáneamente para reflejar el nuevo estado financiero.

---

## 📈 Próximas Mejoras
- [ ] **Venta Multi-Producto (Carrito)**: Permitir múltiples items por operación.
- [ ] **Pagos Divididos**: Soporte para cobrar con varios medios de pago en una misma venta.
- [ ] **Integración ARCA**: Facturación electrónica directa.
- [ ] **Sistema de Etiquetas**: Generación de códigos QR para productos.