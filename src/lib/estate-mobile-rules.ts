export const ESTATE_PROPERTY_TYPES = ["အိမ်", "ခြံ", "မြေကွက်", "ဆိုင်ခန်း"] as const;

export function validateEstateSubmission(input: { title: string; price: string; location: string; phone: string }) {
  if (!input.title.trim() || input.title.trim().length > 300) return "ကြော်ငြာခေါင်းစဉ် ထည့်ပါ။";
  if (!input.price.trim() || !Number.isFinite(Number(input.price)) || Number(input.price) < 0) return "ဈေးနှုန်း မှန်ကန်စွာ ထည့်ပါ။";
  if (!input.location.trim()) return "တည်နေရာ ထည့်ပါ။";
  if (!input.phone.trim()) return "ဆက်သွယ်ရန် ဖုန်းနံပါတ် ထည့်ပါ။";
  return null;
}

export function validateEstateInquiry(question: string) {
  return question.trim().length >= 1 && question.trim().length <= 2000;
}