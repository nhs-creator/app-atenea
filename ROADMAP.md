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

### Limpieza post-migracion (legacy Supabase)

**Archivos a eliminar:**
- [ ] `lib/supabase.ts` — cliente Supabase (ya no se importa en ningún lado activo)
- [ ] `hooks/useAtenea.ts` — hook antiguo reemplazado por `useAteneaConvex.ts`
- [ ] `database.types.ts` — tipos generados de Supabase
- [ ] `supabase/migrations/` — directorio completo (4 archivos SQL)
- [ ] `supabase/seed_inventory_categories.sql` — seed data (si existe)
- [ ] `scripts/audit-schema.js` — script de auditoria Supabase
- [ ] `scripts/README.md` — docs del script
- [ ] `docs/CODE_CHANGES_SUMMARY.md` — referencia a Supabase
- [ ] `docs/IMPLEMENTATION_SUMMARY.md` — referencia a Supabase
- [ ] `docs/MIGRATION_GUIDE.md` — guia de migracion legacy
- [ ] `docs/MIGRATION_SUCCESS.md` — reporte de migracion legacy
- [ ] `docs/MIGRATION_TROUBLESHOOTING.md` — troubleshooting legacy
- [ ] `docs/SCHEMA_AUDIT_REPORT.md` — auditoria legacy
- [ ] `NEXT_STEPS.md` — pasos legacy
- [ ] `dist/` — build viejo con referencias a Supabase (se regenera en deploy)
- [ ] `convex/migration/` — scripts de migracion one-time (4 archivos)

**Archivos a modificar:**
- [ ] `package.json` — desinstalar `@supabase/supabase-js`
- [ ] `public/sw.js` — quitar bypass de `supabase.co` (mantener solo `convex.cloud`)
- [ ] `convex/schema.ts` — quitar campos `supabaseId` de todas las colecciones
- [ ] `tests/hooks/useAtenea.test.ts` — reescribir tests para useAteneaConvex
- [ ] `tests/hooks/useAtenea.inventory.test.ts` — reescribir tests para Convex

**Tests legacy Supabase (reescribir o eliminar):**
- [ ] `tests/hooks/useAtenea.test.ts`
- [ ] `tests/hooks/useAtenea.inventory.test.ts`

**Config/env:**
- [ ] `.env` — eliminar `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Convex env prod/dev — eliminar `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Rotar JWT_PRIVATE_KEY (`npx @convex-dev/auth` en prod)
- [ ] Netlify env — eliminar env vars de Supabase si existen

**Infraestructura:**
- [ ] Cerrar proyecto Supabase (después de 2 semanas de verificación)
- [ ] Arreglar userId en entorno dev (correr fixUserIds con formato estable)

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
