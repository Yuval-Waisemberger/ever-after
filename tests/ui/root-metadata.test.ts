import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { metadata } from "@/app/layout";

describe("root social metadata", () => {
  it("uses the branded 1200 by 630 preview for Open Graph and Twitter", () => {
    const openGraph = metadata.openGraph as {
      title: string;
      description: string;
      images: Array<{ url: string; width: number; height: number; alt: string }>;
    };
    const twitter = metadata.twitter as { title: string; description: string; images: string[] };

    expect(openGraph.title).toBe("Ever After — Your wedding, beautifully organized");
    expect(openGraph.description).toBe("Plan tasks, discover vendors, track your budget, and get guidance in one connected workspace.");
    expect(openGraph.images).toEqual([{ url: "/ever-after-social-card.png", width: 1200, height: 630, alt: "Ever After logo" }]);
    expect(twitter.title).toBe(openGraph.title);
    expect(twitter.description).toBe(openGraph.description);
    expect(twitter.images).toEqual(["/ever-after-social-card.png"]);
  });

  it("keeps the social card as a valid 1200 by 630 PNG", () => {
    const image = readFileSync("public/ever-after-social-card.png");
    expect(image.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
  });
});
