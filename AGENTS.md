<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase API Key Conventions (New Key Format)
Supabase is sunsetting legacy JWT API keys (`anon` / `service_role`). All client instances and backend services must adhere to:
1. **Client / Public Key**:
   - Primary: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`)
   - Fallback: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2. **Server / Secret / Admin Key**:
   - Primary: `SUPABASE_SECRET_KEY` (`sb_secret_...`)
   - Fallback: `SUPABASE_SERVICE_ROLE_KEY`
3. **Services (`baileys-bridge`, microservices, background jobs)**:
   - Must resolve `process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY`.
   - Never hardcode legacy service_role keys or expect only JWT format.

