import mongoose from "mongoose";

// ── Sub-question schema (for subparts / single questions) ────────
const subQuestionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    text: { type: String, required: true },
    marks: { type: Number, required: true },
    difficulty: { type: String },
    topic: { type: String },
    co: { type: Number },
    bloom_level: {
      type: String,
      enum: ["K1", "K2", "K3", "K4", "K5", "K6"],
    },
  },
  { _id: false }
);

// ── Choice option schema (for choice_group questions) ────────────
const choiceOptionSchema = new mongoose.Schema(
  {
    label: { type: String, required: true },
    text: { type: String, required: true },
    marks: { type: Number, required: true },
    difficulty: { type: String },
    topic: { type: String },
  },
  { _id: false }
);

// ── Question schema ──────────────────────────────────────────────
const questionSchema = new mongoose.Schema(
  {
    question_id: { type: Number, required: true },
    type: {
      type: String,
      enum: ["single", "subparts", "choice_group"],
      required: true,
    },
    marks: { type: Number, required: true },
    subquestions: [subQuestionSchema],
    options: [choiceOptionSchema],
  },
  { _id: false }
);

// ── Section schema ───────────────────────────────────────────────
const sectionSchema = new mongoose.Schema(
  {
    section_id: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String },
    header_notes: { type: String, default: "" },
    marks_scheme: { type: String },
    attempt_rule: { type: String },
    questions: [questionSchema],
  },
  { _id: false }
);

// ── Paper metadata schema ────────────────────────────────────────
const paperMetadataSchema = new mongoose.Schema(
  {
    exam: { type: String },
    subject: { type: String, required: true },
    subject_code: { type: String },
    duration: { type: String },
    max_marks: { type: Number, required: true },
  },
  { _id: false }
);

// ── Section Pattern sub-schema (input pattern from user) ─────────
const patternItemSchema = new mongoose.Schema(
  {
    section: { type: String, required: true },
    title: { type: String },
    questions: { type: Number, required: true },
    marksEach: { type: Number, required: true },
    questionType: { type: String, default: "single" },
    attemptRule: { type: String },
    difficulty: { type: String },
    description: { type: String },
  },
  { _id: false }
);

// ── QuestionPaper Schema ─────────────────────────────────────────
const questionPaperSchema = new mongoose.Schema(
  {
    // User-provided paper name (optional)
    name: { type: String, default: "" },

    // Paper metadata from AI response
    metadata: { type: paperMetadataSchema, required: true },

    // Exam instructions
    instructions: [{ type: String }],

    // Generated sections with full question data
    sections: [sectionSchema],

    // The input pattern used for generation
    pattern: [patternItemSchema],

    // Difficulty level used (now mapped to detailed percentage description)
    difficulty: {
      type: String,
      required: true,
    },

    // Reference to the user who generated this paper
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Path to the generated PDF file
    pdfUrl: { type: String, default: null },
  },
  { timestamps: true }
);

export default mongoose.model("QuestionPaper", questionPaperSchema);
