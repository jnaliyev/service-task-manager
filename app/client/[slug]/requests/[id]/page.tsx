"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import PortalNotFound from "../../../components/PortalNotFound";
import ClientLogin from "../../../components/ClientLogin";
import ClientPortalUserBar from "../../../components/ClientPortalUserBar";
import { az } from "@/app/client/i18n/az";
import {
  formatCreatedDate,
  formatRequestId,
  getAttachmentUrls,
} from "@/app/client/utils/requestDisplay";
import RequestTimeline from "../../../components/RequestTimeline";
import RequestActions from "../../../components/RequestActions";
import RequestMessages from "../../../components/RequestMessages";
import { useClientPortalSession } from "../../../hooks/useClientPortalSession";
import { getClientAuthHeaders } from "@/lib/clientPortals/clientSession";
import type { ClientRequestPermissions } from "@/lib/clientPortals/verifyClientTask";

type RequestDetailPageProps = {
  params: Promise<{ slug: string; id: string }>;
};

type ClientRequestDetail = {
  id: number;
  store: string;
  location?: string | null;
  issue: string;
  client_description?: string | null;
  status: string;
  department?: string | null;
  category?: string | null;
  priority?: string | null;
  created_at?: string | null;
  attachments?: string[] | string | null;
  technician?: string | null;
};

type ServiceActPhoto = {
  id: string | number;
  photo_url: string;
  created_at?: string | null;
  author?: string | null;
};

const DETAIL_POLL_MS = 15000;

function normalizeServiceActPhotos(value: unknown): ServiceActPhoto[] {
  if (!Array.isArray(value)) return [];

  const photos: ServiceActPhoto[] = [];

  for (const item of value) {
    if (!item || typeof item !== "object") continue;

    const row = item as Record<string, unknown>;
    const id = row.id;
    const photoUrl =
      typeof row.photo_url === "string" ? row.photo_url.trim() : "";

    if (id === null || id === undefined || id === "") continue;
    if (!photoUrl || !/^https?:\/\//i.test(photoUrl)) continue;

    photos.push({
      id: id as string | number,
      photo_url: photoUrl,
      created_at:
        typeof row.created_at === "string" || row.created_at === null
          ? (row.created_at as string | null)
          : null,
      author:
        typeof row.author === "string" || row.author === null
          ? (row.author as string | null)
          : null,
    });
  }

  return photos;
}

function RequestDetailLoading() {
  return (
    <main className="portal-page">
      <section className="portal-card portal-card--requests" style={{ textAlign: "center" }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>
          {az.loadingRequestDetail}
        </p>
      </section>
    </main>
  );
}

export default function RequestDetailPage({ params }: RequestDetailPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [request, setRequest] = useState<ClientRequestDetail | null>(null);
  const [serviceActPhotos, setServiceActPhotos] = useState<ServiceActPhoto[]>(
    []
  );
  const [permissions, setPermissions] = useState<ClientRequestPermissions>({
    canEdit: false,
    canDelete: false,
    canCancel: false,
    canComment: false,
    canUploadPhoto: false,
  });
  const { session, ready, setSession, clearSession } =
    useClientPortalSession(slug);
  const inFlightRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const loadGenRef = useRef(0);

  const loadRequest = useCallback(async (options?: { silent?: boolean }) => {
    if (!slug || !requestId || !session) return;
    if (inFlightRef.current) return;

    const silent = Boolean(options?.silent);
    const controller = new AbortController();
    const gen = loadGenRef.current;

    abortRef.current = controller;
    inFlightRef.current = true;

    if (!silent) {
      setLoading(true);
      setNotFound(false);
    }

    const isCurrent = () =>
      !controller.signal.aborted && gen === loadGenRef.current;

    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}`,
        {
          headers: getClientAuthHeaders(session),
          signal: controller.signal,
        }
      );

      if (!isCurrent()) return;

      if (response.status === 404) {
        if (!silent) {
          setRequest(null);
          setServiceActPhotos([]);
          setNotFound(true);
        }
        return;
      }

      if (response.status === 401) {
        clearSession();
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to load request");
      }

      const data = (await response.json()) as {
        request: ClientRequestDetail;
        permissions: ClientRequestPermissions;
        serviceActPhotos?: unknown;
      };

      if (!isCurrent()) return;

      setRequest(data.request);
      setPermissions(data.permissions);
      setServiceActPhotos(normalizeServiceActPhotos(data.serviceActPhotos));
      setNotFound(false);
    } catch (error) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError") ||
        (error instanceof Error && error.name === "AbortError")
      ) {
        return;
      }

      console.error(error);
      if (!silent && isCurrent()) {
        setRequest(null);
        setServiceActPhotos([]);
        setNotFound(true);
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        inFlightRef.current = false;
      }

      if (!silent && isCurrent()) {
        setLoading(false);
      }
    }
  }, [clearSession, requestId, session, slug]);

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug.trim().toLowerCase());
      setRequestId(resolvedParams.id);
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    async function loadPortalMeta() {
      try {
        const response = await fetch(`/api/client-portals/${slug}`);

        if (response.ok) {
          const data = (await response.json()) as {
            portal: { companyName: string; logoUrl?: string | null };
          };
          setCompanyName(data.portal.companyName);
          setLogoUrl(data.portal.logoUrl ?? null);
        }
      } catch (error) {
        console.error(error);
      }
    }

    void loadPortalMeta();
  }, [slug]);

  useEffect(() => {
    if (!session) {
      if (ready) {
        setLoading(false);
      }
      return;
    }

    loadGenRef.current += 1;
    abortRef.current?.abort();
    inFlightRef.current = false;

    void loadRequest();

    const interval = window.setInterval(() => {
      void loadRequest({ silent: true });
    }, DETAIL_POLL_MS);

    return () => {
      window.clearInterval(interval);
      loadGenRef.current += 1;
      abortRef.current?.abort();
      inFlightRef.current = false;
    };
  }, [loadRequest, ready, session]);

  if (!slug || !requestId || !ready) {
    return <RequestDetailLoading />;
  }

  if (!session) {
    return (
      <ClientLogin
        slug={slug}
        companyName={companyName || slug}
        logoUrl={logoUrl}
        onSuccess={setSession}
      />
    );
  }

  if (loading) {
    return <RequestDetailLoading />;
  }

  if (notFound || !request) {
    return <PortalNotFound message={az.requestNotFound} />;
  }

  const photos = getAttachmentUrls(request.attachments);
  const validServiceActPhotos = normalizeServiceActPhotos(serviceActPhotos);

  return (
    <main className="portal-page">
      <section className="portal-card portal-card--requests">
        <ClientPortalUserBar
          session={session}
          companyName={companyName || slug}
          logoUrl={logoUrl}
          onLogout={clearSession}
        />

        <Link href={`/client/${slug}`} className="portal-back-link">
          ← {az.backToPortal}
        </Link>

        <div className="portal-request-detail-header">
          <div>
            <p style={eyebrowStyle}>{az.brand}</p>
            <h1 style={titleStyle}>{az.requestDetailTitle}</h1>
            <p style={requestIdStyle}>
              {formatRequestId(request.id, request.created_at)}
            </p>
          </div>
          <span style={statusStyle}>{request.status || "Open"}</span>
        </div>

        <div style={metaGridStyle}>
          <DetailField label={az.store} value={request.store} />
          <DetailField label={az.locationLabel} value={request.location} />
          <DetailField label={az.departmentLabel} value={request.department} />
          <DetailField label={az.categoryLabel} value={request.category} />
          <DetailField label={az.priorityLabel} value={request.priority} />
          <DetailField
            label={az.createdLabel}
            value={formatCreatedDate(request.created_at)}
          />
          <DetailField
            label={az.assignedToLabel}
            value={request.technician?.trim() || az.notAssigned}
          />
        </div>

        <DetailBlock label={az.issueDescription} value={request.issue} />

        {photos.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <p style={labelStyle}>{az.problemPhotosLabel}</p>
            <div className="portal-request-photo-grid">
              {photos.map((photoUrl) => (
                <img
                  key={photoUrl}
                  src={photoUrl}
                  alt=""
                  className="portal-request-photo"
                />
              ))}
            </div>
          </div>
        )}

        {validServiceActPhotos.length > 0 && (
          <div style={{ marginTop: "20px" }}>
            <p style={labelStyle}>{az.serviceActLabel}</p>
            <div className="portal-request-photo-grid">
              {validServiceActPhotos.map((photo) => (
                <a
                  key={String(photo.id)}
                  href={photo.photo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <img
                    src={photo.photo_url}
                    alt=""
                    className="portal-request-photo"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        <RequestActions
          slug={slug}
          requestId={requestId}
          issue={request.issue}
          attachments={request.attachments}
          permissions={permissions}
          session={session}
          onUpdated={() => void loadRequest({ silent: true })}
        />

        <RequestTimeline slug={slug} requestId={requestId} session={session} />

        <RequestMessages slug={slug} requestId={requestId} session={session} />
      </section>
    </main>
  );
}

function DetailField({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div>
      <p style={labelStyle}>{label}</p>
      <p style={valueStyle}>{value?.trim() || "—"}</p>
    </div>
  );
}

function DetailBlock({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div style={{ marginTop: "18px" }}>
      <p style={labelStyle}>{label}</p>
      <p style={bodyStyle}>{value?.trim() || "—"}</p>
    </div>
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
  margin: "0 0 8px",
  color: "#111827",
  fontSize: "clamp(1.5rem, 4vw, 1.875rem)",
  lineHeight: 1.15,
};

const requestIdStyle: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: "15px",
  fontWeight: 700,
};

const statusStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 12px",
  borderRadius: "999px",
  background: "#eff6ff",
  color: "#1d4ed8",
  fontSize: "13px",
  fontWeight: 700,
  flexShrink: 0,
};

const metaGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "14px",
  marginTop: "24px",
};

const labelStyle: React.CSSProperties = {
  margin: "0 0 6px",
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const valueStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "15px",
  fontWeight: 600,
  lineHeight: 1.4,
};

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#374151",
  fontSize: "15px",
  lineHeight: 1.6,
};
