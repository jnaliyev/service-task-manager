export type StatusWorkflowSyncContext = {
  employee_id?: string | null;
  workflow_status?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  closed_at?: string | null;
  previousStatus?: string | null;
};

export type StatusWorkflowSyncFields = {
  status: string;
  workflow_status?: string;
  started_at?: string | null;
  finished_at?: string | null;
  closed_at?: string | null;
};

/**
 * Maps a task status change to the matching workflow fields.
 * Waiting Parts intentionally leaves workflow_status unchanged.
 */
export function getWorkflowFieldsForStatus(
  status: string,
  context: StatusWorkflowSyncContext
): StatusWorkflowSyncFields {
  const now = new Date().toISOString();
  const fields: StatusWorkflowSyncFields = { status };

  switch (status) {
    case "Open": {
      fields.workflow_status = context.employee_id
        ? "technician_assigned"
        : "new_request";
      break;
    }
    case "In Progress": {
      fields.workflow_status = "in_progress";
      if (!context.started_at) {
        fields.started_at = now;
      }
      if (context.previousStatus === "Completed") {
        fields.finished_at = null;
      }
      break;
    }
    case "Completed": {
      fields.workflow_status = "finished";
      if (!context.finished_at) {
        fields.finished_at = now;
      }
      break;
    }
    case "Waiting Parts": {
      // Keep current workflow_status unchanged.
      break;
    }
    case "Cancelled": {
      fields.workflow_status = "closed";
      if (!context.closed_at) {
        fields.closed_at = now;
      }
      break;
    }
    default:
      break;
  }

  return fields;
}
