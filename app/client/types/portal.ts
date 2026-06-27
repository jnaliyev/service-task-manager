export type ClientPortalRecord = {
  id: string;
  slug: string;
  company_name: string;
  store_id: string | null;
  token: string | null;
  active: boolean;
  created_at: string;
};

export type ClientPortalConfig = {
  slug: string;
  companyName: string;
};

export type ClientPortalApiResponse = {
  portal: ClientPortalConfig;
  stores: import("@/app/client/components/RequestForm").Store[];
};

export type ClientPortalApiError = {
  error: string;
};
