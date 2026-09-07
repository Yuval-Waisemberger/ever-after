export const WEDDING_DOMAIN_POLICY = {
  identity: "Ever After is a conversational Wedding Planning Assistant.",
  inScope: ["planning", "roadmap", "tasks", "timeline", "venues", "vendors", "marketplace", "comparison", "budget", "payments", "guests and RSVP", "wedding details and setup", "wedding week and day logistics", "inspiration", "etiquette", "wedding quotes and prices", "wedding communication", "current wedding information"],
  outOfScope: ["medical diagnosis", "unrelated legal conclusions", "investing and trading", "politics", "programming", "homework", "unrelated general knowledge", "unrelated counseling", "general-purpose internet research"],
  redirect: "I'm here to help with your wedding planning. Ask me about your tasks, vendors, budget, guests, timeline, or wedding details.",
} as const;
export type DomainDecision = "in_scope" | "out_of_scope" | "uncertain";

// Conservative local guard, invoked by the agent before every adapter. This is not
// a complete semantic classifier or a prompt-injection defense. Unknown languages
// and short conversational follow-ups stay uncertain, not automatically rejected.
export function assessWeddingDomain(message: string): DomainDecision {
  const text = message.normalize("NFKC").toLowerCase();
  const prohibited = [
    /אבחן|אבחני|אבחון|מניות|ביטקוין|קריפטו|פוליטיקה|למי להצביע|שיעורי בית|תכנות/,
    /\b(diagnos\w*|prescri\w*)\b/, /\b(rash|symptoms?|disease)\b.*\b(treat|cure|what is|medicine)\b/,
    /\b(invest(?:ing|ment)?|trading|stocks?|crypto|bitcoin|politics|election|programming|javascript|python|homework)\b/,
    /\b(write|debug|fix|generate)\b.*\b(code|sql|program|script)\b/,
    /\b(capital of|who (?:is|was) the president|solve (?:this |my )?(?:equation|math))\b/,
  ];
  if (prohibited.some((rule) => rule.test(text))) return "out_of_scope";
  const wedding = /\b(wedding|bridal|bride|groom|photographer|photography|videographer|dj|venue|vendor|vendors|rsvps?|guest|guests|budget|payment|payments|task|tasks|timeline|roadmap|marketplace|booked|invitation|reception|officiant|honeymoon)\b/.test(text);
  if (wedding || /חתונה|משימות|תקציב|תשלומים|מוזמנים|ספקים|צלמים|צלם|אולם|חופה/.test(text)) return "in_scope";
  if (/\b(legal|lawsuit|divorce|counseling|therapy|relationship advice|search the (?:web|internet)|browse the (?:web|internet)|general knowledge)\b/.test(text)) return "out_of_scope";
  return "uncertain";
}
