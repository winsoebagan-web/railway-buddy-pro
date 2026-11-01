import { describe, expect, it } from "vitest";
import { AUTO_NOTE, BATCH_SIZE, MAX_ATTEMPTS, bestEffort, usableAnswer } from "./auto-answer-rules";

describe("auto reply rules", () => {
  const created = "2026-11-01T00:00:00Z";
  it("uses best effort only at the 30 minute idle threshold", () => {
    expect(bestEffort("sweep", created, Date.parse(created) + 29 * 60_000)).toBe(false);
    expect(bestEffort("sweep", created, Date.parse(created) + 30 * 60_000)).toBe(true);
  });
  it("allows an explicit Admin request immediately", () => {
    expect(bestEffort("manual", created, Date.parse(created))).toBe(true);
  });
  it("does not post an unconfident knowledge answer", () => {
    expect(usableAnswer("NO_ANSWER")).toBe(false);
    expect(usableAnswer("   ")).toBe(false);
    expect(usableAnswer("ရထားထွက်ချိန် 08:00")).toBe(true);
  });
  it("bounds each automatic batch and total attempts", () => {
    expect(BATCH_SIZE).toBe(2);
    expect(MAX_ATTEMPTS).toBe(3);
  });
});