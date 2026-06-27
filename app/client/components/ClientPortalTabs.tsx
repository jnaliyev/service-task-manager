"use client";

type ClientPortalTabsProps = {
  activeTab: "submit" | "requests";
  onChange: (tab: "submit" | "requests") => void;
  submitLabel: string;
  requestsLabel: string;
};

export default function ClientPortalTabs({
  activeTab,
  onChange,
  submitLabel,
  requestsLabel,
}: ClientPortalTabsProps) {
  return (
    <div className="portal-tabs">
      <button
        type="button"
        className={`portal-tab${activeTab === "submit" ? " portal-tab--active" : ""}`}
        onClick={() => onChange("submit")}
      >
        {submitLabel}
      </button>
      <button
        type="button"
        className={`portal-tab${activeTab === "requests" ? " portal-tab--active" : ""}`}
        onClick={() => onChange("requests")}
      >
        {requestsLabel}
      </button>
    </div>
  );
}
