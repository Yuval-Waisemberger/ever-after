import { formatIls } from "@/lib/domain/budget";
import { calculateRecommendation } from "@/lib/domain/recommendation";
import { isDueWithinDays } from "@/lib/domain/tasks";
import type { AssistantRequest, AssistantResponse, WeddingAssistantProvider } from "./types";

const knowledge: Array<{ terms: string[]; answer: string }> = [
  {
    terms: ["invitation", "wording"],
    answer: "A clear invitation normally includes the couple’s names, wedding date, ceremony and reception time, venue name and address, RSVP instructions, and any genuinely important dress, parking, accessibility, or transport note. Keep the main card concise; put detailed logistics on a separate details card or page.",
  },
  {
    terms: ["ask", "dj"],
    answer: "Ask a DJ how they learn your taste, handle must-play and do-not-play songs, read the room, coordinate ceremony music, cover overtime, and manage backup equipment. Also confirm arrival time, setup needs, who your actual DJ will be, and every item included in the quote.",
  },
  {
    terms: ["photography", "package"],
    answer: "Photography packages often differ on coverage hours, number of photographers, stills versus video, albums, drone coverage, engagement sessions, delivery timeline, file resolution, editing style, usage rights, overtime, travel, and backup plans. Compare the complete scope, not only the headline price.",
  },
  {
    terms: ["forgot", "expense"],
    answer: "Commonly missed categories include vendor travel or overtime, tips, alterations, stationery postage, rentals, delivery and setup fees, beauty trials, transportation, accommodation, marriage administration, vendor meals, post-wedding returns, and a contingency reserve. Treat this as a planning checklist, not a current market estimate.",
  },
  {
    terms: ["venue manager", "independent"],
    answer: "A venue manager is responsible for the venue’s operation, staff, catering, and house rules. An independent wedding manager represents the couple across suppliers and the full schedule. Responsibilities vary by contract, so map each task to one named owner before signing.",
  },
  {
    terms: ["reception", "happens"],
    answer: "A reception commonly moves from guest arrival and greetings into the ceremony, meal, speeches or blessings, and dancing, but there is no required sequence. Start with the experience you want guests to have, then give the venue and vendors one shared running order.",
  },
];

function normalized(value: string) {
  return value.toLocaleLowerCase();
}

function humanList(values: string[]) {
  if (!values.length) return "none yet";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

export class LocalWeddingAssistantProvider implements WeddingAssistantProvider {
  readonly name = "local";

  async respond({ message, context }: AssistantRequest): Promise<AssistantResponse> {
    const prompt = normalized(message);
    const missing = [
      !context.wedding.weddingDate ? "wedding date" : null,
      !context.wedding.guestCount ? "guest count" : null,
      !context.wedding.preferredArea ? "preferred area" : null,
      !context.wedding.styles.length ? "wedding style" : null,
    ].filter((value): value is string => Boolean(value));

    if (/this week|due|task|still need|to do/.test(prompt)) {
      const open = context.tasks.filter((task) => task.status !== "completed");
      const thisWeek = open.filter((task) => isDueWithinDays(task.dueDate, new Date(), 7));
      const urgent = thisWeek.length ? ` Due in the next seven days: ${humanList(thisWeek.map((task) => task.title))}.` : " Nothing with a date is due in the next seven days.";
      return { text: `You have ${open.length} open ${open.length === 1 ? "task" : "tasks"}.${urgent}`, sources: ["Couple data"] };
    }

    if (/booked|which vendors|our vendors/.test(prompt) && !/compare/.test(prompt)) {
      const booked = context.vendors.filter((vendor) => vendor.status === "booked");
      return { text: booked.length ? `You currently have ${booked.length} booked ${booked.length === 1 ? "vendor" : "vendors"}: ${humanList(booked.map((vendor) => vendor.businessName))}.` : "No vendor is marked Booked yet. You can still save, contact, or consider vendors without committing.", sources: ["Couple data", "Internal vendor database"] };
    }

    if (/budget|left|available|paid|payment/.test(prompt)) {
      const nextPayment = context.budget.upcomingPayments.find((payment) => payment.dueDate);
      const budgetText = context.budget.availableMinor == null
        ? "Your total budget is not set yet."
        : `You have ${formatIls(context.budget.availableMinor)} available after ${formatIls(context.budget.committedMinor)} in commitments. ${formatIls(context.budget.paidMinor)} has been marked paid.`;
      return { text: `${budgetText}${nextPayment ? ` Your next dated payment is ${formatIls(nextPayment.amountMinor)} on ${nextPayment.dueDate}.` : " There is no upcoming dated payment recorded."}`, sources: ["Couple data"] };
    }

    if (/compare|fits us|best value|trade-off|tradeoff/.test(prompt)) {
      const candidates = context.vendors.filter((vendor) => vendor.status === "considering" || vendor.status === "saved");
      if (candidates.length < 2) {
        return { text: "Mark at least two vendors as Saved or Considering and I can compare their price, services, ratings, fit, and your private notes without asking you to enter them again.", sources: ["Couple data"] };
      }
      const wedding = context.wedding;
      const ranked = candidates.map((vendor) => ({ vendor, match: calculateRecommendation({ preferredArea: wedding.preferredArea, availableBudgetMinor: context.budget.availableMinor, styles: wedding.styles, guestCount: wedding.guestCount, eventType: wedding.eventType }, { serviceAreas: vendor.serviceAreas, minPriceMinor: vendor.minPriceMinor, maxPriceMinor: vendor.maxPriceMinor, styles: vendor.styles, minGuestCapacity: vendor.minGuestCapacity, maxGuestCapacity: vendor.maxGuestCapacity, eventTypes: vendor.eventTypes, ratingAverage: vendor.ratingAverage }) })).toSorted((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1));
      const lines = ranked.slice(0, 3).map(({ vendor, match }) => `${vendor.businessName}: ${vendor.minPriceMinor == null ? "price not set" : `${formatIls(vendor.minPriceMinor)}–${formatIls(vendor.maxPriceMinor ?? vendor.minPriceMinor)}`}; ${vendor.services.slice(0, 3).join(", ") || "services not listed"}; ${match.score == null ? "not enough profile evidence for a fit score" : `${match.score}% match from available details`}.`);
      const contextNote = missing.length ? ` I’m missing your ${humanList(missing)}, so the fit comparison is intentionally partial.` : " I used the wedding details already in your workspace.";
      return { text: `${lines.join(" ")}${contextNote}`, sources: ["Couple data", "Internal vendor database"] };
    }

    const knowledgeAnswer = knowledge.find((entry) => entry.terms.every((term) => prompt.includes(term)));
    if (knowledgeAnswer) return { text: knowledgeAnswer.answer, sources: ["General guidance"] };

    if (/current|today|latest|requirement|legal|market price|cost in israel/.test(prompt)) {
      return { text: "That answer depends on current external information. Web research is not configured for this project yet, so I won’t invent a current price, rule, or procedure. When a research-capable provider is added, this answer should use concise sources and prefer official sources for procedures.", sources: ["General guidance"] };
    }

    const known = [context.wedding.preferredArea, context.wedding.guestCount ? `${context.wedding.guestCount} guests` : null, ...context.wedding.styles.slice(0, 2)].filter((value): value is string => Boolean(value));
    return { text: `I can help with your real tasks, budget, payments, booked or considered vendors, vendor comparisons, and general wedding planning. ${known.length ? `I already know: ${humanList(known)}.` : "Your Wedding Details are mostly empty, so I’ll keep personal claims general until you add them."}`, sources: known.length ? ["Couple data", "General guidance"] : ["General guidance"] };
  }
}
