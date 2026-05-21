'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { storage, type Settings, type StreakData } from '@/lib/storage';

export default function PlanPage() {
  const [mounted, setMounted] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [streak, setStreak] = useState<StreakData | null>(null);

  useEffect(() => {
    setMounted(true);
    setSettings(storage.getSettings());
    setStreak(storage.getStreak());
  }, []);

  if (!mounted || !settings || !streak) {
    return <><Nav /><div className="max-w-5xl mx-auto px-6 py-12 mono text-xs text-muted">Loading…</div></>;
  }

  const update = (key: keyof Settings, val: number | string) => {
    const next = storage.setSettings({ [key]: val });
    setSettings(next);
  };

  const today = new Date();
  const goalDate = new Date(settings.goalDate);
  const daysLeft = Math.max(1, Math.ceil((goalDate.getTime() - today.getTime()) / 86400000));
  const followersNeeded = Math.max(0, settings.goalFollowers - settings.currentFollowers);
  const dailyTarget = Math.ceil(followersNeeded / daysLeft);
  const progress = (settings.currentFollowers / settings.goalFollowers) * 100;

  // Milestones
  const milestones = [
    { at: 250, label: 'First moat', tip: 'Replies start landing. People recognize you.' },
    { at: 500, label: 'Compounding starts', tip: 'Posts get organic reach beyond your followers.' },
    { at: 1000, label: 'First viral hit possible', tip: 'One good thread now lands 100s of follows.' },
    { at: 2500, label: 'Niche authority', tip: 'You\'re a known name in the AI-builder pocket.' },
    { at: 5000, label: 'Halfway', tip: 'Brand DMs start. Threads compound monthly.' },
    { at: 10000, label: 'Goal', tip: 'You did it.' },
  ];

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">05 — The Plan</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            89 → <span className="italic text-accent">10,000.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            Set your numbers. Track the trajectory. The math doesn't lie.
          </p>
        </div>

        {/* Big stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-12">
          <BigStat label="Current" value={settings.currentFollowers.toLocaleString()} />
          <BigStat label="Goal" value={settings.goalFollowers.toLocaleString()} accent />
          <BigStat label="Days Left" value={String(daysLeft)} />
          <BigStat label="Net / Day" value={String(dailyTarget)} />
        </div>

        {/* Progress bar */}
        <div className="mb-12">
          <div className="flex justify-between mono text-[10px] uppercase tracking-widest text-muted mb-2">
            <span>Progress</span>
            <span>{progress.toFixed(1)}%</span>
          </div>
          <div className="hairline h-12 relative overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 bg-ink transition-all duration-700"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
            <div className="absolute inset-0 flex items-center justify-center mono text-[10px] uppercase tracking-widest mix-blend-difference text-paper">
              {settings.currentFollowers} / {settings.goalFollowers}
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="hairline-b pb-3 mb-6">
          <h2 className="serif text-2xl">Inputs</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <Field
            label="Current followers"
            type="number"
            value={settings.currentFollowers}
            onChange={v => update('currentFollowers', Number(v))}
          />
          <Field
            label="Goal followers"
            type="number"
            value={settings.goalFollowers}
            onChange={v => update('goalFollowers', Number(v))}
          />
          <Field
            label="Goal date"
            type="date"
            value={settings.goalDate}
            onChange={v => update('goalDate', String(v))}
          />
          <Field
            label="Posts per day"
            type="number"
            value={settings.dailyPosts}
            onChange={v => update('dailyPosts', Math.max(1, Math.min(8, Number(v))))}
          />
        </div>

        {/* Milestones */}
        <div className="hairline-b pb-3 mb-6">
          <h2 className="serif text-2xl">Milestones</h2>
        </div>

        <div className="space-y-2 mb-12">
          {milestones.map((m, i) => {
            const reached = settings.currentFollowers >= m.at;
            const next = !reached && (i === 0 || settings.currentFollowers >= milestones[i - 1].at);
            return (
              <div
                key={m.at}
                className={`flex items-center gap-4 p-4 hairline transition-all fade-up ${reached ? 'bg-ink text-paper' : next ? 'card-elevated' : ''}`}
                style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
              >
                <div className="big-number text-4xl w-32 shrink-0">
                  {m.at >= 1000 ? `${m.at / 1000}K` : m.at}
                </div>
                <div className="flex-1">
                  <div className="serif text-lg">{m.label}</div>
                  <div className={`text-sm ${reached ? 'opacity-70' : 'text-muted'}`}>{m.tip}</div>
                </div>
                <div className="mono text-[10px] uppercase tracking-widest">
                  {reached ? '✓ Done' : next ? 'Next' : ''}
                </div>
              </div>
            );
          })}
        </div>

        {/* The honest strategy */}
        <div className="hairline-b pb-3 mb-6">
          <h2 className="serif text-2xl">The honest strategy</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Block num="01" title="Posts (5 min)">
            3-4 posts a day from the Today tab. Spread them across the day. Pick a time pattern and stick to it.
          </Block>
          <Block num="02" title="Replies (15 min)">
            The growth lever. Make a list of 10-15 accounts in your niche (200-50K followers). Reply with a specific add — not "great post". This is where 70% of follows come from at your size.
          </Block>
          <Block num="03" title="Weekly thread (45 min, Sunday/Monday)">
            One thread a week, no exceptions. Use a template from the Thread tab. Old threads keep working for months.
          </Block>
          <Block num="04" title="Profile">
            Bio: what you build + what people get from following. Pin a thread that shows your best work — update monthly. Header image = product screenshot.
          </Block>
          <Block num="05" title="DMs">
            When someone good engages, DM them. Not a pitch — a question or compliment. Real relationships compound.
          </Block>
          <Block num="06" title="Don't do this">
            Don't buy follows. Don't follow-unfollow. Don't engage-bait with vague hooks. Don't post AI-written text — X downranks it and your audience can tell.
          </Block>
        </div>

        <div className="mt-12 hairline-t pt-6 mono text-[10px] uppercase tracking-widest text-muted text-center">
          All data stored locally in your browser · Nothing leaves this device
        </div>
      </main>
    </>
  );
}

function BigStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className={`p-5 ${accent ? 'bg-ink text-paper' : 'hairline'}`}>
      <div className={`mono text-[10px] uppercase tracking-widest mb-2 ${accent ? 'opacity-70' : 'text-muted'}`}>{label}</div>
      <div className="big-number text-5xl md:text-6xl">{value}</div>
    </div>
  );
}

function Field({ label, type, value, onChange }: { label: string; type: string; value: string | number; onChange: (v: string | number) => void }) {
  return (
    <label className="block">
      <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">{label}</div>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="hairline w-full p-3 text-lg serif"
      />
    </label>
  );
}

function Block({ num, title, children }: { num: string; title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <div className="flex items-baseline gap-3 mb-2">
        <span className="serif text-2xl text-accent">{num}</span>
        <h3 className="serif text-xl">{title}</h3>
      </div>
      <p className="text-sm text-muted leading-relaxed">{children}</p>
    </div>
  );
}
