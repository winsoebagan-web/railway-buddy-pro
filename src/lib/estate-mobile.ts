import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { readCache, writeCache } from "@/lib/offline";

export type EstateListing = Database["public"]["Tables"]["estate_listings"]["Row"];
export type EstateMessage = { id: string; sender: "owner" | "inquirer" | "admin"; body: string; created_at: string };
export type EstateInquiry = { id: string; estate_listing_id: string; listing_title: string; question: string; answer: string | null; status: string; created_at: string; answered_at: string | null; role: "owner" | "inquirer"; messages: EstateMessage[] };
export type EstateHistory = { listings: EstateListing[]; inquiries: EstateInquiry[] };
export type EstateDraft = { title: string; property_type: string; land_type: string; price: string; area: string; length: string; width: string; phone: string; viber: string; location: string; description: string; guest_name: string };

function receiptToken() {
  let token = readCache<string>("estate-private-receipt");
  if (!token || !/^[a-f0-9]{64}$/.test(token)) {
    token = Array.from(crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, "0")).join("");
    writeCache("estate-private-receipt", token);
    if (readCache<string>("estate-private-receipt") !== token) throw new Error("ဖုန်းတွင် မှတ်တမ်းသိမ်းခွင့် လိုအပ်ပါသည်။");
  }
  return token;
}
async function identity() {
  const token = receiptToken();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  const hash = Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return { hash, userId: data.session?.user.id ?? null };
}
export async function fetchEstateListings() {
  const { data, error } = await supabase.from("estate_listings").select("*").eq("status", "approved").order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
export async function fetchEstateHistory(): Promise<EstateHistory> {
  const { data, error } = await supabase.rpc("estate_mobile_history", { p_token: receiptToken() });
  if (error) throw error;
  return data as unknown as EstateHistory;
}
export async function submitEstateListing(draft: EstateDraft) {
  const { hash, userId } = await identity();
  const { error } = await supabase.from("estate_listings").insert({ ...draft, price: Number(draft.price), title: draft.title.trim(), status: "pending", user_id: userId, guest_access_hash: hash });
  if (error) throw error;
}
export async function submitEstateInquiry(listingId: string, question: string, name: string) {
  const { hash, userId } = await identity();
  const { error } = await supabase.from("ai_questions").insert({ estate_listing_id: listingId, question: question.trim(), guest_name: name.trim(), submitter_id: userId, device_id: crypto.randomUUID(), status: "pending", estate_guest_access_hash: hash });
  if (error) throw error;
}
export async function sendEstateMessage(inquiryId: string, body: string) {
  const { error } = await supabase.rpc("estate_send_message", { p_token: receiptToken(), p_inquiry: inquiryId, p_body: body.trim() });
  if (error) throw error;
}