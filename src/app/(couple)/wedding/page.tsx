import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Bot, CalendarClock, CalendarHeart, CheckCircle2, Heart, ListChecks } from "lucide-react";
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

export default async function WeddingDashboardPage({ searchParams }: PageProps<"/wedding">) {
  const params = await searchParams;
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
        <div className="wedding-week-banner mb-7 px-5 py-4">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/75">Wedding Week</p>
          <p className="font-display mt-1 text-2xl">The final details, kept close.</p>
        </div>
      ) : null}

      {params.details === "updated" ? <p className="ea-feedback ea-feedback--success mb-6" role="status">Your Wedding Details have been saved.</p> : null}
      <section className="wedding-dashboard-hero text-center">
        <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold/50 bg-paper text-wine"><Heart className="size-6" strokeWidth={1.3} /></span>
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
        <DashboardCard title="Our Tasks" eyebrow="At a glance" footer={summaryLink("/tasks", "Manage tasks")}>
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

        <DashboardCard title="Our Vendors" eyebrow="People you chose" footer={summaryLink("/vendors/my", "Open Our Vendors")}>
          {booked.length ? (
            <ul className="space-y-3 text-sm">
              {booked.slice(0, 3).map((relationship) => {
                const vendor = Array.isArray(relationship.vendor_profiles) ? relationship.vendor_profiles[0] : relationship.vendor_profiles;
                const images = vendor?.vendor_images ?? [];
                const primary = images.find((image) => image.is_primary) ?? images[0];
                const imageUrl = primary?.external_url ?? (primary?.storage_path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/vendor-media/${primary.storage_path}` : null);
                return <li key={relationship.id} className="flex items-center gap-3">{imageUrl ? <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-paper-muted"><Image src={imageUrl} alt={primary?.alt_text ?? vendor?.business_name ?? "Booked vendor"} fill sizes="40px" className="object-cover" /></span> : <span className="grid size-10 shrink-0 place-items-center rounded-md bg-paper-muted font-display text-wine">{vendor?.business_name?.slice(0, 1) ?? "V"}</span>}<span className="font-semibold">{vendor?.business_name ?? "Booked vendor"}</span></li>;
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
              <div className="flex justify-between border-t pt-3"><dt className="font-semibold">Available</dt><dd className="ea-money text-xl text-wine">{formatIls(budget.availableMinor)}</dd></div>
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
