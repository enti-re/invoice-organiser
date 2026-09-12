export const COMMON_ERRORS = {
  unexpectedServer: "Unexpected server error",
  invoiceNotFound: "Invoice not found",
} as const;

export const UPLOAD_ERRORS = {
  malformedRequest: "Malformed upload request",
  missingFile: "Missing file",
  unsupportedFileType: (type: string) =>
    `Unsupported file type: ${type}. Expected PDF, PNG, JPEG, or WEBP.`,
  emptyFile: "Uploaded file is empty",
  fileTooLarge: "File too large (max 15MB)",
  blobRateLimited: "File storage is temporarily rate limited. Please try again shortly.",
  blobUploadFailed: "Failed to store uploaded file",
  saveFailed: "Extraction succeeded but saving the invoice failed",
} as const;

export const LIST_ERRORS = {
  loadFailed: "Failed to load invoices",
} as const;

export const INVOICE_ERRORS = {
  malformedBody: "Malformed request body",
  invalidAction: "action must be 'confirm' or 'correct'",
  fieldRequired: "field is required",
  fieldNotEditable: (field: string) =>
    `Field '${field}' cannot be corrected directly (line items aren't editable here)`,
  lookupFailed: "Failed to look up invoice",
  deleteFailed: "Failed to delete invoice",
} as const;

export const REVIEW_REASONS = {
  corrected: "Corrected by reviewer",
  confirmed: "Confirmed correct by reviewer",
} as const;
