/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as actions_createAccountant from "../actions/createAccountant.js";
import type * as auth from "../auth.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_semanticId from "../lib/semanticId.js";
import type * as lib_stockHelpers from "../lib/stockHelpers.js";
import type * as migration_fixUserIds from "../migration/fixUserIds.js";
import type * as migration_fixUserIdsMutation from "../migration/fixUserIdsMutation.js";
import type * as migration_importData from "../migration/importData.js";
import type * as migration_importMutations from "../migration/importMutations.js";
import type * as mutations_clients from "../mutations/clients.js";
import type * as mutations_expenses from "../mutations/expenses.js";
import type * as mutations_internal_profiles from "../mutations/internal_profiles.js";
import type * as mutations_inventory from "../mutations/inventory.js";
import type * as mutations_profiles from "../mutations/profiles.js";
import type * as mutations_sales from "../mutations/sales.js";
import type * as queries_clients from "../queries/clients.js";
import type * as queries_expenses from "../queries/expenses.js";
import type * as queries_internal_profiles from "../queries/internal_profiles.js";
import type * as queries_inventory from "../queries/inventory.js";
import type * as queries_inventoryMovements from "../queries/inventoryMovements.js";
import type * as queries_profiles from "../queries/profiles.js";
import type * as queries_sales from "../queries/sales.js";
import type * as queries_vouchers from "../queries/vouchers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  "actions/createAccountant": typeof actions_createAccountant;
  auth: typeof auth;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  "lib/semanticId": typeof lib_semanticId;
  "lib/stockHelpers": typeof lib_stockHelpers;
  "migration/fixUserIds": typeof migration_fixUserIds;
  "migration/fixUserIdsMutation": typeof migration_fixUserIdsMutation;
  "migration/importData": typeof migration_importData;
  "migration/importMutations": typeof migration_importMutations;
  "mutations/clients": typeof mutations_clients;
  "mutations/expenses": typeof mutations_expenses;
  "mutations/internal_profiles": typeof mutations_internal_profiles;
  "mutations/inventory": typeof mutations_inventory;
  "mutations/profiles": typeof mutations_profiles;
  "mutations/sales": typeof mutations_sales;
  "queries/clients": typeof queries_clients;
  "queries/expenses": typeof queries_expenses;
  "queries/internal_profiles": typeof queries_internal_profiles;
  "queries/inventory": typeof queries_inventory;
  "queries/inventoryMovements": typeof queries_inventoryMovements;
  "queries/profiles": typeof queries_profiles;
  "queries/sales": typeof queries_sales;
  "queries/vouchers": typeof queries_vouchers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
