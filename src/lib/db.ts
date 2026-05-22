import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { AuditInput } from "./types";

// Helper to get Supabase client on the server
function getServerSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error("Supabase URL or Key is missing in environment variables.");
  }

  return createClient(supabaseUrl, supabaseKey);
}

// Save an audit and return its generated UUID
export const saveAudit = createServerFn({ method: "POST" })
  .inputValidator((input: AuditInput) => input)
  .handler(async (ctx) => {
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("audits")
      .insert({ input: ctx.data })
      .select("id")
      .single();

    if (error) {
      console.error("Error saving audit:", error);
      throw new Error("Failed to save audit data");
    }

    return data.id as string;
  });

// Get an audit by its UUID
export const getAudit = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async (ctx) => {
    const supabase = getServerSupabase();

    const { data, error } = await supabase
      .from("audits")
      .select("input")
      .eq("id", ctx.data)
      .single();

    if (error || !data) {
      console.error("Error fetching audit:", error);
      return null;
    }

    return data.input as AuditInput;
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
    const supabase = getServerSupabase();
    const finalRole = ctx.data.teamSize ? `Team Size: ${ctx.data.teamSize}` : ctx.data.role || null;

    const { error } = await supabase.from("leads").insert({
      email: ctx.data.email,
      company: ctx.data.company || null,
      role: finalRole,
      audit_id: ctx.data.auditId || null,
    });

    if (error) {
      console.error("Error saving lead:", error);
      throw new Error("Failed to save lead");
    }

    return { success: true };
  });
