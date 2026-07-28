// Single source of truth for the Fiverr order pipeline, so the homepage
// card, the Fiverr page, and old live data all agree on the same stages.

export const FIVERR_STATUSES = [
  "Waiting for Customer Response",
  "Needs Requirements",
  "Order Started",
  "Waiting for Revisions",
  "Pending Approval",
  "Approved",
];

// A short "what to do next" hint per status, shown on the homepage's
// active-order card so it reads like advice, not just a status label.
export const FIVERR_NEXT_STEP = {
  "Waiting for Customer Response": "Follow up if it's been a day or two.",
  "Needs Requirements": "Get the brief locked down before starting.",
  "Order Started": "In progress — keep building.",
  "Waiting for Revisions": "Waiting on your edits before it can move.",
  "Pending Approval": "Nudge the client for final sign-off.",
  "Approved": "Delivered and approved — nothing left to do.",
};

// Old 4-stage values (from before the pipeline expanded) mapped onto the
// closest new stage, applied on every read so existing live orders keep
// working without a manual data migration.
const LEGACY_STATUS_MAP = {
  Inquiry: "Needs Requirements",
  "In Progress": "Order Started",
  Revisions: "Waiting for Revisions",
  Delivered: "Approved",
};

export function normalizeFiverrStatus(status) {
  if (FIVERR_STATUSES.includes(status)) return status;
  return LEGACY_STATUS_MAP[status] || FIVERR_STATUSES[0];
}

export function isFiverrComplete(status) {
  return normalizeFiverrStatus(status) === "Approved";
}