# Roadmap - Atenea Finanzas

## Completado

### Auditoria y bug fixes (2026-03-25)
- [x] Filtros user_id en todas las operaciones destructivas
- [x] Error handling en operaciones de base de datos
- [x] Fix escalacion de privilegios en loadProfile
- [x] Fix race condition de sesion
- [x] Fix useEffect con JSON.stringify en deps
- [x] Fix handleNewSale sin error toast
- [x] Fix precio incorrecto en edicion (|| vs ??)
- [x] Tipado de session como Session | null
- [x] RPC save_multi_sale atomico (PostgreSQL)
- [x] Fix historial: ventana de 24 meses sin limit

### Migracion Supabase a Convex (2026-03-25/26)
- [x] Schema: 9 colecciones con tipos estrictos + 27 indices
- [x] Auth: Convex Auth con Password provider
- [x] Queries: 8 queries reactivas
- [x] Mutations: CRUD + saveMultiSale atomico nativo
- [x] Helpers: stockHelpers (deduct/restore/sync), semanticId, auth (getStableUserId)
- [x] Frontend: hook useAteneaConvex como adaptador drop-in
- [x] Migration script: importData + fixUserIds
- [x] PWA: service worker actualizado para convex.cloud
- [x] Deploy produccion con datos migrados

---

## Pendiente

### Limpieza post-migracion
- [ ] Arreglar userId en entorno dev (correr fixUserIds con formato estable)
- [ ] Eliminar dependencias Supabase: `lib/supabase.ts`, `hooks/useAtenea.ts`, `database.types.ts`
- [ ] Eliminar directorio `supabase/migrations/`
- [ ] Desinstalar `@supabase/supabase-js` de package.json
- [ ] Eliminar campos `supabaseId` del schema (o mantener para auditoria)
- [ ] Eliminar archivos de migracion: `convex/migration/`
- [ ] Rotar JWT_PRIVATE_KEY (`npx @convex-dev/auth` en prod)
- [ ] Cerrar proyecto Supabase

### Config sync (mejora)
- [ ] Migrar config de localStorage a coleccion `userConfig` en Convex
- [ ] Sync entre dispositivos (SettingsView guarda en Convex + localStorage como cache)

### Mejoras de UX
- [ ] Error boundaries para capturar crashes de componentes
- [ ] Loading states en todas las operaciones async
- [ ] Validacion de inputs mas robusta en formularios

### Seguridad
- [ ] Implementar role-check en mutations (no solo en UI)
- [ ] Agregar soporte para accountant en Convex (accountantAssignments)
- [ ] Rate limiting en auth

### Performance
- [ ] Paginar queries grandes en lugar de cargar todo
- [ ] Optimizar re-renders con React.memo en componentes pesados
