// ── Pattern Validation ───────────────────────────────────────────
// Validates that the section pattern matches the declared totalMarks.
//
// pattern format:
//   [
//     { section: "A", questions: 10, marksEach: 2 },
//     { section: "B", questions: 5,  marksEach: 6 },
//     { section: "C", questions: 2,  marksEach: 10 }
//   ]
//
// Rule:  sum of (questions × marksEach) for every section  =  totalMarks

const validatePattern = (pattern, totalMarks) => {
  const errors = [];

  if (!Array.isArray(pattern) || pattern.length === 0) {
    errors.push("Pattern must be a non-empty array of sections");
    return errors;
  }

  let calculatedTotal = 0;

  for (const item of pattern) {
    if (!item.section || typeof item.section !== "string") {
      errors.push("Each pattern item must have a valid section name (e.g. A, B, C)");
    }
    if (!Number.isInteger(item.questions) || item.questions <= 0) {
      errors.push(`Section ${item.section}: questions must be a positive integer`);
    }
    if (!Number.isInteger(item.marksEach) || item.marksEach <= 0) {
      errors.push(`Section ${item.section}: marksEach must be a positive integer`);
    }

    calculatedTotal += (item.questions || 0) * (item.marksEach || 0);
  }

  if (calculatedTotal !== totalMarks) {
    errors.push(
      `Mark distribution mismatch: pattern sums to ${calculatedTotal} but totalMarks is ${totalMarks}`
    );
  }

  return errors;
};

export default validatePattern;
