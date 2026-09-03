import { describe, expect, it } from "vitest";
import { buildTimeline } from "@/lib/domain/timeline";

const tasks = [
  { id: "1", title: "Confirm vendor arrivals", dueDate: "2027-06-10", status: "open" as const },
  { id: "2", title: "Pay deposit", dueDate: "2027-04-14", status: "completed" as const },
  { id: "3", title: "Undated", dueDate: null, status: "open" as const },
];

describe("buildTimeline", () => {
  it("groups the existing dated tasks relative to the wedding", () => {
    const result = buildTimeline(tasks, "2027-06-14");
    expect(result.map((group) => group.label)).toEqual(["3 Months to Go", "Wedding Week"]);
    expect(result.flatMap((group) => group.tasks)).toHaveLength(2);
  });

  it("uses absolute month labels when the wedding date is missing", () => {
    expect(buildTimeline(tasks, null).map((group) => group.label)).toEqual([
      "April 2027",
      "June 2027",
    ]);
  });
});
