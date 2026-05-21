'use client';

import { useEffect, useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import { THREAD_TEMPLATES } from '@/lib/ideas';
import { storage, seededShuffle } from '@/lib/storage';

export default function ThreadPage() {
  const [mounted, setMounted] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [pastThreads, setPastThreads] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setPastThreads(storage.getThreadDates());
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const seed = weekStart.toISOString().slice(0, 10).split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const ordered = seededShuffle(THREAD_TEMPLATES.map((_, i) => i), seed);
    setSelectedIdx(ordered[0]);
  }, []);

  const recommended = THREAD_TEMPLATES[selectedIdx];

  const handleLog = () => {
    storage.logThread();
    setPastThreads(storage.getThreadDates());
  };

  if (!mounted) return <><Nav /><div className="max-w-5xl mx-auto px-6 py-12 mono text-xs text-muted">Loading…</div></>;

  const today = new Date();
  const isMonday = today.getDay() === 1;
  const lastThreadDate = pastThreads[0];
  const daysSinceLast = lastThreadDate
    ? Math.floor((today.getTime() - new Date(lastThreadDate).getTime()) / 86400000)
    : null;

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">03 — Weekly Thread</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            One thread. <span className="italic text-accent">Every week.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            Threads compound. A good one keeps pulling profile visits for weeks.
            Monday is the day. Below: this week's recommended structure.
          </p>
        </div>

        {/* Status bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          <div className="hairline p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Today</div>
            <div className="serif text-2xl">{isMonday ? <span className="text-accent">Thread Day</span> : 'Not Monday'}</div>
          </div>
          <div className="hairline p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Last Thread</div>
            <div className="serif text-2xl">{lastThreadDate ? `${daysSinceLast}d ago` : 'Never'}</div>
          </div>
          <div className="hairline p-4">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Threads Logged</div>
            <div className="serif text-2xl">{pastThreads.length}</div>
          </div>
        </div>

        {/* Template picker */}
        <div className="hairline-b pb-3 mb-6 flex items-baseline justify-between">
          <h2 className="serif text-2xl">Thread templates</h2>
          <span className="mono text-[10px] uppercase tracking-widest text-muted">Pick one</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 mb-8">
          {THREAD_TEMPLATES.map((t, i) => (
            <button
              key={t.type}
              onClick={() => setSelectedIdx(i)}
              className={`p-3 text-left transition-all ${selectedIdx === i ? 'bg-ink text-paper' : 'hairline hover:bg-ink hover:text-paper'}`}
            >
              <div className="mono text-[9px] uppercase tracking-widest opacity-60 mb-1">No. 0{i + 1}</div>
              <div className="serif text-sm leading-tight">{t.type}</div>
            </button>
          ))}
        </div>

        {/* Selected template detail */}
        <div className="card card-elevated p-8 fade-up">
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 md:col-span-4">
              <span className="tag tag-accent mb-4">Recommended this week</span>
              <h3 className="serif text-3xl leading-tight mt-3 mb-4">{recommended.type}</h3>
              <div className="mb-4">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Best for</div>
                <p className="text-sm">{recommended.bestFor}</p>
              </div>
              <div className="mb-6">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Search keywords</div>
                <div className="flex flex-wrap gap-1.5">
                  {recommended.keywords.map(k => (
                    <span key={k} className="mono text-[10px] uppercase tracking-wider border border-line px-2 py-0.5">{k}</span>
                  ))}
                </div>
              </div>
              <button onClick={handleLog} className="btn w-full">
                I posted my thread ✓
              </button>
            </div>

            <div className="col-span-12 md:col-span-8">
              <div className="mono text-[10px] uppercase tracking-widest text-muted mb-3">The structure — write each tweet yourself</div>
              <ol className="space-y-3">
                {recommended.structure.map((step, i) => (
                  <li
                    key={i}
                    className="flex gap-4 fade-up"
                    style={{ animationDelay: `${i * 60}ms`, animationFillMode: 'both' }}
                  >
                    <span className="serif text-3xl leading-none text-accent w-10 shrink-0">
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span className="text-base leading-relaxed border-l border-line pl-4 pt-1">{step}</span>
                  </li>
                ))}
              </ol>

              <div className="mt-8 hairline-t pt-4">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Rules</div>
                <ul className="text-sm space-y-1 text-muted">
                  <li>· First tweet is the whole game — write it 5 times before picking</li>
                  <li>· Every tweet should stand on its own</li>
                  <li>· One screenshot/image somewhere in the thread → more shares</li>
                  <li>· Last tweet: CTA. Soft. "DM me", "follow for more", or a link.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {pastThreads.length > 0 && (
          <div className="mt-10">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-3">Thread log</div>
            <div className="flex flex-wrap gap-2">
              {pastThreads.map(d => (
                <span key={d} className="mono text-xs hairline px-3 py-1">{d}</span>
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
