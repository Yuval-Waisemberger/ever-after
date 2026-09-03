import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, CheckCircle2, ListChecks, Store } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { DashboardCard } from "@/components/wedding/dashboard-card";
import { formatIls } from "@/lib/domain/budget";
import { daysUntilWedding, isWeddingWeek } from "@/lib/domain/wedding-week";
import { getWeddingDashboard } from "@/lib/queries/wedding";

function summaryLink(href: string, label: string) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 font-semibold text-wine hover:underline">
      {label} <ArrowRight className="size-3.5" aria-hidden="true" />
    </Link>
  );
}

export default async function WeddingDashboardPage() {
  const { wedding, taskSummary, tasks, relationships, budget } = await getWeddingDashboard();
  const days = daysUntilWedding(wedding.wedding_date);
  const weddingWeek = isWeddingWeek(wedding.wedding_date);
  const names = `${wedding.partner_one_name} & ${wedding.partner_two_name}`;
  const upcomingTasks = tasks.filter((task) => task.dueDate && task.status !== "completed").slice(0, 3);
  const booked = relationships.filter((relationship) => relationship.status === "booked");
  const savedCount = relationships.filter((relationship) => relationship.status === "saved").length;

  return (
    <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10 lg:py-12">
      {weddingWeek ? (
        <div className="mb-7 rounded-2xl border border-wine/20 bg-wine px-5 py-4 text-white">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Wedding Week</p>
          <p className="font-display mt-1 text-2xl">The final details, kept close.</p>
        </div>
      ) : null}

      <PageHeader
        eyebrow="My Wedding"
        title={names}
        description={
          wedding.wedding_date
            ? `${new Intl.DateTimeFormat("en", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${wedding.wedding_date}T00:00:00Z`))} · ${days === 0 ? "Today" : days != null && days > 0 ? `${days} days to go` : "Wedding day has passed"}`
            : "Wedding date not set yet"
        }
        action={
          <Link href="/wedding/details" className="inline-flex min-h-11 items-center rounded-full border bg-paper px-5 text-sm font-semibold hover:border-wine hover:text-wine">
            Edit wedding details
          </Link>
        }
      />

      {wedding.setup_status !== "completed" ? (
        <Link href="/wedding/setup" className="mt-8 flex items-center justify-between gap-4 rounded-2xl border border-gold/40 bg-[#f3ead7] px-5 py-4 transition hover:border-gold">
          <span>
            <span className="text-sm font-bold text-wine">Complete your Wedding Setup</span>
            <span className="mt-0.5 block text-sm text-ink-soft">A few details will make recommendations and guidance more personal.</span>
          </span>
          <ArrowRight className="size-5 shrink-0 text-wine" aria-hidden="true" />
        </Link>
      ) : null}

      <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <DashboardCard title="Tasks" eyebrow="At a glance" footer={summaryLink("/tasks", "Manage tasks")}>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div><ListChecks className="mx-auto size-5 text-wine" /><strong className="mt-2 block text-2xl">{taskSummary.open}</strong><span className="text-xs text-ink-soft">open</span></div>
            <div><CalendarClock className="mx-auto size-5 text-gold" /><strong className="mt-2 block text-2xl">{taskSummary.dueThisWeek}</strong><span className="text-xs text-ink-soft">this week</span></div>
            <div><CheckCircle2 className="mx-auto size-5 text-sage" /><strong className="mt-2 block text-2xl">{taskSummary.completion}%</strong><span className="text-xs text-ink-soft">completed</span></div>
          </div>
        </DashboardCard>

        <DashboardCard title="Upcoming" eyebrow="Next dates" footer={summaryLink("/wedding/timeline", "Open timeline")}>
          {upcomingTasks.length ? (
            <ul className="space-y-3">
              {upcomingTasks.map((task) => (
                <li key={task.id} className="flex items-start justify-between gap-3 text-sm">
                  <span className="font-semibold">{task.title}</span>
                  <time className="shrink-0 text-xs text-ink-soft">{task.dueDate}</time>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm leading-6 text-ink-soft">No upcoming dated tasks yet.</p>}
        </DashboardCard>

        <DashboardCard title="My Vendors" eyebrow="People you chose" footer={summaryLink("/vendors/my", "Open My Vendors")}>
          {booked.length ? (
            <ul className="space-y-3 text-sm">
              {booked.slice(0, 3).map((relationship) => {
                const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
                return <li key={relationship.id} className="flex items-center gap-2"><Store className="size-4 text-sage" /><span className="font-semibold">{vendor?.business_name ?? "Booked vendor"}</span></li>;
              })}
            </ul>
          ) : <p className="text-sm leading-6 text-ink-soft">Booked vendors will appear here automatically.</p>}
        </DashboardCard>

        <DashboardCard title="Budget" eyebrow="Current picture" footer={summaryLink("/budget", "Open Budget")}>
          {budget.totalBudgetMinor == null ? (
            <p className="text-sm leading-6 text-ink-soft">Set a total budget when you&apos;re ready.</p>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between"><dt className="text-ink-soft">Committed</dt><dd className="font-semibold">{formatIls(budget.committedMinor)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-soft">Paid</dt><dd className="font-semibold">{formatIls(budget.paidMinor)}</dd></div>
              <div className="flex justify-between border-t pt-3"><dt className="font-semibold">Available</dt><dd className="font-display text-xl text-wine">{formatIls(budget.availableMinor)}</dd></div>
            </dl>
          )}
        </DashboardCard>

        <DashboardCard title="Saved Vendors" eyebrow="Your shortlist" footer={summaryLink("/vendors/my?status=saved", "See saved vendors")}>
          <div className="flex items-end gap-3"><span className="font-display text-5xl text-wine">{savedCount}</span><span className="pb-1 text-sm text-ink-soft">saved {savedCount === 1 ? "vendor" : "vendors"}</span></div>
        </DashboardCard>

        <DashboardCard title="Wedding Assistant" eyebrow="Grounded guidance" footer={summaryLink("/assistant", "Ask the Assistant")}>
          <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-wine/10 text-wine"><Bot className="size-5" /></span><p className="text-sm leading-6 text-ink-soft">Ask about your real tasks, budget, vendors, or the decisions in front of you.</p></div>
        </DashboardCard>
      </div>
    </main>
  );
}
