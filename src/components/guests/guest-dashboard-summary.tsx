import { AnimatedValue } from "@/components/planning/animated-value";
import { CheckCircle2, Clock3, MailOpen, UsersRound, XCircle } from "lucide-react";
import type { GuestSummary } from "@/lib/domain/guests";

export function GuestDashboardSummary({ summary }: { summary: GuestSummary }) {
  if (summary.invitationParties === 0) {
    return (
      <div className="flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#F3E7E9] text-wine">
          <UsersRound className="size-5" aria-hidden="true" />
        </span>
        <p className="font-display text-2xl text-wine">Start your guest list</p>
      </div>
    );
  }

  const metrics = [
    { label: "Invited", value: summary.invited, Icon: MailOpen, color: "text-wine", surface: "bg-[#F3E7E9]" },
    { label: "Attending", value: summary.attending, Icon: CheckCircle2, color: "text-[#3F604E]", surface: "bg-[#E8EFEA]" },
    { label: "Awaiting response", value: summary.awaitingResponse, Icon: Clock3, color: "text-[#9A611C]", surface: "bg-[#F5EBD7]" },
    { label: "Not attending", value: summary.notAttending, Icon: XCircle, color: "text-[#9A5965]", surface: "bg-[#F5E6E8]" },
  ];

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-4">
      {metrics.map(({ label, value, Icon, color, surface }) => (
        <div key={label} className="min-w-0 text-center">
          <span className={`mx-auto grid size-9 place-items-center rounded-full ${surface} ${color}`}>
            <Icon className="size-4.5" aria-hidden="true" />
          </span>
          <strong className="mt-1.5 block text-xl leading-none text-ink"><AnimatedValue value={value} /></strong>
          <span className="mt-1 block text-[0.7rem] leading-tight text-ink-soft">{label}</span>
        </div>
      ))}
    </div>
  );
}
