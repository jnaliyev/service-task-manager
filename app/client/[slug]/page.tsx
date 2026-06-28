"use client";

import { useEffect, useMemo, useState } from "react";
import RequestForm, { type Store } from "../components/RequestForm";
import SuccessScreen from "../components/SuccessScreen";
import PortalNotFound from "../components/PortalNotFound";
import ClientPortalTabs from "../components/ClientPortalTabs";
import MyRequests from "../components/MyRequests";
import ClientLogin from "../components/ClientLogin";
import ClientPortalUserBar from "../components/ClientPortalUserBar";
import { useClientPortalSession } from "../hooks/useClientPortalSession";
import type { ClientPortalApiResponse } from "../types/portal";

import { az } from "../i18n/az";

type ClientPortalSlugPageProps = {
  params: Promise<{ slug: string }>;
};

function PortalLoadingState() {
  return (
    <main className="portal-page">
      <section className="portal-card" style={{ textAlign: "center" }}>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>
          {az.loadingPortal}
        </p>
      </section>
    </main>
  );
}

export default function ClientPortalSlugPage({
  params,
}: ClientPortalSlugPageProps) {
  const [slug, setSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [portalData, setPortalData] = useState<ClientPortalApiResponse | null>(
    null
  );
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");
  const [activeTab, setActiveTab] = useState<"submit" | "requests">("submit");
  const { session, ready, setSession, clearSession } =
    useClientPortalSession(slug);

  useEffect(() => {
    async function resolveParams() {
      const resolvedParams = await params;
      setSlug(resolvedParams.slug.trim().toLowerCase());
    }

    resolveParams();
  }, [params]);

  useEffect(() => {
    if (!slug) return;

    async function loadPortal() {
      setLoading(true);
      setNotFound(false);

      try {
        const response = await fetch(`/api/client-portals/${slug}`);

        if (response.status === 404) {
          setPortalData(null);
          setNotFound(true);
          return;
        }

        if (!response.ok) {
          throw new Error("Failed to load portal");
        }

        const data = (await response.json()) as ClientPortalApiResponse;
        setPortalData(data);
      } catch (error) {
        console.error(error);
        setPortalData(null);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    }

    loadPortal();
  }, [slug]);

  const allowedStores = useMemo(() => {
    if (!portalData || !session) return [];

    const stores = portalData.stores as Store[];

    if (session.storeIds.length > 0) {
      const allowedIds = new Set(session.storeIds);
      return stores.filter((store) => allowedIds.has(store.id));
    }

    return stores;
  }, [portalData, session]);

  if (!slug || loading || !ready) {
    return <PortalLoadingState />;
  }

  if (notFound || !portalData) {
    return <PortalNotFound />;
  }

  if (!session) {
    return (
      <ClientLogin
        slug={slug}
        companyName={portalData.portal.companyName}
        logoUrl={portalData.portal.logoUrl}
        onSuccess={setSession}
      />
    );
  }

  if (submitted) {
    return (
      <SuccessScreen
        requestNumber={requestNumber}
        onSubmitAnother={() => {
          setSubmitted(false);
          setRequestNumber("");
        }}
      />
    );
  }

  return (
    <>
      <div className="portal-tab-bar-wrap">
        <ClientPortalUserBar
          session={session}
          companyName={portalData.portal.companyName}
          logoUrl={portalData.portal.logoUrl}
          onLogout={clearSession}
        />
        <ClientPortalTabs
          activeTab={activeTab}
          onChange={setActiveTab}
          submitLabel={az.tabSubmit}
          requestsLabel={az.tabMyRequests}
        />
      </div>

      {activeTab === "submit" ? (
        <RequestForm
          stores={allowedStores}
          portalConfig={{
            slug: portalData.portal.slug,
            companyName: portalData.portal.companyName,
            logoUrl: portalData.portal.logoUrl,
          }}
          clientUser={{
            fullName: session.fullName,
            username: session.username,
          }}
          onSuccess={(number) => {
            setRequestNumber(number);
            setSubmitted(true);
          }}
        />
      ) : (
        <MyRequests
          slug={slug}
          companyName={portalData.portal.companyName}
          logoUrl={portalData.portal.logoUrl}
          session={session}
        />
      )}
    </>
  );
}
