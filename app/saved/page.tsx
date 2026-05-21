'use client';

import { useEffect, useState } from 'react';
import Nav from '@/components/Nav';
import { storage, type SavedIdea } from '@/lib/storage';

const CATEGORY_LABELS: Record<string, string> = {
  'build-log': 'Build Log',
  'ai-workflow': 'AI Workflow',
  'metric': 'Metric',
  'hot-take': 'Hot Take',
  'question': 'Question',
  'behind-scenes': 'BTS',
  'observation': 'Observation',
  'lesson': 'Lesson',
};

export default function SavedPage() {
  const [mounted, setMounted] = useState(false);
  const [ideas, setIdeas] = useState<SavedIdea[]>([]);
  const [filter, setFilter] = useState<'all' | 'unused' | 'used'>('all');

  useEffect(() => {
    setMounted(true);
    setIdeas(storage.getSaved());
  }, []);

  const refresh = () => setIdeas(storage.getSaved());

  const filtered = ideas.filter(i =>
    filter === 'all' ? true : filter === 'used' ? i.used : !i.used
  );

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">04 — Idea Bank</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            Saved <span className="italic text-accent">angles.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            Days you're stuck or running late, pull from here.
          </p>
        </div>

        <div className="hairline-b pb-3 mb-6 flex items-center justify-between gap-4">
          <div className="flex gap-1">
            {(['all', 'unused', 'used'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`mono text-xs uppercase tracking-widest px-3 py-2 ${filter === f ? 'bg-ink text-paper' : 'hover:bg-ink hover:text-paper'}`}
              >
                {f}
              </button>
            ))}
          </div>
          <span className="mono text-[10px] uppercase tracking-widest text-muted">
            {filtered.length} {filtered.length === 1 ? 'idea' : 'ideas'}
          </span>
        </div>

        {!mounted ? (
          <div className="mono text-xs text-muted">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="hairline p-12 text-center">
            <p className="serif text-3xl italic text-muted mb-2">Empty.</p>
            <p className="text-muted text-sm">Save ideas from the Today page.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((idea, i) => (
              <article
                key={idea.id}
                className={`card p-5 fade-up ${idea.used ? 'opacity-60' : ''}`}
                style={{ animationDelay: `${i * 40}ms`, animationFillMode: 'both' }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <span className="tag tag-accent">{CATEGORY_LABELS[idea.category] || idea.category}</span>
                  <span className="mono text-[10px] uppercase tracking-widest text-muted">
                    {new Date(idea.savedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
                <h3 className={`serif text-xl leading-snug mb-4 ${idea.used ? 'line-through' : ''}`}>{idea.text}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => { storage.toggleUsed(idea.id); refresh(); }}
                    className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-ink hover:text-paper"
                  >
                    {idea.used ? 'Mark unused' : 'Mark used'}
                  </button>
                  <button
                    onClick={() => { storage.deleteSaved(idea.id); refresh(); }}
                    className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-accent hover:text-paper hover:border-accent"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
