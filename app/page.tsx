'use client';

import { useEffect, useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import { POST_IDEAS, type PostIdea } from '@/lib/ideas';
import { storage, seededShuffle, type StreakData, type Settings } from '@/lib/storage';

const CATEGORY_LABELS: Record<string, string> = {
  'build-log': 'Build Log',
  'ai-workflow': 'AI Workflow',
  'metric': 'Metric Drop',
  'hot-take': 'Hot Take',
  'question': 'Question',
  'behind-scenes': 'Behind The Scenes',
  'observation': 'Observation',
  'lesson': 'Lesson',
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [streak, setStreak] = useState<StreakData | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [reshuffleCount, setReshuffleCount] = useState(0);
  const [donePosts, setDonePosts] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setStreak(storage.getStreak());
    setSettings(storage.getSettings());
    setDonePosts(storage.getDonePostsForToday());
  }, []);

  const dailyIdeas = useMemo(() => {
    if (!settings) return [];
    const seed = storage.getDailySeed() + reshuffleCount * 7;
    const shuffled = seededShuffle(POST_IDEAS, seed);
    return shuffled.slice(0, settings.dailyPosts);
  }, [settings, reshuffleCount]);

  const handleMarkDone = () => {
    const next = storage.markToday();
    setStreak(next);
  };

  const handleSave = (idea: PostIdea) => {
    storage.saveIdea({
      text: idea.angle,
      category: idea.category,
    });
    alert('Idea saved.');
  };

  const handleTogglePosted = (idea: PostIdea) => {
    const next = storage.togglePostDone(idea.angle);
    setDonePosts(next);
  };

  if (!mounted || !settings || !streak) {
    return (
      <>
        <Nav />
        <div className="max-w-6xl mx-auto px-6 py-12 mono text-xs uppercase tracking-widest text-muted shimmer">Loading…</div>
      </>
    );
  }

  const today = new Date();
  const dayName = today.toLocaleDateString('en-US', { weekday: 'long' });
  const dateStr = today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const isMonday = today.getDay() === 1;

  const daysToGoal = Math.max(
    1,
    Math.ceil((new Date(settings.goalDate).getTime() - today.getTime()) / 86400000)
  );
  const followersNeeded = settings.goalFollowers - settings.currentFollowers;
  const dailyTarget = Math.ceil(followersNeeded / daysToGoal);

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Refiner pointer */}
        <a href="/refiner" className="block mb-8 hairline p-4 bg-ink text-paper hover:bg-accent hover:border-accent transition-colors group fade-up">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-1">Have a rough idea already?</div>
              <p className="serif text-xl">Skip the library — go to the Refiner →</p>
            </div>
            <div className="mono text-xs uppercase tracking-widest opacity-80 group-hover:opacity-100">
              Refine ↗
            </div>
          </div>
        </a>

        {/* Hero strip */}
        <div className="grid grid-cols-12 gap-6 mb-12 fade-up">
          <div className="col-span-12 md:col-span-7">
            <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">
              {dayName} · {dateStr} · 02 — Library
            </div>
            <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight mb-2">
              {isMonday ? (
                <>Monday. <span className="italic text-accent">Thread day.</span></>
              ) : (
                <>Stuck? <span className="italic">Browse prompts.</span></>
              )}
            </h1>
            <p className="text-muted max-w-xl mt-4">
              For days when you don't have a starting idea. Random prompts from the content library —
              pick one, write the tweet yourself.
            </p>
          </div>
          <div className="col-span-12 md:col-span-5">
            <div className="grid grid-cols-3 gap-3">
              <Stat label="Streak" value={String(streak.current)} sub={`best ${streak.best}`} />
              <Stat label="To Goal" value={String(followersNeeded > 0 ? followersNeeded : 0)} sub={`${daysToGoal}d left`} />
              <Stat label="Daily" value={String(dailyTarget > 0 ? dailyTarget : 0)} sub="net follows" accent />
            </div>
            <button
              onClick={handleMarkDone}
              className="btn w-full mt-3"
              disabled={streak.lastDate === new Date().toISOString().slice(0, 10)}
            >
              {streak.lastDate === new Date().toISOString().slice(0, 10) ? 'Logged for today ✓' : 'Mark today done'}
            </button>
          </div>
        </div>

        {/* Idea cards */}
        {(() => {
          const postedVisible = dailyIdeas.filter(i => donePosts.includes(i.angle)).length;
          const allPosted = postedVisible === dailyIdeas.length && dailyIdeas.length > 0;
          return (
            <>
              <div className="hairline-b pb-3 mb-6 flex items-baseline justify-between">
                <div>
                  <h2 className="serif text-2xl">Today's prompts</h2>
                  <p className="mono text-[10px] uppercase tracking-widest text-muted mt-1">
                    Posted {postedVisible} of {dailyIdeas.length}
                    {allPosted && streak?.lastDate !== new Date().toISOString().slice(0, 10) && (
                      <span className="text-accent ml-2">· all done — mark today done ↑</span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setReshuffleCount(c => c + 1)}
                  className="mono text-xs uppercase tracking-widest text-muted hover:text-ink transition-colors"
                >
                  Reshuffle ↻
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {dailyIdeas.map((idea, idx) => (
                  <IdeaCard
                    key={`${idea.angle}-${idx}`}
                    idea={idea}
                    index={idx}
                    onSave={handleSave}
                    done={donePosts.includes(idea.angle)}
                    onTogglePosted={() => handleTogglePosted(idea)}
                  />
                ))}
              </div>
            </>
          );
        })()}

        {/* Footer / methodology */}
        <div className="mt-16 hairline-t pt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Method</div>
            <p className="serif italic text-lg leading-snug">Ideas, not words.</p>
            <p className="text-muted mt-2">X downranks anything that smells AI-generated. You write the tweet — this tool just hands you the angle, the hook structure, and the keyword bag.</p>
          </div>
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Daily Loop</div>
            <ol className="text-muted space-y-1">
              <li>1. Pick 3-4 prompts</li>
              <li>2. Write each in your voice</li>
              <li>3. Post throughout the day</li>
              <li>4. Reply to 10-15 bigger accounts</li>
              <li>5. Mark done</li>
            </ol>
          </div>
          <div>
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Weekly</div>
            <p className="text-muted">One thread on Monday. Use the Thread tab for the structure. Threads compound — old ones still pull followers months later.</p>
          </div>
        </div>
      </main>
    </>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div className={`hairline p-3 ${accent ? 'bg-ink text-paper border-ink' : ''}`}>
      <div className="mono text-[9px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="big-number text-3xl mt-1">{value}</div>
      <div className="mono text-[9px] uppercase tracking-widest opacity-60 mt-1">{sub}</div>
    </div>
  );
}

function IdeaCard({
  idea,
  index,
  onSave,
  done,
  onTogglePosted,
}: {
  idea: PostIdea;
  index: number;
  onSave: (i: PostIdea) => void;
  done: boolean;
  onTogglePosted: () => void;
}) {
  return (
    <article
      className={`card card-elevated p-6 fade-up transition-opacity ${done ? 'opacity-60' : ''}`}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: 'both' }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="tag tag-accent">{CATEGORY_LABELS[idea.category]}</span>
          {done && <span className="mono text-[10px] uppercase tracking-widest text-accent">· posted</span>}
        </div>
        <span className="mono text-[10px] uppercase tracking-widest text-muted">No. {String(index + 1).padStart(2, '0')}</span>
      </div>

      <h3 className="serif text-2xl leading-tight mb-5">{idea.angle}</h3>

      <div className="mb-4">
        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Think about</div>
        <p className="italic text-sm border-l-2 border-ink pl-3">{idea.examplePrompt}</p>
      </div>

      <div className="mb-4">
        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Hook structures</div>
        <ul className="space-y-1.5">
          {idea.hookFormulas.map((h, i) => (
            <li key={i} className="text-sm flex gap-2">
              <span className="mono text-muted text-xs mt-1">{String(i + 1).padStart(2, '0')}</span>
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Example tweets</div>
        <ul className="space-y-2">
          {idea.examples.map((ex, i) => (
            <li key={i} className="text-sm border-l-2 border-accent pl-3 leading-snug">
              {ex}
            </li>
          ))}
        </ul>
      </div>

      <div className="mb-4">
        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Keyword bag</div>
        <div className="flex flex-wrap gap-1.5">
          {idea.keywords.map(k => (
            <span key={k} className="mono text-[10px] uppercase tracking-wider border border-line px-2 py-0.5">{k}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <button
          onClick={onTogglePosted}
          className={`btn text-[10px] ${done ? 'bg-ink text-paper border-ink' : ''}`}
        >
          {done ? 'Posted ✓ · undo' : 'Mark posted'}
        </button>
        <button onClick={() => onSave(idea)} className="btn btn-ghost text-[10px]">
          Save for later
        </button>
      </div>
    </article>
  );
}
