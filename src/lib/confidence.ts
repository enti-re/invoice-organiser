import type { ConfidenceMap } from "@/db/schema";
import { EXTRACTION_FIELD_KEYS, type InvoiceExtraction } from "@/lib/invoice-extraction-schema";

/**
 * "Confidence" means internally consistent, not verified against ground
 * truth — there's no independent source of what an invoice says, only what
 * the model read off it. Three signals, one extraction pass: prompted
 * conservatism (extract.ts), deterministic checks (below), and the model's
 * own self-reported uncertainty (`uncertain_fields`, folded in below).
 */

type FieldKey = (typeof EXTRACTION_FIELD_KEYS)[number];

const SCALAR_FIELD_KEYS = EXTRACTION_FIELD_KEYS.filter(
  (key): key is Exclude<FieldKey, "line_items"> => key !== "line_items",
);

// Dropped in favor of a more specific reason on the same field, if one
// exists — see FieldIssues.reasonsFor().
const MISSING_REASON = "Unable to extract — please verify manually";

const AMOUNT_TOLERANCE_ABS = 0.02;
const AMOUNT_TOLERANCE_RATIO = 0.005;

const PLACEHOLDER_VALUES = new Set([
  "n/a",
  "na",
  "none",
  "unknown",
  "tbd",
  "test",
  "-",
  "--",
  "null",
  "undefined",
]);

function isBlankOrPlaceholder(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  return normalized.length === 0 || PLACEHOLDER_VALUES.has(normalized);
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function amountsMatch(a: number, b: number): boolean {
  const tolerance = Math.max(AMOUNT_TOLERANCE_ABS, Math.abs(b) * AMOUNT_TOLERANCE_RATIO);
  return Math.abs(a - b) <= tolerance;
}

class FieldIssues {
  private reasons = new Map<FieldKey, string[]>();

  flag(field: FieldKey, reason: string): void {
    const existing = this.reasons.get(field) ?? [];
    existing.push(reason);
    this.reasons.set(field, existing);
  }

  reasonsFor(field: FieldKey): string[] {
    const raw = this.reasons.get(field) ?? [];
    if (raw.length > 1 && raw.includes(MISSING_REASON)) {
      return raw.filter((reason) => reason !== MISSING_REASON);
    }
    return raw;
  }
}

export function computeConfidence(extraction: InvoiceExtraction): {
  confidence: ConfidenceMap;
  needsReview: boolean;
} {
  const issues = new FieldIssues();

  for (const field of SCALAR_FIELD_KEYS) {
    if (extraction[field] === null) {
      issues.flag(field, MISSING_REASON);
    }
  }

  if (extraction.vendor_name !== null && isBlankOrPlaceholder(extraction.vendor_name)) {
    issues.flag("vendor_name", "Looks like a blank or placeholder value — please verify manually");
  }
  if (extraction.invoice_number !== null && isBlankOrPlaceholder(extraction.invoice_number)) {
    issues.flag("invoice_number", "Looks like a blank or placeholder value — please verify manually");
  }

  if (extraction.invoice_date !== null && !isValidIsoDate(extraction.invoice_date)) {
    issues.flag(
      "invoice_date",
      `Invalid or unparseable date format (expected YYYY-MM-DD): "${extraction.invoice_date}"`,
    );
  }
  if (extraction.due_date !== null && !isValidIsoDate(extraction.due_date)) {
    issues.flag(
      "due_date",
      `Invalid or unparseable date format (expected YYYY-MM-DD): "${extraction.due_date}"`,
    );
  }

  if (
    extraction.subtotal_amount !== null &&
    extraction.tax_amount !== null &&
    extraction.total_amount !== null &&
    !amountsMatch(extraction.subtotal_amount + extraction.tax_amount, extraction.total_amount)
  ) {
    const reason = `Subtotal (${extraction.subtotal_amount}) + tax (${extraction.tax_amount}) does not add up to total (${extraction.total_amount})`;
    issues.flag("subtotal_amount", reason);
    issues.flag("tax_amount", reason);
    issues.flag("total_amount", reason);
  }

  if (extraction.line_items.length === 0) {
    if (extraction.total_amount !== null) {
      issues.flag("line_items", "No line items were extracted despite a total amount being present");
    }
  } else {
    // Line items exclude tax by convention, so compare against subtotal;
    // fall back to total only for receipts with no separate subtotal/tax.
    const comparisonField: "subtotal_amount" | "total_amount" =
      extraction.subtotal_amount !== null ? "subtotal_amount" : "total_amount";
    const comparisonTarget = extraction[comparisonField];
    if (comparisonTarget !== null) {
      const lineItemSum = extraction.line_items.reduce((sum, item) => sum + item.amount, 0);
      if (!amountsMatch(lineItemSum, comparisonTarget)) {
        const label = comparisonField === "subtotal_amount" ? "subtotal" : "total";
        const reason = `Line items sum to ${lineItemSum.toFixed(2)}, which does not match the ${label} (${comparisonTarget})`;
        issues.flag("line_items", reason);
        issues.flag(comparisonField, reason);
      }
    }
  }

  for (const entry of extraction.uncertain_fields) {
    issues.flag(entry.field, entry.reason);
  }

  const confidence: ConfidenceMap = {};
  for (const field of EXTRACTION_FIELD_KEYS) {
    const reasons = issues.reasonsFor(field);
    if (reasons.length === 0) {
      confidence[field] = { score: 1, flagged: false, reason: "" };
      continue;
    }
    const hasValue = field === "line_items" ? extraction.line_items.length > 0 : extraction[field] !== null;
    confidence[field] = {
      score: hasValue ? 0.5 : 0,
      flagged: true,
      reason: Array.from(new Set(reasons)).join("; "),
    };
  }

  // Document-level, not field-level: catches "wrong kind of document
  // entirely" (a resume, an ID card), which per-field checks can't see.
  // Stored under a synthetic key (not in EXTRACTION_FIELD_KEYS) so it
  // reuses the existing flagged/needsReview/confirm machinery for free.
  if (!extraction.is_invoice) {
    confidence.document_type = {
      score: 0,
      flagged: true,
      reason: extraction.not_invoice_reason ?? "This document doesn't look like an invoice or receipt.",
    };
  }

  const needsReview = Object.values(confidence).some((field) => field.flagged);

  return { confidence, needsReview };
}
