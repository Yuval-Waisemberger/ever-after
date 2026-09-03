import type { MarketplaceVendor } from "@/lib/vendors/types";

export type AssistantTask = {
  id: string;
  title: string;
  dueDate: string | null;
  status: "open" | "in_progress" | "completed";
  priority: "low" | "medium" | "high";
};

export type AssistantVendor = MarketplaceVendor & {
  status: "saved" | "contacted" | "considering" | "booked" | "rejected";
  agreedPriceMinor: number | null;
  privateNotes: string | null;
};

export type AssistantContext = {
  wedding: {
    weddingDate: string | null;
    guestCount: number | null;
    preferredArea: string | null;
    eventType: string | null;
    styles: string[];
    priorities: string[];
    totalBudgetMinor: number | null;
    setupStatus: string;
  };
  tasks: AssistantTask[];
  vendors: AssistantVendor[];
  budget: {
    committedMinor: number;
    paidMinor: number;
    availableMinor: number | null;
    upcomingPayments: Array<{ amountMinor: number; dueDate?: string | null }>;
  };
};

export type AssistantRequest = {
  message: string;
  context: AssistantContext;
};

export type AssistantResponse = {
  text: string;
  sources: Array<"Couple data" | "Internal vendor database" | "General guidance" | "Web research">;
  actionProposal?: {
    type: "create_task" | "book_vendor" | "add_budget_item" | "mark_payment_paid";
    summary: string;
    arguments: Record<string, unknown>;
  };
};

export interface WeddingAssistantProvider {
  readonly name: string;
  respond(request: AssistantRequest): Promise<AssistantResponse>;
}
