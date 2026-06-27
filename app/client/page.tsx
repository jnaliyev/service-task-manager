"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import RequestForm, { type Store } from "./components/RequestForm";
import SuccessScreen from "./components/SuccessScreen";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ClientPortalPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [requestNumber, setRequestNumber] = useState("");

  useEffect(() => {
    async function loadStores() {
      const { data, error } = await supabase
        .from("stores")
        .select("id, company_name, store_name, location, store_code")
        .order("company_name", { ascending: true })
        .order("store_name", { ascending: true });

      if (error) {
        console.error("Error loading stores:", error);
        return;
      }

      setStores(data || []);
    }

    loadStores();
  }, []);

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
      stores={stores}
      onSuccess={(number) => {
        setRequestNumber(number);
        setSubmitted(true);
      }}
    />
  );
}
