import { createClient } from "supabase-js";
import { Database } from "./database.types.ts";
export function createAdminClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient<Database>(supabaseUrl, supabaseServiceRoleKey);
}

export function createUserClient(authToken: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseAnonKey || authToken.length === 0) {
    throw new Error("Missing SUPABASE_URL, SUPABASE_ANON_KEY or authToken");
  }

  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authToken } },
  });
}
