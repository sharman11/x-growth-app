'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Nav from '@/components/Nav';
import { storage, type ReplyTarget, type Settings } from '@/lib/storage';

export default function TargetsPage() {
  const [mounted, setMounted] = useState(false);
  const [targets, setTargets] = useState<ReplyTarget[]>([]);
  const [repliesToday, setRepliesToday] = useState<string[]>([]);
  const [lastReply, setLastReply] = useState<Record<string, string>>({});
  const [settings, setSettings] = useState<Settings | null>(null);

  const [handle, setHandle] = useState('');
  const [niche, setNiche] = useState('');
  const [why, setWhy] = useState('');

  useEffect(() => {
    setMounted(true);
    refresh();
  }, []);

  function refresh() {
    setTargets(storage.getReplyTargets());
    setRepliesToday(storage.getRepliesToday());
    setLastReply(storage.lastReplyByHandle());
    setSettings(storage.getSettings());
  }

  const handleAdd = () => {
    if (!handle.trim()) return;
    storage.addReplyTarget(handle, niche, why);
    setHandle('');
    setNiche('');
    setWhy('');
    refresh();
  };

  const handleRemove = (id: string) => {
    if (!confirm('Remove this target?')) return;
    storage.removeReplyTarget(id);
    refresh();
  };

  const handleMarkReplied = (h: string) => {
    storage.logReplyToTarget(h);
    refresh();
  };

  // Sort: not-yet-replied today first, then by stalest last-reply
  const sorted = useMemo(() => {
    return [...targets].sort((a, b) => {
      const aDone = repliesToday.includes(a.handle);
      const bDone = repliesToday.includes(b.handle);
      if (aDone !== bDone) return aDone ? 1 : -1;
      const aLast = lastReply[a.handle] ?? '0000-00-00';
      const bLast = lastReply[b.handle] ?? '0000-00-00';
      return aLast.localeCompare(bLast);
    });
  }, [targets, repliesToday, lastReply]);

  if (!mounted || !settings) {
    return (
      <>
        <Nav />
        <main className="max-w-6xl mx-auto px-6 py-12 mono text-xs uppercase tracking-widest text-muted">Loading…</main>
      </>
    );
  }

  const replyGoal = settings.dailyReplies ?? 10;
  const completed = repliesToday.length;
  const remaining = Math.max(0, replyGoal - completed);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">03 — Reply Targets</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            Where 70% of follows <span className="italic text-accent">come from.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            A list of accounts in your niche you should be replying to most days. The plan says reply to 10-15 bigger accounts. This is the queue.
          </p>
        </div>

        {/* Today bar */}
        <div className="hairline p-4 mb-8 fade-up">
          <div className="flex items-center justify-between mb-2">
            <div className="mono text-[10px] uppercase tracking-widest text-muted">Today</div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted">{completed} / {replyGoal} replies</div>
          </div>
          <div className="h-2 bg-line">
            <div
              className="h-2 bg-accent transition-all"
              style={{ width: `${Math.min(100, (completed / replyGoal) * 100)}%` }}
            />
          </div>
          <p className="text-sm text-muted mt-2">
            {remaining === 0
              ? <>Daily reply goal hit. Anything more today is upside.</>
              : <>{remaining} {remaining === 1 ? 'reply' : 'replies'} to hit today&apos;s goal. Start with the stalest target.</>
            }
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Add form */}
          <div className="col-span-12 lg:col-span-4">
            <div className="hairline p-5 mb-6">
              <div className="mono text-[10px] uppercase tracking-widest text-muted mb-3">Add a target account</div>
              <input
                value={handle}
                onChange={e => setHandle(e.target.value)}
                placeholder="@handle"
                className="hairline w-full p-2 text-sm mb-2"
              />
              <input
                value={niche}
                onChange={e => setNiche(e.target.value)}
                placeholder="Niche tag (e.g. indie android, claude-code)"
                className="hairline w-full p-2 text-sm mb-2"
              />
              <textarea
                value={why}
                onChange={e => setWhy(e.target.value)}
                placeholder="Why this account? (e.g. ships daily, 8k followers in our niche)"
                rows={3}
                className="hairline w-full p-2 text-sm resize-none mb-3"
              />
              <button
                onClick={handleAdd}
                disabled={!handle.trim()}
                className="btn w-full disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add target
              </button>
            </div>

            <div className="hairline p-4 bg-ink text-paper">
              <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-2">How to use this</div>
              <ol className="text-sm space-y-2 opacity-90">
                <li>1. Add 10-15 accounts in your niche (200-50K followers).</li>
                <li>2. Each day, open the top stale one.</li>
                <li>3. Paste the OP tweet, hit Reply → Refiner pre-fills.</li>
                <li>4. Write your reply with a specific detail OP doesn&apos;t have.</li>
                <li>5. Mark replied. Move to the next.</li>
              </ol>
            </div>
          </div>

          {/* Target list */}
          <div className="col-span-12 lg:col-span-8">
            {sorted.length === 0 ? (
              <div className="hairline p-16 text-center">
                <p className="serif text-3xl italic text-muted mb-2">Your queue is empty.</p>
                <p className="text-sm text-muted">Add your first target account on the left.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sorted.map((t, i) => {
                  const repliedToday = repliesToday.includes(t.handle);
                  const last = lastReply[t.handle];
                  const lastLabel = last
                    ? daysAgo(last)
                    : 'never replied';
                  const stale = !repliedToday && (!last || daysSince(last) >= 3);
                  return (
                    <article
                      key={t.id}
                      className={`card p-4 fade-up transition-opacity ${repliedToday ? 'opacity-50' : ''}`}
                      style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="serif text-xl">{t.handle}</span>
                            {repliedToday && <span className="mono text-[9px] uppercase tracking-widest text-accent">· replied today ✓</span>}
                            {stale && <span className="mono text-[9px] uppercase tracking-widest text-accent">· stale</span>}
                          </div>
                          {t.niche && <span className="tag tag-accent mr-2">{t.niche}</span>}
                          <span className="mono text-[10px] uppercase tracking-widest text-muted">{lastLabel}</span>
                          {t.why && <p className="text-sm text-muted mt-2">{t.why}</p>}
                        </div>
                        <div className="flex flex-col gap-1.5 items-end">
                          <Link
                            href={{
                              pathname: '/refiner',
                              query: { mode: 'reply', handle: t.handle },
                            }}
                            className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-ink hover:text-paper whitespace-nowrap"
                          >
                            Reply →
                          </Link>
                          <a
                            href={`https://x.com/${t.handle.replace(/^@/, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="mono text-[10px] uppercase tracking-widest text-muted hover:text-ink whitespace-nowrap"
                          >
                            Open on X ↗
                          </a>
                          {!repliedToday && (
                            <button
                              onClick={() => handleMarkReplied(t.handle)}
                              className="mono text-[10px] uppercase tracking-widest text-muted hover:text-ink whitespace-nowrap"
                            >
                              Mark replied
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(t.id)}
                            className="mono text-[10px] uppercase tracking-widest text-muted hover:text-accent whitespace-nowrap"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function daysSince(dateStr: string): number {
  const today = new Date(Date.now() + (5 * 60 + 30) * 60 * 1000).toISOString().slice(0, 10);
  const a = new Date(today + 'T00:00:00Z').getTime();
  const b = new Date(dateStr + 'T00:00:00Z').getTime();
  return Math.floor((a - b) / 86400000);
}

function daysAgo(dateStr: string): string {
  const d = daysSince(dateStr);
  if (d <= 0) return 'replied today';
  if (d === 1) return 'replied yesterday';
  return `replied ${d}d ago`;
}
