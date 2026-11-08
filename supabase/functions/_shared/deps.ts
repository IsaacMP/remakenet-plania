// Versiones fijas de las dependencias de las funciones del servidor (Deno).
export { default as Anthropic, toFile } from "npm:@anthropic-ai/sdk@1.6.0";
export { betaZodOutputFormat } from "npm:@anthropic-ai/sdk@1.6.0/helpers/beta/zod";
export * as z from "npm:zod@4.6.7";
export { createClient } from "npm:@supabase/supabase-js@2.119.0";
export type { SupabaseClient, User } from "npm:@supabase/supabase-js@2.119.0";
export { unzipSync, strFromU8 } from "npm:fflate@0.8.3";
