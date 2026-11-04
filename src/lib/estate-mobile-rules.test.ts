import { describe, expect, it } from "vitest";
import { ESTATE_PROPERTY_TYPES, validateEstateInquiry, validateEstateSubmission } from "./estate-mobile-rules";

describe("phone estate submissions", () => {
  it("offers house, compound, land and shop", () => {
    expect([...ESTATE_PROPERTY_TYPES]).toEqual(["အိမ်", "ခြံ", "မြေကွက်", "ဆိုင်ခန်း"]);
  });
  it("accepts a listing with a valid price and contact", () => {
    expect(validateEstateSubmission({ title: "အိမ်ရောင်းရန်", price: "15000000", location: "မိုးညှင်း", phone: "09123456789" })).toBeNull();
  });
  it("rejects negative prices", () => {
    expect(validateEstateSubmission({ title: "အိမ်", price: "-1", location: "မိုးညှင်း", phone: "09123456789" })).not.toBeNull();
  });
  it("accepts guest inquiries without phone verification", () => {
    expect(validateEstateInquiry("ဒီမြေကွက် ဝယ်လို့ရပါသလား?")).toBe(true);
    expect(validateEstateInquiry(" ")).toBe(false);
    expect(validateEstateInquiry("a".repeat(2001))).toBe(false);
  });
});