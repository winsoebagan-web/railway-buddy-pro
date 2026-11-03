export type EstateKnowledge = { title: string; property_type: string; land_type: string; price: number; area: string; length: string; width: string; phone: string; viber: string; location: string; description: string; status: string; updated_at: string };

export function estateContext(listing: EstateKnowledge | null) {
  if (!listing || listing.status !== "approved") return null;
  const { status, updated_at, ...facts } = listing;
  return JSON.stringify(facts);
}

export function estateSummary(listings: { status: string }[], questions: { status: string }[]) {
  return { total: listings.length, pending: listings.filter(x => x.status === "pending").length, unanswered: questions.filter(x => x.status !== "answered").length };
}