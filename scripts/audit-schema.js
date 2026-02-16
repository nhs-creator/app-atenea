#!/usr/bin/env node
/**
 * Schema Audit Script for Supabase/PostgreSQL
 * Analyzes migration files for: architecture, security, performance, naming, inventory robustness
 *
 * Usage:
 *   npm run audit:schema
 *   node scripts/audit-schema.js [path-to-schema.sql]
 *
 * Or dump fresh schema first:
 *   npx supabase db dump --schema public -f supabase/schema_audit.sql
 *   npm run audit:schema supabase/schema_audit.sql
 */

import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

function loadSchema() {
  const arg = process.argv[2];
  if (arg) {
    return readFileSync(join(process.cwd(), arg), 'utf8');
  }
  const migrationsDir = join(projectRoot, 'supabase', 'migrations');
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => join(migrationsDir, f));
  return files.map((f) => readFileSync(f, 'utf8')).join('\n\n');
}

function extract(pattern, schema, group = 1) {
  const matches = [];
  const re = new RegExp(pattern, 'gi');
  let m;
  while ((m = re.exec(schema)) !== null) {
    matches.push(m[group]?.trim() || m[0]);
  }
  return matches;
}

function audit(schema) {
  const issues = [];
  const recommendations = [];
  const good = [];

  // --- TABLES ---
  const tables = extract(/CREATE TABLE (?:IF NOT EXISTS )?"public"\."([^"]+)"/, schema);
  const tableSet = new Set(tables);

  // --- PRIMARY KEYS ---
  const pkTables = new Set();
  const pkRe = /ALTER TABLE ONLY "public"\."([^"]+)"[\s\S]*?ADD CONSTRAINT "[^"]+" PRIMARY KEY/g;
  let pkM;
  while ((pkM = pkRe.exec(schema)) !== null) {
    pkTables.add(pkM[1]);
  }
  tables.forEach((t) => {
    if (!pkTables.has(t)) {
      issues.push({ type: 'ARCHITECTURE', severity: 'HIGH', msg: `Table "${t}" may lack an explicit PRIMARY KEY` });
    }
  });

  // --- FOREIGN KEYS ---
  const fkColumns = [];
  const fkRe = /ALTER TABLE ONLY "public"\."([^"]+)"[\s\S]*?ADD CONSTRAINT "[^"]+" FOREIGN KEY \("([^"]+)"\) REFERENCES/g;
  let fm;
  while ((fm = fkRe.exec(schema)) !== null) {
    fkColumns.push({ table: fm[1], column: fm[2] });
  }

  // --- INDEXES ---
  const indexedColumns = new Map();
  const idxRe = /CREATE INDEX "[^"]+" ON "public"\."([^"]+)"[^)]*\(\s*"([^"]+)"\s*\)/g;
  let idxM;
  while ((idxM = idxRe.exec(schema)) !== null) {
    const t = idxM[1], c = idxM[2];
    if (!indexedColumns.has(t)) indexedColumns.set(t, new Set());
    indexedColumns.get(t).add(c);
  }

  // Missing indexes on FK columns
  fkColumns.forEach(({ table, column }) => {
    const cols = indexedColumns.get(table);
    if (!cols || !cols.has(column)) {
      recommendations.push({
        type: 'PERFORMANCE',
        msg: `Add index on "${table}"."${column}" (foreign key column) for join performance`,
      });
    }
  });

  // --- RLS ---
  const rlsTables = extract(/ALTER TABLE "public"\."([^"]+)" ENABLE ROW LEVEL SECURITY/, schema);
  const noRls = tables.filter((t) => !rlsTables.includes(t));
  if (noRls.length) {
    issues.push({
      type: 'SECURITY',
      severity: 'CRITICAL',
      msg: `Tables without RLS: ${noRls.join(', ')}`,
    });
  } else {
    good.push('All tables have RLS enabled');
  }

  // --- POLICIES ---
  const permissivePolicies = extract(
    /CREATE POLICY "([^"]+)" ON "public"\."([^"]+)"[^U]*USING \(true\)/,
    schema
  );
  const policyRe = /CREATE POLICY "([^"]+)" ON "public"\."([^"]+)"[^;]+USING \(true\)/g;
  const permissive = [];
  let policyM;
  while ((policyM = policyRe.exec(schema)) !== null) {
    permissive.push({ policy: policyM[1], table: policyM[2] });
  }
  permissive.forEach(({ policy, table }) => {
    if (!['inventory_categories', 'inventory_materials', 'inventory_subcategories'].includes(table)) {
      recommendations.push({
        type: 'SECURITY',
        msg: `Policy "${policy}" on "${table}" uses USING (true) - consider scoping to user_id/auth.uid()`,
      });
    } else {
      recommendations.push({
        type: 'SECURITY',
        msg: `Reference table "${table}" has USING (true) - acceptable for read-only lookup, but ensure no INSERT/UPDATE/DELETE policies allow writes`,
      });
    }
  });

  // --- GRANTS ---
  if (schema.includes('GRANT ALL') && schema.includes('TO "anon"')) {
    issues.push({
      type: 'SECURITY',
      severity: 'HIGH',
      msg: 'GRANT ALL to "anon" role - anonymous users should have minimal or no access',
    });
  }

  // --- NAMING ---
  const inconsistent = [];
  if (tableSet.has('clients') && schema.includes('customers_pkey')) {
    issues.push({
      type: 'NAMING',
      severity: 'MEDIUM',
      msg: 'Table "clients" has constraint "customers_pkey" - inconsistent naming (clients vs customers)',
    });
  }
  if (schema.includes('sales_customer_id_fkey') && schema.includes('client_id')) {
    recommendations.push({
      type: 'NAMING',
      msg: 'FK "sales_customer_id_fkey" references "client_id" - consider renaming to sales_client_id_fkey for consistency',
    });
  }

  // --- INVENTORY ROBUSTNESS ---
  const invSchema = schema.match(/CREATE TABLE[^;]*"public"\."inventory"[^;]*/s)?.[0] || '';
  if (invSchema) {
    if (!invSchema.includes('stock_total') || !invSchema.includes('sizes')) {
      issues.push({
        type: 'INVENTORY',
        severity: 'HIGH',
        msg: 'Inventory table should have stock_total and sizes (JSONB) for robust stock tracking',
      });
    } else {
      good.push('Inventory has stock_total and sizes JSONB for size-level tracking');
    }
    if (!invSchema.includes('updated_at') && !invSchema.includes('last_updated')) {
      recommendations.push({
        type: 'INVENTORY',
        msg: 'Add updated_at or last_updated to inventory for audit trail',
      });
    } else {
      good.push('Inventory has last_updated for audit');
    }
    if (!invSchema.includes('sku') && !invSchema.includes('code')) {
      recommendations.push({
        type: 'INVENTORY',
        msg: 'Consider adding sku or product_code to inventory for unique product identification and barcode support',
      });
    }
    if (!schema.includes('trg_inventory_stock_sync') && !schema.includes('calculate_stock_total')) {
      recommendations.push({
        type: 'INVENTORY',
        msg: 'Add trigger to sync stock_total from sizes JSONB to prevent data drift',
      });
    } else {
      good.push('Inventory has trigger to sync stock_total from sizes');
    }
  }

  // Sales -> inventory link
  if (tableSet.has('sales') && schema.includes('inventory_id')) {
    good.push('Sales link to inventory for cost tracking');
  } else if (tableSet.has('sales')) {
    recommendations.push({
      type: 'INVENTORY',
      msg: 'Sales table should reference inventory_id to track stock deductions and cost of goods sold',
    });
  }

  // No inventory_movements / stock_audit table
  if (!tableSet.has('inventory_movements') && !tableSet.has('stock_movements')) {
    recommendations.push({
      type: 'INVENTORY',
      msg: 'Consider adding inventory_movements table for audit trail: every stock change (sale, adjustment, return) with qty, type, reference_id',
    });
  }

  // --- EXPENSES ---
  const expSchema = schema.match(/CREATE TABLE[^;]*"public"\."expenses"[^;]*/s)?.[0] || '';
  if (expSchema && !expSchema.includes('type') && !expSchema.includes('business')) {
    recommendations.push({
      type: 'ARCHITECTURE',
      msg: 'Expenses: consider type (business/personal) for filtering and reporting',
    });
  }

  // --- VOUCHERS ---
  const vouchSchema = schema.match(/CREATE TABLE[^;]*"public"\."vouchers"[^;]*/s)?.[0] || '';
  if (vouchSchema && !vouchSchema.includes('user_id')) {
    issues.push({
      type: 'SECURITY',
      severity: 'HIGH',
      msg: 'Vouchers table should have user_id for RLS and multi-tenant isolation',
    });
  }

  return { issues, recommendations, good, tables };
}

function printReport(result) {
  const { issues, recommendations, good, tables } = result;
  const sep = '─'.repeat(70);

  console.log('\n' + '═'.repeat(70));
  console.log('  SCHEMA AUDIT REPORT');
  console.log('═'.repeat(70));
  console.log(`\nTables analyzed: ${tables.join(', ')}\n`);

  console.log(sep);
  console.log('  CRITICAL / HIGH ISSUES');
  console.log(sep);
  const critical = issues.filter((i) => i.severity === 'CRITICAL' || i.severity === 'HIGH');
  if (critical.length) {
    critical.forEach((i, n) => console.log(`  ${n + 1}. [${i.type}] ${i.msg}`));
  } else {
    console.log('  None found.');
  }

  console.log('\n' + sep);
  console.log('  MEDIUM ISSUES');
  console.log(sep);
  const medium = issues.filter((i) => i.severity === 'MEDIUM');
  if (medium.length) {
    medium.forEach((i, n) => console.log(`  ${n + 1}. [${i.type}] ${i.msg}`));
  } else {
    console.log('  None found.');
  }

  console.log('\n' + sep);
  console.log('  RECOMMENDATIONS');
  console.log(sep);
  recommendations.forEach((r, n) => console.log(`  ${n + 1}. [${r.type}] ${r.msg}`));

  console.log('\n' + sep);
  console.log('  GOOD PRACTICES DETECTED');
  console.log(sep);
  good.forEach((g, n) => console.log(`  ✓ ${g}`));

  console.log('\n' + '═'.repeat(70) + '\n');
}

const schema = loadSchema();
const result = audit(schema);
printReport(result);
