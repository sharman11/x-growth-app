'use client';

import { useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import { refineIdea, CATEGORY_LABELS, type IdeaMode, type RefinedAngle } from '@/lib/refiner';
import { storage } from '@/lib/storage';

const PROMPTS = {
  post: [
    'Just shipped feature X on Hotlistjobs in 2 hours using Claude. Was stuck on auth flow for 40 mins.',
    'StashBox crossed 100 installs this week. Felt small but mattered.',
    'Tried Cursor and Claude Code for the same task. One won, one didn\'t.',
    'Realized I\'ve been over-engineering my prompts. Shorter ones work better.',
  ],
  reply: [
    'OP says "AI coding tools make you a worse engineer" — I disagree but I see why',
    'OP shared their MRR jumped from $0 to $500 in a month',
    'OP asks how people are managing context windows with Claude Code',
  ],
};

export default function RefinerPage() {
  const [mode, setMode] = useState<IdeaMode>('post');
  const [postContext, setPostContext] = useState(''); // for reply mode — the original tweet
  const [rawInput, setRawInput] = useState('');
  const [hasRefined, setHasRefined] = useState(false);

  const result = useMemo(() => {
    if (!hasRefined) return null;
    // For reply mode, concat the OP tweet + your reaction so both feed the analyzer
    const combined = mode === 'reply' ? `${postContext}\n\n${rawInput}` : rawInput;
    return refineIdea(combined, mode);
  }, [rawInput, postContext, mode, hasRefined]);

  const handleRefine = () => {
    if (!rawInput.trim()) return;
    setHasRefined(true);
  };

  const handleReset = () => {
    setRawInput('');
    setPostContext('');
    setHasRefined(false);
  };

  const handleSaveAngle = (angle: RefinedAngle) => {
    storage.saveIdea({
      text: `${angle.name}: ${rawInput.slice(0, 80)}${rawInput.length > 80 ? '…' : ''}`,
      category: angle.category,
    });
    alert('Saved to your idea bank.');
  };

  const tryExample = (example: string) => {
    setRawInput(example);
    setHasRefined(false);
  };

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">01 — Refiner</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            Rough idea in. <span className="italic text-accent">Angles out.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            Drop a half-formed thought, a thing you shipped, or a reaction to a tweet.
            You get 3 angles to write from — you still write the words.
          </p>
        </div>

        {/* Mode toggle */}
        <div className="mb-6 inline-flex hairline">
          <button
            onClick={() => { setMode('post'); handleReset(); }}
            className={`mono text-xs uppercase tracking-widest px-5 py-2.5 transition-colors ${mode === 'post' ? 'bg-ink text-paper' : 'hover:bg-ink hover:text-paper'}`}
          >
            Refine a Post
          </button>
          <button
            onClick={() => { setMode('reply'); handleReset(); }}
            className={`mono text-xs uppercase tracking-widest px-5 py-2.5 transition-colors ${mode === 'reply' ? 'bg-ink text-paper' : 'hover:bg-ink hover:text-paper'}`}
          >
            Refine a Reply
          </button>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Input column */}
          <div className="col-span-12 lg:col-span-5">
            {mode === 'reply' && (
              <div className="mb-4">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">The tweet you{"'"}re replying to</div>
                <textarea
                  value={postContext}
                  onChange={e => setPostContext(e.target.value)}
                  placeholder="Paste the OP tweet here..."
                  rows={4}
                  className="hairline w-full p-3 text-sm resize-none"
                />
              </div>
            )}

            <div>
              <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">
                {mode === 'post' ? 'Your rough idea' : 'Your rough reaction'}
              </div>
              <textarea
                value={rawInput}
                onChange={e => { setRawInput(e.target.value); setHasRefined(false); }}
                placeholder={mode === 'post'
                  ? "What's the half-formed thought? e.g. 'Just shipped X on Hotlistjobs in 2 hours...'"
                  : "Your gut reaction — what do you want to say back?"}
                rows={mode === 'reply' ? 8 : 12}
                className="hairline w-full p-4 text-base resize-none"
              />
              <div className="flex items-center justify-between mt-2">
                <span className="mono text-[10px] uppercase tracking-widest text-muted">
                  {rawInput.length} chars · {rawInput.split(/\s+/).filter(Boolean).length} words
                </span>
                <div className="flex gap-2">
                  {hasRefined && (
                    <button onClick={handleReset} className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-ink hover:text-paper">
                      Reset
                    </button>
                  )}
                  <button
                    onClick={handleRefine}
                    disabled={!rawInput.trim()}
                    className="btn disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    Refine →
                  </button>
                </div>
              </div>
            </div>

            {/* Examples */}
            {!hasRefined && (
              <div className="mt-8">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-3">Try an example</div>
                <div className="space-y-2">
                  {PROMPTS[mode].map((p, i) => (
                    <button
                      key={i}
                      onClick={() => tryExample(p)}
                      className="w-full text-left hairline p-3 text-sm hover:bg-ink hover:text-paper transition-colors"
                    >
                      <span className="mono text-[9px] uppercase tracking-widest opacity-50 mr-2">0{i + 1}</span>
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* How it works */}
            {!hasRefined && (
              <div className="mt-8 hairline p-4 bg-ink text-paper">
                <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-2">How this works</div>
                <p className="serif text-base italic mb-3">It analyzes. It doesn{"'"}t write.</p>
                <p className="text-sm opacity-80">
                  Your input gets scanned for signals — what topic, what tone, what category.
                  Then you get 3 angles to write from, each with hook structures, sharper questions, and what to avoid.
                  No AI, no API calls, nothing leaves your browser.
                </p>
              </div>
            )}
          </div>

          {/* Output column */}
          <div className="col-span-12 lg:col-span-7">
            {!hasRefined || !result || result.angles.length === 0 ? (
              <div className="hairline p-16 text-center">
                <p className="serif text-3xl italic text-muted mb-2">Type your idea →</p>
                <p className="text-sm text-muted">Hit Refine to get angles.</p>
              </div>
            ) : (
              <div>
                {/* Signal readout */}
                <div className="hairline p-4 mb-6 fade-up">
                  <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">What I see in your idea</div>
                  {result.detectedSignals.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {result.detectedSignals.map(s => (
                        <span key={s} className="mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-line">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted mb-3 italic">No strong signals — going with general angles.</p>
                  )}
                  <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Suggested categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detectedCategories.map(c => (
                      <span key={c} className="tag tag-accent">{CATEGORY_LABELS[c]}</span>
                    ))}
                  </div>
                </div>

                {/* Angles */}
                <div className="space-y-4">
                  {result.angles.map((angle, i) => (
                    <article
                      key={angle.name}
                      className="card card-elevated p-6 fade-up"
                      style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                    >
                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <span className="serif text-2xl text-accent">0{i + 1}</span>
                            <h3 className="serif text-2xl">{angle.name}</h3>
                          </div>
                          <span className="tag">{CATEGORY_LABELS[angle.category]}</span>
                        </div>
                        <button
                          onClick={() => handleSaveAngle(angle)}
                          className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-ink hover:text-paper whitespace-nowrap"
                        >
                          Save
                        </button>
                      </div>

                      <p className="text-sm italic mb-4 border-l-2 border-ink pl-3">{angle.whyThisAngle}</p>

                      <div className="mb-4">
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Hook structures</div>
                        <ul className="space-y-1.5">
                          {angle.hookStructures.map((h, j) => (
                            <li key={j} className="text-sm flex gap-2">
                              <span className="mono text-muted text-xs mt-1">{String(j + 1).padStart(2, '0')}</span>
                              <span>{h}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-4">
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Example tweets to riff on</div>
                        <ul className="space-y-2">
                          {angle.examples.map((ex, j) => (
                            <li key={j} className="text-sm border-l-2 border-accent pl-3 leading-snug">
                              {ex}
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-4">
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Sharper questions to help you write</div>
                        <ul className="space-y-1">
                          {angle.sharperQuestions.map((q, j) => (
                            <li key={j} className="text-sm flex gap-2 text-muted">
                              <span className="text-accent">→</span>
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="mb-4">
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Keyword seeds</div>
                        <div className="flex flex-wrap gap-1.5">
                          {angle.keywords.map(k => (
                            <span key={k} className="mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-line">{k}</span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Watch out for</div>
                        <ul className="space-y-1">
                          {angle.watchOuts.map((w, j) => (
                            <li key={j} className="text-sm flex gap-2">
                              <span className="text-muted">·</span>
                              <span className="text-muted">{w}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  ))}
                </div>

                {/* General tips */}
                {result.generalTips.length > 0 && (
                  <div className="hairline p-5 mt-6 bg-ink text-paper fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
                    <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-3">
                      {mode === 'reply' ? 'Reply rules' : 'Writing rules'}
                    </div>
                    <ul className="space-y-2">
                      {result.generalTips.map((t, i) => (
                        <li key={i} className="text-sm flex gap-3">
                          <span className="serif text-accent text-lg leading-none mt-0.5">·</span>
                          <span>{t}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
