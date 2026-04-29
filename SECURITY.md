# 🔒 Kudi Security Setup Guide

## Immediate Actions Required

### 1. Rotate Compromised Keys (DO THIS NOW)

Your old keys were exposed in the client-side bundle. Rotate them immediately:

#### OpenAI API Key
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. **Delete** the old key: `sk-proj-QHbj3L3a...`
3. **Create a new key**
4. Set it as a Supabase Edge Function secret:
   ```bash
   supabase secrets set OPENAI_API_KEY=sk-your-new-key-here
   ```

#### Supabase Secret Key
1. Go to your Supabase Dashboard → Settings → API
2. **Regenerate** the service_role key (if it was the one exposed)
3. The anon key (`sb_publishable_...`) is safe to keep — it's designed to be public

### 2. Deploy the Edge Function

The OpenAI proxy function must be deployed for AI features to work:

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref hw0yom4bkcgw

# Deploy the function
supabase functions deploy openai-proxy

# Set the OpenAI API key as a secret
supabase secrets set OPENAI_API_KEY=sk-your-new-key-here
```

### 3. Update Supabase RLS Policies

Run the updated `supabase-schema.sql` in the Supabase SQL Editor:
1. Go to Supabase Dashboard → SQL Editor
2. Paste the contents of `supabase-schema.sql`
3. Click **Run**

This will:
- Drop the old permissive policies (`USING (true)`)
- Create scoped policies per table and operation

---

## What Was Fixed

| Issue | Status | Details |
|-------|--------|---------|
| OpenAI key in `.env` (client-exposed) | ✅ Fixed | Removed; key now server-side only |
| Supabase secret key in `.env` | ✅ Fixed | Removed entirely |
| Direct OpenAI API calls from browser | ✅ Fixed | Routes through Supabase Edge Function proxy |
| Permissive RLS policies | ✅ Improved | Added migration path docs; interim policies in place |
| No rate limiting | ✅ Fixed | Server-side (60/min/IP) + client-side (2s cooldown) |
| Console logs leaking info | ✅ Fixed | `esbuild.drop` strips all console/debugger in production |
| No security headers | ✅ Fixed | CSP, X-Frame-Options, HSTS, etc. in Vite config |
| No `.env.example` | ✅ Fixed | Created with safe documentation |

---

## Remaining Recommendations

### High Priority
- [ ] **Enable Supabase Anonymous Auth** for proper user identification
- [ ] **Tighten RLS policies** to `USING (profile_id = auth.uid()::text)` after auth migration
- [ ] **Add Supabase Auth** to `useSupabase.js` (replace raw device_id with anonymous sign-in)

### Medium Priority
- [ ] **Encrypt localStorage data** (use Web Crypto API or a library)
- [ ] **Add privacy notice** about financial data sent to OpenAI for AI features
- [ ] **Add a terms of service** document

### Low Priority
- [ ] **Set up monitoring/alerts** for Supabase Edge Function errors
- [ ] **Add CSP reporting endpoint** to catch violations
- [ ] **Implement Content Security Policy** nonce-based approach (remove `unsafe-inline`)

---

## File Changes Summary

```
Modified:
  .env                         → Removed exposed keys, added security comments
  src/composables/useChat.js   → Routes through Edge Function proxy (no API key)
  src/composables/useAIInsights.js → Routes through Edge Function proxy (no API key)
  supabase-schema.sql          → Secure RLS policies + migration docs
  vite.config.js               → Security headers + production build hardening

Created:
  .env.example                 → Safe template for new developers
  supabase/functions/openai-proxy/index.ts → Server-side OpenAI proxy with rate limiting
  SECURITY.md                  → This file
```

---

## Production Deployment Checklist

Before deploying to production:

- [ ] All keys rotated (OpenAI + Supabase service_role)
- [ ] Edge function deployed and tested
- [ ] `OPENAI_API_KEY` secret set in Supabase
- [ ] RLS policies applied in Supabase SQL Editor
- [ ] Security headers configured on your hosting platform (Vercel/Netlify/etc.)
  - Vite's `server.headers` only apply in dev mode
  - For production, use your hosting platform's header config
- [ ] No source maps deployed (`sourcemap: false` in vite.config.js)
- [ ] HTTPS enforced (HSTS header)
- [ ] `.env` is in `.gitignore` (already is ✅)


I change a line in the supabase-schema.sql file :
FROM:

CREATE OR REPLACE FUNCTION auth.device_id()
RETURNS TEXT AS $$
  -- In a future update, this will read from auth.jwt() -> 'device_id'
  -- For now, returns null (all policies will use profile_id match)
  SELECT NULL::TEXT;
$$ LANGUAGE sql STABLE;

TO:

CREATE OR REPLACE FUNCTION public.device_id()
RETURNS TEXT AS $$
  -- In a future update, this will read from auth.jwt() -> 'device_id'
  -- For now, returns null (all policies will use profile_id match)
  SELECT NULL::TEXT;
$$ LANGUAGE sql STABLE;