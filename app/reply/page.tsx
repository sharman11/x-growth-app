'use client';

import { useMemo, useState } from 'react';
import Nav from '@/components/Nav';
import { REPLY_ANGLES } from '@/lib/ideas';

export default function ReplyPage() {
  const [tweet, setTweet] = useState('');
  const [picked, setPicked] = useState<string[]>([]);

  const suggestions = useMemo(() => {
    if (!tweet.trim()) return [];
    const t = tweet.toLowerCase();

    // Lightweight rule-based suggestion ranking
    const scored = REPLY_ANGLES.map(a => {
      let score = 0;
      if (/\?$|how|why|what|which|anyone/.test(t)) {
        if (a.name.includes('Tool/Workflow') || a.name.includes('Curiosity')) score += 3;
      }
      if (/wrong|disagree|hate|stop|never|always/.test(t)) {
        if (a.name.includes('Disagree') || a.name.includes('Reframe')) score += 3;
      }
      if (/shipped|launched|built|live|hit \d/.test(t)) {
        if (a.name.includes('Build-in-Public') || a.name.includes('Agree')) score += 3;
      }
      if (/lol|haha|mood|feel/.test(t)) {
        if (a.name.includes('Joke')) score += 3;
      }
      if (/data|metric|number|users|mrr|revenue/.test(t)) {
        if (a.name.includes('Agree') || a.name.includes('Build-in-Public')) score += 2;
      }
      // Always keep at least baseline variance
      score += Math.random() * 0.5;
      return { ...a, score };
    });

    return scored.sort((a, b) => b.score - a.score).slice(0, 3);
  }, [tweet]);

  const togglePicked = (name: string) => {
    setPicked(p => p.includes(name) ? p.filter(x => x !== name) : [...p, name]);
  };

  return (
    <>
      <Nav />
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-10 fade-up">
          <div className="mono text-[10px] uppercase tracking-[0.3em] text-muted mb-3">02 — Reply Helper</div>
          <h1 className="serif text-5xl md:text-6xl leading-[0.95] tracking-tight">
            Paste a tweet. <span className="italic text-accent">Get angles.</span>
          </h1>
          <p className="text-muted mt-4 max-w-2xl">
            For accounts under 1K, replies to bigger accounts drive most growth. Paste the tweet you want to reply to. You'll get 3 reply <em>angles</em> — you write the reply in your voice.
          </p>
        </div>

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-5">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">The tweet</div>
            <textarea
              value={tweet}
              onChange={e => setTweet(e.target.value)}
              placeholder="Paste the tweet you want to reply to..."
              rows={10}
              className="hairline w-full p-4 text-base resize-none"
            />
            <div className="mono text-[10px] uppercase tracking-widest text-muted mt-3">
              {tweet.length} chars · {tweet.split(/\s+/).filter(Boolean).length} words
            </div>

            <div className="mt-8 hairline p-4 bg-ink text-paper">
              <div className="mono text-[10px] uppercase tracking-widest opacity-70 mb-2">Reply rule</div>
              <p className="serif text-lg italic">Add a specific. Never generic.</p>
              <p className="text-sm opacity-80 mt-2">A reply with one concrete detail (a number, a story, a tool name) beats ten "great post!" replies. Always.</p>
            </div>
          </div>

          <div className="col-span-12 md:col-span-7">
            <div className="mono text-[10px] uppercase tracking-widest text-muted mb-2">Suggested angles</div>
            {suggestions.length === 0 && (
              <div className="hairline p-12 text-center">
                <p className="serif text-2xl italic text-muted">Paste a tweet →</p>
              </div>
            )}
            <div className="space-y-3">
              {suggestions.map((s, i) => (
                <div
                  key={s.name}
                  className={`card p-5 fade-up cursor-pointer transition-all ${picked.includes(s.name) ? 'card-elevated bg-ink text-paper' : 'hover:translate-x-[2px] hover:shadow-[3px_3px_0_var(--ink)]'}`}
                  style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
                  onClick={() => togglePicked(s.name)}
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="serif text-xl">{s.name}</h3>
                    <span className={`tag ${picked.includes(s.name) ? 'border-paper' : 'tag-accent'}`}>
                      Angle 0{i + 1}
                    </span>
                  </div>
                  <div className="mb-3">
                    <div className={`mono text-[10px] uppercase tracking-widest mb-1 ${picked.includes(s.name) ? 'opacity-70' : 'text-muted'}`}>Use when</div>
                    <p className="text-sm">{s.when}</p>
                  </div>
                  <div className="mb-3">
                    <div className={`mono text-[10px] uppercase tracking-widest mb-1 ${picked.includes(s.name) ? 'opacity-70' : 'text-muted'}`}>Approach</div>
                    <p className="text-sm">{s.approach}</p>
                  </div>
                  <div>
                    <div className={`mono text-[10px] uppercase tracking-widest mb-1 ${picked.includes(s.name) ? 'opacity-70' : 'text-muted'}`}>Phrasing seeds</div>
                    <div className="flex flex-wrap gap-1.5">
                      {s.keywords.map(k => (
                        <span key={k} className={`mono text-[10px] uppercase tracking-wider px-2 py-0.5 border ${picked.includes(s.name) ? 'border-paper/50' : 'border-line'}`}>
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {suggestions.length > 0 && (
              <div className="mt-6 hairline-t pt-4 mono text-[10px] uppercase tracking-widest text-muted">
                Tap an angle to pick it. Then go write the reply. {picked.length} selected.
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
