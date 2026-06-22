// Action-verb taxonomy (M9-S1, spec §12). Evidence in a resume is stronger when a
// skill is tied to a real accomplishment verb ("architected", "scaled") than when
// it just sits in a skills list. Each verb carries an evidence-strength boost; the
// resume evidence graph (M9-S3) sums the boosts of the verbs it finds in a bullet.
//
// Keys are lemmas; the matcher also accepts the common inflections (-ed/-d/-ing/-s)
// so "design", "designed", "designing" all resolve to the "designed" boost.

export const ACTION_VERB_BOOST: Record<string, number> = {
  architected: 1.0,
  scaled: 1.0,
  designed: 0.8,
  owned: 0.8,
  led: 0.8,
  migrated: 0.8,
  built: 0.5,
  launched: 0.6,
  shipped: 0.5,
  optimized: 0.6,
  automated: 0.5,
  implemented: 0.4,
  developed: 0.3,
  created: 0.3,
  delivered: 0.4,
  drove: 0.6,
  spearheaded: 0.8,
  rearchitected: 1.0,
};

// Lemma → the set of surface forms we accept (the lemma is usually already past
// tense, so we add the base/gerund/3rd-person forms). Kept explicit rather than
// stemmed so matching stays deterministic and precise.
const VERB_FORMS: Record<string, string[]> = {
  architected: ["architect", "architects", "architected", "architecting", "re-architected", "rearchitected"],
  scaled: ["scale", "scales", "scaled", "scaling"],
  designed: ["design", "designs", "designed", "designing"],
  owned: ["own", "owns", "owned", "owning"],
  led: ["lead", "leads", "led", "leading"],
  migrated: ["migrate", "migrates", "migrated", "migrating"],
  built: ["build", "builds", "built", "building"],
  launched: ["launch", "launches", "launched", "launching"],
  shipped: ["ship", "ships", "shipped", "shipping"],
  optimized: ["optimize", "optimizes", "optimized", "optimizing", "optimise", "optimised"],
  automated: ["automate", "automates", "automated", "automating"],
  implemented: ["implement", "implements", "implemented", "implementing"],
  developed: ["develop", "develops", "developed", "developing"],
  created: ["create", "creates", "created", "creating"],
  delivered: ["deliver", "delivers", "delivered", "delivering"],
  drove: ["drive", "drives", "drove", "driving", "driven"],
  spearheaded: ["spearhead", "spearheads", "spearheaded", "spearheading"],
  rearchitected: ["rearchitect", "rearchitected"],
};

const FORM_TO_LEMMA = new Map<string, string>();
for (const [lemma, forms] of Object.entries(VERB_FORMS)) {
  for (const form of forms) FORM_TO_LEMMA.set(form, lemma);
}

const ACTION_VERB_REGEX = new RegExp(
  `(?<![a-zA-Z0-9])(?:${[...FORM_TO_LEMMA.keys()].map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})(?![a-zA-Z0-9])`,
  "gi",
);

/** Distinct action-verb lemmas found in `text` (deduped, deterministic order). */
export function extractActionVerbs(text: string | null | undefined): string[] {
  if (!text) return [];
  const seen = new Set<string>();
  for (const m of text.matchAll(ACTION_VERB_REGEX)) {
    const lemma = FORM_TO_LEMMA.get(m[0].toLowerCase());
    if (lemma) seen.add(lemma);
  }
  return [...seen];
}

/** Summed evidence-strength boost of the action verbs present in `text`. */
export function actionVerbBoost(text: string | null | undefined): number {
  let total = 0;
  for (const lemma of extractActionVerbs(text)) total += ACTION_VERB_BOOST[lemma] ?? 0;
  return total;
}
