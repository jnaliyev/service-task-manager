import type { Store } from "@/app/client/types/store";

export type ClientPortalRecord = {
  id: string;
  slug: string;
  company_name: string;
  client_id?: string | null;
  store_id: string | null;
  token: string | null;
  active: boolean;
  created_at: string;
};

export type ClientPortalConfig = {
  slug: string;
  companyName: string;
  clientId?: string | null;
  logoUrl?: string | null;
};

export type ClientPortalApiResponse = {
  portal: ClientPortalConfig;
  stores: Store[];
};

export type ClientPortalApiError = {
  error: string;
};
