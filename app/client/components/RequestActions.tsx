"use client";

import { useEffect, useRef, useState } from "react";
import { az } from "@/app/client/i18n/az";
import {
  getClientAuthHeaders,
  type ClientPortalSession,
} from "@/lib/clientPortals/clientSession";
import type { ClientRequestPermissions } from "@/lib/clientPortals/verifyClientTask";
import {
  isAcceptedClientPhoto,
  uploadClientPhotos,
} from "@/app/client/utils/clientPhotoUpload";
import { getAttachmentUrls } from "@/app/client/utils/requestDisplay";

type RequestActionsProps = {
  slug: string;
  requestId: string;
  issue: string;
  attachments?: string[] | string | null;
  permissions: ClientRequestPermissions;
  session: ClientPortalSession;
  onUpdated: () => void;
};

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;
};

function createPhotoItem(file: File): PhotoItem {
  return {
    id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    file,
    previewUrl: URL.createObjectURL(file),
  };
}

export default function RequestActions({
  slug,
  requestId,
  issue,
  attachments,
  permissions,
  session,
  onUpdated,
}: RequestActionsProps) {
  const [issueValue, setIssueValue] = useState(issue);
  const [photoItems, setPhotoItems] = useState<PhotoItem[]>([]);
  const [replacePhotos, setReplacePhotos] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const photoItemsRef = useRef(photoItems);
  photoItemsRef.current = photoItems;

  useEffect(() => {
    setIssueValue(issue);
    setReplacePhotos(false);
    setPhotoItems([]);
  }, [issue]);

  useEffect(() => {
    return () => {
      photoItemsRef.current.forEach((item) =>
        URL.revokeObjectURL(item.previewUrl)
      );
    };
  }, []);

  const existingPhotos = getAttachmentUrls(attachments);
  const uploadPercent = uploadProgress
    ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
    : 0;

  const hasAnyAction =
    permissions.canEdit ||
    permissions.canComment ||
    permissions.canUploadPhoto;

  if (!hasAnyAction) {
    return null;
  }

  async function handleSave() {
    setError("");
    setBusy(true);

    try {
      let nextAttachments = existingPhotos;

      if (replacePhotos) {
        const files = photoItems.map((item) => item.file);

        if (files.length > 0) {
          setUploadProgress({ current: 0, total: files.length });
          nextAttachments = await uploadClientPhotos(files, (current, total) => {
            setUploadProgress({ current, total });
          });
          setUploadProgress(null);
        } else {
          nextAttachments = [];
        }
      }

      const trimmedIssue = issueValue.trim();

      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getClientAuthHeaders(session),
          },
          body: JSON.stringify({
            issue: trimmedIssue,
            client_description: trimmedIssue,
            attachments: nextAttachments,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Save failed");
      }

      setReplacePhotos(false);
      setPhotoItems([]);
      onUpdated();
    } catch (saveError) {
      console.error(saveError);
      setError(az.actionError);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  async function handleCancelRequest() {
    if (!window.confirm(az.confirmCancel)) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...getClientAuthHeaders(session),
          },
          body: JSON.stringify({ cancel: true }),
        }
      );

      if (!response.ok) {
        throw new Error("Cancel failed");
      }

      onUpdated();
    } catch (cancelError) {
      console.error(cancelError);
      setError(az.actionError);
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteRequest() {
    if (!window.confirm(az.confirmDelete)) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}`,
        { method: "DELETE", headers: getClientAuthHeaders(session) }
      );

      if (!response.ok) {
        throw new Error("Delete failed");
      }

      window.location.href = `/client/${slug}`;
    } catch (deleteError) {
      console.error(deleteError);
      setError(az.actionError);
      setBusy(false);
    }
  }

  async function handleAddComment() {
    const comment = commentText.trim();

    if (!comment) return;

    setError("");
    setBusy(true);

    try {
      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/comments`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getClientAuthHeaders(session),
          },
          body: JSON.stringify({ comment }),
        }
      );

      if (!response.ok) {
        throw new Error("Comment failed");
      }

      setCommentText("");
      onUpdated();
    } catch (commentError) {
      console.error(commentError);
      setError(az.actionError);
    } finally {
      setBusy(false);
    }
  }

  async function handleAdditionalPhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!isAcceptedClientPhoto(file)) {
      setError(az.invalidImageType);
      event.target.value = "";
      return;
    }

    setError("");
    setBusy(true);

    try {
      setUploadProgress({ current: 0, total: 1 });
      const [photoUrl] = await uploadClientPhotos([file], (current, total) => {
        setUploadProgress({ current, total });
      });
      setUploadProgress(null);

      const response = await fetch(
        `/api/client-portals/${slug}/requests/${requestId}/photos`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getClientAuthHeaders(session),
          },
          body: JSON.stringify({ photoUrl }),
        }
      );

      if (!response.ok) {
        throw new Error("Photo upload failed");
      }

      event.target.value = "";
      onUpdated();
    } catch (photoError) {
      console.error(photoError);
      setError(az.actionError);
    } finally {
      setBusy(false);
      setUploadProgress(null);
    }
  }

  function handlePhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    const validFiles = files.filter(isAcceptedClientPhoto);

    if (validFiles.length !== files.length) {
      setError(az.invalidImageType);
    } else {
      setError("");
    }

    if (validFiles.length === 0) {
      event.target.value = "";
      return;
    }

    setReplacePhotos(true);
    setPhotoItems((current) => [
      ...current,
      ...validFiles.map(createPhotoItem),
    ]);
    event.target.value = "";
  }

  function removePhoto(id: string) {
    setPhotoItems((current) => {
      const item = current.find((photo) => photo.id === id);

      if (item) {
        URL.revokeObjectURL(item.previewUrl);
      }

      return current.filter((photo) => photo.id !== id);
    });
    setReplacePhotos(true);
  }

  return (
    <div className="portal-request-actions">
      <h2 style={sectionTitleStyle}>{az.manageRequestTitle}</h2>

      {error && <p style={errorStyle}>{error}</p>}

      {permissions.canEdit && (
        <div className="portal-request-actions-edit">
          <label style={labelStyle}>
            {az.issueDescription}
            <textarea
              value={issueValue}
              onChange={(event) => setIssueValue(event.target.value)}
              disabled={busy}
              rows={3}
              style={textareaStyle}
            />
          </label>

          <div style={{ marginTop: "16px" }}>
            <p style={labelStyle}>{az.replacePhotosLabel}</p>
            <label className="portal-upload-area">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={busy}
                onChange={handlePhotoChange}
                style={{ display: "none" }}
              />
              <span style={uploadTitleStyle}>{az.choosePhotos}</span>
              <span style={uploadHintStyle}>{az.uploadHint}</span>
            </label>

            {uploadProgress && permissions.canEdit && (
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

            {!replacePhotos && existingPhotos.length > 0 && (
              <div className="portal-request-photo-grid" style={{ marginTop: 12 }}>
                {existingPhotos.map((photoUrl) => (
                  <img
                    key={photoUrl}
                    src={photoUrl}
                    alt=""
                    className="portal-request-photo"
                  />
                ))}
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
                      disabled={busy}
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

          <div className="portal-request-actions-buttons">
            <button
              type="button"
              className="portal-btn-primary"
              disabled={busy || !issueValue.trim()}
              onClick={() => void handleSave()}
            >
              {busy ? az.saving : az.saveChanges}
            </button>
            <button
              type="button"
              className="portal-btn-secondary"
              disabled={busy}
              onClick={() => void handleCancelRequest()}
            >
              {az.cancelRequest}
            </button>
            <button
              type="button"
              className="portal-btn-secondary portal-btn-danger"
              disabled={busy}
              onClick={() => void handleDeleteRequest()}
            >
              {az.deleteRequest}
            </button>
          </div>
        </div>
      )}

      {(permissions.canComment || permissions.canUploadPhoto) && (
        <div className="portal-request-actions-locked">
          {permissions.canComment && (
            <label style={labelStyle}>
              {az.addComment}
              <textarea
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                disabled={busy}
                rows={3}
                placeholder={az.commentPlaceholder}
                style={textareaStyle}
              />
            </label>
          )}

          {permissions.canComment && (
            <button
              type="button"
              className="portal-btn-primary"
              disabled={busy || !commentText.trim()}
              onClick={() => void handleAddComment()}
            >
              {busy ? az.saving : az.addComment}
            </button>
          )}

          {permissions.canUploadPhoto && (
            <div style={{ marginTop: permissions.canComment ? 16 : 0 }}>
              <p style={labelStyle}>{az.uploadAdditionalPhoto}</p>
              <label className="portal-upload-area">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(event) => void handleAdditionalPhotoChange(event)}
                  style={{ display: "none" }}
                />
                <span style={uploadTitleStyle}>{az.choosePhotos}</span>
                <span style={uploadHintStyle}>{az.uploadHint}</span>
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const sectionTitleStyle: React.CSSProperties = {
  margin: 0,
  color: "#111827",
  fontSize: "18px",
  fontWeight: 700,
};

const labelStyle: React.CSSProperties = {
  display: "block",
  margin: "0 0 12px",
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const textareaStyle: React.CSSProperties = {
  display: "block",
  width: "100%",
  marginTop: "8px",
  padding: "12px 14px",
  border: "1px solid #d1d5db",
  borderRadius: "12px",
  fontSize: "15px",
  lineHeight: 1.5,
  color: "#111827",
  background: "#ffffff",
  resize: "vertical",
  boxSizing: "border-box",
};

const errorStyle: React.CSSProperties = {
  margin: "0 0 12px",
  color: "#b91c1c",
  fontSize: "14px",
};

const uploadTitleStyle: React.CSSProperties = {
  fontSize: "15px",
  fontWeight: 600,
  color: "#111827",
};

const uploadHintStyle: React.CSSProperties = {
  fontSize: "13px",
  color: "#6b7280",
};
