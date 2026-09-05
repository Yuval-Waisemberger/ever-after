import { describe, expect, it } from "vitest";
import { buildTimeline, relativeTimelineLabel } from "@/lib/domain/timeline";

const tasks = [
  { id: "1", title: "Confirm vendor arrivals", dueDate: "2027-06-10", status: "open" as const },
  { id: "2", title: "Pay deposit", dueDate: "2027-04-14", status: "completed" as const },
  { id: "3", title: "Undated", dueDate: null, status: "open" as const },
];

describe("buildTimeline", () => {
  it("groups the existing dated tasks relative to the wedding", () => {
    const result = buildTimeline(tasks, "2027-06-14");
    expect(result.map((group) => group.label)).toEqual(["2 Months Before", "Wedding Week"]);
    expect(result.flatMap((group) => group.tasks)).toHaveLength(2);
  });

  it("uses complete calendar months instead of rounding 75 days up to three months", () => {
    expect(relativeTimelineLabel("2026-09-06", "2026-11-20").label).toBe("2 Months Before");
    expect(relativeTimelineLabel("2026-10-20", "2026-11-20").label).toBe("1 Month Before");
    expect(relativeTimelineLabel("2026-10-30", "2026-11-20").label).toBe("3 Weeks Before");
  });

  it("uses absolute month labels when the wedding date is missing", () => {
    expect(buildTimeline(tasks, null).map((group) => group.label)).toEqual([
      "April 2027",
      "June 2027",
    ]);
  });
});
