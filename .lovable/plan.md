

## Problem

The platform is stuck in an infinite loading state. The root cause is **two separate Supabase client instances** fighting over the same browser auth token lock:

1. `src/integrations/supabase/client.ts` — the auto-generated canonical client
2. `src/lib/db.ts` — a manually created duplicate client

Both call `createClient()` with the same credentials, which causes the Supabase auth SDK to enter a lock contention loop (visible in the console: "Lock was not released within 5000ms" and "Lock was released because another request stole it"). This prevents the auth session from ever resolving, so `loading` stays `true` forever in `AuthProvider`, and `ProtectedRoute` shows the spinner indefinitely.

## Fix

### 1. Eliminate the duplicate client (`src/lib/db.ts`)
Replace its contents to re-export from the canonical client:

```typescript
// src/lib/db.ts
export { supabase as db } from '@/integrations/supabase/client';
```

This keeps all existing `import { db } from '@/lib/db'` imports working (5 hooks use it) without creating a second `createClient` instance.

### 2. No other changes needed
- `AuthContext.tsx` already re-exports the canonical client as `export const supabase = supabaseClient`
- `CandidateContext.tsx` and other files import from `AuthContext` which uses the canonical client
- The 5 hooks using `db` will now share the same single instance

## Impact
- Fixes the infinite loading / lock contention
- Zero breaking changes — all existing imports continue to work
- Single file edit (~1 line change)

