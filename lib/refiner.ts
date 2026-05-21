// Refiner engine — analyzes a rough idea/thought and returns angles to write from.
// Rule-based: keyword detection + category scoring + angle templates.
// No AI, no API calls. Fast, private, free.

export type IdeaMode = 'post' | 'reply';

export interface RefinedAngle {
  name: string;
  category: string;
  whyThisAngle: string;
  hookStructures: string[];
  examples: string[];
  sharperQuestions: string[];
  keywords: string[];
  watchOuts: string[];
}

export interface RefinerResult {
  detectedSignals: string[];
  detectedCategories: string[];
  wordCount: number;
  angles: RefinedAngle[];
  generalTips: string[];
}

// Keyword signal detection — what topics/emotions does the rough idea hit?
interface Signal {
  name: string;
  patterns: RegExp[];
  categories: string[];
}

const SIGNALS: Signal[] = [
  { name: 'shipping', patterns: [/\b(ship|shipped|launch|launched|pushed|deployed|live|released)\b/i], categories: ['build-log', 'metric'] },
  { name: 'bug', patterns: [/\b(bug|broke|broken|crash|error|fix|fixed|debug|debugging)\b/i], categories: ['build-log', 'lesson'] },
  { name: 'metric', patterns: [/\b(\d+\s*(users?|signups?|installs?|mrr|revenue|dau|mau|downloads?|views?))|users? jumped|crossed \d/i], categories: ['metric', 'build-log'] },
  { name: 'claude-tool', patterns: [/\b(claude|cursor|copilot|chatgpt|gpt|cline|aider|mcp|sub.?agent|prompt)\b/i], categories: ['ai-workflow', 'lesson'] },
  { name: 'lesson', patterns: [/\b(learn|learned|lesson|realized|figured out|wish i knew|looking back|in hindsight)\b/i], categories: ['lesson', 'observation'] },
  { name: 'mistake', patterns: [/\b(mistake|wrong|mess(ed)? up|screw(ed)? up|regret|should(n.t)? have)\b/i], categories: ['lesson', 'build-log'] },
  { name: 'opinion', patterns: [/\b(think|believe|opinion|hot take|imo|imho|disagree|wrong|overrated|underrated)\b/i], categories: ['hot-take', 'observation'] },
  { name: 'question', patterns: [/\?$|\b(how do you|what do you|anyone else|am i the only)\b/i], categories: ['question'] },
  { name: 'surprise', patterns: [/\b(surprised|surprising|didn.t expect|unexpected|weird|strange|counter.?intuitive)\b/i], categories: ['observation', 'metric'] },
  { name: 'comparison', patterns: [/\b(vs|versus|compared|better than|worse than|switched from|replaced)\b/i], categories: ['ai-workflow', 'hot-take'] },
  { name: 'workflow', patterns: [/\b(workflow|setup|stack|process|use(d)?|tool|toolkit)\b/i], categories: ['ai-workflow', 'behind-scenes'] },
  { name: 'time', patterns: [/\b(\d+\s*(hours?|days?|weeks?|months?|minutes?))|in (a day|an hour|minutes)\b/i], categories: ['build-log', 'metric'] },
  { name: 'product-stashbox', patterns: [/\bstashbox\b/i], categories: ['build-log', 'metric', 'behind-scenes'] },
  { name: 'product-hotlist', patterns: [/\bhotlist(jobs)?\b/i], categories: ['build-log', 'metric', 'behind-scenes'] },
  { name: 'feeling', patterns: [/\b(feel|feeling|tired|exhausted|excited|frustrated|happy|stuck)\b/i], categories: ['observation', 'lesson'] },
  { name: 'feature', patterns: [/\b(feature|added|building|working on|building out)\b/i], categories: ['build-log', 'behind-scenes'] },
  { name: 'user-feedback', patterns: [/\b(user|customer|feedback|told me|said|complained|loved|hated|asked for)\b/i], categories: ['lesson', 'metric'] },
];

// Angle generators — for each detected category, here are the angle templates.
interface AngleTemplate {
  category: string;
  name: string;
  whyThisAngle: string;
  hookStructures: string[];
  examples: string[];
  sharperQuestions: string[];
  keywords: string[];
  watchOuts: string[];
}

const ANGLE_TEMPLATES: AngleTemplate[] = [
  {
    category: 'build-log',
    name: 'Ship Log',
    whyThisAngle: 'You shipped. Say so. People follow accounts where they can watch the work happen day by day.',
    hookStructures: [
      'Verb + what + tool/time (e.g. "Shipped [feature] in [time] using [tool]")',
      'Just-now phrasing ("Pushed X 5 minutes ago. Already [result/feeling]")',
      'Day-counter ("Day N of [product] — today\'s ship:")',
    ],
    examples: [
      'Pushed saved-search alerts to Hotlistjobs in 90 mins. Hard part was email deliverability, not the code.',
      'StashBox v0.4 live on Play Store. Dark mode + 2 bug fixes. Review took 26 hours this time, fastest yet.',
      'Day 47 of StashBox. Today\'s ship: pull-to-refresh on the saved screen. Should have been there from v0.1.',
    ],
    sharperQuestions: [
      'What specifically broke first when you tried it?',
      'What did you cut to ship today vs leave for v2?',
      'What would you tell yourself before starting this?',
    ],
    keywords: ['shipped', 'pushed', 'live', 'just ran', 'in production'],
    watchOuts: [
      'Don\'t describe vaguely. Name the actual feature.',
      'A screenshot doubles engagement on ship logs.',
    ],
  },
  {
    category: 'build-log',
    name: 'Debugging Story',
    whyThisAngle: 'Bug stories work on dev X. A specific bug with a specific fix is the kind of post people screenshot and reply to.',
    hookStructures: [
      'Time-lost framing ("Spent N hours on X. Turned out Y")',
      'Plot twist ("Was sure it was X. It was Y")',
      'Confession ("Embarrassing bug I just shipped a fix for:")',
    ],
    examples: [
      'Spent 3 hours on a StashBox crash. Was sure it was Room migration. Turned out to be a null FileProvider URI on Android 14.',
      'Hotlistjobs was 404ing on 1 in 50 job pages. Stale Next.js ISR cache. Cleared it. Felt stupid.',
      'Spanish locale crashed StashBox on launch. Stray %s in a strings.xml entry. Crash log was 600 lines pointing at the wrong layer.',
    ],
    sharperQuestions: [
      'What was the WRONG first hypothesis you chased?',
      'Which line of code (or config) was actually the culprit?',
      'What would have caught this earlier?',
    ],
    keywords: ['bug', 'TIL', 'gotcha', 'turns out', 'culprit'],
    watchOuts: [
      'Be specific about the actual fix. Vague stories don\'t land.',
      'A code screenshot of the bad line next to the fix line lands hard.',
    ],
  },
  {
    category: 'ai-workflow',
    name: 'Workflow Reveal',
    whyThisAngle: 'AI workflow posts pull the most follows for indie builders right now. Show the actual prompt instead of describing it.',
    hookStructures: [
      'My-exact-X ("My exact Claude prompt for [task]:")',
      'Replaced-X-with-Y ("I stopped doing [thing]. Claude does it in [time] now")',
      'Setup-reveal ("This is my actual Claude Code setup:")',
    ],
    examples: [
      'My exact Claude prompt for adding a screen to StashBox: paste the closest existing screen, describe the diff in one sentence. Works 9/10 times.',
      'Stopped writing Room migrations by hand. Claude reads the entity, diffs the schema, drops the migration. 30 seconds per change.',
      'My CLAUDE.md for Hotlistjobs is 40 lines. 11 rewrites in. The biggest unlock was the "never use any" line.',
    ],
    sharperQuestions: [
      'What\'s the one prompt/pattern that does most of the work?',
      'What did you try before that didn\'t work?',
      'How much time/money does this save you per week?',
    ],
    keywords: ['Claude', 'prompt', 'workflow', 'replaced', 'use this'],
    watchOuts: [
      'Don\'t generalize. Paste the actual prompt or config.',
      'A screenshot of the Claude convo makes it land harder.',
    ],
  },
  {
    category: 'ai-workflow',
    name: 'Tool Comparison',
    whyThisAngle: 'You ran two tools at the same job. That\'s a post. Name the job, name the winner, name what surprised you.',
    hookStructures: [
      'A-vs-B-for-X ("Tried [A] vs [B] for [task]. Result:")',
      'When-to-use ("Use [tool] for X. Use [other] for Y.")',
      'Switched-from ("Switched from [A] to [B] last week. Here\'s the diff:")',
    ],
    examples: [
      'Tried Cursor and Claude Code on the same Hotlistjobs refactor. Cursor started faster. Claude finished.',
      'Switched from one big system prompt to sub-agents on StashBox. The agent that only knows Room migrations is worth the setup time alone.',
      'Claude vs Cursor on TS files: Cursor for inline edits, Claude for 5+ file changes. I run both in the same project.',
    ],
    sharperQuestions: [
      'What specific task triggered the switch/comparison?',
      'What does the loser do better that surprised you?',
      'Would a beginner pick differently than you did?',
    ],
    keywords: ['vs', 'switched', 'better for', 'use case'],
    watchOuts: [
      'Tool wars get reach and pile-ons. Be specific, not tribal.',
    ],
  },
  {
    category: 'metric',
    name: 'Number Drop',
    whyThisAngle: 'Real numbers beat adjectives. 47 installs reads more honest than "growing fast". Small numbers count.',
    hookStructures: [
      'Bare-number ("[Product]: [N] [unit] today.")',
      'Delta ("From [X] to [Y] in [time]. Here\'s what changed:")',
      'Counter-intuitive ("Counter-intuitive: [action] led to [unexpected metric move]")',
    ],
    examples: [
      'StashBox: 47 installs this week. Up from 12 last week. The thing that moved it was a 30-second screen recording on TikTok.',
      'Hotlistjobs hit 200 candidate signups today. 9 weeks in. Slower than I wanted, faster than my last try.',
      'Week 9 of Hotlistjobs: signup-to-application conversion is 31%. I\'d take 31% on almost anything.',
    ],
    sharperQuestions: [
      'What action immediately preceded this number?',
      'Is this a vanity metric or did revenue/retention move?',
      'What\'s the one thing you\'d change about how you got here?',
    ],
    keywords: ['hit', 'crossed', 'from X to Y', 'this week'],
    watchOuts: [
      'Small numbers are fine. Vague numbers aren\'t. Be exact.',
      'Pair the metric with WHY in one sentence.',
    ],
  },
  {
    category: 'metric',
    name: 'Surprise Data',
    whyThisAngle: 'Data that surprised you is worth posting. Readers stop scrolling when their assumption gets contradicted.',
    hookStructures: [
      'Expected-vs-actual ("Expected X. Got Y. The reason:")',
      'Plot-twist-metric ("Looked at the data today. [Counter-intuitive finding]")',
      'Question-then-answer ("Thought I needed X. Data said Y.")',
    ],
    examples: [
      'Expected Hotlistjobs power users to be web devs. They\'re QA folks. 4 of my top-10 most active accounts.',
      'Thought StashBox D7 retention was dead. Pulled the numbers. D7 is 38%. I\'d been reading the wrong row.',
      'Counter-intuitive: more screenshots on the Play Store listing dropped install rate. The 4-image version beats the 8-image one.',
    ],
    sharperQuestions: [
      'What were you measuring and what surprised you?',
      'What action changed because of this?',
      'Does this generalize or is it specific to your product?',
    ],
    keywords: ['surprised', 'didn\'t expect', 'turns out', 'data shows'],
    watchOuts: [
      'Don\'t overclaim. Say "in my product", not "in general".',
    ],
  },
  {
    category: 'hot-take',
    name: 'Contrarian Take',
    whyThisAngle: 'Disagreeing publicly works if you have a concrete example behind it. Vague hot takes get ignored or piled on.',
    hookStructures: [
      'Unpopular-opinion ("Unpopular opinion: [claim]")',
      'Stop-doing ("Stop [common advice]. Do [counter] instead.")',
      'X-is-overrated ("[Thing] is overrated. [Other thing] is underrated. Here\'s why:")',
    ],
    examples: [
      'Stop polishing your landing page before you have 100 users. Mine looked terrible at 60 installs and still looks terrible at 200. Made no difference.',
      'Android-only in 2026 is underrated. Less noise, fewer indie competitors, ASO still works. The "iOS first" advice is from 2021.',
      'Hot take: code review is a higher-value AI workflow than code generation. Generation gets the demos. Review saves the hours.',
    ],
    sharperQuestions: [
      'What\'s the specific example from your work that proves your point?',
      'Where does the conventional wisdom come from? Why does it usually work?',
      'When does YOUR take stop being true?',
    ],
    keywords: ['unpopular', 'overrated', 'underrated', 'stop doing'],
    watchOuts: [
      'Acknowledge where you\'d be wrong. It adds credibility.',
      'Vague hot takes flop. Concrete contrarian wins.',
    ],
  },
  {
    category: 'observation',
    name: 'Niche Truth',
    whyThisAngle: 'Things only people inside your niche would notice. Insiders nod. Outsiders scroll past. The nods are the followers.',
    hookStructures: [
      'You-can-tell ("You can tell a builder is [adjective] when [specific detail]")',
      'Nobody-warns-you ("Nobody warns you that [specific X] when you start [Y]")',
      'N-month-mark ("The N-month mark of building hits differently because")',
    ],
    examples: [
      'You can tell an Android indie is solo when every release note says "bug fixes and improvements". Yes. Me.',
      'Nobody warns you that Play Store review for a 1-line fix takes the same 3 days as a major release. You learn to batch.',
      'The 6-week mark of an indie launch hits different. Early support is gone. Word of mouth hasn\'t started. You just ship.',
    ],
    sharperQuestions: [
      'What specific moment/scene captures this?',
      'Who needed to hear this 6 months ago?',
      'Why is this rarely said out loud?',
    ],
    keywords: ['nobody warns', 'real talk', 'small thing', 'noticed'],
    watchOuts: [
      'If it could apply to any field, it\'s too generic.',
    ],
  },
  {
    category: 'lesson',
    name: 'Hard-Won Lesson',
    whyThisAngle: 'Lessons tied to a real event in StashBox or Hotlistjobs land. Generic lessons read like LinkedIn.',
    hookStructures: [
      'After-N ("After [N users/months/launches], the biggest lesson is X")',
      'Wish-I-knew ("Wish I knew this before building [your product]:")',
      'Cost-of-not-knowing ("Not knowing X cost me [time/money]. Here it is for free:")',
    ],
    examples: [
      'After 200 signups on Hotlistjobs, biggest lesson: people don\'t read filters. Default wide. Let them narrow.',
      'Wish I knew this before StashBox: write the Play Store listing first. Forces you to know what the app is in 80 characters.',
      'Building Hotlistjobs changed how I think about onboarding. Every extra screen was my fault, not the user\'s.',
    ],
    sharperQuestions: [
      'What\'s the specific event that taught you this?',
      'Who told you the opposite (and was wrong)?',
      'How would you apply this in your next product?',
    ],
    keywords: ['lesson', 'wish I knew', 'learned', 'looking back'],
    watchOuts: [
      'Anchor to a specific event in StashBox or Hotlistjobs.',
      'Generic lessons get generic engagement.',
    ],
  },
  {
    category: 'question',
    name: 'Real Question',
    whyThisAngle: 'Real questions get real replies. Fake ones get scrolled. You can feel the difference reading them.',
    hookStructures: [
      'Devs-building-with ("Devs shipping with Claude — how do you [X]?")',
      'Poll-style ("A or B? [specific tradeoff]")',
      'Stuck-on ("Stuck on [specific problem]. How do you handle it?")',
    ],
    examples: [
      'Devs shipping Android with Claude: how do you keep large Room schemas in context? Mine keeps forgetting the relations.',
      'Anyone running a candidate-side job board: how do you keep listings fresh without scraping?',
      'Quick poll: do you write the Play Store listing before you build the app, or after? I\'ve done it both ways and "before" wins.',
    ],
    sharperQuestions: [
      'What\'s the specific decision you\'re actually making?',
      'What are the 2-3 options you\'re weighing?',
      'What would change if you got the answer?',
    ],
    keywords: ['how do you', 'what do you use', 'A or B'],
    watchOuts: [
      'Don\'t fake-ask. Readers can tell. Only post if you genuinely want input.',
    ],
  },
  {
    category: 'behind-scenes',
    name: 'Show, Don\'t Tell',
    whyThisAngle: 'A screenshot of your actual setup beats an essay describing it. Every time.',
    hookStructures: [
      'My-actual-X ("My actual [setup/folder/dashboard] for [product]:")',
      'Show-me-yours ("Here\'s my stack. Show me yours.")',
      'Cost-breakdown ("$X/month to run [product]. Here\'s what I pay for:")',
    ],
    examples: [
      'My actual StashBox folder. 4 Gradle modules. 1 does 80% of the work. The other 3 are aspirational.',
      '$23/month to run Hotlistjobs. Vercel free, Neon free, Resend $20, domain $3. That\'s the entire stack.',
      'My Claude Code sub-agents folder for StashBox. 4 agents. Each one is dumb on its own. Together they\'re the whole pipeline.',
    ],
    sharperQuestions: [
      'What screenshot tells the story without explaining?',
      'What part of your setup would surprise someone?',
      'What did you replace recently and why?',
    ],
    keywords: ['my setup', 'my stack', 'screenshot', 'here\'s mine'],
    watchOuts: [
      'Always include the image. Text-only BTS posts underperform.',
    ],
  },
];

const GENERAL_TIPS_POOL = [
  'Lead with the specific. Generic = no engagement.',
  'One thought per tweet. Split if it has "and".',
  'First 7 words decide if anyone reads the rest.',
  'Pair the post with a screenshot when you can.',
  'Numbers beat adjectives. "Lost 3 hours" beats "wasted time".',
  'Cut the first sentence. It\'s usually warmup.',
  'Avoid emoji-heavy openers. Reads as AI or marketing.',
  'No hashtags. They tank reach on X.',
];

const REPLY_TIPS_POOL = [
  'Add one specific detail OP doesn\'t have. That\'s the whole game.',
  'Reply within 30 min of OP posting for max visibility.',
  'Don\'t start with "Great post!". Readers skip these.',
  'A question is a stronger reply than agreement.',
  'Replies under 200 chars get read. Over 280, skimmed.',
  'Quote-tweet only if you have a real addition. Otherwise reply.',
];

export function refineIdea(rawInput: string, mode: IdeaMode): RefinerResult {
  const text = rawInput.trim();
  if (!text) {
    return { detectedSignals: [], detectedCategories: [], wordCount: 0, angles: [], generalTips: [] };
  }

  // 1. Detect signals
  const detectedSignals: string[] = [];
  const categoryScores: Record<string, number> = {};

  for (const sig of SIGNALS) {
    if (sig.patterns.some(p => p.test(text))) {
      detectedSignals.push(sig.name);
      for (const cat of sig.categories) {
        categoryScores[cat] = (categoryScores[cat] || 0) + 1;
      }
    }
  }

  // 2. Pick top 3 categories (or fall back to defaults)
  let topCategories = Object.entries(categoryScores)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c]) => c);

  if (topCategories.length === 0) {
    // Default fallback — give them a mix
    topCategories = ['build-log', 'observation', 'lesson'];
  } else if (topCategories.length < 3) {
    // Pad with a complementary category
    const padOptions = ['observation', 'lesson', 'hot-take', 'behind-scenes'].filter(c => !topCategories.includes(c));
    while (topCategories.length < 3 && padOptions.length > 0) {
      topCategories.push(padOptions.shift()!);
    }
  }

  // 3. For each category, pick the best angle template (rotate when multiple per category)
  const usedTemplates = new Set<string>();
  const angles: RefinedAngle[] = [];

  for (const cat of topCategories) {
    const candidates = ANGLE_TEMPLATES.filter(t => t.category === cat && !usedTemplates.has(t.name));
    if (candidates.length === 0) continue;

    // Prefer templates whose keywords overlap with detected signals
    const ranked = candidates
      .map(t => {
        const overlap = t.keywords.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
        return { t, overlap };
      })
      .sort((a, b) => b.overlap - a.overlap);

    const chosen = ranked[0].t;
    usedTemplates.add(chosen.name);
    angles.push({
      name: chosen.name,
      category: chosen.category,
      whyThisAngle: chosen.whyThisAngle,
      hookStructures: chosen.hookStructures,
      examples: chosen.examples,
      sharperQuestions: chosen.sharperQuestions,
      keywords: chosen.keywords,
      watchOuts: chosen.watchOuts,
    });
  }

  // 4. Pick 3 general tips (rotate by input length for some variety)
  const tipPool = mode === 'reply' ? REPLY_TIPS_POOL : GENERAL_TIPS_POOL;
  const seed = text.length;
  const tips: string[] = [];
  for (let i = 0; i < 3 && i < tipPool.length; i++) {
    tips.push(tipPool[(seed + i * 3) % tipPool.length]);
  }

  return {
    detectedSignals,
    detectedCategories: topCategories,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    angles,
    generalTips: tips,
  };
}

export const CATEGORY_LABELS: Record<string, string> = {
  'build-log': 'Build Log',
  'ai-workflow': 'AI Workflow',
  'metric': 'Metric',
  'hot-take': 'Hot Take',
  'question': 'Question',
  'behind-scenes': 'Behind The Scenes',
  'observation': 'Observation',
  'lesson': 'Lesson',
};
