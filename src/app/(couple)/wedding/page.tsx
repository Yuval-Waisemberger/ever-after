import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, CalendarHeart, CheckCircle2, ListChecks } from "lucide-react";
import { DashboardCard } from "@/components/wedding/dashboard-card";
import { CoupleProfileMenu } from "@/components/couple/couple-profile-menu";
import { GuestDashboardSummary } from "@/components/guests/guest-dashboard-summary";
import { StatusPill, type StatusTone } from "@/components/ui/status-pill";
import { TaskStatusPill } from "@/components/tasks/task-status-pill";
import { deriveBudgetItemStatus, derivePaymentStatus, formatIls } from "@/lib/domain/budget";
import { formatCalendarDate } from "@/lib/domain/date-status";
import { selectUpcomingTasks } from "@/lib/domain/tasks";
import { daysUntilWedding, isWeddingWeek } from "@/lib/domain/wedding-week";
import { getWeddingDashboard } from "@/lib/queries/wedding";
import { getCoupleIdentity } from "@/lib/queries/couple-identity";
import { getGuestSummary } from "@/lib/queries/guests";

function summaryLink(href: string, label: string) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-wine hover:underline">
      {label} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

const budgetStatusTone = {
  inactive: "neutral",
  estimated: "neutral",
  committed: "progress",
  partially_paid: "warning",
  paid: "success",
} satisfies Record<ReturnType<typeof deriveBudgetItemStatus>["kind"], StatusTone>;

const paymentStatusTone = {
  paid: "success",
  overdue: "danger",
  due_soon: "warning",
  scheduled: "neutral",
} satisfies Record<ReturnType<typeof derivePaymentStatus>["kind"], StatusTone>;

export default async function WeddingDashboardPage({ searchParams }: PageProps<"/wedding">) {
  const params = await searchParams;
  const [{ wedding, taskSummary, tasks, relationships, budget, budgetItems }, identity, guestSummary] = await Promise.all([getWeddingDashboard(), getCoupleIdentity(), getGuestSummary()]);
  const days = daysUntilWedding(wedding.wedding_date);
  const weddingWeek = isWeddingWeek(wedding.wedding_date);
  const names = `${wedding.partner_one_name} & ${wedding.partner_two_name}`;
  const today = new Date();
  const upcomingTasks = selectUpcomingTasks(tasks, today, 5);
  const booked = relationships.filter((relationship) => relationship.status === "booked");

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      {weddingWeek ? (
        <div className="wedding-week-banner mb-7 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Wedding Week</p>
          <p className="font-display mt-1 text-2xl">The final details, kept close.</p>
        </div>
      ) : null}

      {params.details === "updated" ? <p className="ea-feedback ea-feedback--success mb-6" role="status">Your Wedding Details have been saved.</p> : null}
      <section className="wedding-dashboard-hero text-center">
        <CoupleProfileMenu choice={identity.avatarChoice} photoUrl={identity.photoUrl} />
        <p className="eyebrow mt-5">Our Wedding</p>
        <h1 className="font-display mt-2 text-5xl leading-tight tracking-tight sm:text-6xl">{names}</h1>
        <div className="wedding-date-card mx-auto mt-6 flex max-w-2xl flex-col items-center justify-center gap-3 border-y px-5 py-5 sm:flex-row sm:gap-5">
          <CalendarHeart className="size-6 shrink-0 text-gold" strokeWidth={1.35} />
          <div className="text-center sm:text-left">
            <p className="font-display text-2xl text-wine">{wedding.wedding_date ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${wedding.wedding_date}T00:00:00Z`)) : "Wedding date not set yet"}</p>
            {wedding.wedding_date ? <p className="mt-1 text-sm text-ink-soft">{days === 0 ? "Today is your day" : days != null && days > 0 ? `${days} days until your celebration` : "Your wedding day has passed"}</p> : <p className="mt-1 text-sm text-ink-soft">Choose it whenever the moment feels right.</p>}
          </div>
        </div>
        <Link href="/wedding/details" className="ea-button mt-5 border border-line bg-paper text-ink hover:border-wine hover:text-wine">Edit wedding details</Link>
      </section>

      {wedding.setup_status !== "completed" ? (
        <Link href="/wedding/setup" className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-[#f3ead7] px-5 py-4 transition hover:border-gold">
          <span>
            <span className="text-sm font-bold text-wine">Complete your Wedding Setup</span>
            <span className="mt-0.5 block text-sm text-ink-soft">A few details will make recommendations and guidance more personal.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-wine" aria-hidden="true" />
        </Link>
      ) : null}

      <div className="wedding-overview mt-8">
        <DashboardCard title="Our Tasks" eyebrow="At a glance" className="dashboard-tasks-card" footer={summaryLink("/tasks", "Manage tasks")}>
          <div className="task-summary-grid grid grid-cols-3 gap-3 text-center">
            <div><ListChecks className="mx-auto size-5 text-wine" /><strong className="mt-2 block text-2xl">{taskSummary.open}</strong><span className="text-xs text-ink-soft">Open</span></div>
            <div><CalendarClock className="mx-auto size-5 text-[#9A611C]" /><strong className="mt-2 block text-2xl">{taskSummary.dueThisWeek}</strong><span className="text-xs text-ink-soft">Due this week</span></div>
            <div><CheckCircle2 className="mx-auto size-5 text-[#3F604E]" /><strong className="mt-2 block text-2xl">{taskSummary.completed} of {taskSummary.total}</strong><span className="text-xs text-ink-soft">Completed</span></div>
          </div>
          {taskSummary.total ? <div className="mt-5 h-1.5 overflow-hidden rounded-full bg-[#EEE7DD]" aria-label={`${taskSummary.completion}% task completion`}><div className="h-full rounded-full bg-[#7A2B3F]" style={{ width: `${taskSummary.completion}%` }} /></div> : null}
        </DashboardCard>

        <DashboardCard title="Upcoming" eyebrow="What needs attention" className="dashboard-upcoming-card" footer={summaryLink("/tasks", "View all tasks")}>
          {upcomingTasks.length ? (
            <ul className="dashboard-upcoming-list divide-y">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 first:pt-0 last:pb-0 text-sm">
                  <span className="min-w-0 flex-1 font-semibold">{task.title}</span>
                  <TaskStatusPill status={task.status} dueDate={task.dueDate} today={today} />
                  <time className="w-full text-xs text-ink-soft sm:w-auto" dateTime={task.dueDate!}>{formatCalendarDate(task.dueDate!)}</time>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm leading-6 text-ink-soft">No overdue tasks or deadlines in the next seven days.</p>}
        </DashboardCard>

        <DashboardCard title="Our Vendors" eyebrow="People you chose" className="dashboard-vendors-card" footer={summaryLink("/vendors/my", "Open Our Vendors")}>
          {booked.length ? (
            <ul className="grid gap-3 xl:grid-cols-2">
              {booked.slice(0, 3).map((relationship) => {
                const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
                const external = Array.isArray(relationship.external_vendors) ? relationship.external_vendors[0] : relationship.external_vendors;
                const images = vendor?.vendor_images ?? [];
                const primary = images.find((image) => image.is_primary) ?? images[0];
                const imageUrl = primary?.external_url ?? (primary?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primary.storage_path}` : null);
                const subcategoryValue = vendor?.vendor_subcategories ?? external?.vendor_subcategories ?? null;
                const subcategory = Array.isArray(subcategoryValue) ? subcategoryValue[0] : subcategoryValue;
                const businessName = vendor?.business_name ?? external?.business_name ?? "Booked vendor";
                return <li key={relationship.id} className="dashboard-vendor-row grid min-w-0 items-center gap-4 rounded-xl border bg-[#FCF9F6] p-3">{imageUrl ? <span className="dashboard-vendor-image relative size-20 overflow-hidden rounded-md bg-paper-muted"><Image src={imageUrl} alt={primary?.alt_text ?? businessName} fill sizes="80px" className="object-cover" /></span> : <span className="dashboard-vendor-image grid size-20 place-items-center rounded-md bg-paper-muted font-display text-2xl text-wine">{businessName.slice(0, 1)}</span>}<span className="dashboard-vendor-info min-w-0"><span className="dashboard-vendor-name block font-semibold">{businessName}</span><span className="dashboard-vendor-category mt-1 block text-xs text-ink-soft">{subcategory?.name ?? "Wedding vendor"}{external ? " · Added by you" : ""}</span><StatusPill tone="success" className="mt-2">Booked</StatusPill></span></li>;
              })}
            </ul>
          ) : <p className="text-sm leading-6 text-ink-soft">Booked vendors will appear here automatically.</p>}
        </DashboardCard>

        <DashboardCard title="Budget" eyebrow="Current picture" className="dashboard-budget-card" footer={summaryLink("/budget", "Open Budget")}>
          {budget.totalBudgetMinor == null ? (
            <p className="text-sm leading-6 text-ink-soft">Set a total budget when you&apos;re ready.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Committed</dt><dd className="font-semibold">{formatIls(budget.committedMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Paid</dt><dd className="font-semibold">{formatIls(budget.paidMinor)}</dd></div>
              <div className="flex justify-between border-t pt-3"><dt className="font-semibold">Available</dt><dd className="ea-money text-xl text-wine">{formatIls(budget.availableMinor)}</dd></div>
            </dl>
          )}
          {budgetItems.length ? <ul className="mt-5 space-y-2 border-t pt-4">{budgetItems.slice(0, 2).map((item) => { const status = deriveBudgetItemStatus(item); return <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="font-semibold">{item.label}</span><StatusPill tone={budgetStatusTone[status.kind]}>{status.label}</StatusPill></li>; })}</ul> : null}
          {budget.upcomingPayments.length ? <div className="mt-4 rounded-md bg-[#FCF9F6] p-3"><p className="text-xs font-semibold text-ink-soft">Next payment</p>{budget.upcomingPayments.slice(0, 1).map((payment, index) => { const status = derivePaymentStatus(payment, today); return <div key={`${payment.itemLabel}-${payment.label}-${index}`} className="mt-2 flex flex-wrap items-center gap-2 text-sm"><span className="min-w-0 flex-1 font-semibold">{payment.itemLabel}: {payment.label}</span><StatusPill tone={paymentStatusTone[status.kind]}>{status.label}</StatusPill></div>; })}</div> : null}
        </DashboardCard>

        <DashboardCard title="Guest List" eyebrow="Guests" footer={summaryLink("/guests", guestSummary.invitationParties ? "See guest list" : "Open guest list")}>
          <GuestDashboardSummary summary={guestSummary} />
        </DashboardCard>

        <DashboardCard title="Wedding Assistant" eyebrow="Grounded guidance" footer={summaryLink("/assistant", "Ask the Assistant")}>
          <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-wine/10 text-wine"><Bot className="size-5" /></span><p className="text-sm leading-6 text-ink-soft">Ask about your real tasks, budget, vendors, or the decisions in front of you.</p></div>
        </DashboardCard>
      </div>
    </main>
  );
}
