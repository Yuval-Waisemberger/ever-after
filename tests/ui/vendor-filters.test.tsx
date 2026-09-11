import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { VendorFiltersForm } from "@/components/vendors/vendor-filters";

const subcategories = [
  { slug: "wedding-photographers", name: "Wedding Photographers", categorySlug: "photography-content" },
  { slug: "videographers", name: "Videographers", categorySlug: "photography-content" },
  { slug: "flowers", name: "Flowers", categorySlug: "design-flowers" },
];

describe("subcategory filter control", () => {
  it("shows category-scoped real choices and preserves URL filter values", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<VendorFiltersForm
      filters={{ category: "photography-content", subcategory: "videographers", search: "Films", area: "north", minRating: 4, maxPrice: 10000, service: "Drone", page: 2 }}
      subcategories={subcategories}
    />), "text/html");
    const select = document.querySelector<HTMLSelectElement>('select[name="subcategory"]')!;
    expect([...select.options].map(option => option.value)).toEqual(["", "wedding-photographers", "videographers"]);
    expect(select.value).toBe("videographers");
    expect(select.getAttribute("aria-label")).toBe("Subcategory");
    expect(document.querySelector("select[name=category]")).toBeNull();
    expect(document.querySelector<HTMLInputElement>("input[name=category]")?.value).toBe("photography-content");
    expect(document.querySelector<HTMLInputElement>('[name="search"]')?.value).toBe("Films");
    expect(document.querySelector<HTMLInputElement>('[name="search"]')?.className).toContain("vendor-search-input");
    expect(document.querySelector(".vendor-search-icon")?.classList.contains("pointer-events-none")).toBe(true);
    expect(document.querySelector<HTMLInputElement>('[name="service"]')?.value).toBe("Drone");
    expect(document.querySelector<HTMLSelectElement>('[name="minRating"]')?.value).toBe("4");
    expect(document.querySelector('[name="page"]')).toBeNull(); // Applying new filters starts at page one.
    expect(document.querySelector("form")?.method).toBe("get");
    expect(document.body.textContent).not.toContain("Display by");
    expect(document.querySelector('select[name="sort"]')).toBeNull();
    const apply = document.querySelector("button")!;
    expect(select.compareDocumentPosition(apply) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(document.querySelector("form")?.lastElementChild).toBe(apply);
  });

  it("offers all real subcategories when no parent category is selected", () => {
    const document = new DOMParser().parseFromString(renderToStaticMarkup(<VendorFiltersForm filters={{ page: 1 }} subcategories={subcategories} />), "text/html");
    expect(document.querySelectorAll('select[name="subcategory"] option')).toHaveLength(4);
  });
});
