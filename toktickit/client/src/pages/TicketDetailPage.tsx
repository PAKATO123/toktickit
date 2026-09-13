import React, { useState, useEffect, useRef } from "react";
import { Link, useParams, useLocation, useNavigate } from "react-router-dom";
import { useRequester } from "../context/RequesterContext";
import { useAuth } from "../context/AuthContext";
import {
  getTicketDetail,
  addAttachmentToTicket,
  deleteAttachment,
  getAttachmentDownloadUrl,
  getAttachmentPreviewUrl,
  requestResolutionIndication,
  TicketDetailData,
  AttachmentMeta,
} from "../api";

const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB (BR-27)

export const TicketDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const { selectedRequester } = useRequester();
  const { user } = useAuth();

  const [ticket, setTicket] = useState<TicketDetailData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Attachment Management States
  const [uploadingAttachment, setUploadingAttachment] = useState<boolean>(false);
  const [attachmentActionError, setAttachmentActionError] = useState<string | null>(null);

  // Modals
  const [previewAttachment, setPreviewAttachment] = useState<AttachmentMeta | null>(null);
  const [removingAttachment, setRemovingAttachment] = useState<AttachmentMeta | null>(null);
  const [removalReasonInput, setRemovalReasonInput] = useState<string>("");
  const [submittingRemoval, setSubmittingRemoval] = useState<boolean>(false);
  const [showResolveModal, setShowResolveModal] = useState<boolean>(false);
  const [submittingResolution, setSubmittingResolution] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [toastMessage, setToastMessage] = useState<string | null>(
    (location.state as { toastMessage?: string })?.toastMessage || null
  );

  const currentRequesterId = selectedRequester?.id || user?.id;

  // Track initial requester ID to detect requester switches (BR-07)
  const initialRequesterIdRef = useRef<number | null>(currentRequesterId || null);

  // BR-07: Redirect to /tickets if requester context changes while on detail page
  useEffect(() => {
    if (selectedRequester && initialRequesterIdRef.current !== null && selectedRequester.id !== initialRequesterIdRef.current) {
      navigate("/tickets");
    }
  }, [selectedRequester, navigate]);

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const loadTicket = async () => {
    if (!id || !currentRequesterId) return;

    setLoading(true);
    setErrorStatus(null);
    setErrorMessage(null);

    try {
      const data = await getTicketDetail(id, currentRequesterId);
      setTicket(data);
    } catch (err: any) {
      console.error("Error fetching ticket detail:", err);
      setErrorStatus(err.status || 500);
      setErrorMessage(err.message || "Unable to load ticket details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTicket();
  }, [id, selectedRequester]);

  // Handle Add Attachment File Picker
  const handleAddAttachmentClick = () => {
    setAttachmentActionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !ticket || !selectedRequester) return;

    const file = files[0];
    e.target.value = ""; // reset file input

    // Pre-validation checks (AC-20, AC-21)
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setAttachmentActionError("Unsupported file type. Only JPG, PNG, WEBP, and PDF files are allowed.");
      return;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      setAttachmentActionError("File size exceeds the 5 MB limit.");
      return;
    }

    setUploadingAttachment(true);
    setAttachmentActionError(null);

    try {
      await addAttachmentToTicket(ticket.id, selectedRequester.id, file);
      // Reload ticket details to reflect new attachment
      const refreshed = await getTicketDetail(ticket.id, selectedRequester.id);
      setTicket(refreshed);
    } catch (err: any) {
      console.error("Error uploading attachment:", err);
      if (err.status === 409) {
        setAttachmentActionError("This ticket already has the maximum of 5 active attachments.");
      } else {
        setAttachmentActionError(err.message || "Failed to upload attachment.");
      }
    } finally {
      setUploadingAttachment(false);
    }
  };

  // Handle Attachment Removal Submission
  const handleConfirmRemoval = async () => {
    if (!removingAttachment || !ticket || !selectedRequester) return;
    const trimmedReason = removalReasonInput.trim();
    if (!trimmedReason) return;

    setSubmittingRemoval(true);
    try {
      await deleteAttachment(removingAttachment.id, selectedRequester.id, trimmedReason);
      setRemovingAttachment(null);
      setRemovalReasonInput("");
      // Refresh ticket details
      const refreshed = await getTicketDetail(ticket.id, selectedRequester.id);
      setTicket(refreshed);
    } catch (err: any) {
      console.error("Error removing attachment:", err);
      setAttachmentActionError(err.message || "Failed to remove attachment.");
      setRemovingAttachment(null);
    } finally {
      setSubmittingRemoval(false);
    }
  };

  const handleConfirmResolution = async () => {
    if (!ticket) return;
    setSubmittingResolution(true);
    try {
      const updated = await requestResolutionIndication(ticket.id);
      setTicket(updated);
      setShowResolveModal(false);
      setToastMessage("Resolution request submitted. IT support has been notified to verify.");
    } catch (err: any) {
      console.error("Error requesting resolution:", err);
      setAttachmentActionError(err.message || "Failed to submit resolution request.");
      setShowResolveModal(false);
    } finally {
      setSubmittingResolution(false);
    }
  };

  const activeAttachments = ticket?.attachments.filter((a) => !a.isDeleted) || [];
  const deletedAttachments = ticket?.attachments.filter((a) => a.isDeleted) || [];

  const renderPriorityBadge = (priority: string | null) => {
    if (!priority) {
      return <span style={{ color: "var(--color-text-muted)" }}>Unassigned (Omitted)</span>;
    }
    const up = priority.toUpperCase();
    if (up === "URGENT") return <span className="tt-badge tt-badge-urgent">Urgent</span>;
    if (up === "HIGH") return <span className="tt-badge tt-badge-high">High</span>;
    if (up === "MEDIUM") return <span className="tt-badge tt-badge-medium">Medium</span>;
    if (up === "LOW") return <span className="tt-badge tt-badge-low">Low</span>;
    return <span className="tt-badge">{priority}</span>;
  };

  const renderStatusBadge = (status: string, isRequesterResolved?: boolean) => {
    const lower = status.toLowerCase();
    if (isRequesterResolved || lower === "pending verification") {
      return (
        <span className="tt-badge" style={{ backgroundColor: "#FEFCBF", color: "#744210", border: "1px solid #D69E2E", fontWeight: 600 }}>
          Pending Verification
        </span>
      );
    }
    if (lower === "new") return <span className="tt-badge tt-badge-new">New</span>;
    if (lower === "open") return <span className="tt-badge" style={{ backgroundColor: "#EBF8FF", color: "#2B6CB0", border: "1px solid #63B3ED" }}>Open</span>;
    if (lower === "in progress") return <span className="tt-badge tt-badge-medium">In Progress</span>;
    if (lower === "waiting for requester") return <span className="tt-badge" style={{ backgroundColor: "#FEFCBF", color: "#744210", border: "1px solid #D69E2E" }}>Waiting for Requester</span>;
    if (lower === "reopened") return <span className="tt-badge" style={{ backgroundColor: "#FEE2E2", color: "#991B1B", border: "1px solid #F87171" }}>Reopened</span>;
    if (lower === "resolved") {
      return (
        <span className="tt-badge" style={{ backgroundColor: "#E6FFFA", color: "#234E52", border: "1px solid #319795" }}>
          Resolved
        </span>
      );
    }
    if (lower === "closed") {
      return (
        <span className="tt-badge" style={{ backgroundColor: "#EDF2F7", color: "#4A5568", border: "1px solid #CBD5E0" }}>
          Closed
        </span>
      );
    }
    return <span className="tt-badge">{status}</span>;
  };

  const formatDate = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto", position: "relative" }}>
      {/* Hidden file input for adding attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/jpeg,image/png,image/webp,application/pdf"
        style={{ display: "none" }}
      />

      {/* Success Toast Notification */}
      {toastMessage && (
        <div className="tt-toast" role="status">
          <span>✅</span>
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-primary-green)",
              fontWeight: "bold",
              cursor: "pointer",
              marginLeft: "12px",
              fontSize: "14px",
            }}
            title="Close notification"
          >
            ✕
          </button>
        </div>
      )}

      {/* Inline Preview Modal */}
      {previewAttachment && selectedRequester && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.65)",
            zIndex: 1100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setPreviewAttachment(null)}
        >
          <div
            className="tt-card"
            style={{
              maxWidth: "800px",
              maxHeight: "85vh",
              width: "100%",
              overflow: "auto",
              position: "relative",
              display: "flex",
              flexDirection: "column",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0 }}>Preview: {previewAttachment.fileName}</h3>
              <button
                type="button"
                className="tt-btn tt-btn-outline"
                onClick={() => setPreviewAttachment(null)}
                style={{ padding: "4px 10px" }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ textAlign: "center", flex: 1, overflow: "auto" }}>
              {previewAttachment.contentType.includes("pdf") ? (
                <object
                  data={getAttachmentPreviewUrl(previewAttachment.id, selectedRequester.id)}
                  type="application/pdf"
                  width="100%"
                  height="500px"
                >
                  <p>PDF preview unavailable in this browser. Use download button instead.</p>
                </object>
              ) : (
                <img
                  src={getAttachmentPreviewUrl(previewAttachment.id, selectedRequester.id)}
                  alt={previewAttachment.fileName}
                  style={{ maxWidth: "100%", maxHeight: "550px", borderRadius: "var(--radius-sm)", objectFit: "contain" }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Removal Reason Modal */}
      {removingAttachment && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div className="tt-card" style={{ maxWidth: "500px", width: "100%" }}>
            <h3 style={{ marginTop: 0, marginBottom: "8px" }}>Remove Attachment</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "16px" }}>
              Are you sure you want to remove <strong>{removingAttachment.fileName}</strong>? Please enter a reason below.
            </p>

            <div className="tt-form-group">
              <label className="tt-label" htmlFor="removal-reason-input">
                Removal Reason <span className="tt-required-asterisk">*</span>
              </label>
              <textarea
                id="removal-reason-input"
                className="tt-textarea"
                placeholder="Enter reason for removing this attachment..."
                value={removalReasonInput}
                onChange={(e) => setRemovalReasonInput(e.target.value)}
                style={{ height: "80px" }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", marginTop: "16px" }}>
              <button
                type="button"
                className="tt-btn tt-btn-outline"
                disabled={submittingRemoval}
                onClick={() => {
                  setRemovingAttachment(null);
                  setRemovalReasonInput("");
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tt-btn tt-btn-primary"
                style={{ backgroundColor: "var(--color-error)", borderColor: "var(--color-error)" }}
                disabled={!removalReasonInput.trim() || submittingRemoval}
                onClick={handleConfirmRemoval}
              >
                {submittingRemoval ? "Removing..." : "Confirm Removal"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <Link to="/tickets" style={{ fontSize: "14px", textDecoration: "none" }}>
          &larr; Back to My Tickets
        </Link>
      </div>

      {loading ? (
        <div className="tt-card tt-empty-state">
          <div className="tt-spinner" />
          <p style={{ marginTop: "12px" }}>Loading ticket details...</p>
        </div>
      ) : errorStatus === 403 ? (
        /* 403 Forbidden State View */
        <div className="tt-card tt-empty-state" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)" }}>
          <h2 style={{ color: "var(--color-error)", marginBottom: "8px" }}>403 Access Denied</h2>
          <p style={{ color: "var(--color-text-main)", marginBottom: "20px" }}>
            {errorMessage || "You do not have permission to view this ticket as it belongs to another requester."}
          </p>
          <Link to="/tickets" className="tt-btn tt-btn-primary">
            Return to My Tickets
          </Link>
        </div>
      ) : errorStatus === 404 ? (
        /* 404 Not Found State View */
        <div className="tt-card tt-empty-state">
          <h2 style={{ marginBottom: "8px" }}>404 Ticket Not Found</h2>
          <p style={{ color: "var(--color-text-muted)", marginBottom: "20px" }}>
            {errorMessage || "The requested ticket could not be found."}
          </p>
          <Link to="/tickets" className="tt-btn tt-btn-primary">
            Return to My Tickets
          </Link>
        </div>
      ) : errorStatus ? (
        /* General API Error View */
        <div className="tt-card tt-empty-state" style={{ backgroundColor: "var(--color-error-bg)", borderColor: "var(--color-error)" }}>
          <h3 style={{ color: "var(--color-error)" }}>Unable to load ticket details</h3>
          <p>{errorMessage}</p>
          <Link to="/tickets" className="tt-btn tt-btn-outline" style={{ marginTop: "12px" }}>
            Return to My Tickets
          </Link>
        </div>
      ) : ticket ? (
        /* Read-Only Ticket Detail Screen (FR-23, AC-37) */
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "16px" }}>
            <div>
              <h1 style={{ marginBottom: "4px" }}>Ticket #{ticket.ticketNumber}</h1>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                {renderStatusBadge(ticket.currentStatus, ticket.isRequesterResolved)}
                {renderPriorityBadge(ticket.requestedPriority)}
              </div>
            </div>

            {/* Resolution Indication Button for Ticket Owner (F-06) */}
            {ticket.requesterId === (user?.id || selectedRequester?.id) && (
              <div>
                {ticket.isRequesterResolved || ticket.currentStatus === "Pending Verification" ? (
                  <button
                    type="button"
                    className="tt-btn tt-btn-outline"
                    disabled
                    data-testid="resolution-requested-badge"
                    style={{ backgroundColor: "#F7FAFC", color: "#4A5568", borderColor: "#CBD5E0", cursor: "not-allowed" }}
                  >
                    Resolution Requested ✓
                  </button>
                ) : !["Closed", "Resolved", "Cancelled"].includes(ticket.currentStatus) && (
                  <button
                    type="button"
                    className="tt-btn tt-btn-primary"
                    data-testid="request-resolution-button"
                    onClick={() => setShowResolveModal(true)}
                  >
                    I consider this issue resolved
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="tt-card">
            {/* 3 Read-Only Fields (Ticket Number, Requester Name, Requester ID) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Ticket #</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={ticket.ticketNumber} />
              </div>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Requester Name</label>
                <input
                  type="text"
                  className="tt-input tt-readonly"
                  readOnly
                  value={ticket.requester?.name || selectedRequester?.name || "N/A"}
                />
              </div>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Requester ID</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={String(ticket.requesterId)} />
              </div>
            </div>

            {/* Category, Related System, and Requested Priority Grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "20px" }}>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Category</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={ticket.category.name} />
              </div>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Related System</label>
                <input type="text" className="tt-input tt-readonly" readOnly value={ticket.relatedSystem.name} />
              </div>
              <div className="tt-form-group" style={{ marginBottom: 0 }}>
                <label className="tt-label">Requested Priority</label>
                <input
                  type="text"
                  className="tt-input tt-readonly"
                  readOnly
                  value={ticket.requestedPriority || "Unassigned"}
                />
              </div>
            </div>

            {/* Summary */}
            <div className="tt-form-group">
              <label className="tt-label">Summary</label>
              <input type="text" className="tt-input tt-readonly" readOnly value={ticket.summary} />
            </div>

            {/* Description */}
            <div className="tt-form-group">
              <label className="tt-label">Description</label>
              <textarea className="tt-textarea tt-readonly" readOnly value={ticket.description} />
            </div>

            {/* Timestamps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px", paddingTop: "16px", borderTop: "1px solid var(--color-border)" }}>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Submitted On:</span>
                <p style={{ margin: "2px 0 0 0", fontWeight: 500 }}>{formatDate(ticket.createdAt)}</p>
              </div>
              <div>
                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>Last Updated:</span>
                <p style={{ margin: "2px 0 0 0", fontWeight: 500 }}>{formatDate(ticket.updatedAt)}</p>
              </div>
            </div>

            {/* Attachment Management Section (Feature 10) */}
            <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "1px solid var(--color-border)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ fontSize: "16px", margin: 0 }}>
                  Attachments ({activeAttachments.length} / 5 active)
                </h3>
                <button
                  type="button"
                  className="tt-btn tt-btn-outline"
                  disabled={activeAttachments.length >= 5 || uploadingAttachment}
                  onClick={handleAddAttachmentClick}
                  style={{ fontSize: "13px", height: "34px" }}
                  title={activeAttachments.length >= 5 ? "Maximum of 5 active attachments reached" : "Upload new attachment"}
                >
                  {uploadingAttachment ? "Uploading..." : "+ Add Attachment"}
                </button>
              </div>

              {attachmentActionError && (
                <div
                  style={{
                    backgroundColor: "var(--color-error-bg)",
                    border: "1px solid var(--color-error)",
                    color: "var(--color-error)",
                    padding: "8px 12px",
                    borderRadius: "var(--radius-sm)",
                    marginBottom: "12px",
                    fontSize: "13px",
                  }}
                >
                  {attachmentActionError}
                </div>
              )}

              {/* Active Attachments */}
              {activeAttachments.length === 0 && deletedAttachments.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>
                  No attachments uploaded for this ticket.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {activeAttachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--color-surface)",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span style={{ fontSize: "18px" }}>{att.contentType.includes("pdf") ? "📄" : "🖼️"}</span>
                        <div>
                          {/* Click filename to Preview (Feature 10) */}
                          <button
                            type="button"
                            onClick={() => setPreviewAttachment(att)}
                            style={{
                              background: "none",
                              border: "none",
                              padding: 0,
                              margin: 0,
                              fontWeight: 600,
                              fontSize: "14px",
                              color: "var(--color-primary-green)",
                              textDecoration: "underline",
                              cursor: "pointer",
                              textAlign: "left",
                            }}
                            title="Click to preview attachment"
                          >
                            {att.fileName}
                          </button>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                            {formatFileSize(att.fileSize)} · Uploaded {formatDate(att.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                        {selectedRequester && (
                          <a
                            href={getAttachmentDownloadUrl(att.id, selectedRequester.id)}
                            download={att.fileName}
                            className="tt-btn tt-btn-outline"
                            style={{ fontSize: "12px", height: "30px", padding: "0 10px", textDecoration: "none" }}
                          >
                            Download
                          </a>
                        )}
                        <button
                          type="button"
                          className="tt-btn tt-btn-outline"
                          onClick={() => {
                            setRemovingAttachment(att);
                            setRemovalReasonInput("");
                          }}
                          style={{
                            fontSize: "12px",
                            height: "30px",
                            padding: "0 10px",
                            borderColor: "var(--color-error)",
                            color: "var(--color-error)",
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Soft-Removed Attachments — Requester Perspective (Bottom of List) */}
                  {deletedAttachments.map((att) => (
                    <div
                      key={att.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        border: "1px dashed var(--color-border)",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "#F7FAFC",
                        color: "var(--color-text-muted)",
                        opacity: 0.85,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        {/* Red X Cross Icon */}
                        <span style={{ fontSize: "16px", color: "var(--color-error)" }} title="Attachment Removed">
                          ❌
                        </span>
                        <div>
                          <p style={{ margin: 0, fontWeight: 500, fontSize: "14px", textDecoration: "line-through", color: "var(--color-text-muted)" }}>
                            {att.fileName}
                          </p>
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
                            {formatFileSize(att.fileSize)} · Removed {att.deletedAt ? formatDate(att.deletedAt) : ""}
                            {att.removalReason && (
                              <span style={{ fontStyle: "italic", marginLeft: "6px" }}>
                                — Reason: &quot;{att.removalReason}&quot;
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <span style={{ fontSize: "12px", fontStyle: "italic", color: "var(--color-text-muted)" }}>
                        [Removed]
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      {/* Resolution Indication Confirmation Modal */}
      {showResolveModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            zIndex: 1100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          data-testid="resolution-confirmation-modal"
        >
          <div className="tt-card" style={{ maxWidth: "460px", width: "100%", margin: 0 }}>
            <h3 style={{ marginTop: 0, marginBottom: "10px" }}>Request Ticket Resolution</h3>
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px", marginBottom: "20px", lineHeight: "1.5" }}>
              Are you sure you consider this issue resolved? Your IT support team will be notified to verify and close the ticket.
            </p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
              <button
                type="button"
                className="tt-btn tt-btn-outline"
                data-testid="cancel-resolution-button"
                onClick={() => setShowResolveModal(false)}
                disabled={submittingResolution}
              >
                Cancel
              </button>
              <button
                type="button"
                className="tt-btn tt-btn-primary"
                data-testid="confirm-resolution-button"
                onClick={handleConfirmResolution}
                disabled={submittingResolution}
              >
                {submittingResolution ? "Submitting..." : "Yes, Mark as Resolved"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TicketDetailPage;
