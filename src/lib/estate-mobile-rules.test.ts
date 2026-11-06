import { describe, expect, it } from "vitest";
import { ESTATE_PROPERTY_TYPES, estateSubmissionValues, validateEstateInquiry, validateEstateSubmission } from "./estate-mobile-rules";

const draft = { property_type: "အိမ်", guest_name: "တင်သူ", location: "မိုးညှင်း", phone: "09123456789", viber: "", description: "အိမ်ရောင်းရန်" };

describe("phone estate submissions", () => {
  it("offers house, compound, land and shop", () => {
    expect([...ESTATE_PROPERTY_TYPES]).toEqual(["အိမ်", "ခြံ", "မြေကွက်", "ဆိုင်ခန်း"]);
  });
  it("accepts the six submission details without price or dimensions", () => {
    expect(validateEstateSubmission(draft)).toBeNull();
    const values = estateSubmissionValues({ ...draft, price: "500", title: "old", area: "old" } as typeof draft);
    expect(values).toEqual({ ...draft, title: "အိမ် · တင်သူ", price: 0, land_type: "", area: "", length: "", width: "" });
  });
  it("allows exactly 1000 description characters and rejects 1001", () => {
    expect(validateEstateSubmission({ ...draft, description: "က".repeat(1000) })).toBeNull();
    expect(validateEstateSubmission({ ...draft, description: "က".repeat(1001) })).not.toBeNull();
  });
  it("requires a submitter name and retains a GPS map location", () => {
    expect(validateEstateSubmission({ ...draft, guest_name: " " })).not.toBeNull();
    expect(estateSubmissionValues({ ...draft, location: "https://www.google.com/maps?q=24.7,96.3" }).location).toBe("https://www.google.com/maps?q=24.7,96.3");
  });
  it("accepts guest inquiries without phone verification", () => {
    expect(validateEstateInquiry("ဒီမြေကွက် ဝယ်လို့ရပါသလား?")).toBe(true);
    expect(validateEstateInquiry(" ")).toBe(false);
    expect(validateEstateInquiry("a".repeat(2001))).toBe(false);
  });
});