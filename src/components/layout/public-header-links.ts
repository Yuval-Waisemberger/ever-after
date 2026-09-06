export type PublicHeaderRole = "couple" | "vendor" | null | undefined;

export function getPublicHeaderLinks(role: PublicHeaderRole) {
  if (role === "couple") {
    return {
      navigationLinks: [
        { href: "/#how-it-works", label: "How it works" },
        { href: "/wedding", label: "Our Wedding" },
        { href: "/tasks", label: "Our Tasks" },
        { href: "/guests", label: "Our Guests" },
        { href: "/vendors", label: "Vendors" },
        { href: "/budget", label: "Budget" },
      ],
      accountLinks: [
        { href: "/assistant", label: "Assistant" },
        { href: "/settings", label: "Settings" },
      ],
    };
  }

  if (role === "vendor") {
    return {
      navigationLinks: [
        { href: "/vendor", label: "Dashboard" },
        { href: "/vendor/profile", label: "Business Profile" },
        { href: "/vendors", label: "Vendors" },
      ],
      accountLinks: [{ href: "/vendor/settings", label: "Settings" }],
    };
  }

  return {
    navigationLinks: [
      { href: "/#how-it-works", label: "How it works" },
      { href: "/vendors", label: "Vendors" },
    ],
    accountLinks: [],
  };
}
