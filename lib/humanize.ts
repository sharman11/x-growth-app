// Humanizer — finds AI writing tells in a string and returns concrete issues.
// Rule-based, deterministic, runs in the browser. No API calls.
// Pattern list adapted from Wikipedia: Signs of AI writing.

export type IssueSeverity = 'high' | 'med' | 'low';

export interface HumanizeIssue {
  type: string;
  severity: IssueSeverity;
  excerpt: string;
  suggestion: string;
}

export interface HumanizeReport {
  issues: HumanizeIssue[];
  score: number; // 0-100; higher = cleaner. 100 means no tells found.
  hookStrength: {
    firstWords: string;
    score: number; // 0-100
    note: string;
  };
  charCount: number;
  tweetCount: number; // ceil(chars / 280)
}

interface RulePattern {
  type: string;
  severity: IssueSeverity;
  pattern: RegExp;
  suggestion: string;
}

const AI_VOCAB_WORDS = [
  'additionally', 'leverage', 'leverages', 'leveraging', 'delve', 'delves', 'delving',
  'underscore', 'underscores', 'underscoring', 'showcase', 'showcases', 'showcasing',
  'tapestry', 'vibrant', 'boasts', 'boasting', 'nestled', 'groundbreaking',
  'breathtaking', 'must-visit', 'renowned', 'intricate', 'intricacies', 'pivotal',
  'enhance', 'enhances', 'enhancing', 'foster', 'fosters', 'fostering',
  'garner', 'garners', 'garnered', 'interplay', 'valuable insights', 'cultivate',
  'cultivating', 'commitment to', 'profound', 'transformative', 'evolving landscape',
  'rapidly evolving', 'paradigm shift', 'cutting-edge', 'state-of-the-art',
  'seamless', 'seamlessly', 'crucial', 'vital role', 'pivotal moment',
  'testament to', 'serves as a', 'stands as a', 'marks a pivotal',
  'in the heart of', 'a rich tapestry', 'embark on', 'navigate the complexities',
  'in the realm of', 'in the world of', 'in today\'s',
];

const RULES: RulePattern[] = [
  // 1. AI-vocab words. Auto-built from the list above.
  ...AI_VOCAB_WORDS.map<RulePattern>(word => ({
    type: 'ai-vocab',
    severity: 'high' as IssueSeverity,
    pattern: new RegExp(`\\b${word.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, 'i'),
    suggestion: `"${word}" reads as AI. Cut or replace with plain wording.`,
  })),

  // 2. Copula avoidance — "serves as / stands as / functions as"
  {
    type: 'copula-avoidance',
    severity: 'med',
    pattern: /\b(serves|stands|functions|acts) as (a|an|the)\b/i,
    suggestion: 'Use "is" or "are" instead. Plain copulas are more human.',
  },

  // 3. Negative parallelism — "not just X, it's Y" / "not only X but also Y"
  {
    type: 'negative-parallelism',
    severity: 'high',
    pattern: /\b(it.?s not (just|merely) [^.,;]{2,40},?\s*it.?s\b)|(\bnot only [^.,;]{2,40} but also\b)/i,
    suggestion: 'Drop the "not just X, it\'s Y" frame. Just say Y.',
  },

  // 4. Em-dash overuse — flag when two or more em-dashes appear in the same string
  {
    type: 'em-dash-overuse',
    severity: 'med',
    pattern: /—[^—]{0,200}—/,
    suggestion: 'Multiple em-dashes read as AI. Use commas or periods.',
  },

  // 5. Curly quotes
  {
    type: 'curly-quotes',
    severity: 'high',
    pattern: /[“”‘’]/,
    suggestion: 'Use straight quotes ". ChatGPT outputs curly quotes by default.',
  },

  // 6. Vague attributions
  {
    type: 'vague-attribution',
    severity: 'med',
    pattern: /\b(experts (say|argue|believe|agree)|industry (observers|reports)|many believe|some critics|observers (have )?noted)\b/i,
    suggestion: 'Name the source or drop the claim. Vague attribution is an AI tell.',
  },

  // 7. Hedging stack — "could potentially / may possibly / might somewhat"
  {
    type: 'over-hedging',
    severity: 'med',
    pattern: /\b(could potentially|may possibly|might (somewhat|potentially)|it (could|can) be argued)\b/i,
    suggestion: 'Stacked hedges. Pick one or none.',
  },

  // 8. Filler phrases
  {
    type: 'filler',
    severity: 'low',
    pattern: /\b(at this point in time|in order to|due to the fact that|it is important to note that|has the ability to|in the event that)\b/i,
    suggestion: 'Filler phrase. Cut for a tighter sentence.',
  },

  // 9. Generic positive conclusions
  {
    type: 'generic-conclusion',
    severity: 'high',
    pattern: /\b(the future looks bright|exciting times (lie ahead|ahead)|a step in the right direction|continues to thrive|a journey toward)\b/i,
    suggestion: 'Generic upbeat closer. Say something specific or cut the line.',
  },

  // 10. Knowledge-cutoff disclaimers
  {
    type: 'cutoff-disclaimer',
    severity: 'high',
    pattern: /\b(as of my (last )?(knowledge|training)|up to my (last )?training|based on (available|the information) (i have|provided)|while specific details are (limited|scarce))\b/i,
    suggestion: 'LLM disclaimer. Delete the line.',
  },

  // 11. Sycophantic/chatbot artifacts
  {
    type: 'chatbot-artifact',
    severity: 'high',
    pattern: /\b(great question|certainly!|of course!|you.?re absolutely right|i hope this helps|let me know if you.?d like)\b/i,
    suggestion: 'Chatbot leftover. Delete.',
  },

  // 12. "Inflated significance" phrasing
  {
    type: 'inflated-significance',
    severity: 'med',
    pattern: /\b(a (key|crucial|vital|pivotal) (role|moment|turning point)|marking a pivotal|setting the stage for|reflects (a )?broader|symbolizing|indelible mark|deeply rooted in)\b/i,
    suggestion: 'Puffs up importance. Cut or replace with the concrete thing.',
  },

  // 13. Superficial -ing endings tacked to sentences
  {
    type: 'tacked-ing',
    severity: 'med',
    pattern: /,\s*(highlighting|underscoring|emphasizing|reflecting|symbolizing|contributing to|fostering|encompassing|showcasing|illustrating|demonstrating)\b/i,
    suggestion: 'AI tacks on -ing phrases for fake depth. End the sentence sooner.',
  },

  // 14. False ranges — "from X to Y" with abstract endpoints
  {
    type: 'false-range',
    severity: 'low',
    pattern: /\bfrom (the )?[a-z]+ (of [a-z]+ )?to (the )?[a-z]+ (of [a-z]+)?\b/i,
    suggestion: 'Check if "from X to Y" actually spans a scale, or is just AI scaffolding.',
  },
];

// Rule of three: three short noun phrases separated by commas with "and" before the last.
// Loose detection — high false-positive risk, so flag as low severity only.
const RULE_OF_THREE_RE = /(\b\w+\b),\s*(\b\w+\b),?\s*and\s*(\b\w+\b)/g;

function detectRuleOfThree(text: string): HumanizeIssue[] {
  const issues: HumanizeIssue[] = [];
  const matches = [...text.matchAll(RULE_OF_THREE_RE)];
  // Only flag when there are 2+ rule-of-three patterns in the same text (one is fine).
  if (matches.length >= 2) {
    issues.push({
      type: 'rule-of-three',
      severity: 'low',
      excerpt: matches[0][0],
      suggestion: 'Multiple "X, Y, and Z" patterns. AI forces ideas into triples.',
    });
  }
  return issues;
}

const HOOK_VERBS = [
  'shipped', 'launched', 'pushed', 'released', 'deployed', 'fixed', 'broke',
  'built', 'rewrote', 'killed', 'cut', 'added', 'removed', 'tried', 'switched',
  'stopped', 'started', 'hit', 'crossed', 'lost', 'spent', 'noticed', 'realized',
];

const HOOK_OPENERS_STRONG = ['stop', 'unpopular', 'hot take', 'nobody', 'most', 'after', 'wish', 'my', 'i'];

function checkHookStrength(text: string): HumanizeReport['hookStrength'] {
  const words = text.trim().split(/\s+/).slice(0, 7);
  const firstWords = words.join(' ');
  const lower = firstWords.toLowerCase();
  const firstWord = words[0]?.toLowerCase() ?? '';

  let score = 50;
  let note = 'OK opening. Specific is better than abstract.';

  if (!firstWord) {
    return { firstWords: '', score: 0, note: 'Empty.' };
  }

  // Verb-first
  if (HOOK_VERBS.includes(firstWord)) {
    score = 90;
    note = 'Strong verb-first opener.';
  }
  // Number-first
  else if (/^\d/.test(firstWord)) {
    score = 85;
    note = 'Number-first opener. Reads concrete.';
  }
  // Contrarian opener
  else if (HOOK_OPENERS_STRONG.includes(firstWord)) {
    score = 80;
    note = 'Punchy opener.';
  }
  // The/A/An — flabby
  else if (['the', 'a', 'an', 'this', 'that', 'there'].includes(firstWord)) {
    score = 30;
    note = 'Soft opener. Try leading with a verb or a number.';
  }
  // -ing opener — often weak
  else if (firstWord.endsWith('ing')) {
    score = 40;
    note = 'Gerund opener tends to read passive. Try a finite verb.';
  }

  // Penalty: AI vocab in first 7 words
  if (AI_VOCAB_WORDS.some(w => lower.includes(w.toLowerCase()))) {
    score = Math.min(score, 25);
    note = 'AI vocab in the hook. Cut it.';
  }

  return { firstWords, score, note };
}

export function humanize(text: string): HumanizeReport {
  const issues: HumanizeIssue[] = [];

  for (const rule of RULES) {
    const m = rule.pattern.exec(text);
    if (m) {
      const start = Math.max(0, (m.index ?? 0) - 12);
      const end = Math.min(text.length, (m.index ?? 0) + m[0].length + 12);
      issues.push({
        type: rule.type,
        severity: rule.severity,
        excerpt: text.slice(start, end).trim(),
        suggestion: rule.suggestion,
      });
    }
  }

  issues.push(...detectRuleOfThree(text));

  // Dedupe by type (one entry per rule type is enough for UI).
  const seen = new Set<string>();
  const deduped = issues.filter(i => {
    if (seen.has(i.type)) return false;
    seen.add(i.type);
    return true;
  });

  // Score: start at 100, subtract per issue weighted by severity.
  const weight: Record<IssueSeverity, number> = { high: 18, med: 10, low: 4 };
  const penalty = deduped.reduce((acc, i) => acc + weight[i.severity], 0);
  const score = Math.max(0, 100 - penalty);

  const charCount = text.length;
  const tweetCount = charCount === 0 ? 0 : Math.ceil(charCount / 280);

  return {
    issues: deduped,
    score,
    hookStrength: checkHookStrength(text),
    charCount,
    tweetCount,
  };
}

// Convenience labels for the UI
export const SEVERITY_LABELS: Record<IssueSeverity, string> = {
  high: 'High',
  med: 'Medium',
  low: 'Low',
};
