"use client";

import { useEffect, useState } from "react";
import RequestForm, { type Store } from "../components/RequestForm";
import SuccessScreen from "../components/SuccessScreen";
import PortalNotFound from "../components/PortalNotFound";
import type { ClientPortalApiResponse } from "../types/portal";

type ClientPortalSlugPageProps = {
  params: Promise<{ slug: string }>;
};

function PortalLoadingState() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 16px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif',
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: "560px",
          background: "#ffffff",
          borderRadius: "22px",
          padding: "32px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.12)",
          textAlign: "center",
        }}
      >
        <p style={{ margin: 0, color: "#6b7280", fontSize: "16px" }}>
          Loading client portal...
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
          const errorBody = await response.json().catch(() => null);
          console.log("[client_portals] Portal not found", {
            slug,
            status: response.status,
            errorBody,
          });
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

  if (!slug || loading) {
    return <PortalLoadingState />;
  }

  if (notFound || !portalData) {
    return <PortalNotFound />;
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
    <RequestForm
      stores={portalData.stores as Store[]}
      portalConfig={{
        slug: portalData.portal.slug,
        companyName: portalData.portal.companyName,
      }}
      onSuccess={(number) => {
        setRequestNumber(number);
        setSubmitted(true);
      }}
    />
  );
}
