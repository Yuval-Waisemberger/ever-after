import { classifyUnpaidPayments } from "./payments";
import type { AgentEvidence } from "./evidence";
import { formatIls } from "@/lib/domain/budget";
import { calculateRecommendation } from "@/lib/domain/recommendation";
import { localTaskSubset, localTaskSummary } from "./local-task-summary";
import type { AssistantRequest, AssistantResponse, WeddingAssistantProvider } from "./types";
import { assistantCopy, selectResponseLanguage } from "./language";
import { hebrewLocalSummary, localPrompt, researchClarification } from "./local-bilingual";

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

function humanList(values: string[]) {
  if (!values.length) return "none yet";
  if (values.length === 1) return values[0];
  return `${values.slice(0, -1).join(", ")} and ${values.at(-1)}`;
}

function answer(text: string, evidence: AgentEvidence[]): AssistantResponse {
  return { status: "ok", text, evidence };
}

export class LocalWeddingAssistantProvider implements WeddingAssistantProvider {
  readonly name = "local";

  async respond({ message, context, language = selectResponseLanguage(message).language }: AssistantRequest): Promise<AssistantResponse> {
    const prompt = localPrompt(message);
    const missing = [
      !context.wedding.weddingDate ? "wedding date" : null,
      context.wedding.guestCount == null ? "guest count" : null,
      !context.wedding.preferredArea ? "preferred area" : null,
      !context.wedding.styles.length ? "wedding style" : null,
    ].filter((value): value is string => Boolean(value));

    // Market questions must not be mistaken for account-budget queries.
    if (/\b(requirement|requirements|legal)\b|\b(current|latest)\b.*\b(market|price|prices|range|cost|costs|rules|procedures)\b|market price|cost in israel|good price|good .* price|reasonable|realistic|normal .*range/.test(prompt)) {
      return {
        status: "unavailable", text: language === "he" ? assistantCopy.he.research : "That answer depends on current external information. Web research is not configured for this project yet, so I won't invent a current price, rule, or procedure. Ever After Marketplace prices are not a real-world market benchmark.",
        language, clarificationIntent: researchClarification(message, context), evidence: [], error: { code: "RESEARCH_UNAVAILABLE", retryable: false },
      };
    }

    const taskSubset = localTaskSubset(prompt);
    if (taskSubset) return answer(localTaskSummary(context.tasks, language, taskSubset), [{ kind: "COUPLE_DATA", section: "tasks" }]);

    if (language === "he") return hebrewLocalSummary(prompt, context);

    if (/guest list|guest count|rsvp|attend|not invited|already invited/.test(prompt)) {
      const guests = context.guestList;
      return answer(`Your Guest List currently has ${guests.invited} invited, ${guests.attending} attending, ${guests.awaitingResponse} awaiting a response, ${guests.notAttending} not attending, and ${guests.notYetInvited} not yet invited.`, [{ kind: "COUPLE_DATA", section: "guestList" }]);
    }

    // Payments take precedence over the generic word "due" used by task questions.
    if (/budget|left|available|paid|payment|overdue/.test(prompt) && !/\btasks?\b/.test(prompt)) {
      const payments = classifyUnpaidPayments(context.budget.unpaidPayments);
      const nextPayment = payments.upcoming[0];
      const overdueText = payments.overdue.length
        ? ` You have ${payments.overdue.length} overdue unpaid ${payments.overdue.length === 1 ? "payment" : "payments"}, totaling ${formatIls(payments.overdue.reduce((sum, payment) => sum + payment.amountMinor, 0))}.`
        : " No dated unpaid payments are overdue.";
      const nextText = nextPayment
        ? ` Your next upcoming payment is ${formatIls(nextPayment.amountMinor)} on ${nextPayment.dueDate}.`
        : " There is no upcoming dated payment recorded.";
      const undatedText = payments.undated.length ? ` ${payments.undated.length} unpaid ${payments.undated.length === 1 ? "payment has" : "payments have"} no due date set.` : "";
      const budgetText = context.budget.availableMinor == null
        ? "Your total budget is not set yet."
        : `You have ${formatIls(context.budget.availableMinor)} available after commitments and actual spending. Active commitments total ${formatIls(context.budget.committedMinor)}. ${formatIls(context.budget.paidMinor)} has been marked paid.`;
      return answer(`${budgetText}${overdueText}${nextText}${undatedText}`, [{ kind: "COUPLE_DATA", section: "budget" }]);
    }

    if (/this week|due|task|still need|to do/.test(prompt)) {
      return answer(localTaskSummary(context.tasks, language, null), [{ kind: "COUPLE_DATA", section: "tasks" }]);
    }

    if (/booked|which vendors|our vendors/.test(prompt) && !/compare/.test(prompt)) {
      const booked = context.vendors.filter((vendor) => vendor.lifecycleStatus === "booked");
      const marketplaceIds = booked.filter((vendor) => vendor.source === "marketplace").map((vendor) => vendor.id);
      return answer(booked.length
        ? `You currently have ${booked.length} booked ${booked.length === 1 ? "vendor" : "vendors"}: ${humanList(booked.map((vendor) => vendor.businessName))}.`
        : "No vendor is marked Booked yet. You can still save, contact, or consider vendors without committing.",
      [{ kind: "COUPLE_DATA", section: "vendors" }, ...(marketplaceIds.length ? [{ kind: "MARKETPLACE_DATA" as const, vendorIds: marketplaceIds }] : [])]);
    }

    if (/compare|fits us|best value|trade-off|tradeoff/.test(prompt)) {
      const candidates = context.vendors.filter((vendor) => vendor.lifecycleStatus === "considering" || vendor.isSaved);
      if (candidates.length < 2) {
        return answer("Mark at least two vendors as Saved or Considering and I can compare their listed price, services, ratings, and fit using your wedding details.", [{ kind: "COUPLE_DATA", section: "vendors" }, { kind: "AI_RECOMMENDATION" }]);
      }
      const wedding = context.wedding;
      const ranked = candidates.map((vendor) => ({ vendor, match: calculateRecommendation({ preferredArea: wedding.preferredArea, availableBudgetMinor: context.budget.availableMinor, styles: wedding.styles, guestCount: wedding.guestCount, eventType: wedding.eventType }, { serviceAreas: vendor.serviceAreas, minPriceMinor: vendor.minPriceMinor, maxPriceMinor: vendor.maxPriceMinor, styles: vendor.styles, minGuestCapacity: vendor.minGuestCapacity, maxGuestCapacity: vendor.maxGuestCapacity, eventTypes: vendor.eventTypes, ratingAverage: vendor.ratingAverage }) })).toSorted((a, b) => (b.match.score ?? -1) - (a.match.score ?? -1)).slice(0, 3);
      const lines = ranked.map(({ vendor, match }) => `${vendor.businessName}: ${vendor.minPriceMinor == null ? "price not set" : `${formatIls(vendor.minPriceMinor)}–${formatIls(vendor.maxPriceMinor ?? vendor.minPriceMinor)}`}; ${vendor.services.slice(0, 3).join(", ") || "services not listed"}; ${match.score == null ? "not enough profile evidence for a fit score" : `${match.score}% match from available details`}.`);
      const contextNote = missing.length ? ` I'm missing your ${humanList(missing)}, so the fit comparison is intentionally partial.` : " I used the wedding details already in your workspace.";
      const marketplaceIds = ranked.filter(({ vendor }) => vendor.source === "marketplace").map(({ vendor }) => vendor.id);
      return answer(`${lines.join(" ")}${contextNote} Fit scores are deterministic recommendations; these listed prices are not a current market benchmark.`, [
        { kind: "COUPLE_DATA", section: "vendors" }, { kind: "COUPLE_DATA", section: "wedding" }, { kind: "COUPLE_DATA", section: "budget" },
        ...(marketplaceIds.length ? [{ kind: "MARKETPLACE_DATA" as const, vendorIds: marketplaceIds }] : []), { kind: "AI_RECOMMENDATION" },
      ]);
    }

    const knowledgeAnswer = knowledge.find((entry) => entry.terms.every((term) => prompt.includes(term)));
    if (knowledgeAnswer) return answer(knowledgeAnswer.answer, [{ kind: "AI_RECOMMENDATION" }]);

    const known = [context.wedding.preferredArea, context.wedding.guestCount != null ? `${context.wedding.guestCount} guests` : null, ...context.wedding.styles.slice(0, 2)].filter((value): value is string => Boolean(value));
    return answer(`I can help with your real tasks, budget, payments, booked or considered vendors, vendor comparisons, and general wedding planning. ${known.length ? `I already know: ${humanList(known)}.` : "Your Wedding Details are mostly empty, so I'll keep personal claims general until you add them."}`, known.length ? [{ kind: "COUPLE_DATA", section: "wedding" }, { kind: "AI_RECOMMENDATION" }] : [{ kind: "AI_RECOMMENDATION" }]);
  }
}
