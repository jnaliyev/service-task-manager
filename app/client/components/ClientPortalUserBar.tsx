"use client";

import { az } from "@/app/client/i18n/az";
import ClientBrandMark from "@/app/components/ClientBrandMark";
import type { ClientPortalSession } from "@/lib/clientPortals/clientSession";

type ClientPortalUserBarProps = {
  session: ClientPortalSession;
  companyName: string;
  logoUrl?: string | null;
  onLogout: () => void;
};

export default function ClientPortalUserBar({
  session,
  companyName,
  logoUrl = null,
  onLogout,
}: ClientPortalUserBarProps) {
  return (
    <div className="portal-user-bar">
      <div className="portal-user-bar-client">
        <ClientBrandMark name={companyName} logoUrl={logoUrl} size="sm" />
        <span className="portal-user-bar-client-name">{companyName}</span>
      </div>
      <div className="portal-user-bar-info">
        <span className="portal-user-bar-name">{session.fullName}</span>
        <span className="portal-user-bar-email">{session.username}</span>
      </div>
      <button
        type="button"
        className="portal-btn-secondary portal-btn-secondary--compact"
        onClick={onLogout}
      >
        {az.logout}
      </button>
    </div>
  );
}
