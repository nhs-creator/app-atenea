import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const paymentDetailValidator = v.object({
  method: v.string(),
  amount: v.number(),
  installments: v.optional(v.number()),
  voucherCode: v.optional(v.string()),
  appliedToItems: v.optional(v.array(v.string())),
  roundingBase: v.optional(v.union(
    v.literal(100), v.literal(500), v.literal(1000), v.null()
  )),
});

export default defineSchema({
  // --- Convex Auth tables ---
  ...authTables,

  // --- App: Profiles ---
  profiles: defineTable({
    userId: v.string(),
    storeName: v.optional(v.string()),
    role: v.union(v.literal("owner"), v.literal("accountant"), v.literal("pending")),
    supabaseId: v.optional(v.string()),
    // Letra de la categoría de monotributo actual de la dueña (A..K). Editable desde Settings.
    monotributoCategory: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Monotributo: escala de categorías editable por la dueña ---
  monotributoCategories: defineTable({
    userId: v.string(),
    letter: v.string(), // "A" .. "K"
    order: v.number(),  // 0..10 — para ordenar
    maxBilling: v.number(),
    surfaceLimit: v.optional(v.string()),
    electricityLimit: v.optional(v.string()),
    rentLimit: v.optional(v.number()),
    unitPriceLimit: v.optional(v.number()),
    taxServices: v.optional(v.number()),
    taxGoods: v.number(),
    sipa: v.number(),
    obraSocial: v.number(),
    totalServices: v.optional(v.number()),
    totalGoods: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_letter", ["userId", "letter"]),

  // --- Facturado mensual: campo manual ingresado por la contadora o dueña ---
  monthlyBilling: defineTable({
    userId: v.string(),
    yearMonth: v.string(), // "2026-01"
    facturado: v.number(),
  })
    .index("by_userId_yearMonth", ["userId", "yearMonth"]),

  accountantAssignments: defineTable({
    ownerId: v.id("profiles"),
    accountantId: v.id("profiles"),
  })
    .index("by_owner", ["ownerId"])
    .index("by_accountant", ["accountantId"]),

  // --- Clients ---
  clients: defineTable({
    userId: v.string(),
    name: v.string(),
    lastName: v.optional(v.string()),
    phone: v.string(),
    email: v.optional(v.string()),
    totalSpent: v.number(),
    lastPurchaseDate: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Inventory ---
  inventory: defineTable({
    userId: v.string(),
    name: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    costPrice: v.number(),
    sellingPrice: v.number(),
    sizes: v.record(v.string(), v.number()),
    stockTotal: v.number(),
    minStock: v.optional(v.number()),
    sku: v.optional(v.string()),
    barcode: v.optional(v.string()),
    supabaseId: v.optional(v.string()),
    // Nota libre (tela, estampado, detalle) para cuando la categoría rígida no alcanza
    // a describir la prenda como la piensa la dueña. También la matchea la búsqueda.
    detalle: v.optional(v.string()),
    // Talle -> timestamp del último talle impreso (no un conteo, solo "¿ya se
    // imprimió alguna vez?") — para saber qué falta etiquetar al cargar stock nuevo.
    labelsPrinted: v.optional(v.record(v.string(), v.number())),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_name", ["userId", "name"])
    .index("by_userId_category", ["userId", "category"])
    .index("by_userId_barcode", ["userId", "barcode"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Sales ---
  sales: defineTable({
    userId: v.string(),
    date: v.string(),
    clientNumber: v.string(),
    productName: v.string(),
    quantity: v.number(),
    size: v.optional(v.string()),
    price: v.number(),
    listPrice: v.optional(v.number()),
    costPrice: v.optional(v.number()),
    paymentMethod: v.string(),
    paymentDetails: v.array(paymentDetailValidator),
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("cancelled"),
      v.literal("returned"),
      v.literal("exchanged"),
    ),
    notes: v.optional(v.string()),
    expiresAt: v.optional(v.string()),
    inventoryId: v.optional(v.id("inventory")),
    clientId: v.optional(v.id("clients")),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_clientNumber", ["userId", "clientNumber"])
    .index("by_userId_status", ["userId", "status"])
    .index("by_clientId", ["clientId"])
    .index("by_inventoryId", ["inventoryId"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Expenses ---
  expenses: defineTable({
    userId: v.string(),
    date: v.string(),
    description: v.string(),
    amount: v.number(),
    category: v.string(),
    type: v.union(v.literal("business"), v.literal("personal")),
    hasInvoiceA: v.boolean(),
    invoiceAmount: v.number(),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_date", ["userId", "date"])
    .index("by_userId_type", ["userId", "type"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Vouchers ---
  vouchers: defineTable({
    userId: v.string(),
    code: v.string(),
    initialAmount: v.number(),
    currentAmount: v.number(),
    status: v.union(
      v.literal("active"), v.literal("used"), v.literal("expired")
    ),
    clientId: v.optional(v.id("clients")),
    expiresAt: v.string(),
    supabaseId: v.optional(v.string()),
  })
    .index("by_userId_status", ["userId", "status"])
    .index("by_code", ["code"])
    .index("by_supabaseId", ["supabaseId"]),

  // --- Inventory Movements (Audit Trail) ---
  inventoryMovements: defineTable({
    inventoryId: v.id("inventory"),
    userId: v.string(),
    movementType: v.union(
      v.literal("sale"), v.literal("return"), v.literal("restock"),
      v.literal("adjustment"), v.literal("transfer_in"),
      v.literal("transfer_out"), v.literal("initial"), v.literal("cancel"),
    ),
    size: v.string(),
    quantityChange: v.number(),
    quantityBefore: v.number(),
    quantityAfter: v.number(),
    referenceType: v.optional(v.string()),
    referenceId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_inventoryId", ["inventoryId"])
    .index("by_userId", ["userId"]),

  // --- Inventory Price History ---
  inventoryPriceHistory: defineTable({
    inventoryId: v.id("inventory"),
    costPrice: v.number(),
    sellingPrice: v.number(),
    changedBy: v.optional(v.string()),
  })
    .index("by_inventoryId", ["inventoryId"]),

  // --- AFIP: configuración fiscal (CUIT, punto de venta, credenciales de contexto) ---
  afipConfig: defineTable({
    userId: v.string(),
    cuit: v.number(),
    puntoVenta: v.number(),
    razonSocial: v.string(),
    // Nombre del negocio (ej. "Atenea Moda y Accesorios") — ARCA exige que la razón
    // social (nombre legal, monotributo = persona física) figure en la factura, pero
    // permite sumar el nombre de fantasía al lado. Es solo visual en nuestro PDF propio.
    nombreFantasia: v.optional(v.string()),
    domicilioComercial: v.string(),
    condicionIva: v.number(),
    inicioActividades: v.string(),
    iibb: v.optional(v.string()),
    isProduction: v.boolean(),
    certExpiration: v.optional(v.string()),
    // Regla de negocio configurable: por default el efectivo no se factura
    // (caso original de Atenea), pero otros comercios pueden necesitar
    // facturar todo, incluido efectivo.
    facturarEfectivo: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"]),

  // --- AFIP: comprobantes emitidos (Factura C / Nota de Crédito C) con CAE ---
  invoices: defineTable({
    userId: v.string(),
    yearMonth: v.string(), // "2026-07" — bucketing explícito para reportes mensuales
    clientNumber: v.string(),
    clientId: v.optional(v.id("clients")),
    docTipo: v.number(), // 80 CUIT / 86 CUIL / 96 DNI / 99 Consumidor Final
    docNro: v.number(),
    condicionIvaReceptor: v.number(), // códigos AFIP 1/4/5/6
    importeTotal: v.number(),
    afipCae: v.string(),
    afipCaeExpiration: v.string(),
    afipPuntoVenta: v.number(),
    afipCbteNro: v.number(),
    afipCbteTipo: v.number(), // 11 Factura C / 13 Nota de Crédito C
    afipConcepto: v.number(), // 1 = Productos
    afipQrData: v.string(),
    afipFiscalNumber: v.string(), // "C 00002-00000147"
    creditNoteFor: v.optional(v.id("invoices")),
    motivo: v.optional(v.string()), // solo para notas de crédito
  })
    .index("by_userId", ["userId"])
    .index("by_userId_clientNumber", ["userId", "clientNumber"])
    .index("by_userId_yearMonth", ["userId", "yearMonth"]),

  // --- User Config (optional: sync across devices) ---
  userConfig: defineTable({
    userId: v.string(),
    categories: v.array(v.string()),
    subcategories: v.record(v.string(), v.array(v.string())),
    materials: v.array(v.string()),
    sizeSystems: v.record(v.string(), v.array(v.string())),
    categorySizeMap: v.record(v.string(), v.string()),
    openDays: v.array(v.number()),
  })
    .index("by_userId", ["userId"]),

  // --- Asistente conversacional (Atenea IA) ---
  // Conversaciones del chat. `summary` + `summarizedUpTo` implementan la
  // compactación: los mensajes anteriores a `summarizedUpTo` quedan resumidos
  // y se descartan del contexto que se manda al modelo.
  assistantConversations: defineTable({
    userId: v.string(),
    title: v.optional(v.string()),
    // Sin valor = "sales" (conversaciones viejas, chat general). "inventory" = agente
    // de carga de inventario por voz, con su propio prompt y tools.
    mode: v.optional(v.union(v.literal("sales"), v.literal("inventory"))),
    messages: v.array(
      v.object({
        role: v.union(v.literal("user"), v.literal("assistant")),
        content: v.string(),
        tools: v.optional(v.array(v.string())),
        pending: v.optional(v.boolean()),
        createdAt: v.number(),
      })
    ),
    summary: v.optional(v.string()),
    summarizedUpTo: v.optional(v.number()),
    processed: v.boolean(),
    lastActivityAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_activity", ["userId", "lastActivityAt"])
    .index("by_processed_activity", ["processed", "lastActivityAt"]),

  // Ventas propuestas por el asistente, pendientes de confirmación en el modal.
  assistantSaleProposals: defineTable({
    userId: v.string(),
    conversationId: v.id("assistantConversations"),
    clientLabel: v.optional(v.string()),
    items: v.array(
      v.object({
        product: v.string(),
        quantity: v.number(),
        price: v.number(), // precio final unitario
        listPrice: v.optional(v.number()),
      })
    ),
    payments: v.array(
      v.object({
        method: v.string(),
        amount: v.number(),
        installments: v.optional(v.number()),
      })
    ),
    discountPercent: v.optional(v.number()),
    total: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  }).index("by_conversation_status", ["conversationId", "status"]),

  // Altas/ajustes de inventario propuestos por el agente de voz, pendientes
  // de confirmación en el modal. "sizes" es cantidad absoluta por talle en
  // kind="create", y delta (+/-) por talle en kind="update".
  assistantInventoryProposals: defineTable({
    userId: v.string(),
    conversationId: v.id("assistantConversations"),
    kind: v.union(v.literal("create"), v.literal("update")),
    inventoryId: v.optional(v.id("inventory")), // solo kind="update"
    name: v.string(),
    category: v.optional(v.string()),
    subcategory: v.optional(v.string()),
    material: v.optional(v.string()),
    detalle: v.optional(v.string()),
    sizes: v.record(v.string(), v.number()),
    costPrice: v.optional(v.number()),
    sellingPrice: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("confirmed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
  }).index("by_conversation_status", ["conversationId", "status"]),

  // Diccionario personal: abreviaturas/términos propios de la dueña que el
  // asistente aprende con el uso (ej. "modal m/c" = "modal crepé").
  assistantVocabulary: defineTable({
    userId: v.string(),
    term: v.string(), // como lo dice ella, normalizado a minúsculas
    meaning: v.string(), // qué significa
    useCount: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_term", ["userId", "term"]),

  // RAG de memoria: resúmenes de conversaciones cerradas, vectorizados.
  assistantMemories: defineTable({
    userId: v.string(),
    summary: v.string(),
    embedding: v.array(v.float64()),
    source: v.string(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["userId"],
    }),
});
