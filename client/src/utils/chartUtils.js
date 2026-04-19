// ── Chart Data Aggregation Utilities ─────────────────────────────
// Pure functions — no UI dependencies. Deterministic aggregation.

const BLOOM_LEVELS = ["K1", "K2", "K3", "K4", "K5", "K6"];

/**
 * Walk a paper's nested sections → questions → subquestions
 * and collect every leaf item that carries bloom_level / co / marks.
 */
function collectLeafItems(paper) {
  const items = [];
  const sections = paper?.sections || [];

  for (const section of sections) {
    for (const q of section.questions || []) {
      if (q.type === "single" && q.subquestions?.length > 0) {
        // Single question — only the first subquestion matters
        items.push(q.subquestions[0]);
      } else if (q.type === "subparts" && q.subquestions?.length > 0) {
        // Multi-part — each subquestion is a leaf
        items.push(...q.subquestions);
      } else if (q.type === "choice_group") {
        // Count primary subquestions only (student picks one path)
        if (q.subquestions?.length > 0) {
          items.push(...q.subquestions);
        }
      }
    }
  }

  return items;
}

/**
 * Aggregate total marks per Bloom's level (K1–K6).
 * Missing levels get 0. Unknown / missing bloom_level → "Unknown".
 *
 * @param {object} paper  — full paper document from the API
 * @returns {{ K1: number, K2: number, …, K6: number, Unknown?: number }}
 */
export function aggregateBlooms(paper) {
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

  // Remove "Unknown" if it stayed at 0
  if (result["Unknown"] === 0) delete result["Unknown"];

  return result;
}

/**
 * Aggregate total marks per Course Outcome (CO1, CO2, …).
 * Missing co → "Unassigned". Dynamic number of COs.
 *
 * @param {object} paper
 * @returns {{ CO1: number, CO2: number, …, Unassigned?: number }}
 */
export function aggregateCOs(paper) {
  const result = {};
  const items = collectLeafItems(paper);

  for (const item of items) {
    const marks = Number(item.marks) || 0;
    let coLabel;

    if (item.co != null && item.co !== "") {
      // co is stored as a Number in the DB (1, 2, …)
      coLabel = typeof item.co === "number" ? `CO${item.co}` : `${item.co}`;
      // Normalise: if it already starts with "CO" keep it, otherwise prepend
      if (!coLabel.startsWith("CO")) {
        coLabel = `CO${coLabel}`;
      }
    } else {
      coLabel = "Unassigned";
    }

    result[coLabel] = (result[coLabel] || 0) + marks;
  }

  // Remove Unassigned if zero
  if (result["Unassigned"] === 0) delete result["Unassigned"];

  // Sort keys so CO1 < CO2 < … < Unassigned
  const sorted = {};
  Object.keys(result)
    .sort((a, b) => {
      if (a === "Unassigned") return 1;
      if (b === "Unassigned") return -1;
      const numA = parseInt(a.replace("CO", ""), 10) || 0;
      const numB = parseInt(b.replace("CO", ""), 10) || 0;
      return numA - numB;
    })
    .forEach((k) => (sorted[k] = result[k]));

  return sorted;
}

export { BLOOM_LEVELS };
