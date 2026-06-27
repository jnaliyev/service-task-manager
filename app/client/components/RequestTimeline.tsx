"use client";

import { useCallback, useEffect, useState } from "react";
import { az } from "@/app/client/i18n/az";
import {
  getClientAuthHeaders,
  type ClientPortalSession,
} from "@/lib/clientPortals/clientSession";
import {
  mapTaskHistoryRows,
  type TaskHistoryRow,
  type TimelineEvent,
} from "@/app/client/utils/timelineEvents";

type RequestTimelineProps = {
  slug: string;
  requestId: string;
  session: ClientPortalSession;
};

const TIMELINE_POLL_MS = 15000;

export default function RequestTimeline({
  slug,
  requestId,
  session,
}: RequestTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTimeline = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/history`,
        { headers: getClientAuthHeaders(session) }
      );

      if (!response.ok) {
        throw new Error("Failed to load timeline");
      }

      const data = (await response.json()) as { history: TaskHistoryRow[] };
      setEvents(mapTaskHistoryRows(data.history || []));
    } catch (error) {
      console.error(error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [requestId, session, slug]);

  useEffect(() => {
    void loadTimeline();

    const interval = window.setInterval(() => {
      void loadTimeline();
    }, TIMELINE_POLL_MS);

    return () => window.clearInterval(interval);
  }, [loadTimeline]);

  return (
    <div className="portal-timeline-section">
      <h2 style={sectionTitleStyle}>{az.timelineTitle}</h2>

      {loading && events.length === 0 && (
        <p style={emptyStyle}>{az.loadingTimeline}</p>
      )}

      {!loading && events.length === 0 && (
        <p style={emptyStyle}>{az.noActivityYet}</p>
      )}

      {events.length > 0 && (
        <ul className="portal-timeline-list">
          {events.map((event) => (
            <li key={event.id} className="portal-timeline-item">
              <span className="portal-timeline-icon" aria-hidden="true">
                {event.icon}
              </span>
              <div className="portal-timeline-content">
                <p style={eventTitleStyle}>{event.title}</p>
                <p style={eventMetaStyle}>
                  {event.date} · {event.time}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const emptyStyle: React.CSSProperties = {
  margin: "16px 0 0",
  color: "#6b7280",
  fontSize: "14px",
};

const eventTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: 1.4,
};

const eventMetaStyle: React.CSSProperties = {
  margin: "4px 0 0",
  color: "#6b7280",
  fontSize: "13px",
};
