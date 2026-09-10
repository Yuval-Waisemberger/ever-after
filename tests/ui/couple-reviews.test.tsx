import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const { read } = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/queries/couple-vendors", () => ({ getMyReviews: read }));
vi.mock("@/lib/actions/vendors", () => ({ deleteReview: vi.fn() }));
import ReviewsPage from "@/app/(couple)/reviews/page";

describe("Our Reviews presentation", () => {
 it("renders the real empty count and explanatory sections", async () => {
  read.mockResolvedValue([]);
  const html = renderToStaticMarkup(await ReviewsPage());
  expect(html).toContain("Our Reviews");
  expect(html).toContain("0 reviews");
  expect(html).toContain("No reviews yet");
  expect(html).toContain("Sharing your experience");
 });
 it("retains populated review content, links, ratings and delete action", async () => {
  read.mockResolvedValue([{id:"fixture",professionalism:4,punctuality:4,service_attitude:4,value_for_money:4,updated_at:"2026-09-01T12:00:00Z",review_text:"Thoughtful service",would_choose_again:true,vendor_profiles:{business_name:"Fixture business",slug:"fixture-business",vendor_images:[]}}]);
  const html = renderToStaticMarkup(await ReviewsPage());
  expect(html).toContain("1 review");
  expect(html).toContain("Thoughtful service");
  expect(html).toContain('/vendors/fixture-business');
  expect(html).toContain("Delete review for Fixture business");
  expect(html).not.toContain("No reviews yet");
 });
});
