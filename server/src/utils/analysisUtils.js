// ── Server-side Bloom / CO Aggregation ───────────────────────────
// Mirrors the client-side chartUtils.js logic for backend use.

const BLOOM_LEVELS = ["K1", "K2", "K3", "K4", "K5", "K6"];

/**
 * Collect all leaf sub-question items from a paper.
 */
function collectLeafItems(paper) {
  const items = [];
  const sections = paper?.sections || [];

  for (const section of sections) {
    for (const q of section.questions || []) {
      if (q.type === "single" && q.subquestions?.length > 0) {
        items.push(q.subquestions[0]);
      } else if (q.type === "subparts" && q.subquestions?.length > 0) {
        items.push(...q.subquestions);
      } else if (q.type === "choice_group") {
        // Student picks ONE option — only count the first for analysis.
        // Data lives in options (preferred) or subquestions (legacy).
        if (q.options?.length > 0) {
          items.push(q.options[0]);
        } else if (q.subquestions?.length > 0) {
          items.push(q.subquestions[0]);
        }
      }
    }
  }
  return items;
}

/**
 * Aggregate marks per Bloom's level (K1–K6).
 */
function aggregateBlooms(paper) {
  const result = {};
  BLOOM_LEVELS.forEach((k) => (result[k] = 0));

  const items = collectLeafItems(paper);
  for (const item of items) {
    const level = item.bloom_level;
    const marks = Number(item.marks) || 0;
    if (level && BLOOM_LEVELS.includes(level)) {
      result[level] += marks;
    } else {
      result["Unknown"] = (result["Unknown"] || 0) + marks;
    }
  }
  if (result["Unknown"] === 0) delete result["Unknown"];
  return result;
}

/**
 * Aggregate marks per Course Outcome.
 */
function aggregateCOs(paper) {
  const result = {};
  const items = collectLeafItems(paper);

  for (const item of items) {
    const marks = Number(item.marks) || 0;
    let coLabel;
    if (item.co != null && item.co !== "") {
      coLabel = typeof item.co === "number" ? `CO${item.co}` : `${item.co}`;
      if (!coLabel.startsWith("CO")) coLabel = `CO${coLabel}`;
    } else {
      coLabel = "Unassigned";
    }
    result[coLabel] = (result[coLabel] || 0) + marks;
  }
  if (result["Unassigned"] === 0) delete result["Unassigned"];

  const sorted = {};
  Object.keys(result)
    .sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      return (parseInt(a.replace("CO", ""), 10) || 0) - (parseInt(b.replace("CO", ""), 10) || 0);
    })
    .forEach((k) => (sorted[k] = result[k]));

  return sorted;
}

export { aggregateBlooms, aggregateCOs, BLOOM_LEVELS };
