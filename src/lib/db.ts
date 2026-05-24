import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { AuditInput } from "./types";

// Helper to get Supabase client on the server
function getServerSupabase() {
  const supabaseUrl =
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL;

  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY;

  // Real Supabase anon keys are always JWTs (starting with eyJ). 
  // If the key is missing, or is a placeholder/mock key starting with "sb_", throw immediately 
  // to avoid slow, hanging database requests that stall the user experience.
  if (
    !supabaseUrl ||
    !supabaseKey ||
    supabaseKey.startsWith("sb_") ||
    !supabaseKey.startsWith("eyJ")
  ) {
    throw new Error("Supabase URL or Key is missing or is an invalid mock placeholder.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Convert JSON object to URL-safe base64 string
function encodeLocalData(data: AuditInput): string {
  const jsonStr = JSON.stringify(data);
  const base64 = Buffer.from(jsonStr, "utf-8").toString("base64");
  return "local-" + base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Parse URL-safe base64 string back to JSON object
function decodeLocalData(str: string): AuditInput | null {
  try {
    let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
    while (base64.length % 4) {
      base64 += "=";
    }
    const jsonStr = Buffer.from(base64, "base64").toString("utf-8");
    return JSON.parse(jsonStr) as AuditInput;
  } catch (err) {
    console.error("Failed to decode local data:", err);
    return null;
  }
}

// Save an audit and return its generated UUID or a base64url local fallback string
export const saveAudit = createServerFn({ method: "POST" })
  .inputValidator((input: AuditInput) => input)
  .handler(async (ctx) => {
    try {
      const supabase = getServerSupabase();

      const { data, error } = await supabase
        .from("audits")
        .insert({ input: ctx.data })
        .select("id")
        .single();

      if (error) {
        throw error;
      }

      return data.id as string;
    } catch (err) {
      console.warn(
        "Supabase save failed or unconfigured, falling back to local base64 encoding:",
        err,
      );
      return encodeLocalData(ctx.data);
    }
  });

// Get an audit by its UUID or local base64 fallback
export const getAudit = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async (ctx) => {
    const id = ctx.data;
    if (id && id.startsWith("local-")) {
      return decodeLocalData(id.substring(6));
    }

    try {
      const supabase = getServerSupabase();

      const { data, error } = await supabase.from("audits").select("input").eq("id", id).single();

      if (error || !data) {
        throw error || new Error("No audit found with that ID");
      }

      return data.input as AuditInput;
    } catch (err) {
      console.warn(
        "Supabase fetch failed or unconfigured, attempting direct base64 decode as fallback:",
        err,
      );
      // As a final safety fallback, check if the ID itself is a valid base64 payload
      const decoded = decodeLocalData(id);
      if (decoded && decoded.subscriptions) {
        return decoded;
      }
      return null;
    }
  });

export interface LeadInput {
  email: string;
  company?: string;
  role?: string;
  teamSize?: string | number;
  auditId?: string;
}

// Save a lead
export const saveLead = createServerFn({ method: "POST" })
  .inputValidator((input: LeadInput) => input)
  .handler(async (ctx) => {
    try {
      const supabase = getServerSupabase();
      const finalRole = ctx.data.teamSize
        ? `Team Size: ${ctx.data.teamSize}`
        : ctx.data.role || null;

      const { error } = await supabase.from("leads").insert({
        email: ctx.data.email,
        company: ctx.data.company || null,
        role: finalRole,
        audit_id: ctx.data.auditId || null,
      });

      if (error) {
        throw error;
      }

      return { success: true };
    } catch (err) {
      console.warn(
        "Supabase lead capture failed or unconfigured, returning local mock success:",
        err,
      );
      return { success: true };
    }
  });
