"use client";

import { az } from "@/app/client/i18n/az";
import type { ClientPortalSession } from "@/lib/clientPortals/clientSession";

type ClientPortalUserBarProps = {
  session: ClientPortalSession;
  onLogout: () => void;
};

export default function ClientPortalUserBar({
  session,
  onLogout,
}: ClientPortalUserBarProps) {
  return (
    <div className="portal-user-bar">
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
