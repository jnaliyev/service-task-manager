export const WORKFLOW_STATUSES = [
    "new_request",
    "accepted",
    "site_inspection",
    "quotation_sent",
    "waiting_for_approval",
    "approved",
    "technician_assigned",
    "in_progress",
    "finished",
    "closed",
  ] as const;
  
  export type WorkflowStatus = (typeof WORKFLOW_STATUSES)[number];
  
  export const WORKFLOW_LABELS: Record<WorkflowStatus, string> = {
    new_request: "New Request",
    accepted: "Accepted",
    site_inspection: "Site Inspection",
    quotation_sent: "Quotation Sent",
    waiting_for_approval: "Waiting for Approval",
    approved: "Approved",
    technician_assigned: "Technician Assigned",
    in_progress: "In Progress",
    finished: "Finished",
    closed: "Closed",
  };