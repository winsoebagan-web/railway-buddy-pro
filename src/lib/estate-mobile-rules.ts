export const ESTATE_PROPERTY_TYPES = ["အိမ်", "ခြံ", "မြေကွက်", "ဆိုင်ခန်း"] as const;
export const ESTATE_DESCRIPTION_LIMIT = 1000;
export type EstateSubmission = { property_type: string; guest_name: string; phone: string; viber: string; location: string; description: string };

export function validateEstateSubmission(input: EstateSubmission) {
  if (!ESTATE_PROPERTY_TYPES.some(type => type === input.property_type)) return "အိမ်ခြံမြေ အမျိုးအစား ရွေးပါ။";
  if (!input.guest_name.trim() || input.guest_name.length > 100) return "တင်သူအမည် ထည့်ပါ။";
  if (!input.phone.trim()) return "ဆက်သွယ်ရန် ဖုန်းနံပါတ် ထည့်ပါ။";
  if (input.description.length > ESTATE_DESCRIPTION_LIMIT) return "အသေးစိတ် အကြောင်းအရာကို စာလုံးရေ ၁၀၀၀ အထိသာ ထည့်နိုင်ပါသည်။";
  return null;
}

export function estateSubmissionValues(input: EstateSubmission) {
  return { property_type: input.property_type, guest_name: input.guest_name.trim(), phone: input.phone.trim(), viber: input.viber.trim(), location: input.location.trim(), description: input.description.trim(), title: `${input.property_type} · ${input.guest_name.trim()}`, price: 0, land_type: "", area: "", length: "", width: "" };
}

export function validateEstateInquiry(question: string) {
  return question.trim().length >= 1 && question.trim().length <= 2000;
}