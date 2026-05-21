// The "brain" — content pools for daily rotation.
// You write the actual tweets. These give you angles, hooks, and keywords.

export type IdeaCategory =
  | 'build-log'
  | 'ai-workflow'
  | 'metric'
  | 'hot-take'
  | 'question'
  | 'behind-scenes'
  | 'observation'
  | 'lesson';

export interface PostIdea {
  category: IdeaCategory;
  angle: string;
  hookFormulas: string[]; // structures, not full tweets
  examples: string[]; // concrete tweet examples in your voice
  keywords: string[];
  examplePrompt: string; // a question to spark your thinking
}

export const POST_IDEAS: PostIdea[] = [
  // BUILD LOG
  {
    category: 'build-log',
    angle: 'Ship something today, even tiny',
    hookFormulas: [
      'Number + what you did + tool used',
      'Before / After contrast',
      'Time taken + result',
    ],
    examples: [
      'Pushed pull-to-refresh to StashBox. 8 lines. Should have been there from v0.1.',
      'Shipped a 2-line copy fix on Hotlistjobs. Signup conversion notched up the next day. Probably noise. Probably not.',
      'Day 47 of StashBox. Today\'s ship: empty-state illustration on the saved screen.',
    ],
    keywords: ['shipped', 'pushed', 'live', 'StashBox', 'Hotlistjobs', 'today'],
    examplePrompt: 'What did you ship/fix/change in your products in the last 24h?',
  },
  {
    category: 'build-log',
    angle: 'Show a bug you hit and how you fixed it',
    hookFormulas: [
      'Spent X hours on Y bug. Turned out to be Z',
      'This took me embarrassingly long to figure out',
      'Plot twist debugging story',
    ],
    examples: [
      'Spent 3 hours on a StashBox crash. Was sure it was Room. It was a FileProvider URI on Android 14.',
      'Hotlistjobs was 404ing on 1 in 50 job pages. Stale Next.js ISR cache. Embarrassing.',
      'Spanish locale broke StashBox because I had a stray %s in strings.xml. The crash log was 600 lines pointing at the wrong layer.',
    ],
    keywords: ['bug', 'debugging', 'TIL', 'gotcha', 'wasted hours'],
    examplePrompt: 'What was the dumbest bug you hit recently?',
  },
  {
    category: 'build-log',
    angle: 'Show a feature being built (not finished)',
    hookFormulas: [
      'Working on X today — here\'s the rough cut',
      'WIP — feedback wanted',
      'Day N of building X',
    ],
    examples: [
      'Working on saved-search alerts for Hotlistjobs. UI is there, email is flaky. Tag in if you want to break it.',
      'WIP: StashBox home-screen widget. Looks like a Cosmo magazine cover right now. Feedback welcome.',
      'Day 3 of building filters on Hotlistjobs. Got the chips wrong twice. Third try ships tonight.',
    ],
    keywords: ['WIP', 'building', 'next feature', 'shipping soon'],
    examplePrompt: 'What feature is half-built on your machine right now?',
  },

  // AI WORKFLOW
  {
    category: 'ai-workflow',
    angle: 'A specific Claude prompt or pattern you use',
    hookFormulas: [
      'My favorite Claude prompt for X is...',
      'I stopped doing X manually. Now Claude does it in N seconds',
      'This prompt saved me Y hours this week',
    ],
    examples: [
      'My favorite Claude prompt for StashBox: paste the closest existing screen, describe the diff in one sentence. 9 out of 10 times it nails it.',
      'I stopped writing release notes. Claude reads the diff and drafts them. I edit the tone. 5 mins instead of 30.',
      'This prompt saved me 4 hours this week: "find the cheapest test that would have caught this bug".',
    ],
    keywords: ['Claude', 'prompt', 'workflow', 'system prompt', 'sub-agent'],
    examplePrompt: 'What prompt or Claude pattern did you use today that worked well?',
  },
  {
    category: 'ai-workflow',
    angle: 'Tool comparison — Claude vs X for a specific task',
    hookFormulas: [
      'Tested A vs B for [task]. Result:',
      'Switched from X to Claude for Y because Z',
      'A does X better. B does Y better. Here\'s when I use which',
    ],
    examples: [
      'Tested Cursor vs Claude Code on the same Hotlistjobs refactor. Cursor started faster. Claude finished.',
      'Switched from one big system prompt to sub-agents on StashBox. The Room migrations agent alone is worth it.',
      'Claude vs Cursor for inline TS edits: Cursor. For 5+ file changes: Claude. Same project. Both running.',
    ],
    keywords: ['compared', 'switched', 'use case', 'better for'],
    examplePrompt: 'What AI tool task did you compare recently?',
  },
  {
    category: 'ai-workflow',
    angle: 'Mistake you made using AI and what you learned',
    hookFormulas: [
      'I trusted Claude on X. Big mistake. Now I do Y',
      'AI generated [thing]. I shipped it. It broke. Lesson:',
      'Stop letting AI do X without Y',
    ],
    examples: [
      'Trusted Claude on a Room migration. Shipped. App crashed on update for users below v0.3. Hotfix went out 4 hours later.',
      'AI generated a regex for parsing salary strings on Hotlistjobs. Matched "$10 per hour" as $10k. Caught it in QA. Barely.',
      'Stop letting Claude name your variables without checking. I had "usrPrf" and "userProfile" next to each other for a week.',
    ],
    keywords: ['mistake', 'lesson', 'don\'t do this', 'guardrail'],
    examplePrompt: 'When did AI mess you up and how did you adjust?',
  },

  // METRIC
  {
    category: 'metric',
    angle: 'Real number from your products',
    hookFormulas: [
      'StashBox today: N installs / N active / N retention',
      'Hotlistjobs MRR / signups / DAU number',
      'Week N progress: from X to Y',
    ],
    examples: [
      'StashBox today: 47 weekly installs. Up from 12. Real measure of: was the TikTok worth it. Yes.',
      'Hotlistjobs: 200 candidate signups. 9 weeks in. ~22/week. Boring number. Compounding.',
      'Week 9 of Hotlistjobs: signup-to-application conversion is 31%. I\'d take 31% on almost anything.',
    ],
    keywords: ['MRR', 'installs', 'signups', 'DAU', 'metric', 'today'],
    examplePrompt: 'What is one real number from your products this week?',
  },
  {
    category: 'metric',
    angle: 'Number that surprised you',
    hookFormulas: [
      'I expected X. Got Y. Reason was Z',
      'Counter-intuitive: more X led to less Y',
      'Biggest surprise from looking at data this week',
    ],
    examples: [
      'Expected Hotlistjobs power users to be web devs. Top 10 most active = 4 QA folks. Adjusting filters accordingly.',
      'Thought StashBox D7 retention was dead. Pulled the numbers. 38%. I\'d been reading D1 by mistake.',
      'Counter-intuitive: more screenshots on the Play Store listing dropped install rate. The 4-image version beats 8.',
    ],
    keywords: ['surprised', 'data', 'analytics', 'didn\'t expect'],
    examplePrompt: 'What metric surprised you recently?',
  },

  // HOT TAKE
  {
    category: 'hot-take',
    angle: 'Disagree with common indie hacker advice',
    hookFormulas: [
      'Unpopular opinion:',
      'Everyone says X. I disagree. Here\'s why:',
      'X is overrated. Y is underrated.',
    ],
    examples: [
      'Stop polishing your landing page before you have 100 users. Mine looks terrible at 200 installs. Doesn\'t matter.',
      'Solo on Android in 2026 is underrated. The "iOS first" advice is from 2021.',
      'Twitter is overrated for your first 500 followers if you don\'t already have a niche. Reddit is underrated.',
    ],
    keywords: ['unpopular', 'disagree', 'overrated', 'underrated'],
    examplePrompt: 'What "rule" of building have you broken and benefitted from?',
  },
  {
    category: 'hot-take',
    angle: 'Take on AI / Claude / dev landscape',
    hookFormulas: [
      'The thing nobody is talking about in AI right now',
      'Hot take: [tool/trend] is/isn\'t the future',
      'In 6 months, [prediction]',
    ],
    examples: [
      'The thing nobody is talking about in AI tooling: how much your CLAUDE.md actually shapes the output. Way more than people admit.',
      'In 6 months, sub-agents will be the default mental model, not a power-user thing.',
      'Hot take: code review is a higher-value AI workflow than code generation. Generation gets the demos. Review saves the hours.',
    ],
    keywords: ['take', 'prediction', 'trend', 'future of'],
    examplePrompt: 'What is one prediction you have about AI tooling in 6 months?',
  },

  // QUESTION
  {
    category: 'question',
    angle: 'Specific question your audience can answer',
    hookFormulas: [
      'Devs building with AI — how do you handle X?',
      'What\'s your go-to for Y?',
      'Quick poll: A or B?',
    ],
    examples: [
      'Devs shipping Android with Claude: how do you keep large Room schemas in context? Mine keeps forgetting the relations.',
      'Quick poll: do you write the Play Store listing before you build the app, or after?',
      'What\'s your go-to for catching regex bugs that pass tests but break in production? I keep getting bitten.',
    ],
    keywords: ['question', 'poll', 'how do you', 'what do you use'],
    examplePrompt: 'What is one thing about building you genuinely want crowdsourced answers on?',
  },

  // BEHIND THE SCENES
  {
    category: 'behind-scenes',
    angle: 'Screenshot of code / Claude convo / dashboard',
    hookFormulas: [
      'My Claude.md file looks like this:',
      'This is my actual [setup/dashboard/folder]',
      'Show me yours — here\'s mine',
    ],
    examples: [
      'My CLAUDE.md for StashBox. Updated this week. Curious what people are pruning.',
      'My actual Hotlistjobs admin dashboard at 200 users. Nothing fancy. SQL plus a 1990s-looking layout.',
      'Show me yours. Here\'s my Claude Code sub-agents folder for StashBox.',
    ],
    keywords: ['screenshot', 'setup', 'my workflow', 'show me yours'],
    examplePrompt: 'What screenshot from your workflow today is share-worthy?',
  },
  {
    category: 'behind-scenes',
    angle: 'Stack or tools breakdown',
    hookFormulas: [
      'The stack for [product]:',
      '$X/month — here\'s what I pay for',
      'My exact toolkit for shipping with AI',
    ],
    examples: [
      '$23/month to run Hotlistjobs. Vercel free, Neon free, Resend $20, domain $3. That\'s it.',
      'The StashBox stack: Kotlin, Compose, Room, Hilt, Firebase Crashlytics. 1 module does 80% of the work.',
      'My exact toolkit for shipping with Claude: Claude Code, 4 sub-agents, a CLAUDE.md refactored 11 times.',
    ],
    keywords: ['stack', 'tools', 'subscription', 'toolkit'],
    examplePrompt: 'What tools/services power StashBox or Hotlistjobs that people would want to know?',
  },

  // OBSERVATION (reply-bait, niche-true)
  {
    category: 'observation',
    angle: 'Something specific only builders notice',
    hookFormulas: [
      'You can tell a [thing] is [adjective] when [specific detail]',
      'Nobody warns you about X when you start Y',
      'The N-month mark hits different because',
    ],
    examples: [
      'You can tell an Android indie is solo when every version says "bug fixes". Yes. Me.',
      'Nobody warns you that Play Store review for a 1-line fix takes the same 3 days as a major release.',
      'The 6-week mark of an indie launch hits different. Early support is gone. Word of mouth hasn\'t started. You just ship.',
    ],
    keywords: ['notice', 'nobody warns', 'small detail', 'real talk'],
    examplePrompt: 'What small truth about building have you noticed that few talk about?',
  },

  // LESSON
  {
    category: 'lesson',
    angle: 'Concrete lesson from building products',
    hookFormulas: [
      'After N users on StashBox/Hotlistjobs, the biggest lesson is X',
      'I wish I knew X when I started Y',
      'Building changed how I think about Z',
    ],
    examples: [
      'After 200 signups on Hotlistjobs: people don\'t read filters. Default wide. Let them narrow.',
      'I wish I knew this when starting StashBox: write the Play Store listing first. Forces clarity in 80 characters.',
      'Building Hotlistjobs changed how I think about onboarding. Every extra screen was my fault, not the user\'s.',
    ],
    keywords: ['lesson', 'learned', 'looking back', 'wish I knew'],
    examplePrompt: 'What lesson would you tell yourself 3 months ago?',
  },
];

// REPLY ANGLES — for the reply helper
export interface ReplyAngle {
  name: string;
  when: string;
  approach: string;
  keywords: string[];
}

export const REPLY_ANGLES: ReplyAngle[] = [
  {
    name: 'Agree + Add Specific Data',
    when: 'OP makes a general claim you agree with',
    approach: 'Confirm with a concrete number, story, or example from your own building. Adds credibility, drives profile clicks.',
    keywords: ['same here', 'data point', 'in my case', 'specifically'],
  },
  {
    name: 'Polite Disagree + Counter-Example',
    when: 'OP says something common that has exceptions',
    approach: 'Acknowledge their point, then share the exception you\'ve seen. Don\'t be combative — be additive.',
    keywords: ['caveat', 'edge case', 'one nuance', 'in my experience'],
  },
  {
    name: 'Ask the Sharper Question',
    when: 'OP\'s post raises an implicit question they didn\'t answer',
    approach: 'Don\'t answer. Ask the better question their post hinted at. Forces them (and readers) to think.',
    keywords: ['curious', 'follow-up', 'what about', 'how do you handle'],
  },
  {
    name: 'Joke / Pattern Match',
    when: 'The tweet is light or relatable',
    approach: 'A short witty reply riffing on the same theme. No effort to be clever — be observational.',
    keywords: ['mood', 'same energy', 'lol'],
  },
  {
    name: 'Build-in-Public Tie-In',
    when: 'OP\'s topic overlaps with something you\'re shipping',
    approach: 'Quick "I just hit this with [your product]" + one specific detail. Subtle plug, not spammy.',
    keywords: ['ran into this', 'last week with StashBox', 'shipping this'],
  },
  {
    name: 'Tool/Workflow Share',
    when: 'OP is asking for advice or describing a problem',
    approach: 'Drop the specific tool/prompt/pattern you use. No fluff. Just the actionable thing.',
    keywords: ['I use', 'try this', 'works for me'],
  },
  {
    name: 'Reframe / Bigger Picture',
    when: 'OP is in the weeds; zooming out adds value',
    approach: 'Show the question behind the question. Useful for AI-tooling debates.',
    keywords: ['stepping back', 'real question is', 'bigger pattern'],
  },
  {
    name: 'Genuine Curiosity Question',
    when: 'OP has shared something interesting and specific',
    approach: 'Ask a question that shows you actually read it. Builds relationship with bigger accounts.',
    keywords: ['curious about', 'how did you', 'did X happen'],
  },
];

// THREAD TEMPLATES
export interface ThreadTemplate {
  type: string;
  structure: string[];
  bestFor: string;
  keywords: string[];
}

export const THREAD_TEMPLATES: ThreadTemplate[] = [
  {
    type: 'How I Built X with Claude',
    structure: [
      'Hook: result + time/cost (e.g. "I built [X] in [Y days] using Claude. Here\'s exactly how:")',
      'The problem you were solving',
      'The stack/tools you picked and why',
      'The Claude workflow (system prompt, sub-agents, MCP, etc.)',
      'One specific prompt or pattern that did the heavy lifting',
      'The dumbest mistake you made + fix',
      'Metric/outcome (real numbers if you have them)',
      'CTA — try it / link / DM me',
    ],
    bestFor: 'Showing a real shipped product. Highest viral potential.',
    keywords: ['how I built', 'breakdown', 'with Claude', 'in N days'],
  },
  {
    type: 'Lessons from N Months / Users',
    structure: [
      'Hook: "N months/users of [your product]. Here are N lessons I didn\'t expect:"',
      'Each lesson = 1 tweet. Specific, not generic',
      'Include at least 1 mistake, 1 win, 1 surprise',
      'End with what you\'re doing next',
    ],
    bestFor: 'Reflection moments — works well on month-end',
    keywords: ['lessons', 'months in', 'looking back'],
  },
  {
    type: 'Tool / Workflow Breakdown',
    structure: [
      'Hook: "My exact [workflow/stack/setup] for [outcome]. Stealing welcome:"',
      'List the tools — one per tweet, with WHY each one',
      'Show how they connect (screenshot helps)',
      'Cost breakdown',
      'What you replaced and why',
      'CTA — share your stack',
    ],
    bestFor: 'High-save thread. Drives followers from saves.',
    keywords: ['my stack', 'workflow', 'toolkit', 'setup'],
  },
  {
    type: 'Anti-Advice Thread',
    structure: [
      'Hook: "Everyone tells builders to do X. Here\'s what to do instead:"',
      'Each tweet: common advice → why it\'s wrong/incomplete → what to do',
      'Use real examples from your products',
      'End with the meta-lesson',
    ],
    bestFor: 'Hot-take threads — divisive, drives engagement',
    keywords: ['stop doing', 'instead of', 'unpopular'],
  },
  {
    type: 'Teardown / Case Study',
    structure: [
      'Hook: "I broke down [product/tweet/feature]. Here\'s what they\'re doing right:"',
      'Each tweet = 1 specific element + why it works',
      'Add screenshots',
      'End with what you\'re stealing for your own work',
    ],
    bestFor: 'Showing taste + analytical thinking. Builds authority.',
    keywords: ['teardown', 'broke down', 'analyzed'],
  },
  {
    type: 'Mistake Postmortem',
    structure: [
      'Hook: "I [made mistake]. It cost me [time/money/users]. Here\'s what happened:"',
      'Timeline — what you did',
      'Where it broke',
      'How you found out',
      'The fix',
      'What you do differently now',
    ],
    bestFor: 'Vulnerability builds trust + virality',
    keywords: ['mistake', 'broke', 'lost', 'cost me'],
  },
];
