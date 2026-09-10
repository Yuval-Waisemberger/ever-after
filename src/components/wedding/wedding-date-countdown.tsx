"use client";

import { useEffect, useState } from "react";
import { AnimatedValue } from "@/components/planning/animated-value";
import { getWeddingPhase, weddingDayCountdown } from "@/lib/domain/wedding-week";

export function WeddingDateCountdown({ weddingDate, initialNow, previewNow = null }: { weddingDate: string | null; initialNow: number; previewNow?: number | null }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!weddingDate) return;
    const timer = setInterval(() => setElapsed(Date.now() - initialNow), 60_000);
    return () => clearInterval(timer);
  }, [weddingDate, initialNow]);
  const now = new Date((previewNow ?? initialNow) + elapsed);
  const phase = getWeddingPhase(weddingDate, now);
  const finalWeek = phase.key === "FINAL_WEEK" || phase.key === "DAY_BEFORE";
  const special = finalWeek || phase.key === "WEDDING_DAY" || phase.key === "POST_WEDDING";
  const dateLabel = weddingDate ? new Intl.DateTimeFormat("en-GB", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${weddingDate}T00:00:00Z`)) : "Wedding date not set yet";
  const fine = finalWeek && weddingDate ? weddingDayCountdown(weddingDate, now) : null;
  const title = phase.key === "DAY_BEFORE" ? "Tomorrow" : phase.key === "FINAL_WEEK" ? `${phase.daysRemaining} days to go` : phase.key === "WEDDING_DAY" ? "Today is the day" : "Just married";

  return <div aria-label="Wedding date and countdown" data-phase={phase.key} className="wedding-date-card mx-auto mt-6">
    {phase.key === "WEDDING_DAY" ? <span className="wedding-day-spark" aria-hidden="true">✦</span> : null}
    <div className="min-w-0 text-center">
      {special ? <>
        {phase.key !== "POST_WEDDING" ? <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-wine">{finalWeek ? "Wedding Week" : "Wedding Day"}</p> : null}
        <p className="font-display countdown-special-title text-wine">{phase.key === "FINAL_WEEK" ? <><AnimatedValue value={phase.daysRemaining!} duration={2000} countdown /> days to go</> : title}</p>
        <p className="countdown-date-label mt-2 text-sm text-ink-soft">{dateLabel}</p>
        {fine ? <p className="mt-2 text-sm tabular-nums text-ink-soft"><span dir="ltr">{String(fine.hours).padStart(2, "0")}h {String(fine.minutes).padStart(2, "0")}m</span> until your wedding day</p> : null}
      </> : <>
        <p className="countdown-date-label font-display text-2xl text-wine">{dateLabel}</p>
        {weddingDate ? <p className="countdown-day-value" aria-label={`${phase.daysRemaining} days until your celebration`}><AnimatedValue value={phase.daysRemaining!} duration={2200} countdown /><span className="countdown-caption">days until your celebration <span aria-hidden="true">✧</span></span></p> : <p className="mt-2 text-sm text-ink-soft">Choose it whenever the moment feels right.</p>}
      </>}
      {previewNow !== null ? <p className="mt-2 text-xs text-ink-soft">Development preview · date area only</p> : null}
    </div>
  </div>;
}
