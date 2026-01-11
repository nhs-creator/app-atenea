# 🏛️ Atenea Finanzas v2.0

**Atenea Finanzas** es una solución integral de Punto de Venta (POS) y gestión de inventario diseñada específicamente para negocios minoristas de indumentaria. Enfocada en la velocidad de carga y la facilidad de uso para usuarios que prefieren flujos táctiles y visuales.

## 🚀 Funcionalidades Principales

### 🛒 Registro de Ventas Avanzado (POS)
- **Carrito Multi-Producto**: Permite registrar múltiples prendas en una sola operación, calculando subtotales y totales en tiempo real.
- **Medios de Pago Divididos**: Soporta pagos mixtos (ej: parte en efectivo y parte transferencia) validando el saldo restante.
- **ID Semántico Inteligente**: Generación automática de IDs con formato `[Tipo][Fecha]-[Correlativo]` (Ej: `V260109-001` para Ventas, `S` para Señas, `C` para Cambios).
- **Gestión de Señas**: El sistema detecta automáticamente si una venta está incompleta y la marca como "Seña" (Pendiente).

### 🔄 Sistema de Cambios y Devoluciones
- **Flujo Guiado**: Los cambios se inician desde el historial de ventas, cargando automáticamente la prenda a devolver con precio negativo.
- **Diferencial Automático**: Calcula la diferencia a cobrar o devolver al agregar los nuevos productos del intercambio.
- **Sincronización de Stock**: Las devoluciones suman stock automáticamente y las salidas lo restan.

### 📦 Inventario y Stock
- **Gestión por Talles**: Soporte nativo para distribución de talles (S, M, L, XL, Único, etc.) mediante estructura JSONB.
- **Triggers Automáticos**: La base de datos calcula el `stock_total` automáticamente mediante triggers cada vez que se modifica un talle.
- **Precios de Costo y Venta**: Seguimiento de márgenes de ganancia por producto.

### 📱 UX y Accesibilidad
- **Diseño "Finger-Friendly"**: Botones de acción con área táctil mínima de 44x44px.
- **Alto Contraste**: Interfaz optimizada para legibilidad en dispositivos móviles bajo cualquier condición de luz.
- **Entrada Inteligente**: Selección automática de teclados (numérico para precios, QWERTY para búsqueda).
- **Confirmaciones Nativas**: Uso de diálogos de sistema para acciones críticas (borrado), asegurando rapidez y seguridad.

## 🛠️ Stack Tecnológico

- **Frontend**: React + TypeScript + Vite.
- **Estilos**: Tailwind CSS (Diseño responsive y alto contraste).
- **Iconografía**: Lucide React.
- **Backend & DB**: Supabase (PostgreSQL).
- **Infraestructura**: Docker (para entorno de desarrollo y migraciones CLI).

## 🛡️ Seguridad y Rendimiento

- **RLS Optimizado**: Políticas de seguridad de nivel de fila (Row Level Security) optimizadas para alto rendimiento.
- **Índices de Búsqueda**: Indexación por `client_number` para consultas instantáneas en el historial.
- **Search Path Security**: Funciones de base de datos protegidas contra ataques de mutación de esquema.

## 📝 Guía de Uso Rápido

1. **Cargar Inventario**: Asegúrate de tener stock con sus respectivos talles.
2. **Realizar Venta**: Ve a "Ingresar", agrega productos al carrito, selecciona medio de pago y confirma.
3. **Realizar Cambio**: Busca la venta original en el "Historial", toca el botón **Indigo (↺)** y agrega la nueva prenda que lleva el cliente.
4. **Corregir Error**: Usa el botón **Gris (✏️)** en el historial para volver a cargar una venta vieja en el formulario y sobrescribirla.

---
*Desarrollado con foco en la eficiencia operativa y el control financiero.*