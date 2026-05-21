// Refiner engine — analyzes a rough idea/thought and returns angles to write from.
// Rule-based: keyword detection + token extraction + angle templates.
// No AI, no API calls. Fast, private, free.

import { humanize, type HumanizeReport } from './humanize';

export type IdeaMode = 'post' | 'reply';

export interface ExtractedTokens {
  verb?: string;
  product?: string;
  tool?: string;
  time?: string;
  number?: string;
  unit?: string;
  noun?: string;
}

export interface RefinedAngle {
  name: string;
  category: string;
  whyThisAngle: string;
  whyPicked: string;
  hookStructures: string[];
  draftScaffolds: string[];
  examples: string[];
  sharperQuestions: string[];
  keywords: string[];
  watchOuts: string[];
}

export interface RefinerResult {
  detectedSignals: string[];
  detectedCategories: string[];
  wordCount: number;
  angles: RefinedAngle[]; // [0] is the primary
  generalTips: string[];
  extracted: ExtractedTokens;
  humanizeReport: HumanizeReport;
}

interface Signal {
  name: string;
  patterns: RegExp[];
  categories: string[];
}

const SIGNALS: Signal[] = [
  { name: 'shipping', patterns: [/\b(ship|shipped|launch|launched|pushed|deployed|live|released)\b/i], categories: ['build-log', 'metric'] },
  { name: 'bug', patterns: [/\b(bug|broke|broken|crash|error|fix|fixed|debug|debugging)\b/i], categories: ['build-log', 'lesson'] },
  { name: 'metric', patterns: [/\b(\d+\s*(users?|signups?|installs?|mrr|revenue|dau|mau|downloads?|views?))|users? jumped|crossed \d/i], categories: ['metric', 'build-log'] },
  { name: 'claude-tool', patterns: [/\b(claude|cursor|copilot|chatgpt|gpt|cline|aider|mcp|sub.?agent|prompt|ai|llm|agent|model)\b/i], categories: ['ai-workflow', 'lesson'] },
  { name: 'lesson', patterns: [/\b(learn|learned|lesson|realized|figured out|wish i knew|looking back|in hindsight|takeaway)\b/i], categories: ['lesson', 'observation'] },
  { name: 'mistake', patterns: [/\b(mistake|wrong|mess(ed)? up|screw(ed)? up|regret|should(n.t)? have|cost me|burned)\b/i], categories: ['lesson', 'build-log'] },
  { name: 'opinion', patterns: [/\b(think|believe|opinion|hot take|imo|imho|disagree|wrong|overrated|underrated|prediction|nobody talks)\b/i], categories: ['hot-take', 'observation'] },
  { name: 'question', patterns: [/\?$|\b(how do you|what do you|anyone else|am i the only|should i|a or b|or should|picking between|stuck between|trying to decide)\b/i], categories: ['question', 'hot-take'] },
  { name: 'surprise', patterns: [/\b(surprised|surprising|didn.t expect|unexpected|weird|strange|counter.?intuitive|huh)\b/i], categories: ['observation', 'metric'] },
  { name: 'comparison', patterns: [/\b(vs|versus|compared|better than|worse than|switched from|replaced|moved from)\b/i], categories: ['ai-workflow', 'hot-take'] },
  { name: 'workflow', patterns: [/\b(workflow|setup|stack|process|use(d)?|tool|toolkit|pipeline|claude\.?md)\b/i], categories: ['ai-workflow', 'behind-scenes'] },
  { name: 'time', patterns: [/\b(\d+\s*(hours?|days?|weeks?|months?|minutes?|mins?))|in (a day|an hour|minutes)|\b(today|yesterday|tonight|this morning|this week|last week|this month)\b/i], categories: ['build-log', 'metric'] },
  { name: 'product-stashbox', patterns: [/\bstashbox\b/i], categories: ['build-log', 'metric', 'behind-scenes'] },
  { name: 'product-hotlist', patterns: [/\bhotlist(jobs)?\b/i], categories: ['build-log', 'metric', 'behind-scenes'] },
  { name: 'feeling', patterns: [/\b(feel|feeling|tired|exhausted|excited|frustrated|happy|stuck|noticing|noticed|wondering|curious)\b/i], categories: ['observation', 'lesson'] },
  { name: 'feature', patterns: [/\b(feature|added|building|working on|building out|implementing|prototyping)\b/i], categories: ['build-log', 'behind-scenes'] },
  { name: 'user-feedback', patterns: [/\b(user|customer|feedback|told me|said|complained|loved|hated|asked for|requested)\b/i], categories: ['lesson', 'metric'] },
  { name: 'money', patterns: [/\$\s?\d|\b\d+\s*(dollars?|bucks|mrr|arr|revenue|month|monthly)\b|\bbill\b|\bcost\b/i], categories: ['behind-scenes', 'metric'] },
  { name: 'platform', patterns: [/\b(play store|app store|android|ios|google play|apk|aab|asml?|review|reviewer)\b/i], categories: ['build-log', 'behind-scenes'] },
];

interface AngleTemplate {
  category: string;
  name: string;
  whyThisAngle: string;
  hookStructures: string[];
  scaffolds: string[]; // template strings with ${verb} ${product} ${tool} ${time} ${number} ${unit} ${noun}
  examples: string[];
  sharperQuestions: string[];
  keywords: string[];
  watchOuts: string[];
}

const POST_ANGLE_TEMPLATES: AngleTemplate[] = [
  {
    category: 'build-log',
    name: 'Ship Log',
    whyThisAngle: 'You shipped. Say so. People follow accounts where they can watch the work happen day by day.',
    hookStructures: [
      'Verb + what + tool/time ("Shipped [feature] in [time] using [tool]")',
      'Just-now phrasing ("Pushed X 5 minutes ago. Already [result/feeling]")',
      'Day-counter ("Day N of [product] — today\'s ship:")',
    ],
    scaffolds: [
      '${verb} ${noun} in ${time} using ${tool}. ${what was hard}.',
      '${verb} ${noun} to ${product} today. ${one specific thing}.',
      'Day N of ${product}. Today: ${verb} ${noun}. ${tiny detail}.',
    ],
    examples: [
      'Pushed saved-search alerts to Hotlistjobs in 90 mins. Hard part was email deliverability, not the code.',
      'StashBox v0.4 live on Play Store. Dark mode + 2 bug fixes. Review took 26 hours this time, fastest yet.',
      'Day 47 of StashBox. Today: pull-to-refresh on the saved screen. Should have been there from v0.1.',
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
    scaffolds: [
      'Spent ${time} on ${noun} in ${product}. Turned out: ${actual cause}.',
      'Was sure ${noun} was ${wrong hypothesis}. It was ${actual cause}.',
      'Bug I just fixed in ${product}: ${one sentence}. The fix: ${one sentence}.',
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
    scaffolds: [
      'My exact ${tool} prompt for ${noun} in ${product}: ${prompt text}.',
      'Stopped doing ${noun} by hand. ${tool} does it in ${time}.',
      'My ${tool} setup for ${product}: ${one sentence about it}.',
    ],
    examples: [
      'My exact Claude prompt for adding a screen to StashBox: paste the closest existing screen, describe the diff in one sentence. Works 9/10 times.',
      'Stopped writing Room migrations by hand. Claude reads the entity, diffs the schema, drops the migration. 30 seconds per change.',
      'My CLAUDE.md for Hotlistjobs is 40 lines. 11 rewrites in. The biggest unlock was the "never use any" line.',
    ],
    sharperQuestions: [
      'What\'s the one prompt or pattern that does most of the work?',
      'What did you try before that didn\'t work?',
      'How much time or money does this save you per week?',
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
    scaffolds: [
      'Tried ${tool} vs ${other tool} on ${noun} in ${product}. ${result in one line}.',
      'Switched from ${old} to ${tool}. ${specific thing that changed}.',
      'Use ${tool} for ${task A}. Use ${other} for ${task B}.',
    ],
    examples: [
      'Tried Cursor and Claude Code on the same Hotlistjobs refactor. Cursor started faster. Claude finished.',
      'Switched from one big system prompt to sub-agents on StashBox. The agent that only knows Room migrations is worth the setup time alone.',
      'Claude vs Cursor on TS files: Cursor for inline edits, Claude for 5+ file changes. I run both in the same project.',
    ],
    sharperQuestions: [
      'What specific task triggered the switch or comparison?',
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
    scaffolds: [
      '${product}: ${number} ${unit} ${time}. ${one sentence about why}.',
      'From ${old number} to ${number} ${unit} in ${time}. ${what changed}.',
      '${product} week N: ${number} ${unit}. ${one specific thing}.',
    ],
    examples: [
      'StashBox: 47 installs this week. Up from 12 last week. The thing that moved it was a 30-second screen recording on TikTok.',
      'Hotlistjobs hit 200 candidate signups today. 9 weeks in. Slower than I wanted, faster than my last try.',
      'Week 9 of Hotlistjobs: signup-to-application conversion is 31%. I\'d take 31% on almost anything.',
    ],
    sharperQuestions: [
      'What action immediately preceded this number?',
      'Is this a vanity metric or did revenue or retention move?',
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
    scaffolds: [
      'Expected ${expected} in ${product}. Got ${actual}. ${why}.',
      'Thought ${assumption}. Pulled the numbers: ${actual}.',
      'Counter-intuitive: ${specific action} moved ${unit} in ${product}.',
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
    scaffolds: [
      'Stop ${common advice}. ${what you do instead}. ${result from your product}.',
      'Unpopular opinion: ${claim}. Proof from ${product}: ${specific example}.',
      '${X} is overrated. ${Y} is underrated. ${why, in one line}.',
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
    scaffolds: [
      'You can tell ${type of person} is ${adj} when ${specific detail from your product}.',
      'Nobody warns you that ${specific thing} happens when you ${verb} ${noun}.',
      'The ${N}-month mark of ${what you\'re building} hits differently. ${one line}.',
    ],
    examples: [
      'You can tell an Android indie is solo when every release note says "bug fixes and improvements". Yes. Me.',
      'Nobody warns you that Play Store review for a 1-line fix takes the same 3 days as a major release. You learn to batch.',
      'The 6-week mark of an indie launch hits different. Early support is gone. Word of mouth hasn\'t started. You just ship.',
    ],
    sharperQuestions: [
      'What specific moment or scene captures this?',
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
    scaffolds: [
      'After ${number} ${unit} on ${product}, biggest lesson: ${one line}.',
      'Wish I knew this before ${product}: ${specific lesson}.',
      'Not knowing ${specific thing} cost me ${time or money} on ${product}. ${lesson}.',
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
    scaffolds: [
      'Devs using ${tool}: how do you handle ${specific problem in product}?',
      'Stuck on ${specific problem} in ${product}. ${what you tried}.',
      'A or B for ${product}: ${option A} or ${option B}? ${what tips the choice}.',
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
    scaffolds: [
      'My actual ${noun} for ${product}: ${one line description, screenshot in reply}.',
      'Here\'s my stack for ${product}: ${list 3-4 items}. Show me yours.',
      '$${number}/month to run ${product}. ${line items}.',
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
  {
    category: 'hot-take',
    name: 'Trend Prediction',
    whyThisAngle: 'Your read on where AI tooling is going. Specific timeframes get more replies than vague predictions.',
    hookStructures: [
      'In-N-months ("In 6 months, [specific prediction about tool/trend]")',
      'Nobody-talks ("Nobody talks about [trend]. They will in [timeframe].")',
      'Already-here ("[Trend] is already here. People just call it [old name].")',
    ],
    scaffolds: [
      'In ${time}, ${specific prediction}. ${what triggers it}.',
      'Nobody talks about ${specific thing}. They will in ${time}.',
      '${trend} is already here. People just call it ${old name}.',
    ],
    examples: [
      'In 6 months, sub-agents will be the default mental model. The "one giant system prompt" era is ending.',
      'Nobody talks about how much CLAUDE.md actually shapes output. The good prompts live in those files.',
      'AI coding is already commoditized. The moat is taste and judgment about what to ship.',
    ],
    sharperQuestions: [
      'What specific tool or pattern triggers this prediction?',
      'What would prove you wrong?',
      'Who already does this and is ahead of the curve?',
    ],
    keywords: ['prediction', 'in 6 months', 'trend', 'future', 'nobody talks'],
    watchOuts: [
      'Pick a date. "Soon" doesn\'t count.',
      'Acknowledge what you might get wrong.',
    ],
  },
  {
    category: 'observation',
    name: 'Quiet Pattern',
    whyThisAngle: 'Specific patterns you\'ve noticed in your own work, without making a big claim about them.',
    hookStructures: [
      'Noticed-that ("Noticed [specific pattern] in my [product/work]")',
      'Same-thing ("Same thing keeps happening: [pattern]")',
      'Quiet-rule ("Quiet rule of [domain]: [observation]")',
    ],
    scaffolds: [
      'Noticed in ${product}: ${specific pattern}.',
      'Same thing keeps happening on ${product}: ${pattern}.',
      'Quiet rule of ${domain}: ${observation}.',
    ],
    examples: [
      'Noticed that every Hotlistjobs feature I ship without a mobile-friendly equivalent gets used less. Candidates want parity across devices.',
      'Same thing keeps happening on StashBox: users open it, save 2-3 items, forget about it for a week, come back. The habit cycle is weekly, not daily.',
      'Quiet rule of indie Android: a 5MB binary feels professional. A 50MB one feels lazy. Nobody says it out loud.',
    ],
    sharperQuestions: [
      'Is this a pattern in your product or in the world?',
      'What would falsify this observation?',
      'How did you first notice it?',
    ],
    keywords: ['noticed', 'pattern', 'keeps happening', 'quiet rule'],
    watchOuts: [
      'Stay specific. "I\'ve noticed X" beats "users tend to Y".',
    ],
  },
  {
    category: 'lesson',
    name: 'Anti-Pattern',
    whyThisAngle: 'What NOT to do, framed from your own mistake. Stronger than "do X" advice because it has a scar.',
    hookStructures: [
      'Stop-doing ("Stop [common thing]. Here\'s what I do instead:")',
      'Cost-me ("This habit cost me [time/users/money]:")',
      'I-used-to ("I used to [X]. Then [bad thing] happened. Now I [Y].")',
    ],
    scaffolds: [
      'Stop ${common habit}. ${what I do instead in product}.',
      'This habit cost me ${time or users or money} on ${product}: ${habit}.',
      'I used to ${X} on ${product}. Then ${bad thing}. Now I ${Y}.',
    ],
    examples: [
      'Stop accepting Claude\'s first variable names. I had "usrPrf" and "userProfile" coexisting in StashBox for a week.',
      'I used to ship Hotlistjobs features without checking on mobile. Cost me a chunk of mobile retention before I caught it.',
      'Stop letting AI write your error messages. Mine all started sounding identical and users stopped reading them.',
    ],
    sharperQuestions: [
      'What was the specific incident that taught you this?',
      'How much did it cost in time, users, or money?',
      'What do you do now instead?',
    ],
    keywords: ['stop doing', 'used to', 'don\'t do', 'cost me'],
    watchOuts: [
      'Anchor the lesson to a real event you can describe in one sentence.',
    ],
  },
  {
    category: 'behind-scenes',
    name: 'Cost Reveal',
    whyThisAngle: 'Money breakdowns get saved. People want to know what running an indie product actually costs.',
    hookStructures: [
      'Monthly-cost ("$X/month to run [product]. Here\'s the line item:")',
      'Cost-per-user ("Costs me $X per active user. Sustainable until [N] users.")',
      'Bill-shock ("Got the [Vercel/Firebase/etc] bill today. [N] dollars.")',
    ],
    scaffolds: [
      '$${number}/month to run ${product} at ${number} ${unit}. ${line items}.',
      'Costs me $${number} per ${unit} on ${product}. Sustainable until ${number} ${unit}.',
      'Got the ${tool} bill today. ${number} dollars. ${why it went up}.',
    ],
    examples: [
      '$23/month to run Hotlistjobs at 200 signups. Vercel free, Neon free, Resend $20, domain $3.',
      'StashBox: $0/month to run. Firebase free tier, Play Store $25 one-time. The unfair advantage of mobile.',
      'Got the Resend bill today. Saved-search alerts pushed me past free tier. Worth it. Open rates went up too.',
    ],
    sharperQuestions: [
      'What line item would surprise people?',
      'What did you almost get charged for that you avoided?',
      'What\'s the cost per active user?',
    ],
    keywords: ['cost', 'monthly', 'bill', '$', 'per user'],
    watchOuts: [
      'Include the small line items. The $3 domain matters as much as the $20 saas.',
    ],
  },
  {
    category: 'question',
    name: 'Decision Help',
    whyThisAngle: 'Sharing the actual fork in the road and asking the timeline gets builders to weigh in fast.',
    hookStructures: [
      'A-or-B ("A or B for [specific decision]? Tradeoffs are [X] vs [Y].")',
      'Stuck-between ("Stuck between [option A] and [option B] for [thing]. Where do you land?")',
      'Picking-now ("Picking [thing] this week. Want to hear what burned you.")',
    ],
    scaffolds: [
      'A or B for ${product}: ${option A} or ${option B}? ${tradeoff}.',
      'Stuck between ${option A} and ${option B} for ${noun} in ${product}. Where do you land?',
      'Picking ${noun} for ${product} ${time}. Want to hear what burned you.',
    ],
    examples: [
      'Picking between Room and SQLDelight for the next StashBox feature. Room\'s easier, SQLDelight scales better. Which would you regret less?',
      'Hotlistjobs: should saved searches be local-first or server-first? Going local-first feels right, server-first matches user expectations.',
      'A or B: ship the Android widget this week (90% done) or fix the Play Store listing first (revenue lever)?',
    ],
    sharperQuestions: [
      'What are the 2 options, in one sentence each?',
      'What does your gut say, and what makes you doubt it?',
      'What would change once you decide?',
    ],
    keywords: ['A or B', 'stuck between', 'picking', 'tradeoff'],
    watchOuts: [
      'Name the actual options. "Which framework?" gets nothing. "Room vs SQLDelight" gets answers.',
    ],
  },
];

// Reply-specific angles. These replace post angles when mode === 'reply'.
const REPLY_ANGLE_TEMPLATES: AngleTemplate[] = [
  {
    category: 'observation',
    name: 'Add A Detail',
    whyThisAngle: 'The reply that adds one concrete detail OP doesn\'t have is the one that gets the like-back and the follow.',
    hookStructures: [
      'Spec-add ("Adding to this: in my ${product}, ${specific detail}")',
      'Edge-case ("Edge case I hit on the same thing: ${detail}")',
      'Number-add ("In ${product}, this looked like: ${number} ${unit}")',
    ],
    scaffolds: [
      'Adding to this from ${product}: ${one specific detail you can give that OP can\'t}.',
      'Edge case I hit on the same: ${one sentence}.',
      'In ${product}, this looked like ${number} ${unit}. ${one sentence}.',
    ],
    examples: [
      'Adding from StashBox: this also breaks on Android 14 if you forget to add FOREGROUND_SERVICE_DATA_SYNC. Took me 2 hours to find.',
      'Edge case on the same: Play Store review for a 1-line patch still takes 3 days. Batch your fixes.',
      'In Hotlistjobs this looked like 9% open rate on the welcome email until I dropped a single image. Then 22%.',
    ],
    sharperQuestions: [
      'What\'s the one detail from your work that OP doesn\'t have?',
      'Is your detail a number, a story, or a name?',
      'Can you say it in 200 characters?',
    ],
    keywords: ['adding', 'edge case', 'in my', 'from'],
    watchOuts: [
      'No "great post". Lead with the detail.',
      'Under 200 chars reads. Over 280 gets skimmed.',
    ],
  },
  {
    category: 'metric',
    name: 'Counter With A Number',
    whyThisAngle: 'A reply with a number from your own product is the highest-density way to be useful in a thread.',
    hookStructures: [
      'Tried-it ("Tried this. ${number} ${unit} result.")',
      'My-version ("My version: ${number} ${unit} on ${product}")',
      'Order-of-magnitude ("Order of magnitude off. We saw ${number} ${unit}.")',
    ],
    scaffolds: [
      'Tried this on ${product}. ${number} ${unit}. ${one line}.',
      'My version: ${number} ${unit} on ${product}. ${one line about why}.',
      'In ${product} we saw ${number} ${unit} for the same setup. ${one sentence}.',
    ],
    examples: [
      'Tried this on StashBox. 47 installs in week 1. The hook was a 30s screen recording, not the landing page.',
      'My version: $23/month all-in for Hotlistjobs at 200 signups. Resend is the only line item that scales.',
      'In Hotlistjobs we saw 31% signup-to-application. Default-wide filters did most of the work.',
    ],
    sharperQuestions: [
      'What number from your product can you drop?',
      'Does the number confirm or contradict OP?',
      'Can you name the action behind the number?',
    ],
    keywords: ['tried', 'my version', 'we saw', 'number'],
    watchOuts: [
      'Numbers without context flop. Pair with one sentence of why.',
    ],
  },
  {
    category: 'question',
    name: 'Sharper Question',
    whyThisAngle: 'The next-layer question that OP didn\'t ask. Pulls the thread forward, often gets pinned by OP.',
    hookStructures: [
      'Next-layer ("Behind this: ${deeper question}")',
      'What-about ("What about ${edge case} though?")',
      'Two-options ("How do you choose between ${A} and ${B} here?")',
    ],
    scaffolds: [
      'Genuine question on top of this: ${one deeper question}.',
      'What about ${edge case from your product}? Have you hit that?',
      'How do you choose between ${A} and ${B} in this setup?',
    ],
    examples: [
      'Genuine question on top: when the prompt is 40 lines, do you still trust the model to read all of it? I get drift after line 25.',
      'What about Android 14 and FileProvider URIs? Same idea broke for me there.',
      'How do you choose between Room and SQLDelight at the stage you\'re at? I keep flipping.',
    ],
    sharperQuestions: [
      'What did OP\'s post leave unanswered?',
      'Is your question a thing you actually want to know?',
      'Does it open a useful sub-thread?',
    ],
    keywords: ['question', 'what about', 'how do you', 'behind this'],
    watchOuts: [
      'Don\'t fake-ask. Readers and OP can tell.',
      'One question, not three.',
    ],
  },
  {
    category: 'lesson',
    name: 'Receipt / Changed My Mind',
    whyThisAngle: 'Public agreement with a specific reason behind it. Or "I used to think the same. Here\'s what changed."',
    hookStructures: [
      'Had-the-same ("Had the same take 6 months ago. What changed: ${X}")',
      'Receipt ("Same. Here\'s the receipt from ${product}: ${detail}")',
      'Now-I-think ("Used to think this. Now I think ${Y}. The data: ${detail}")',
    ],
    scaffolds: [
      'Had the same take ${time} ago. What changed: ${one specific event in product}.',
      'Same. Receipt from ${product}: ${one line with a number or detail}.',
      'Used to think ${X}. Now I think ${Y} because ${specific from product}.',
    ],
    examples: [
      'Had the same take 6 months ago on StashBox. What changed: 80% of my retention came from the screen I almost cut. Stopped trimming.',
      'Same. Receipt from Hotlistjobs: 200 signups, 0 from a polished landing page. Came from one TikTok and one Reddit comment.',
      'Used to think iOS-first was the move. Now I think Android-first for indie tooling. ASO still works there.',
    ],
    sharperQuestions: [
      'Is the agreement specific or generic?',
      'What event in your work made you flip?',
      'Can you name the date or product version?',
    ],
    keywords: ['had the same', 'receipt', 'used to think', 'now I think'],
    watchOuts: [
      'Generic agreement reads as a like. Skip those replies.',
    ],
  },
  {
    category: 'hot-take',
    name: 'Concrete Counter',
    whyThisAngle: 'Disagree publicly, but with a single example. Polite specificity beats vague pushback.',
    hookStructures: [
      'Partly ("Half-agree. The part I\'d push on: ${X}")',
      'Counter-example ("Counter-example from my work: ${detail}")',
      'Where-this-breaks ("This breaks at ${number} ${unit} or when ${condition}")',
    ],
    scaffolds: [
      'Half-agree. The part I\'d push on: ${specific claim} because ${product detail}.',
      'Counter-example from ${product}: ${one sentence}.',
      'This breaks when ${condition or scale}. ${detail from your work}.',
    ],
    examples: [
      'Half-agree. The part I\'d push on: AI-generated landing copy is fine if the product is generic. For mine it tanked conversion 40%.',
      'Counter-example from Hotlistjobs: filters that default narrow killed signup rate. Default wide pulled it back.',
      'This breaks past 5 file changes. Claude is solid up to that. After that I switch tools.',
    ],
    sharperQuestions: [
      'What\'s the one example that contradicts OP?',
      'Where does OP\'s claim still hold?',
      'Are you disagreeing or refining?',
    ],
    keywords: ['half-agree', 'counter-example', 'breaks at', 'in my work'],
    watchOuts: [
      'Lead with what you agree on. Then push.',
      'Naming the limit ("breaks at N users") lands harder than vague disagreement.',
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

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// --- Token extraction ---------------------------------------------------------

const VERB_LIST = [
  'shipped', 'launched', 'pushed', 'released', 'deployed', 'fixed', 'broke',
  'built', 'rewrote', 'killed', 'cut', 'added', 'removed', 'tried', 'switched',
  'stopped', 'started', 'hit', 'crossed', 'lost', 'spent', 'noticed', 'realized',
];

const TOOL_LIST = ['claude', 'cursor', 'copilot', 'chatgpt', 'gpt', 'aider', 'cline', 'mcp'];

const PRODUCT_LIST = ['stashbox', 'hotlistjobs', 'hotlist'];

const UNIT_LIST = [
  'install', 'installs', 'signup', 'signups', 'user', 'users', 'mrr', 'arr',
  'revenue', 'dau', 'mau', 'view', 'views', 'download', 'downloads', 'follower',
  'followers', 'reply', 'replies', 'minute', 'minutes', 'mins', 'hour', 'hours',
  'day', 'days', 'week', 'weeks', 'month', 'months',
];

export function extractTokens(input: string): ExtractedTokens {
  const lower = input.toLowerCase();
  const tokens: ExtractedTokens = {};

  // Verb — first matching verb in input
  for (const v of VERB_LIST) {
    if (new RegExp(`\\b${v}\\b`, 'i').test(input)) {
      tokens.verb = v.charAt(0).toUpperCase() + v.slice(1);
      break;
    }
  }

  // Product
  if (/\bstashbox\b/i.test(input)) tokens.product = 'StashBox';
  else if (/\bhotlist(jobs)?\b/i.test(input)) tokens.product = 'Hotlistjobs';

  // Tool
  for (const t of TOOL_LIST) {
    if (new RegExp(`\\b${t}\\b`, 'i').test(input)) {
      tokens.tool = t === 'gpt' ? 'GPT' : t.charAt(0).toUpperCase() + t.slice(1);
      break;
    }
  }

  // Time phrase
  const timeMatch = input.match(/\b(\d+\s*(hours?|days?|weeks?|months?|minutes?|mins?))|in (a day|an hour|minutes)|\b(today|yesterday|tonight|this week|last week|this month)\b/i);
  if (timeMatch) tokens.time = timeMatch[0];

  // Number + unit (first occurrence)
  for (const unit of UNIT_LIST) {
    const re = new RegExp(`(\\$?\\d+(?:\\.\\d+)?)\\s*${unit}\\b`, 'i');
    const m = input.match(re);
    if (m) {
      tokens.number = m[1];
      tokens.unit = unit;
      break;
    }
  }

  // Fallback: any standalone number
  if (!tokens.number) {
    const numMatch = input.match(/\$?\d+/);
    if (numMatch) tokens.number = numMatch[0];
  }

  // Noun — a notable noun-ish phrase. Look for compound nouns with hyphens or
  // capitalized words that aren't the product. Heuristic, often imperfect.
  const compoundMatch = input.match(/\b([a-z]+-[a-z]+(?:-[a-z]+)?)\b/i);
  if (compoundMatch && !PRODUCT_LIST.some(p => compoundMatch[0].toLowerCase().includes(p))) {
    tokens.noun = compoundMatch[0];
  } else {
    const words = input.split(/\s+/);
    const skipSet = new Set([
      ...VERB_LIST, ...TOOL_LIST, ...PRODUCT_LIST, 'i', 'me', 'my', 'the', 'a', 'an',
      'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'is', 'was',
      'this', 'that', 'just', 'today', 'yesterday',
    ]);
    const candidate = words.find(w => w.length > 4 && !skipSet.has(w.toLowerCase()) && /^[a-z]/i.test(w));
    if (candidate) tokens.noun = candidate.replace(/[.,;:!?]$/, '');
  }

  void lower;
  return tokens;
}

function fillScaffold(scaffold: string, tokens: ExtractedTokens): string {
  return scaffold
    .replace(/\$\{verb\}/g, tokens.verb || '___')
    .replace(/\$\{product\}/g, tokens.product || '___')
    .replace(/\$\{tool\}/g, tokens.tool || '___')
    .replace(/\$\{time\}/g, tokens.time || '___')
    .replace(/\$\{number\}/g, tokens.number || '___')
    .replace(/\$\{unit\}/g, tokens.unit || '___')
    .replace(/\$\{noun\}/g, tokens.noun || '___')
    // Any unfilled placeholder gets a blank
    .replace(/\$\{[^}]+\}/g, '___');
}

function injectIntoQuestions(questions: string[], tokens: ExtractedTokens): string[] {
  const hints: string[] = [];
  if (tokens.product) hints.push(tokens.product);
  if (tokens.number && tokens.unit) hints.push(`${tokens.number} ${tokens.unit}`);
  else if (tokens.number) hints.push(tokens.number);
  if (tokens.tool) hints.push(tokens.tool);
  if (hints.length === 0) return questions;

  // Prepend a tailored question that names extracted tokens.
  const tailored = `You mentioned ${hints.join(' and ')}. What happened in the 24h around that?`;
  return [tailored, ...questions];
}

function sortExamplesByInput(examples: string[], input: string): string[] {
  const tokens = input.toLowerCase().split(/\W+/).filter(t => t.length > 3);
  const mentionsStashbox = /\bstashbox\b/i.test(input);
  const mentionsHotlist = /\bhotlist/i.test(input);

  return [...examples]
    .map((ex, originalIdx) => {
      const exLower = ex.toLowerCase();
      let score = 0;
      for (const tok of tokens) if (exLower.includes(tok)) score++;
      if (mentionsStashbox && /stashbox/i.test(ex)) score += 5;
      if (mentionsHotlist && /hotlist/i.test(ex)) score += 5;
      if (mentionsStashbox && !mentionsHotlist && /hotlist/i.test(ex) && !/stashbox/i.test(ex)) score -= 3;
      if (mentionsHotlist && !mentionsStashbox && /stashbox/i.test(ex) && !/hotlist/i.test(ex)) score -= 3;
      return { ex, score, originalIdx };
    })
    .sort((a, b) => b.score - a.score || a.originalIdx - b.originalIdx)
    .map(({ ex }) => ex);
}

const FALLBACK_SETS: string[][] = [
  ['build-log', 'observation', 'lesson'],
  ['ai-workflow', 'hot-take', 'lesson'],
  ['behind-scenes', 'observation', 'question'],
  ['metric', 'lesson', 'hot-take'],
  ['ai-workflow', 'behind-scenes', 'observation'],
];

export function refineIdea(rawInput: string, mode: IdeaMode): RefinerResult {
  const text = rawInput.trim();
  if (!text) {
    return {
      detectedSignals: [],
      detectedCategories: [],
      wordCount: 0,
      angles: [],
      generalTips: [],
      extracted: {},
      humanizeReport: humanize(''),
    };
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
    topCategories = FALLBACK_SETS[hashStr(text) % FALLBACK_SETS.length];
  } else if (topCategories.length < 3) {
    const padOptions = ['observation', 'lesson', 'hot-take', 'behind-scenes'].filter(c => !topCategories.includes(c));
    while (topCategories.length < 3 && padOptions.length > 0) {
      topCategories.push(padOptions.shift()!);
    }
  }

  // 3. Pick angle templates based on mode
  const pool = mode === 'reply' ? REPLY_ANGLE_TEMPLATES : POST_ANGLE_TEMPLATES;
  const tokens = extractTokens(text);

  const usedTemplates = new Set<string>();
  const angles: RefinedAngle[] = [];

  // In reply mode, pull straight from the reply pool; categories are advisory.
  if (mode === 'reply') {
    // Rank reply templates by keyword overlap with the input
    const ranked = pool
      .map((t, idx) => {
        const overlap = t.keywords.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
        const tieBreak = ((hashStr(text) + idx * 17) % 100) / 100;
        return { t, overlap, tieBreak };
      })
      .sort((a, b) => b.overlap - a.overlap || b.tieBreak - a.tieBreak);

    for (const { t } of ranked.slice(0, 3)) {
      angles.push(buildAngle(t, text, tokens, detectedSignals));
    }
  } else {
    for (const cat of topCategories) {
      const candidates = pool.filter(t => t.category === cat && !usedTemplates.has(t.name));
      if (candidates.length === 0) continue;

      const inputHash = hashStr(text);
      const ranked = candidates
        .map((t, idx) => {
          const overlap = t.keywords.filter(k => text.toLowerCase().includes(k.toLowerCase())).length;
          const tieBreak = ((inputHash + idx * 17) % 100) / 100;
          return { t, overlap, tieBreak };
        })
        .sort((a, b) => b.overlap - a.overlap || b.tieBreak - a.tieBreak);

      const chosen = ranked[0].t;
      usedTemplates.add(chosen.name);
      angles.push(buildAngle(chosen, text, tokens, detectedSignals));
    }
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
    extracted: tokens,
    humanizeReport: humanize(text),
  };
}

function buildAngle(
  t: AngleTemplate,
  text: string,
  tokens: ExtractedTokens,
  detectedSignals: string[],
): RefinedAngle {
  const matchedSignals = detectedSignals.filter(s =>
    t.keywords.some(k => s.includes(k.toLowerCase().split(' ')[0])) ||
    new RegExp(`\\b${s.split('-')[0]}\\b`, 'i').test(t.name)
  );
  const whyPicked = matchedSignals.length > 0
    ? `Picked because your input shows: ${matchedSignals.slice(0, 3).join(', ')}.`
    : `Picked as a strong default for this kind of idea.`;

  return {
    name: t.name,
    category: t.category,
    whyThisAngle: t.whyThisAngle,
    whyPicked,
    hookStructures: t.hookStructures,
    draftScaffolds: t.scaffolds.map(s => fillScaffold(s, tokens)),
    examples: sortExamplesByInput(t.examples, text),
    sharperQuestions: injectIntoQuestions(t.sharperQuestions, tokens),
    keywords: t.keywords,
    watchOuts: t.watchOuts,
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
