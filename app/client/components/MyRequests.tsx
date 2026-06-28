"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { az } from "@/app/client/i18n/az";
import ClientBrandMark from "@/app/components/ClientBrandMark";
import {
  getClientAuthHeaders,
  type ClientPortalSession,
} from "@/lib/clientPortals/clientSession";
import {
  formatCreatedDate,
  formatRequestId,
  getAttachmentUrls,
} from "@/app/client/utils/requestDisplay";

export type ClientPortalRequest = {
  id: number;
  store: string;
  location?: string | null;
  issue: string;
  status: string;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
  created_at?: string | null;
  attachments?: string[] | string | null;
};

type MyRequestsProps = {
  slug: string;
  companyName: string;
  logoUrl?: string | null;
  session: ClientPortalSession;
};

export default function MyRequests({
  slug,
  companyName,
  logoUrl = null,
  session,
}: MyRequestsProps) {
  const [requests, setRequests] = useState<ClientPortalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/client-portals/${slug}/requests`, {
        headers: getClientAuthHeaders(session),
      });

      if (response.status === 401) {
        setError(az.loginRequired);
        setRequests([]);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load requests");
      }

      const data = (await response.json()) as { requests: ClientPortalRequest[] };
      setRequests(data.requests || []);
    } catch (loadError) {
      console.error(loadError);
      setError(az.requestsLoadError);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [session, slug]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  return (
    <main className="portal-page">
      <section className="portal-card portal-card--requests">
        <div className="portal-requests-header">
          <div>
            <div style={portalBrandRowStyle}>
              <ClientBrandMark
                name={companyName}
                logoUrl={logoUrl}
                size="md"
              />
              <span style={portalClientNameStyle}>{companyName}</span>
            </div>
            <p style={eyebrowStyle}>{az.brand}</p>
            <h1 style={titleStyle}>{az.myRequestsTitle}</h1>
          </div>

          <button
            type="button"
            className="portal-btn-secondary portal-btn-secondary--compact"
            onClick={() => void loadRequests()}
            disabled={loading}
          >
            {az.refreshRequests}
          </button>
        </div>

        {loading && (
          <p style={messageStyle}>{az.loadingRequests}</p>
        )}

        {!loading && error && <p style={errorStyle}>{error}</p>}

        {!loading && !error && requests.length === 0 && (
          <p style={messageStyle}>{az.noRequests}</p>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="portal-requests-list">
            {requests.map((request) => {
              const photoUrl = getAttachmentUrls(request.attachments)[0];

              return (
                <Link
                  key={request.id}
                  href={`/client/${slug}/requests/${request.id}`}
                  className="portal-request-card portal-request-card--link"
                >
                  <div className="portal-request-card-top">
                    <strong style={requestIdStyle}>
                      {formatRequestId(request.id, request.created_at)}
                    </strong>
                    <span style={statusStyle}>{request.status || "Open"}</span>
                  </div>

                  <div style={metaGridStyle}>
                    <div>
                      <p style={labelStyle}>{az.store}</p>
                      <p style={valueStyle}>{request.store || "—"}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{az.locationLabel}</p>
                      <p style={valueStyle}>{request.location || "—"}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{az.departmentLabel}</p>
                      <p style={valueStyle}>{request.department || "—"}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{az.categoryLabel}</p>
                      <p style={valueStyle}>{request.category || "—"}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{az.priorityLabel}</p>
                      <p style={valueStyle}>{request.priority || "—"}</p>
                    </div>
                    <div>
                      <p style={labelStyle}>{az.createdLabel}</p>
                      <p style={valueStyle}>
                        {formatCreatedDate(request.created_at)}
                      </p>
                    </div>
                  </div>

                  <div style={{ marginTop: "14px" }}>
                    <p style={labelStyle}>{az.issueDescription}</p>
                    <p style={issueStyle}>{request.issue || "—"}</p>
                  </div>

                  {photoUrl && (
                    <div style={{ marginTop: "14px" }}>
                      <p style={labelStyle}>{az.uploadPhotos}</p>
                      <img
                        src={photoUrl}
                        alt=""
                        className="portal-request-photo"
                      />
                    </div>
                  )}

                  <p style={viewDetailsStyle}>{az.viewDetails} →</p>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

const eyebrowStyle: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "0 0 6px",
  color: "#111827",
  fontSize: "clamp(1.5rem, 4vw, 1.875rem)",
  lineHeight: 1.15,
};

const portalBrandRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  marginBottom: "12px",
};

const portalClientNameStyle: React.CSSProperties = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: 1.3,
};

const messageStyle: React.CSSProperties = {
  margin: "24px 0 0",
  color: "#6b7280",
  fontSize: "15px",
  textAlign: "center",
};

const errorStyle: React.CSSProperties = {
  ...messageStyle,
  color: "#dc2626",
};

const requestIdStyle: React.CSSProperties = {
  fontSize: "15px",
  color: "#111827",
};

const statusStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "4px 10px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "12px",
  fontWeight: 700,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
  gap: "12px",
  marginTop: "14px",
};

const labelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const valueStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "14px",
  fontWeight: 600,
  lineHeight: 1.4,
};

const issueStyle: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: "14px",
  lineHeight: 1.55,
};

const viewDetailsStyle: React.CSSProperties = {
  margin: "14px 0 0",
  color: "#2563eb",
  fontSize: "13px",
  fontWeight: 700,
};
