'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Nav from '@/components/Nav';
import { refineIdea, CATEGORY_LABELS, type IdeaMode, type RefinedAngle } from '@/lib/refiner';
import { humanize, SEVERITY_LABELS } from '@/lib/humanize';
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

export default function RefinerPageWrapper() {
  return (
    <Suspense fallback={<><Nav /><main className="max-w-6xl mx-auto px-6 py-10 mono text-xs uppercase tracking-widest text-muted">Loading…</main></>}>
      <RefinerPage />
    </Suspense>
  );
}

function RefinerPage() {
  const params = useSearchParams();
  const initialMode = (params?.get('mode') === 'reply' ? 'reply' : 'post') as IdeaMode;
  const initialReplyTo = params?.get('replyTo') ?? '';
  const initialHandle = params?.get('handle') ?? '';

  const [mode, setMode] = useState<IdeaMode>(initialMode);
  const [postContext, setPostContext] = useState(initialReplyTo);
  const [rawInput, setRawInput] = useState('');
  const [hasRefined, setHasRefined] = useState(false);
  const [expandedAngleIdx, setExpandedAngleIdx] = useState(0);
  const [draft, setDraft] = useState('');
  const [draftReport, setDraftReport] = useState<ReturnType<typeof humanize> | null>(null);

  // If the URL prefilled a reply target, log that we replied when the user hits refine.
  const [pendingTarget, setPendingTarget] = useState(initialHandle);

  useEffect(() => {
    if (initialReplyTo && mode !== 'reply') setMode('reply');
  }, [initialReplyTo, mode]);

  const result = useMemo(() => {
    if (!hasRefined) return null;
    const combined = mode === 'reply' ? `${postContext}\n\n${rawInput}` : rawInput;
    return refineIdea(combined, mode);
  }, [rawInput, postContext, mode, hasRefined]);

  const inputHumanize = useMemo(() => {
    if (!rawInput.trim()) return null;
    return humanize(rawInput);
  }, [rawInput]);

  const handleRefine = () => {
    if (!rawInput.trim()) return;
    setHasRefined(true);
    setExpandedAngleIdx(0);
    if (pendingTarget) {
      storage.logReplyToTarget(pendingTarget);
      setPendingTarget('');
    }
  };

  const handleReset = () => {
    setRawInput('');
    setPostContext('');
    setHasRefined(false);
    setDraft('');
    setDraftReport(null);
  };

  const handleSaveAngle = (angle: RefinedAngle) => {
    storage.saveIdea({
      text: `${angle.name}: ${rawInput.slice(0, 80)}${rawInput.length > 80 ? '…' : ''}`,
      category: angle.category,
    });
    alert('Saved to your idea bank.');
  };

  const handlePolish = () => {
    setDraftReport(humanize(draft));
  };

  const tryExample = (example: string) => {
    setRawInput(example);
    setHasRefined(false);
  };

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">01 — Refiner</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            Rough idea in. <span className="italic text-accent">Angles out.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            Drop a half-formed thought, a thing you shipped, or a reaction to a tweet.
            You get one primary angle, two alternates, and a draft scaffold to fill in. You still write the words.
          </p>
        </div>

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

            {/* Live humanize warning on the input */}
            {inputHumanize && inputHumanize.issues.length > 0 && (
              <div className="mt-3 hairline p-3 bg-accent/10">
                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">AI tells in your input</div>
                <ul className="space-y-1 text-xs">
                  {inputHumanize.issues.slice(0, 3).map((iss, i) => (
                    <li key={i}>
                      <span className="mono text-[10px] text-accent uppercase tracking-wider mr-2">{iss.type}</span>
                      <span className="text-muted">{iss.suggestion}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

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

            {!hasRefined && (
              <div className="mt-8 hairline p-4 bg-ink text-paper">
                <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-2">How this works</div>
                <p className="serif text-base italic mb-3">It analyzes. It doesn{"'"}t write.</p>
                <p className="text-sm opacity-80">
                  Your input gets scanned for signals (topic, tone, named tools, products, numbers).
                  You get 3 angles: one primary, two alternates. Each has a fillable scaffold, sharper questions, and what to avoid.
                  No model calls. Nothing leaves your browser.
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
                {/* Signal + tokens readout */}
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
                    <p className="text-sm text-muted mb-3 italic">No strong signals. Falling back to general angles.</p>
                  )}

                  {/* Extracted tokens */}
                  {Object.keys(result.extracted).length > 0 && (
                    <>
                      <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1 mt-2">Tokens extracted</div>
                      <div className="flex flex-wrap gap-1.5 mb-3 text-xs">
                        {Object.entries(result.extracted).map(([k, v]) => (
                          <span key={k} className="mono px-2 py-0.5 bg-ink text-paper">
                            {k}: {v}
                          </span>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">Suggested categories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {result.detectedCategories.map(c => (
                      <span key={c} className="tag tag-accent">{CATEGORY_LABELS[c] ?? c}</span>
                    ))}
                  </div>
                </div>

                {/* Angles — 1 primary + 2 alternates */}
                <div className="space-y-4">
                  {result.angles.map((angle, i) => {
                    const isPrimary = i === 0;
                    const isExpanded = expandedAngleIdx === i;
                    return (
                      <article
                        key={`${angle.name}-${i}`}
                        className={`card ${isPrimary ? 'card-elevated' : ''} fade-up cursor-pointer`}
                        style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                        onClick={() => !isExpanded && setExpandedAngleIdx(i)}
                      >
                        <div className="p-5">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="serif text-2xl text-accent">0{i + 1}</span>
                                <h3 className="serif text-2xl">{angle.name}</h3>
                                {isPrimary && (
                                  <span className="mono text-[9px] uppercase tracking-widest px-2 py-0.5 bg-accent text-paper">
                                    Primary
                                  </span>
                                )}
                              </div>
                              <span className="tag">{CATEGORY_LABELS[angle.category] ?? angle.category}</span>
                              <p className="mono text-[10px] text-muted mt-2 uppercase tracking-wider">
                                {angle.whyPicked}
                              </p>
                            </div>
                            {isExpanded && (
                              <button
                                onClick={(e) => { e.stopPropagation(); handleSaveAngle(angle); }}
                                className="mono text-[10px] uppercase tracking-widest px-3 py-1.5 hairline hover:bg-ink hover:text-paper whitespace-nowrap"
                              >
                                Save
                              </button>
                            )}
                          </div>

                          {!isExpanded ? (
                            <p className="text-sm text-muted mt-3 italic">{angle.whyThisAngle.split('.')[0]}. Click to expand →</p>
                          ) : (
                            <>
                              <p className="text-sm italic mb-4 mt-4 border-l-2 border-ink pl-3">{angle.whyThisAngle}</p>

                              {/* Draft scaffolds — the new thing */}
                              <div className="mb-4">
                                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Draft scaffolds (fill the blanks)</div>
                                <ul className="space-y-2">
                                  {angle.draftScaffolds.map((s, j) => (
                                    <li key={j} className="text-sm border-l-2 border-accent pl-3 leading-snug font-medium">
                                      {s}
                                    </li>
                                  ))}
                                </ul>
                              </div>

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
                                    <li key={j} className="text-sm border-l-2 border-line pl-3 leading-snug text-muted">
                                      {ex}
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              <div className="mb-4">
                                <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Sharper questions</div>
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
                            </>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {/* Polish panel */}
                <div className="hairline p-5 mt-6 fade-up" style={{ animationDelay: '250ms', animationFillMode: 'both' }}>
                  <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">
                    Polish your draft (paste below)
                  </div>
                  <p className="text-sm text-muted mb-3">
                    Once you write the tweet, paste it here. You get char count, hook strength, and the AI tells that X will downrank.
                  </p>
                  <textarea
                    value={draft}
                    onChange={e => { setDraft(e.target.value); setDraftReport(null); }}
                    placeholder="Paste your draft tweet here..."
                    rows={4}
                    className="hairline w-full p-3 text-sm resize-none mb-2"
                  />
                  <div className="flex items-center justify-between">
                    <span className="mono text-[10px] uppercase tracking-widest text-muted">
                      {draft.length} chars · {draft.length > 280 ? Math.ceil(draft.length / 280) + ' tweets' : '1 tweet'}
                    </span>
                    <button onClick={handlePolish} disabled={!draft.trim()} className="btn disabled:opacity-30 disabled:cursor-not-allowed">
                      Polish →
                    </button>
                  </div>

                  {draftReport && (
                    <div className="mt-4 space-y-3">
                      <div className="grid grid-cols-3 gap-3">
                        <Stat label="Clean Score" value={`${draftReport.score}/100`} good={draftReport.score >= 80} />
                        <Stat label="Hook Strength" value={`${draftReport.hookStrength.score}/100`} good={draftReport.hookStrength.score >= 70} />
                        <Stat label="Tweet Count" value={String(draftReport.tweetCount)} good={draftReport.tweetCount === 1} />
                      </div>
                      <div className="text-xs">
                        <div className="mono text-[10px] uppercase tracking-widest text-muted mb-1">First 7 words</div>
                        <p className="italic mb-1">&ldquo;{draftReport.hookStrength.firstWords}&rdquo;</p>
                        <p className="text-muted">{draftReport.hookStrength.note}</p>
                      </div>
                      {draftReport.issues.length === 0 ? (
                        <p className="mono text-[10px] uppercase tracking-widest text-accent">No AI tells found. Ship it.</p>
                      ) : (
                        <div>
                          <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Issues found ({draftReport.issues.length})</div>
                          <ul className="space-y-2">
                            {draftReport.issues.map((iss, i) => (
                              <li key={i} className="text-xs hairline p-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="mono text-[9px] uppercase tracking-wider text-accent">{iss.type}</span>
                                  <span className="mono text-[9px] uppercase tracking-wider text-muted">{SEVERITY_LABELS[iss.severity]}</span>
                                </div>
                                <p className="text-muted italic mb-1">&ldquo;...{iss.excerpt}...&rdquo;</p>
                                <p>{iss.suggestion}</p>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>

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

function Stat({ label, value, good }: { label: string; value: string; good: boolean }) {
  return (
    <div className={`hairline p-2 text-center ${good ? 'bg-ink text-paper' : ''}`}>
      <div className="mono text-[9px] uppercase tracking-widest opacity-70">{label}</div>
      <div className="big-number text-2xl mt-1">{value}</div>
    </div>
  );
}
