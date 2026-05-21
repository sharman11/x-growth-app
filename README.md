# Growth Engine — X (No-AI-Writing Edition)

Personal tool for growing an X profile from ~89 to 10K followers by end of year. Generates **ideas, angles, hook structures, and keywords** — never the actual tweets. You write the words yourself, in your own voice. X downranks AI-written content; this tool respects that.

## What it does

- **Refiner** *(the main tool)* — Paste a rough idea, half-formed thought, or a tweet + your gut reaction. The engine scans for signals (shipping, bug, metric, hot take, etc.) and returns 3 angles to write from. Each angle includes: why this angle works, hook structures, sharper questions to help you think, keyword seeds, and what to avoid. Two modes: **Refine a Post** (your raw idea → angles) and **Refine a Reply** (OP tweet + your reaction → angles). Rule-based, no AI, nothing leaves your browser.
- **Library** — Random daily prompts for days when you don't have a starting idea. 3-4 rotating prompts from a content pool across 8 categories.
- **Reply** — A separate quick reply-angle helper. Paste a tweet, get 3 generic reply angles.
- **Thread** — A weekly thread template with structure. Logs which Mondays you shipped.
- **Saved** — Idea bank where you can stash refined angles for later.
- **Plan** — Goal tracker, daily target math, milestones, full strategy.

Everything is stored in `localStorage`. No backend, no API keys, no signups. Just deploy and use.

## The Refiner — how it works

You give it your rough idea. The engine:

1. Scans for **signals** — keywords across 17 categories (shipping, bug, claude-tool, lesson, mistake, metric, surprise, opinion, etc.)
2. Scores **content categories** based on which signals fired
3. Picks the 3 most relevant **angle templates** from a curated pool (Ship Log, Debugging Story, Workflow Reveal, Number Drop, Contrarian Take, Hard-Won Lesson, etc.)
4. Returns each angle with: why it works, hook structures, sharper questions, keyword seeds, watch-outs

No AI inference happens. The "intelligence" is in the rule set, which you can extend in `lib/refiner.ts`.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Follow prompts. Or push to GitHub and import the repo at [vercel.com/new](https://vercel.com/new) — zero config needed.

## Edit the content library

The whole "brain" lives in `lib/ideas.ts`. Three exported arrays:

- `POST_IDEAS` — the daily post pool (add categories, angles, hooks, keywords)
- `REPLY_ANGLES` — the reply angle pool (the helper picks 3 based on the tweet)
- `THREAD_TEMPLATES` — the weekly thread structures

Add more entries any time. The Today page randomly samples on each visit (seeded by date, so it's stable through the day — hit "Reshuffle" if you want a new set).

## Tech

- Next.js 14 (App Router)
- Tailwind CSS
- TypeScript
- `localStorage` for everything

## Daily routine (60 min)

- **10 min** — Open Refiner, paste 3-4 rough ideas you've been collecting, write the tweets in your voice
- **35 min** — Reply to 15-25 tweets from bigger accounts in your niche (200-50K followers). For each: paste tweet + your rough reaction into Refiner (Reply mode), pick an angle, write the reply
- **10 min** — DM 1-2 people who engaged well today, scroll your niche for context
- **5 min** — Mark today done, jot tomorrow's ideas in Saved

Mondays add ~45 min for the weekly thread using the Thread tab.

## Editing your goal

Plan tab → change Current Followers, Goal, Date, Posts/day. The math recomputes daily target automatically.

## Notes

- All data is local. Clearing your browser clears your streak and saved ideas.
- The "reshuffle" button on Today gives you fresh prompts without waiting for tomorrow.
- The Reply tab's suggestions are rule-based (keyword matching on the tweet you paste) — not an LLM call. Fast, free, private.
