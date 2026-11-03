import { describe, expect, it } from "vitest";
import { estateContext, estateSummary } from "./estate-rules";

describe("estate moderation", () => {
  const listing = { title: "အိမ်", property_type: "အိမ်", land_type: "ဂရန်", price: 150000, area: "1200", length: "40", width: "30", phone: "", viber: "", location: "မိုးညှင်း", description: "", status: "approved", updated_at: "2026-11-03" };
  it("allows AI knowledge only from approved listings", () => {
    expect(estateContext(listing)).toContain('"price":150000');
    expect(estateContext({ ...listing, status: "pending" })).toBeNull();
    expect(estateContext({ ...listing, status: "rejected" })).toBeNull();
    expect(estateContext(null)).toBeNull();
  });
  it("counts all listings, only pending moderation, and unanswered inquiries", () => {
    expect(estateSummary([{ status: "approved" }, { status: "pending" }, { status: "rejected" }], [{ status: "pending" }, { status: "answered" }, { status: "needs_admin_review" }])).toEqual({ total: 3, pending: 1, unanswered: 2 });
  });
});