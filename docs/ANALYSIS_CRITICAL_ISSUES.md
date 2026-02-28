# EvaraTech — Full-Stack Analysis Report

**Senior architect review (25+ years perspective)**  
*Production readiness, Supabase, ThingSpeak, routing, complexity audit*

---

## Executive Summary

The EvaraTech codebase has a solid core (nodes API, ThingSpeak integration, module separation) but contains **critical runtime bugs**, **auth/Supabase inconsistencies**, **dead code**, and **non-production-ready patterns**. Several device-related endpoints will crash due to missing model columns.

---

## 1. CRITICAL ISSUES (Runtime Failures)

### 1.1 Missing Model Definitions — Will Crash

| Location | Issue | Impact |
|----------|-------|--------|
| `devices.py` L59–62 | `node.firmware_version`, `node.calibration_factor` | **Node model has neither.** `AttributeError` on PUT `/devices/{id}/metadata`. |
| `devices.py` L178–194 | `node.shadow_state` | **Node model has no shadow_state.** `AttributeError` on PATCH `/devices/{id}/shadow`. |
| `devices.py` L87, L117 | `models.ProvisioningToken` | **ProvisioningToken not defined in all_models.py.** `AttributeError` on POST `/devices/provision-token`, POST `/devices/claim`. |
| `devices.py` L153 | `community.organization_id` | **Community model has no organization_id.** `AttributeError` in claim_device. |
| `devices.py` L153 | `node.organization_id` | **Node model has no organization_id.** `AttributeError` in claim_device. |

**Fix:** Add missing columns to `Node`, add `ProvisioningToken` and `organization_id` to `Community`, or remove/guard the affected endpoints.

---

### 1.2 AdminNodes Removed from Routes — No Node Creation UI

```tsx
// App.tsx L12: AdminNodes is commented out
// import AdminNodes from './pages/admin/AdminNodes';
// Route path="nodes" -> Navigate to="regions"
```

**Impact:** Users cannot add nodes from the UI. The node creation form is unreachable.

**Fix:** Restore AdminNodes route under `/superadmin/nodes` or equivalent.

---

## 2. SUPABASE PROBLEMS

### 2.1 Auth Bypass Everywhere

| Component | Behavior | Production risk |
|-----------|----------|-----------------|
| `security_supabase.py` | `get_current_user_token()` **always** returns mock admin user | No real auth. Anyone can access protected endpoints. |
| `verify_supabase_token()` | Never called; dev bypass returns early | JWT verification effectively disabled. |
| `AuthContext.tsx` | Uses hardcoded users + `localStorage` | Supabase auth unused for primary flow. |
| `Login.tsx` | Dev bypass: `admin@evaratech.com` / `admin123` | Skips Supabase entirely in dev. |

**Fix:** Use `verify_supabase_token()` with real JWT for protected routes; remove hardcoded auth from production.

---

### 2.2 Supabase Configuration

| Issue | Location | Fix |
|-------|----------|-----|
| Hardcoded URL & anon key | `client/src/lib/supabase.ts` | Use `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |
| No Supabase env vars in Render | `render.yaml` | Add `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_JWT_SECRET` |
| Backend uses `.env` for Supabase | `config.py` | Ensure Render supplies these in production |

---

### 2.3 Supabase vs Backend Data Split

- **Supabase:** Auth only (in theory; currently bypassed). `users_profiles` may exist in Supabase.
- **Backend DB (DATABASE_URL):** Nodes, `users_profiles`, tenancy — primary data store.
- **hybrid_db / supabase_rest:** Assume Supabase REST for nodes/users. **Neither is used** by any active endpoint. Nodes API uses SQLAlchemy only.

**Fix:** Remove `hybrid_database.py` and `supabase_rest.py` if not needed, or document when they are used.

---

## 3. THINGSPEAK DATA FLOW

### 3.1 Current Flow (Correct)

| Module | Config source | ThingSpeak caller | Field mapping |
|--------|---------------|-------------------|---------------|
| EvaraTank | `getDeviceDetails` → `thingspeak_mappings` | `useThingSpeak` (client) | field2 = distance |
| EvaraFlow | Same | Same | field1 = flow rate |
| EvaraDeep | Same | Same | config-dependent |

Backend `/devices/{id}/live-data` and `/devices/{id}/history` use `ThingSpeakTelemetryService` with `field_mapping`. Field semantics are documented correctly.

### 3.2 Issues

| Issue | Location | Fix |
|-------|----------|-----|
| Duplicate ThingSpeak logic | `lib/thingspeak.ts` vs `services/thingspeak.ts` | Consolidate to one module. |
| API key in client URL | `useThingSpeak` → `fetchFeeds(…api_key)` | Prefer backend proxy for private keys. |
| `field1` vs `field2` | EvaraTank must use field2 for level | Already enforced in backend; document in frontend. |
| Excessive `print()` in backend | `thingspeak.py` | Replace with structured logging. |

---

## 4. ROUTING & DATA ROUTING

### 4.1 API Endpoints

| Path | Purpose | Auth | Notes |
|------|---------|------|-------|
| `GET /nodes/` | List nodes | None | Public |
| `POST /nodes/` | Create node | Mock | Needs real auth |
| `GET /nodes/{id}` | Node details | None | Public |
| `GET /devices/{id}/live-data` | ThingSpeak live | None | Correct |
| `GET /devices/{id}/history` | ThingSpeak history | None | Correct |
| `PUT /devices/{id}/metadata` | Firmware/calibration | Mock | **Crashes** (missing columns) |
| `PATCH /devices/{id}/shadow` | Device shadow | Mock | **Crashes** (missing columns) |
| `POST /devices/claim` | Claim device | Token | **Crashes** (ProvisioningToken, organization_id) |

### 4.2 Frontend Routing

- Dashboard, nodes, EvaraTank/Flow/Deep: OK.
- Admin nodes: **removed** (no node creation UI).
- `/superadmin/nodes` redirects to regions.

---

## 5. UNNECESSARY COMPLEXITY

| Area | Complexity | Recommendation |
|------|------------|----------------|
| `hybrid_database.py` | Postgres vs Supabase REST fallback | Remove or clearly document; currently unused |
| `supabase_rest.py` | Mock session, REST fallback | Remove if unused |
| `get_current_user_token()` | Returns mock, never validates JWT | Replace with real JWT verification |
| Node vs Device naming | `node_key`/`hardware_id`, `label`/`device_label`, `lng`/`long` | Standardize; use one convention in API and models |
| Dual ThingSpeak clients | `lib/thingspeak.ts` + `services/thingspeak.ts` | Single client module |
| Auth flows | Hardcoded + Supabase + dev bypass | One auth path: Supabase (or chosen provider) |

---

## 6. LACK OF UNIFORMITY

### 6.1 Naming

| Context | Backend (Python) | DB column | Frontend |
|---------|------------------|-----------|----------|
| Node ID | `node_key` | `hardware_id` | `node_key` |
| Label | `label` | `device_label` | `label` |
| Category | `category` | `device_type` | `category` |
| Longitude | `lng` | `long` | `lng` |

Use aliases or a single naming convention end-to-end.

### 6.2 API Response Shapes

- Nodes list: `node_key`, `label`, `category`.
- Node details: mix of aliases via `getattr`.
- Standardize response DTOs (e.g. Pydantic schemas with `populate_by_name`).

---

## 7. PRODUCTION READINESS

| Item | Status | Action |
|------|--------|--------|
| CORS `allow_origins=["*"]` | Insecure | Restrict to known origins |
| `SECRET_KEY` default | Weak | Require env override in prod |
| `print()` for logging | Not production-grade | Use `logging` module |
| `console.log` in frontend | Exposes internals | Strip or gate by env |
| Hardcoded Supabase keys | Security risk | Env vars only |
| Render env vars | Missing Supabase | Add `SUPABASE_*` |
| Error handling | Many bare `except` | Log and re-raise or handle explicitly |
| Rate limiting | Admin/auth only | Consider broader coverage |

---

## 8. RECOMMENDED FIX PRIORITY

### P0 (Blockers)

1. Add missing Node columns: `firmware_version`, `calibration_factor`, `shadow_state`, `organization_id` (or remove endpoints that use them).
2. Add `ProvisioningToken` model and migration.
3. Add `organization_id` to Community (or change claim logic).
4. Restore AdminNodes route for node creation.

### P1 (Critical)

5. Implement real JWT verification in `get_current_user_token()`.
6. Use env vars for Supabase config (frontend and backend).
7. Add Supabase env vars to Render.

### P2 (Important)

8. Remove or integrate `hybrid_database.py` and `supabase_rest.py`.
9. Consolidate ThingSpeak client (single module).
10. Replace `print()` with structured logging.
11. Fix CORS for production.

### P3 (Polish)

12. Standardize node/device naming.
13. Remove hardcoded dev auth from production build.
14. Document ThingSpeak field mapping per module.

---

## 9. WHAT IS WORKING

- Nodes CRUD (create, list, get, update, delete) via SQLAlchemy.
- ThingSpeak integration for EvaraTank, EvaraFlow, EvaraDeep with correct field semantics.
- Module isolation via `analytics_type` and config tables.
- WebSocket for `NODE_PROVISIONED` updates.
- Frontend structure (hooks, services, layouts).
- Role-based routing (superadmin, distributor, customer).

---

*End of analysis. Address P0 items before production deployment.*
