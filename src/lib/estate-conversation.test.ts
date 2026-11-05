import { describe, expect, it } from "vitest";

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const admin = process.env.ESTATE_TEST_ADMIN_TOKEN;
describe.skipIf(!url || !key || !admin)("private estate conversations (live database)", () => {
  it("allows only the listing phone and inquiring phone to exchange messages, with Admin monitoring", async () => {
    const request = async (path: string, method = "GET", body?: unknown, privileged = false) => {
      const response = await fetch(`${url}/rest/v1/${path}`, { method, headers: { apikey: key ?? "", ...(privileged ? { Authorization: `Bearer ${admin}` } : {}), "Content-Type": "application/json", Prefer: "return=representation" }, body: body === undefined ? undefined : JSON.stringify(body) });
      return { ok: response.ok, data: await response.json() };
    };
    const token = () => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "");
    const owner = token(), inquirer = token(), outsider = token();
    const hash = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join("");
    const listing = await request("estate_listings", "POST", { title: "Private conversation integration test", guest_access_hash: await hash(owner), status: "pending" }, true);
    expect(listing.ok).toBe(true);
    const id = listing.data[0].id;
    try {
      expect((await request(`estate_listings?id=eq.${id}`, "PATCH", { status: "approved" }, true)).ok).toBe(true);
      const question = await request("ai_questions", "POST", { estate_listing_id: id, estate_guest_access_hash: await hash(inquirer), device_id: token(), question: "Is this listing available?", status: "pending" }, true);
      expect(question.ok).toBe(true);
      const qid = question.data[0].id;
      const history = (p_token: string) => request("rpc/estate_mobile_history", "POST", { p_token });
      expect((await history(owner)).data.inquiries.find((q: { id: string }) => q.id === qid)?.role).toBe("owner");
      expect((await history(inquirer)).data.inquiries.find((q: { id: string }) => q.id === qid)?.role).toBe("inquirer");
      expect((await history(outsider)).data.inquiries).toEqual([]);
      expect((await request("rpc/estate_send_message", "POST", { p_token: outsider, p_inquiry: qid, p_body: "Unauthorized reply" })).ok).toBe(false);
      expect((await request("rpc/estate_send_message", "POST", { p_token: owner, p_inquiry: qid, p_body: "Yes, available." })).ok).toBe(true);
      expect((await request("rpc/estate_send_message", "POST", { p_token: inquirer, p_inquiry: qid, p_body: "When can I visit?" })).ok).toBe(true);
      expect((await history(inquirer)).data.inquiries[0].messages.map((m: { sender: string }) => m.sender)).toEqual(["owner", "inquirer"]);
      expect((await request(`estate_messages?inquiry_id=eq.${qid}`, "GET", undefined, true)).data).toHaveLength(2);
      expect((await request(`ai_questions?id=eq.${qid}`)).data).toEqual([]);
      expect((await request(`ai_questions?id=eq.${qid}`, "PATCH", { answer: "Bad reply", status: "answered" })).data).toEqual([]);
    } finally { await request(`estate_listings?id=eq.${id}`, "DELETE", undefined, true); }
  }, 30000);
});