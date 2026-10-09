// Turns a written answer into something a speech engine reads correctly:
// currency, units, punctuation and local place names. The typed answer is the
// source of truth; this only changes how it is *spoken*, never what it says.

const UNITS: Record<string, string> = { k: ' thousand', m: ' million', b: ' billion' };

const PRONUNCIATION: Array<[RegExp, string]> = [
  [/\bEwet\b/gi, 'Eh-wet'],
  [/\bUyo\b/gi, 'Oo-yo'],
  [/\bAkwa Ibom\b/gi, 'Ah-kwa Ee-bom'],
  [/\bOps Desk\b/gi, 'Operations Desk'],
  [/\bfor_sale\b/gi, 'for sale'],
  [/\bunder_offer\b/gi, 'under offer'],
];

const strip = (n: string) => n.replace(/,/g, '');

export function forSpeech(input: string): string {
  let t = input;

  t = t.replace(/[*_`#>]/g, ' ');
  t = t.replace(/₦\s?([\d,]+(?:\.\d+)?)\s?([kmb])\b/gi, (_m, n, u) => `${strip(n)}${UNITS[u.toLowerCase()]} naira`);
  t = t.replace(/₦\s?([\d,]+(?:\.\d+)?)/g, (_m, n) => `${strip(n)} naira`);
  t = t.replace(/\bN(\d[\d,]*(?:\.\d+)?)\s?([kmb])\b/g, (_m, n, u) => `${strip(n)}${UNITS[u.toLowerCase()]} naira`);
  t = t.replace(/%/g, ' percent');
  t = t.replace(/&/g, ' and ');
  t = t.replace(/[()[\]{}<>/\\|]/g, ' ');

  for (const [re, rep] of PRONUNCIATION) t = t.replace(re, rep);

  return t.replace(/\s+/g, ' ').trim();
}
