"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ClientPortalConfig } from "@/app/client/types/portal";
import { az } from "@/app/client/i18n/az";
import { buildClientCreatedBy } from "@/lib/clientPortals/clientSession";
import CompanySelect from "./CompanySelect";
import StoreSelect from "./StoreSelect";

import type { Store } from "@/app/client/types/store";

export type { Store };

type ClientRequestForm = {
  company: string;
  store: string;
  description: string;
};

type ClientAiAnalysis = {
  ai_category: string;
  ai_department: string;
  ai_priority: string;
  ai_summary: string;
  ai_confidence: number;
};

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

const initialFormState: ClientRequestForm = {
  company: "",
  store: "",
  description: "",
};

const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ATTACHMENTS_BUCKET = "client-attachments";

async function uploadSelectedPhotos(
  files: File[],
  onProgress?: (completed: number, total: number) => void
): Promise<string[]> {
  const uploadedUrls: string[] = [];

  for (let index = 0; index < files.length; index += 1) {
    const file = files[index];
    const filePath = `client-requests/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(ATTACHMENTS_BUCKET)
      .getPublicUrl(filePath);

    uploadedUrls.push(data.publicUrl);
    onProgress?.(index + 1, files.length);
  }

  return uploadedUrls;
}

type RequestFormProps = {
  stores: Store[];
  onSuccess: (requestNumber: string) => void;
  portalConfig?: ClientPortalConfig | null;
  clientUser?: {
    fullName: string;
    username: string;
  } | null;
};

function createInitialFormState(
  portalConfig?: ClientPortalConfig | null
): ClientRequestForm {
  if (portalConfig) {
    return {
      ...initialFormState,
      company: portalConfig.companyName,
    };
  }

  return initialFormState;
}

function createPhotoItem(file: File): PhotoItem {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export default function RequestForm({
  stores,
  onSuccess,
  portalConfig = null,
  clientUser = null,
}: RequestFormProps) {
  const isPortalMode = Boolean(portalConfig);
  const [form, setForm] = useState<ClientRequestForm>(() =>
    createInitialFormState(portalConfig)
  );
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitPhase, setSubmitPhase] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const photoItemsRef = useRef(photoItems);
  photoItemsRef.current = photoItems;

  useEffect(() => {
    if (!portalConfig) return;

    setForm(createInitialFormState(portalConfig));
  }, [portalConfig]);

  useEffect(() => {
    return () => {
      photoItemsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl)
      );
    };
  }, []);

  const companies = useMemo(() => {
    const uniqueCompanies = new Set<string>();

    stores.forEach((store) => {
      const companyName = (store.company_name || "").trim();

      if (companyName) {
        uniqueCompanies.add(companyName);
      }
    });

    return Array.from(uniqueCompanies).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );
  }, [stores]);

  const filteredStores = useMemo(() => {
    const companyName = portalConfig?.companyName || form.company;

    if (!companyName) return [];

    return stores
      .filter((store) => store.company_name === companyName)
      .filter((store) => (store.store_name || "").trim() !== "")
      .sort((a, b) =>
        (a.store_name || "").localeCompare(b.store_name || "", undefined, {
          sensitivity: "base",
        })
      );
  }, [stores, form.company, portalConfig?.companyName]);

  const uploadPercent = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  function handleChange(
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "company" ? { store: "" } : {}),
    }));
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files) return;

    const incomingFiles = Array.from(files);
    const validFiles = incomingFiles.filter((file) =>
      ACCEPTED_IMAGE_TYPES.includes(file.type)
    );

    if (validFiles.length < incomingFiles.length) {
      alert(az.invalidImageType);
    }

    if (validFiles.length > 0) {
      setPhotoItems((prev) => [
        ...prev,
        ...validFiles.map((file) => createPhotoItem(file)),
      ]);
    }

    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotoItems((prev) => {
      const item = prev.find((photo) => photo.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return prev.filter((photo) => photo.id !== id);
    });
  }

  function clearPhotos() {
    photoItems.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    setPhotoItems([]);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const companyName = portalConfig?.companyName || form.company;
    const storeName = form.store;
    const clientDescription = form.description.trim();
    const selectedPhotos = photoItems.map((item) => item.file);

    if (!companyName || !storeName || !clientDescription) {
      alert(isPortalMode ? az.validationPortal : az.validationDefault);
      return;
    }

    const selectedStore = stores.find(
      (store) =>
        store.company_name === companyName && store.store_name === storeName
    );

    setIsSubmitting(true);

    try {
      let attachments: string[] = [];

      if (selectedPhotos.length > 0) {
        setSubmitPhase(az.uploadingPhotos);
        setUploadProgress({ current: 0, total: selectedPhotos.length });

        attachments = await uploadSelectedPhotos(selectedPhotos, (current, total) => {
          setUploadProgress({ current, total });
        });

        setUploadProgress(null);
      }

      setSubmitPhase(az.analyzingRequest);

      console.log("[Client Submit] before AI analyze");

      const analyzeResponse = await fetch("/api/ai/analyze-client-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          issue: clientDescription,
          attachments,
        }),
      });

      console.log("[Client Submit] AI analyze response:", analyzeResponse.status);

      if (!analyzeResponse.ok) {
        throw new Error("AI analysis failed");
      }

      const aiResult = (await analyzeResponse.json()) as ClientAiAnalysis;

      setSubmitPhase(az.submittingRequest);

      const taskPayload = {
        store: storeName,
        company_name: companyName,
        location: selectedStore?.location || "",
        store_id: selectedStore?.id || null,
        issue: clientDescription,
        client_description: clientDescription,
        status: "Open",
        category: aiResult.ai_category,
        department: aiResult.ai_department,
        priority: aiResult.ai_priority,
        due_date: null,
        employee_id: null,
        technician: "",
        created_by: isPortalMode
          ? clientUser
            ? buildClientCreatedBy(
                portalConfig?.companyName || companyName,
                clientUser.fullName,
                clientUser.username
              )
            : `Client Portal - ${portalConfig?.companyName}`
          : "Client Portal",
        attachments,
        ai_category: aiResult.ai_category,
        ai_department: aiResult.ai_department,
        ai_priority: aiResult.ai_priority,
        ai_summary: aiResult.ai_summary,
        ai_confidence: aiResult.ai_confidence,
      };

      console.log("[Client Submit] before task create", taskPayload);

      const response = await fetch("/api/tasks/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(taskPayload),
      });

      console.log("[Client Submit] task create response:", response.status);

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const result = await response.json();

      onSuccess(
        `RS-${new Date().getFullYear()}-${String(result.task.id).padStart(6, "0")}`
      );

      setForm(createInitialFormState(portalConfig));
      clearPhotos();
    } catch (error) {
      console.error(error);
      alert(az.submitError);
    } finally {
      setIsSubmitting(false);
      setSubmitPhase("");
      setUploadProgress(null);
    }
  }

  return (
    <main className="portal-page">
      <section className="portal-card">
        <div style={headerStyle}>
          <div style={logoStyle}>RS</div>
          <p style={eyebrowStyle}>{az.brand}</p>
          <h1 style={titleStyle}>{az.portalTitle}</h1>
          <p style={subtitleStyle}>
            {isPortalMode
              ? az.portalSubtitlePortal(portalConfig?.companyName || "")
              : az.portalSubtitleDefault}
          </p>
        </div>

        {isPortalMode && (
          <div style={companyBadgeStyle}>
            <p style={companyBadgeLabelStyle}>{az.company}</p>
            <p style={companyBadgeValueStyle}>{portalConfig?.companyName}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={formStyle}>
          {!isPortalMode && (
            <CompanySelect
              companies={companies}
              value={form.company}
              onChange={handleChange}
              disabled={isSubmitting}
            />
          )}

          <StoreSelect
            filteredStores={filteredStores}
            company={portalConfig?.companyName || form.company}
            value={form.store}
            onChange={handleChange}
            disabled={isSubmitting}
          />

          <div>
            <label style={labelStyle}>{az.issueDescription}</label>
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              required
              disabled={isSubmitting}
              placeholder={az.issuePlaceholder}
              className="portal-field-textarea"
            />
          </div>

          <div>
            <label style={labelStyle}>{az.uploadPhotos}</label>
            <label className="portal-upload-area">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={isSubmitting}
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <span style={uploadTitleStyle}>{az.choosePhotos}</span>
              <span style={uploadHintStyle}>{az.uploadHint}</span>
            </label>

            {uploadProgress && (
              <div className="portal-upload-progress">
                <div className="portal-upload-progress-label">
                  <span>{az.uploadingPhotos}</span>
                  <span>
                    {az.uploadProgress(
                      uploadProgress.current,
                      uploadProgress.total
                    )}
                  </span>
                </div>
                <div className="portal-upload-progress-track">
                  <div
                    className="portal-upload-progress-fill"
                    style={{ width: `${uploadPercent}%` }}
                  />
                </div>
              </div>
            )}

            {photoItems.length > 0 && (
              <div className="portal-photo-grid">
                {photoItems.map((item) => (
                  <div key={item.id} className="portal-photo-preview">
                    <img src={item.previewUrl} alt={item.file.name} />
                    <button
                      type="button"
                      className="portal-photo-remove"
                      disabled={isSubmitting}
                      onClick={() => removePhoto(item.id)}
                      aria-label={az.removePhoto}
                      title={az.removePhoto}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="portal-btn-primary"
          >
            {isSubmitting ? submitPhase || az.submitting : az.submit}
          </button>
        </form>
      </section>
    </main>
  );
}

const headerStyle: React.CSSProperties = {
  textAlign: "center",
  marginBottom: "32px",
};

const logoStyle: React.CSSProperties = {
  width: "56px",
  height: "56px",
  borderRadius: "18px",
  background: "#111827",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontWeight: 800,
  fontSize: "18px",
  margin: "0 auto 16px",
  letterSpacing: "0.5px",
};

const eyebrowStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

const titleStyle: React.CSSProperties = {
  margin: "8px 0 12px",
  color: "#111827",
  fontSize: "clamp(1.75rem, 5vw, 2rem)",
  lineHeight: 1.15,
  letterSpacing: "-0.02em",
};

const subtitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#6b7280",
  fontSize: "15px",
  lineHeight: 1.55,
};

const companyBadgeStyle: React.CSSProperties = {
  background: "#f9fafb",
  border: "1px solid #e5e7eb",
  borderRadius: "18px",
  padding: "16px 18px",
  marginBottom: "24px",
};

const companyBadgeLabelStyle: React.CSSProperties = {
  margin: "0 0 4px",
  fontSize: "11px",
  fontWeight: 700,
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const companyBadgeValueStyle: React.CSSProperties = {
  margin: 0,
  fontSize: "16px",
  fontWeight: 600,
  color: "#111827",
};

const formStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "10px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};

const uploadTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#111827",
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
  lineHeight: 1.45,
};
