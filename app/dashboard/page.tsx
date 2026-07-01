"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";

import TaskMobileCard from "../components/TaskMobileCard";
import TaskTable from "../components/TaskTable";
import TaskForm from "../components/TaskForm";
import AIAnalysisCard from "../components/AIAnalysisCard";
import NotificationBell from "./components/NotificationBell";
import DashboardKpiCard from "./components/DashboardKpiCard";
import ClientRequestToast from "./components/ClientRequestToast";
import ErpMessageToast from "./components/ErpMessageToast";
import TaskMessagesPanel, {
  subscribeToClientMessageNotifications,
} from "./components/TaskMessagesPanel";
import { useClientRequestRealtime } from "./hooks/useClientRequestRealtime";
import type { ClientRequestNotification } from "./hooks/useClientRequestRealtime";
import "./dashboard-realtime.css";
import {
  playNotificationSound,
  unlockNotificationSound,
} from "@/lib/notifications/playNotificationSound";
import { WORKFLOW_LABELS, type WorkflowStatus } from "@/lib/workflow";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  is_active: boolean;
};

type Task = {
  id: number;
  store_id?: number | null;
  store: string;
  issue: string;
 technician: string;
 company_name?: string;
location?: string;
  status: string;
  workflow_status?: string | null;
  accepted_at?: string | null;
  inspection_at?: string | null;
  quotation_sent_at?: string | null;
  approved_at?: string | null;
  category?: string;
  department?: string;
assigned_to?: string;
created_by?: string;
  priority?: string;
  due_date?: string;
  employee_id?: string;
  created_at?: string;
  employees?: Employee;
  task_assignments?: {
    employee_id: string;
    employees?: {
      full_name: string;
    };
  }[];

  stores?: {
    company_name: string;
    store_name: string;
    location: string;
    clients?: { client_name: string | null } | null;
  };
  attachments?: string[] | string | null;
  client_description?: string | null;
  ai_category?: string | null;
  ai_department?: string | null;
  ai_priority?: string | null;
  ai_summary?: string | null;
  ai_confidence?: number | null;
};
type Comment = {
  id: string;
  task_id: string;
  comment: string;
  author: string;
  created_at?: string;
};
type Photo = {
  id: string;
  task_id: number;
  photo_url: string;
  author: string;
  created_at?: string;
};
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type TaskStoreRecord = {
  id: number;
  company_name?: string | null;
  store_name?: string | null;
  location?: string | null;
  store_code?: string | null;
  client_id?: number | string | null;
  clients?: { client_name: string | null } | { client_name: string | null }[] | null;
};

type TaskClientOption = {
  id: number | string;
  client_name: string | null;
};

function normalizeJoinedClient(
  clients: TaskStoreRecord["clients"]
): { client_name: string | null } | null {
  if (!clients) return null;
  return Array.isArray(clients) ? clients[0] ?? null : clients;
}

function getStoreClientName(store: TaskStoreRecord): string {
  const clientName = normalizeJoinedClient(store.clients)?.client_name?.trim();
  return clientName || store.company_name?.trim() || "";
}

function getTaskCompanyName(task: Task): string {
  const clientName = normalizeJoinedClient(
    (task.stores as TaskStoreRecord | undefined)?.clients
  )?.client_name?.trim();

  if (clientName) return clientName;

  const storeCompanyName = task.stores?.company_name?.trim();
  if (storeCompanyName) return storeCompanyName;

  return task.company_name?.trim() || "";
}

type TaskStoreLookup = {
  id: number;
  store_name: string | null;
  location: string | null;
  company_name: string | null;
  client_id: number | string | null;
};

type TaskClientLookup = {
  id: number | string;
  client_name: string | null;
};

function attachStoresToTasks(
  taskRows: Task[],
  storeRows: TaskStoreLookup[],
  clientRows: TaskClientLookup[]
): Task[] {
  const storeById = new Map<number, TaskStoreLookup>();

  for (const store of storeRows) {
    storeById.set(Number(store.id), store);
  }

  const clientById = new Map<string, TaskClientLookup>();

  for (const client of clientRows) {
    clientById.set(String(client.id), client);
  }

  return taskRows.map((task) => {
    if (!task.store_id) {
      return task;
    }

    const store = storeById.get(Number(task.store_id));
    if (!store) {
      return task;
    }

    const client =
      store.client_id !== null && store.client_id !== ""
        ? clientById.get(String(store.client_id))
        : undefined;

    return {
      ...task,
      stores: {
        company_name: store.company_name || "",
        store_name: store.store_name || "",
        location: store.location || "",
        clients: client ? { client_name: client.client_name } : null,
      },
    };
  });
}

function formatTaskStoreLabel(store: TaskStoreRecord): string {
  const clientName = getStoreClientName(store);
  const storeName = store.store_name?.trim() || "";
  const location = store.location?.trim() || "";

  if (clientName) {
    return `${clientName} / ${storeName} / ${location}`;
  }

  return `${storeName} / ${location}`;
}

function getTaskStoreLabel(task: Task): string {
  if (task.stores) {
    return formatTaskStoreLabel(task.stores as TaskStoreRecord);
  }

  return task.store || "";
}

function getTableRowBackground(
  task: Task,
  isHighlighted: boolean,
  darkMode: boolean
) {
  if (isHighlighted && !darkMode) {
    return "#bbf7d0";
  }

  if (darkMode) {
    return "#1e293b";
  }

  if (task.status === "Completed") {
    return "#ecfdf5";
  }

  if (task.priority === "Urgent" || task.priority === "Critical") {
    return "#fee2e2";
  }

  if (task.priority === "High") {
    return "#fff7ed";
  }

  return "white";
}

function getTaskAttachmentUrls(
  attachments: string[] | string | null | undefined
): string[] {
  if (!attachments) return [];

  if (Array.isArray(attachments)) {
    return attachments.filter(
      (url): url is string => typeof url === "string" && url.trim() !== ""
    );
  }

  if (typeof attachments === "string") {
    try {
      const parsed = JSON.parse(attachments);

      if (Array.isArray(parsed)) {
        return parsed.filter(
          (url): url is string => typeof url === "string" && url.trim() !== ""
        );
      }
    } catch {
      return attachments.trim() ? [attachments] : [];
    }
  }

  return [];
}

function TaskAttachmentsPanel({
  attachments,
  darkMode,
}: {
  attachments: string[] | string | null | undefined;
  darkMode: boolean;
}) {
  const attachmentUrls = getTaskAttachmentUrls(attachments);

  if (attachmentUrls.length === 0) return null;

  return (
    <div
      style={{
        background: darkMode ? "#1f2937" : "white",
        color: darkMode ? "#f9fafb" : "#111827",
        padding: "20px",
        borderRadius: "14px",
        marginBottom: "20px",
      }}
    >
      <h3 style={{ margin: "0 0 12px" }}>Attachments</h3>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "8px",
        }}
      >
        {attachmentUrls.map((url, index) => (
          <a
            key={`${url}-${index}`}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", lineHeight: 0 }}
          >
            <img
              src={url}
              alt={`Attachment ${index + 1}`}
              style={{
                width: "120px",
                height: "120px",
                objectFit: "contain",
                borderRadius: "10px",
                border: "1px solid #e5e7eb",
                background: darkMode ? "#374151" : "#f9fafb",
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}

function TaskAttachmentsModal({
  task,
  darkMode,
  onClose,
}: {
  task: Task;
  darkMode: boolean;
  onClose: () => void;
}) {
  const attachmentUrls = getTaskAttachmentUrls(task.attachments);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: darkMode ? "#1f2937" : "white",
          color: darkMode ? "#f9fafb" : "#111827",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
        }}
      >
        <h2 style={{ margin: "0 0 8px" }}>Photos</h2>
        <p
          style={{
            margin: "0 0 20px",
            color: darkMode ? "#cbd5e1" : "#6b7280",
            fontSize: "14px",
          }}
        >
          {task.stores
            ? `${getTaskCompanyName(task)} / ${task.stores.store_name}`
            : task.store}
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "12px",
          }}
        >
          {attachmentUrls.map((url, index) => (
            <a
              key={`${url}-${index}`}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", lineHeight: 0 }}
            >
              <img
                src={url}
                alt={`Attachment ${index + 1}`}
                style={{
                  width: "100%",
                  aspectRatio: "1 / 1",
                  objectFit: "contain",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb",
                  background: darkMode ? "#374151" : "#f9fafb",
                }}
              />
            </a>
          ))}
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            ...buttonStyle,
            marginTop: "24px",
            width: "100%",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function TaskAiAnalysisModal({
  task,
  darkMode,
  onClose,
}: {
  task: Task;
  darkMode: boolean;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        zIndex: 1000,
      }}
    >
      <div
        style={{
          background: darkMode ? "#1f2937" : "white",
          color: darkMode ? "#f9fafb" : "#111827",
          width: "100%",
          maxWidth: "720px",
          maxHeight: "90vh",
          overflow: "auto",
          borderRadius: "16px",
          padding: "24px",
          boxShadow: "0 20px 50px rgba(15, 23, 42, 0.2)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "20px",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "#eff6ff",
              color: "#2563eb",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "18px",
              flexShrink: 0,
            }}
            aria-hidden="true"
          >
            🤖
          </div>
          <h2 style={{ margin: 0 }}>AI Analysis</h2>
        </div>

        <AIAnalysisCard
          ai_category={task.ai_category}
          ai_department={task.ai_department}
          ai_priority={task.ai_priority}
          ai_summary={task.ai_summary}
          ai_confidence={task.ai_confidence}
          client_description={task.client_description}
          embedded
        />

        <button
          type="button"
          onClick={onClose}
          style={{
            ...buttonStyle,
            marginTop: "24px",
            width: "100%",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
}

function TaskActionsDropdown({
  task,
  darkMode,
  isOpen,
  onToggle,
  onClose,
  showEdit,
  showDelete,
  showPhotos,
  showAiAnalysis,
  onComments,
  onPhotos,
  onAiAnalysis,
  onEdit,
  onDelete,
  onUploadPhoto,
  showAcceptRequest,
  onAcceptRequest,
  showStartSiteInspection,
  onStartSiteInspection,
  showSendQuotation,
  onSendQuotation,
  showApprove,
  onApprove,
}: {
  task: Task;
  darkMode: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  showEdit: boolean;
  showDelete: boolean;
  showPhotos: boolean;
  showAiAnalysis: boolean;
  onComments: () => void;
  onPhotos: () => void;
  onAiAnalysis: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
  showAcceptRequest: boolean;
  onAcceptRequest: () => void;
  showStartSiteInspection: boolean;
  onStartSiteInspection: () => void;
  showSendQuotation: boolean;
  onSendQuotation: () => void;
  showApprove: boolean;
  onApprove: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const whatsAppUrl = `https://wa.me/?text=${encodeURIComponent(
    `Task: ${task.issue}

Store: ${task.store}

Status: ${task.status}

Assigned To: ${task.technician || "Not Assigned"}

Created By: ${task.created_by || "Retail Systems"}`
  )}`;

  const menuStyle: React.CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    right: 0,
    minWidth: "168px",
    background: darkMode ? "#1f2937" : "white",
    border: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
    borderRadius: "10px",
    boxShadow: "0 10px 25px rgba(15, 23, 42, 0.15)",
    overflow: "hidden",
    zIndex: 20,
  };

  const menuItemStyle: React.CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "10px 14px",
    border: "none",
    background: "transparent",
    color: darkMode ? "#f9fafb" : "#111827",
    fontSize: "14px",
    fontWeight: 500,
    cursor: "pointer",
    textDecoration: "none",
    boxSizing: "border-box",
  };

  const menuDividerStyle: React.CSSProperties = {
    borderBottom: `1px solid ${darkMode ? "#374151" : "#e5e7eb"}`,
  };

  function renderMenuItem(
    label: string,
    onClick: () => void,
    options?: { destructive?: boolean; isLink?: boolean; href?: string }
  ) {
    const style: React.CSSProperties = {
      ...menuItemStyle,
      ...(options?.destructive ? { color: "#dc2626" } : {}),
    };

    if (options?.isLink && options.href) {
      return (
        <a
          key={label}
          href={options.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ ...style, ...menuDividerStyle }}
          onClick={onClose}
        >
          {label}
        </a>
      );
    }

    return (
      <button
        key={label}
        type="button"
        style={{ ...style, ...menuDividerStyle }}
        onClick={() => {
          onClick();
          onClose();
        }}
      >
        {label}
      </button>
    );
  }

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={onToggle}
        style={{
          background: darkMode ? "#334155" : "#111827",
          color: "white",
          padding: "8px 14px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        Actions ▾
      </button>

      {isOpen && (
        <div style={menuStyle}>
          {renderMenuItem("Comments", onComments)}
          {showPhotos && renderMenuItem("Photos", onPhotos)}
          {showAiAnalysis && renderMenuItem("AI Analysis", onAiAnalysis)}
          {showAcceptRequest && renderMenuItem("Accept Request", onAcceptRequest)}
          {showStartSiteInspection &&
            renderMenuItem("Start Site Inspection", onStartSiteInspection)}
          {showSendQuotation && renderMenuItem("Send Quotation", onSendQuotation)}
          {showApprove && renderMenuItem("Approve", onApprove)}
          {showEdit && renderMenuItem("Edit", onEdit)}
          {renderMenuItem("WhatsApp", () => {}, {
            isLink: true,
            href: whatsAppUrl,
          })}
          <button
            type="button"
            style={{ ...menuItemStyle, ...menuDividerStyle }}
            onClick={() => {
              onClose();
              fileInputRef.current?.click();
            }}
          >
            Upload Photo
          </button>
          {showDelete && (
            <button
              type="button"
              style={{
                ...menuItemStyle,
                color: "#dc2626",
              }}
              onClick={() => {
                onDelete();
                onClose();
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        hidden
        accept="image/*"
        onChange={async (event) => {
          const file = event.target.files?.[0];

          if (!file) return;

          await onUploadPhoto(file);
          event.target.value = "";
        }}
      />
    </div>
  );
}

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  
  const [isMobile, setIsMobile] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoTaskId, setSelectedPhotoTaskId] = useState<number | null>(null); 
const [commentText, setCommentText] = useState("");
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
const [editingTask, setEditingTask] = useState<Task | null>(null);
const [attachmentsModalTask, setAttachmentsModalTask] = useState<Task | null>(null);
const [aiAnalysisModalTask, setAiAnalysisModalTask] = useState<Task | null>(null);
const [openActionsTaskId, setOpenActionsTaskId] = useState<number | null>(null);
const [erpMessageToast, setErpMessageToast] = useState<{
  taskId: number;
  senderName: string;
  preview: string;
} | null>(null);
const [messageUnreadByTask, setMessageUnreadByTask] = useState<
  Record<number, number>
>({});

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<TaskStoreRecord[]>([]);
  const [taskClients, setTaskClients] = useState<TaskClientOption[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const isAdmin = currentEmployee?.role?.toLowerCase() === "admin";
const isGeneral = currentEmployee?.role?.toLowerCase() === "general";
const isTechnician = currentEmployee?.role?.toLowerCase() === "technician";
const isManager = currentEmployee?.role?.toLowerCase() === "manager";
const canUseTaskMessages = Boolean(isAdmin || isGeneral || isManager);
const isInventory = currentEmployee?.role === "Inventory";
const isViewer = currentEmployee?.role === "Viewer";

  const fetchTaskById = useCallback(async (taskId: number) => {
    const { data, error } = await supabase
      .from("tasks")
      .select(`
        *,
        employees(full_name, role),
        task_assignments(
          employee_id,
          employees(full_name)
        )
      `)
      .eq("id", taskId)
      .single();

    if (error) {
      console.error(error);
      return null;
    }

    return data as Task;
  }, []);

  const receiveRealtimeTask = useCallback((task: Task) => {
    setTasks((prev) => {
      if (prev.some((item) => item.id === task.id)) {
        return prev;
      }

      return [task, ...prev];
    });
  }, []);

  const {
    notifications,
    unreadCount,
    activeToast,
    highlightedTaskIds,
    isPanelOpen,
    openPanel,
    closePanel,
    dismissToast,
    dismissNotification,
    openNotificationTask,
    highlightTask,
  } = useClientRequestRealtime({
    enabled: Boolean(isAdmin || isGeneral),
    supabase,
    fetchTaskById,
    onTaskReceived: receiveRealtimeTask,
  });

  const handleErpMessageUnreadChange = useCallback(
    (taskId: number, count: number) => {
      setMessageUnreadByTask((current) => ({
        ...current,
        [taskId]: count,
      }));
    },
    []
  );

  const handleOpenTaskFromMessage = useCallback((taskId: number) => {
    setSelectedTaskId(String(taskId));
    setErpMessageToast(null);
    setMessageUnreadByTask((current) => ({
      ...current,
      [taskId]: 0,
    }));
  }, []);

  useEffect(() => {
    if (!canUseTaskMessages) return;

    return subscribeToClientMessageNotifications(
      supabase,
      true,
      selectedTaskId,
      (message) => {
        setMessageUnreadByTask((current) => ({
          ...current,
          [message.task_id]: (current[message.task_id] || 0) + 1,
        }));
        setErpMessageToast({
          taskId: message.task_id,
          senderName: message.sender_name,
          preview: message.body,
        });
        void playNotificationSound();
      }
    );
  }, [canUseTaskMessages, selectedTaskId]);

  useEffect(() => {
    let unlocked = false;

    function unlockAudio() {
      if (unlocked) return;
      unlocked = true;
      void unlockNotificationSound();
    }

    window.addEventListener("click", unlockAudio);
    window.addEventListener("keydown", unlockAudio);

    return () => {
      window.removeEventListener("click", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

const kpiTasks =
  isAdmin || isGeneral
    ? tasks
    : isManager
    ? tasks.filter((task) => task.department === currentEmployee?.department)
    : tasks.filter((task) => task.employee_id === String(currentEmployee?.id));
const totalKpiTasks = kpiTasks.length;
const openKpiTasks = kpiTasks.filter((task) => task.status !== "Done").length;
const doneKpiTasks = kpiTasks.filter((task) => task.status === "Done").length;
const urgentKpiTasks = kpiTasks.filter((task) => task.priority === "Urgent").length;

const visibleEmployees =
  isAdmin || isGeneral
    ? employees
    : isManager
    ? employees.filter(
        (employee) => employee.department === currentEmployee?.department
      )
    : employees.filter(
        (employee) => String(employee.id) === String(currentEmployee?.id)
      );
      const canEdit =
      isAdmin || isGeneral || isManager || isTechnician || isInventory;

  const canCreateTask =
  isAdmin || isGeneral || isManager;

const canManageEmployees =
  isAdmin;
  const [showForm, setShowForm] = useState(false);
  const darkMode = false;
  const bgColor = darkMode ? "#020817" : "#f3f4f6";
const panelBg = darkMode ? "#1e293b" : "white";
const textColor = darkMode ? "#f8fafc" : "#111827";
const inputBg = darkMode ? "#334155" : "white";
const borderColor = darkMode ? "#475569" : "#d1d5db";
  const [statusFilter, setStatusFilter] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
const tasksPerPage = 10;
  const [employeeFilter, setEmployeeFilter] = useState("All");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [topKpiFilter, setTopKpiFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
const [locationFilter, setLocationFilter] = useState("All");
const [reportType, setReportType] = useState("detailed");
const [showReportPreview, setShowReportPreview] = useState(true);

const [showEmployeeKpi, setShowEmployeeKpi] = useState(false);
const [showDepartmentKpi, setShowDepartmentKpi] = useState(false);
const [showServiceKpi, setShowServiceKpi] = useState(false);
const [showReports, setShowReports] = useState(true);
  const [storeSearchText, setStoreSearchText] = useState("");
  const [showQuickAddStore, setShowQuickAddStore] = useState(false);

const [quickStore, setQuickStore] = useState({
  client_id: "",
  store_name: "",
  location: "",
  store_code: "",
});
  const [newTask, setNewTask] = useState({
    store_id: "",
    store: "",
    issue: "",
    employee_id: "",
    additional_employee_ids: [] as string[],
    status: "Open",
    category: "General",
    priority: "Medium",
    due_date: "",
    client_name: "",
    company_name: "",
    location: "",
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
  
    checkMobile();
  
    window.addEventListener("resize", checkMobile);
  
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  useEffect(() => {
    async function checkUser() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
  
      if (!session) {
        window.location.href = "/";
        return;
      }
  
      const { data: employee, error } = await supabase
        .from("employees")
        .select("*")
        .eq("email", session.user.email)
        .single();
  
      if (error || !employee) {
        alert("Your user is not registered as employee");
  
        await supabase.auth.signOut();
  
        window.location.href = "/";
        return;
      }
  
      setCurrentEmployee(employee);
  
      loadEmployees();
      loadStores();
      loadTaskClients();
  
      await loadTasks(employee);
    }
  
    checkUser();
  
    const interval = setInterval(() => {
      if (currentEmployee) {
        loadTasks(currentEmployee);
      }
    }, 10000);
  
    return () => clearInterval(interval);
  }, [currentEmployee]);
  

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchStatus =
        statusFilter === "All" || task.status === statusFilter;
  
      const matchEmployee =
        employeeFilter === "All" || task.employee_id === employeeFilter;
  
      const matchCategory =
        categoryFilter === "All" || task.category === categoryFilter;
        const matchTopKpi =
  topKpiFilter === "All" ||
  (topKpiFilter === "open" &&
    task.status !== "Completed") ||
  (topKpiFilter === "urgent" &&
    task.priority === "Urgent") ||
  (topKpiFilter === "overdue" &&
    task.due_date &&
    task.status !== "Completed" &&
    new Date(task.due_date) < new Date());
        const matchCompany =
  companyFilter === "All" ||
  getTaskCompanyName(task) === companyFilter;

  const matchLocation =
  locationFilter === "All" ||
  task.stores?.location === locationFilter;
  
  const search = searchText.toLowerCase();

  const matchSearch =
    task.store?.toLowerCase().includes(search) ||
    task.stores?.store_name?.toLowerCase().includes(search) ||
    getTaskCompanyName(task).toLowerCase().includes(search) ||
    task.company_name?.toLowerCase().includes(search) ||
    task.stores?.location?.toLowerCase().includes(search) ||
    task.issue?.toLowerCase().includes(search) ||
    task.technician?.toLowerCase().includes(search) ||
    task.employees?.full_name?.toLowerCase().includes(search);
  
    const roleAccess =
  isAdmin ||
  isGeneral ||
  isViewer ||
  (isManager && task.department === currentEmployee?.department) ||
  (isTechnician && task.employee_id === String(currentEmployee?.id));
      
  return (
    roleAccess &&
    matchTopKpi &&
    matchStatus &&
    matchEmployee &&
    matchCategory &&
    matchCompany &&
    matchLocation &&
    matchSearch
  );
    });
  }, 
  [
    tasks,
    statusFilter,
    employeeFilter,
    categoryFilter,
    companyFilter,
    locationFilter,
    searchText,
    topKpiFilter,
  ]);

  const reportingOpenTasks = filteredTasks.filter(
    (task) => task.status !== "Completed"
  ).length;
  
  const reportingCompletedTasks = filteredTasks.filter(
    (task) => task.status === "Completed"
  ).length;
  
  const reportingUrgentTasks = filteredTasks.filter(
    (task) => task.priority === "Urgent"
  ).length;
  
  const reportingOverdueTasks = filteredTasks.filter(
    (task) =>
      task.due_date &&
      task.status !== "Completed" &&
      new Date(task.due_date) < new Date()
  ).length;

  const totalPages = Math.ceil(filteredTasks.length / tasksPerPage);

const paginatedTasks = filteredTasks.slice(
  (currentPage - 1) * tasksPerPage,
  currentPage * tasksPerPage
);

  const handleOpenTaskFromNotification = useCallback(
    async (notification: ClientRequestNotification) => {
      const taskId = openNotificationTask(notification);
      console.log("[notification open task] clicked:", taskId);
      dismissToast();
      closePanel();

      let task = tasks.find((item) => item.id === taskId) || null;

      if (!task) {
        task = await fetchTaskById(taskId);
        if (task) {
          receiveRealtimeTask(task);
        }
      }

      highlightTask(taskId);

      const taskIndex = filteredTasks.findIndex((item) => item.id === taskId);
      if (taskIndex >= 0) {
        const targetPage = Math.floor(taskIndex / tasksPerPage) + 1;
        if (targetPage !== currentPage) {
          setCurrentPage(targetPage);
        }
      }

      window.setTimeout(() => {
        const element = document.querySelector(`[data-task-id="${taskId}"]`);
        console.log("[notification open task] found row:", !!element);
        element?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 50);

      if (!task) return;

      setSelectedTask(task);
      setSelectedTaskId(String(taskId));
      loadComments(taskId);
      loadPhotos(taskId);
      setSelectedPhotoTaskId(taskId);
    },
    [
      closePanel,
      currentPage,
      dismissToast,
      fetchTaskById,
      filteredTasks,
      highlightTask,
      openNotificationTask,
      receiveRealtimeTask,
      tasks,
    ]
  );

  async function loadEmployees() {
    const { data, error } = await supabase
      .from("employees")
      .select("*")
      .eq("is_active", true)
      .order("full_name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setEmployees(data || []);
  }
  async function loadTaskClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, client_name")
      .eq("status", "Active")
      .order("client_name", { ascending: true });

    if (error) {
      console.error(error);
      return;
    }

    setTaskClients(data || []);
  }

  async function loadStores() {
    const { data, error } = await supabase
      .from("stores")
      .select(
        "id, company_name, store_name, location, store_code, client_id, clients(client_name)"
      )
      .order("company_name", { ascending: true });
  
    if (error) {
      console.error(error);
      return;
    }

    const normalizedStores: TaskStoreRecord[] = (data || []).map((store) => ({
      id: store.id,
      company_name: store.company_name,
      store_name: store.store_name,
      location: store.location,
      store_code: store.store_code,
      client_id: store.client_id,
      clients: Array.isArray(store.clients) ? store.clients[0] ?? null : store.clients,
    }));
  
    setStores(normalizedStores);
  }
  async function quickAddStore() {
    const selectedClient = taskClients.find(
      (client) => String(client.id) === quickStore.client_id
    );
    const clientName = selectedClient?.client_name?.trim() || "";

    if (!quickStore.client_id || !clientName || !quickStore.store_name || !quickStore.location) {
      alert("Please select a Client and fill Store Name and Location");
      return;
    }

    const clientId = Number(quickStore.client_id);
    if (!Number.isFinite(clientId)) {
      alert("Invalid client selection");
      return;
    }
  
    const { data, error } = await supabase
      .from("stores")
      .insert([
        {
          client_id: clientId,
          company_name: clientName,
          store_name: quickStore.store_name.trim(),
          location: quickStore.location.trim(),
          store_code: quickStore.store_code.trim(),
        },
      ])
      .select(
        "id, company_name, store_name, location, store_code, client_id, clients(client_name)"
      )
      .single();
  
    if (error) {
      console.error(error);
      alert("Error adding store");
      return;
    }

    const normalizedStore: TaskStoreRecord = {
      id: data.id,
      company_name: data.company_name,
      store_name: data.store_name,
      location: data.location,
      store_code: data.store_code,
      client_id: data.client_id,
      clients: Array.isArray(data.clients) ? data.clients[0] ?? null : data.clients,
    };
  
    await loadStores();
  
    setNewTask({
      ...newTask,
      store_id: String(normalizedStore.id),
      store: formatTaskStoreLabel(normalizedStore),
      client_name: getStoreClientName(normalizedStore),
      company_name: getStoreClientName(normalizedStore),
      location: normalizedStore.location || "",
    });
  
    setQuickStore({
      client_id: "",
      store_name: "",
      location: "",
      store_code: "",
    });
  
    setShowQuickAddStore(false);
  }
  async function loadTasks(employee?: Employee | null) {
    let query = supabase
      .from("tasks")
      .select(`
        *,
        employees(full_name, role),
        task_assignments(
          employee_id,
          employees(full_name)
        )
      `)
      .order("created_at", { ascending: false });
  
    const role = employee?.role?.toLowerCase();
    const department = employee?.department?.toLowerCase();
  
    if (role === "technician") {
      query = query.eq("employee_id", employee?.id);
    } else if (role === "manager" && department !== "general") {
      query = query.eq("department", employee?.department);
    }

    const [tasksResult, storesResult, clientsResult] = await Promise.all([
      query,
      supabase
        .from("stores")
        .select("id, store_name, location, company_name, client_id"),
      supabase.from("clients").select("id, client_name"),
    ]);
  
    if (tasksResult.error) {
      console.error(tasksResult.error);
      return;
    }

    if (storesResult.error) {
      console.error(storesResult.error);
    }

    if (clientsResult.error) {
      console.error(clientsResult.error);
    }

    const mergedTasks = attachStoresToTasks(
      (tasksResult.data || []) as Task[],
      (storesResult.data || []) as TaskStoreLookup[],
      (clientsResult.data || []) as TaskClientLookup[]
    );

    setTasks(mergedTasks);
  }

  async function addTask() {
    if (!newTask.store_id || !newTask.issue) {
      alert("Please fill Store and Issue");
      return;
    }

    if (!newTask.company_name.trim()) {
      alert("Selected store does not have a linked client");
      return;
    }
  
    const selectedEmployee = employees.find(
      (e) => e.id === newTask.employee_id
    );
  
    const taskPayload = {
      store: newTask.store,
      company_name: newTask.company_name || "",
      location: newTask.location || "",
      store_id: newTask.store_id ? Number(newTask.store_id) : null,
      issue: newTask.issue,
      status: newTask.status,
      category: newTask.category,
      department: newTask.category,
      priority: newTask.priority,
      due_date: newTask.due_date || null,
      employee_id: newTask.employee_id || null,
      technician: selectedEmployee?.full_name || "",
      created_by: currentEmployee?.full_name || "Retail Systems",
    };
  
    let taskId = editingTask?.id;
  
    const { data, error } = editingTask
      ? await supabase
          .from("tasks")
          .update(taskPayload)
          .eq("id", editingTask.id)
          .select("id")
          .single()
      : await supabase
          .from("tasks")
          .insert([{ ...taskPayload, workflow_status: "new_request" }])
          .select("id")
          .single();
  
    if (error) {
      console.error(error);
      alert("Error while saving task");
      return;
    }
  
    taskId = data?.id || taskId;
  
    if (taskId) {
      await supabase
        .from("task_assignments")
        .delete()
        .eq("task_id", taskId);
  
      const allAssignedEmployeeIds = [
        newTask.employee_id,
        ...newTask.additional_employee_ids,
      ].filter(Boolean);
  
      if (allAssignedEmployeeIds.length > 0) {
        const assignmentRows = allAssignedEmployeeIds.map((employeeId) => ({
          task_id: taskId,
          employee_id: employeeId,
        }));
  
        const { error: assignmentError } = await supabase
          .from("task_assignments")
          .insert(assignmentRows);
  
          if (assignmentError) {
            console.error("Assignment error:", JSON.stringify(assignmentError, null, 2));
            alert(
              assignmentError.message ||
                assignmentError.details ||
                "Task saved, but assignments were not saved"
            );
          }
      }
    }
  
    setNewTask({
      store_id: "",
      store: "",
      issue: "",
      employee_id: "",
      additional_employee_ids: [],
      status: "Open",
      category: "General",
      priority: "Medium",
      due_date: "",
      client_name: "",
      company_name: "",
      location: "",
    });
  
    setEditingTask(null);
    setShowForm(false);
  
    if (currentEmployee) {
      loadTasks(currentEmployee);
    } else {
      loadTasks();
    }
  }
  async function updateStatus(taskId: number, status: string) {
    const currentTask = tasks.find((t) => t.id === taskId);
    const oldStatus = currentTask?.status || "";
  
    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, status } : task
      )
    );
  
    const { error } = await supabase
      .from("tasks")
      .update({ status })
      .eq("id", taskId);
  
    if (error) {
      console.error(error);
      alert("Error while updating status");
      return;
    }
  
    const { error: historyError } = await supabase
      .from("task_history")
      .insert([
        {
          task_id: taskId,
          old_status: oldStatus,
          new_status: status,
          author: currentEmployee?.full_name || "Unknown",
        },
      ]);
  
    if (historyError) {
      console.error(historyError);
      alert("Status changed, but history was not saved");
    }
  
    if (currentEmployee) {
      loadTasks(currentEmployee);
    }
  }

  async function acceptRequest(taskId: number) {
    const acceptedAt = new Date().toISOString();

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, workflow_status: "accepted", accepted_at: acceptedAt }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        workflow_status: "accepted",
        accepted_at: acceptedAt,
      })
      .eq("id", taskId);

    if (error) {
      console.error(error);
      alert("Error while accepting request");
      if (currentEmployee) {
        loadTasks(currentEmployee);
      } else {
        loadTasks();
      }
      return;
    }

    if (currentEmployee) {
      loadTasks(currentEmployee);
    } else {
      loadTasks();
    }
  }

  async function startSiteInspection(taskId: number) {
    const inspectionAt = new Date().toISOString();

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              workflow_status: "site_inspection",
              inspection_at: inspectionAt,
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        workflow_status: "site_inspection",
        inspection_at: inspectionAt,
      })
      .eq("id", taskId);

    if (error) {
      console.error(error);
      alert("Error while starting site inspection");
      if (currentEmployee) {
        loadTasks(currentEmployee);
      } else {
        loadTasks();
      }
      return;
    }

    if (currentEmployee) {
      loadTasks(currentEmployee);
    } else {
      loadTasks();
    }
  }

  async function sendQuotation(taskId: number) {
    const quotationSentAt = new Date().toISOString();

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              workflow_status: "quotation_sent",
              quotation_sent_at: quotationSentAt,
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        workflow_status: "quotation_sent",
        quotation_sent_at: quotationSentAt,
      })
      .eq("id", taskId);

    if (error) {
      console.error(error);
      alert("Error while sending quotation");
      if (currentEmployee) {
        loadTasks(currentEmployee);
      } else {
        loadTasks();
      }
      return;
    }

    if (currentEmployee) {
      loadTasks(currentEmployee);
    } else {
      loadTasks();
    }
  }

  async function approveRequest(taskId: number) {
    const approvedAt = new Date().toISOString();

    setTasks((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? {
              ...task,
              workflow_status: "approved",
              approved_at: approvedAt,
            }
          : task
      )
    );

    const { error } = await supabase
      .from("tasks")
      .update({
        workflow_status: "approved",
        approved_at: approvedAt,
      })
      .eq("id", taskId);

    if (error) {
      console.error(error);
      alert("Error while approving request");
      if (currentEmployee) {
        loadTasks(currentEmployee);
      } else {
        loadTasks();
      }
      return;
    }

    if (currentEmployee) {
      loadTasks(currentEmployee);
    } else {
      loadTasks();
    }
  }
  
  
  async function deleteTask(taskId: number) {
    const confirmed = confirm("Delete this task?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("tasks")
      .delete()
      .eq("id", taskId);

    if (error) {
      console.error(error);
      alert("Error while deleting task");
      return;
    }

    loadTasks();
  }
  function exportTasks() {
    let headers: string[] = [];
    let rows: any[] = [];
  
    if (reportType === "detailed") {
      headers = [
        "Store",
        "Company",
        "Location",
        "Issue",
        "Category",
        "Priority",
        "Assigned To",
        "Status",
        "Due Date",
      ];
  
      rows = filteredTasks.map((task) => [
        task.store,
        getTaskCompanyName(task),
        task.stores?.location || task.location || "",
        task.issue,
        task.category,
        task.priority,
        task.technician,
        task.status,
        task.due_date,
      ]);
    }
  
    if (reportType === "store") {
      headers = ["Store", "Total Tasks", "Open", "Completed"];
  
      const grouped = [...new Set(filteredTasks.map((t) => t.store))];
  
      rows = grouped.map((store) => {
        const storeTasks = filteredTasks.filter(
          (t) => t.store === store
        );
  
        return [
          store,
          storeTasks.length,
          storeTasks.filter((t) => t.status !== "Completed").length,
          storeTasks.filter((t) => t.status === "Completed").length,
        ];
      });
    }
  
    if (reportType === "company") {
      headers = ["Company", "Total Tasks", "Open", "Completed"];
    
      const grouped = [
        ...new Set(filteredTasks.map((t) => getTaskCompanyName(t))),
      ].filter(Boolean);
    
      rows = grouped.map((company) => {
        const companyTasks = filteredTasks.filter(
          (t) => getTaskCompanyName(t) === company
        );
    
        return [
          company,
          companyTasks.length,
          companyTasks.filter((t) => t.status !== "Completed").length,
          companyTasks.filter((t) => t.status === "Completed").length,
        ];
      });
    }
  
    if (reportType === "department") {
      headers = ["Department", "Total Tasks", "Open", "Completed"];
  
      const grouped = [
        ...new Set(filteredTasks.map((t) => t.department)),
      ].filter(Boolean);
  
      rows = grouped.map((department) => {
        const departmentTasks = filteredTasks.filter(
          (t) => t.department === department
        );
  
        return [
          department,
          departmentTasks.length,
          departmentTasks.filter((t) => t.status !== "Completed").length,
          departmentTasks.filter((t) => t.status === "Completed").length,
        ];
      });
    }
  
    if (reportType === "employee") {
      headers = ["Employee", "Total Tasks", "Open", "Completed"];
  
      const grouped = [
        ...new Set(filteredTasks.map((t) => t.technician)),
      ].filter(Boolean);
  
      rows = grouped.map((employee) => {
        const employeeTasks = filteredTasks.filter(
          (t) => t.technician === employee
        );
  
        return [
          employee,
          employeeTasks.length,
          employeeTasks.filter((t) => t.status !== "Completed").length,
          employeeTasks.filter((t) => t.status === "Completed").length,
        ];
      });
    }
  
    const csvContent = [headers, ...rows]
      .map((row) => row.join(","))
      .join("\n");
  
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
  
    const link = document.createElement("a");
  
    link.href = URL.createObjectURL(blob);
  
    link.setAttribute(
      "download",
      `${reportType}-report-${Date.now()}.csv`
    );
  
    document.body.appendChild(link);
  
    link.click();
  
    document.body.removeChild(link);
  }
async function loadComments(taskId: number) {
  const { data, error } = await supabase
    .from("task_comments")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setComments(data || []);
}

async function addComment(taskId: number) {
  if (!commentText) return;

  const { error } = await supabase.from("task_comments").insert([
    {
      task_id: taskId,
      comment: commentText,
      author:
        currentEmployee?.full_name || "Unknown",
    },
  ]);

  if (error) {
    console.error(error);
    alert("Error adding comment");
    return;
  }
  
  const task = tasks.find((t) => t.id === taskId);
  const oldStatus = task?.status || "";
  
  await supabase.from("task_history").insert([
    {
      task_id: taskId,
      old_status: oldStatus,
      new_status: status,
      changed_by: currentEmployee?.full_name || "Unknown",
    },
  ]);

  setCommentText("");

  loadComments(taskId);
}
async function loadPhotos(taskId: number) {
  const { data, error } = await supabase
    .from("task_photos")
    .select("*")
    .eq("task_id", taskId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  setPhotos(data || []);
}
async function uploadPhoto(taskId: number, file: File) {
  const fileName = `${taskId}-${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from("task-photos")
    .upload(fileName, file);

  if (uploadError) {
    console.error(uploadError);
    alert("Error uploading photo");
    return;
  }

  const { data } = supabase.storage
    .from("task-photos")
    .getPublicUrl(fileName);

  const { error: insertError } = await supabase.from("task_photos").insert([
    {
      task_id: taskId,
      photo_url: data.publicUrl,
      author: currentEmployee?.full_name || "Unknown",
    },
  ]);

  if (insertError) {
    console.error(insertError);
    alert("Error saving photo");
    return;
  }

  loadPhotos(taskId);
}
return (
  <main
    style={{
      padding: "40px",
      fontFamily: "Arial",
      background: bgColor,
      color: textColor,
      minHeight: "100vh",
      transition: "0.3s",
    }}
  >
    <header
      style={{
        background: panelBg,
        borderRadius: "16px",
        padding: "24px 28px",
        marginBottom: "24px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        border: `1px solid ${borderColor}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: "20px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "clamp(26px, 4vw, 36px)",
              margin: 0,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            Retail Systems ERP
          </h1>
          <p
            style={{
              margin: "6px 0 0",
              color: "#64748b",
              fontSize: "14px",
            }}
          >
            Service Management Platform
          </p>
          {currentEmployee && (
            <p
              style={{
                margin: "10px 0 0",
                color: "#111827",
                fontSize: "15px",
                fontWeight: 600,
              }}
            >
              Welcome back, {getFirstName(currentEmployee.full_name)}!
            </p>
          )}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            flexWrap: "wrap",
          }}
        >
          {(isAdmin || isGeneral) && (
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              isOpen={isPanelOpen}
              onOpen={openPanel}
              onClose={closePanel}
              onOpenTask={handleOpenTaskFromNotification}
              onDismiss={dismissNotification}
            />
          )}

          {currentEmployee && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: "2px",
                padding: "8px 14px",
                borderRadius: "12px",
                background: darkMode ? "#334155" : "#f9fafb",
                border: `1px solid ${borderColor}`,
              }}
            >
              <span style={{ fontSize: "14px", fontWeight: 700 }}>
                {currentEmployee.full_name}
              </span>
              <span style={{ fontSize: "12px", color: "#64748b" }}>
                {currentEmployee.role}
              </span>
            </div>
          )}

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/";
            }}
            style={{
              background: "#dc2626",
              color: "white",
              padding: "12px 20px",
              border: "none",
              borderRadius: "10px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "14px",
            }}
          >
            Logout
          </button>
        </div>
      </div>

      <nav
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          marginTop: "24px",
        }}
        aria-label="Dashboard navigation"
      >
        <DashboardNavLink href="/dashboard" icon="📋" label="Tasks" active />
        <DashboardNavLink href="/dashboard/clients" icon="👥" label="Clients" />
        <DashboardNavLink href="/dashboard/stores" icon="🏪" label="Stores" />
        <DashboardNavLink href="/dashboard" icon="👤" label="Employees" />
        <DashboardNavLink
          href="/dashboard/inventory"
          icon="📦"
          label="Inventory"
        />
      </nav>
    </header>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: "16px",
    marginTop: "10px",
  }}
>
  <DashboardKpiCard
    icon="📋"
    title="Open Tasks"
    value={tasks.filter((t) => t.status !== "Completed").length}
    helperText="Active work orders"
    accent="blue"
    active={topKpiFilter === "open"}
    onClick={() => {
      setTopKpiFilter(topKpiFilter === "open" ? "All" : "open");
      setCurrentPage(1);
    }}
  />

  <DashboardKpiCard
    icon="📊"
    title="Total Tasks"
    value={totalKpiTasks}
    helperText="All recorded tasks"
    accent="blue"
    active={topKpiFilter === "All"}
    onClick={() => {
      setTopKpiFilter("All");
      setStatusFilter("All");
      setEmployeeFilter("All");
      setCategoryFilter("All");
      setCompanyFilter("All");
      setLocationFilter("All");
      setSearchText("");
      setCurrentPage(1);
    }}
  />

  <DashboardKpiCard
    icon="⏰"
    title="Overdue"
    value={
      tasks.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date) < new Date() &&
          task.status !== "Completed"
      ).length
    }
    helperText="Needs attention"
    accent="red"
    warning
    active={topKpiFilter === "overdue"}
    onClick={() => {
      setTopKpiFilter(topKpiFilter === "overdue" ? "All" : "overdue");
      setCurrentPage(1);
    }}
  />

  <DashboardKpiCard
    icon="🔥"
    title="Urgent"
    value={tasks.filter((t) => t.priority === "Urgent").length}
    helperText="High priority tasks"
    accent="orange"
    active={topKpiFilter === "urgent"}
    onClick={() => {
      setTopKpiFilter(topKpiFilter === "urgent" ? "All" : "urgent");
      setCurrentPage(1);
    }}
  />

  <DashboardKpiCard
    icon="👤"
    title="Employees"
    value={employees.length}
    helperText="Team members"
    accent="green"
  />

  <DashboardKpiCard
    icon="👥"
    title="Clients"
    value="-"
    helperText="Company clients"
    accent="purple"
    onClick={() => {
      window.location.href = "/dashboard/clients";
    }}
  />
</div>
      <div
  style={{
    ...panelStyle,
    marginTop: "30px",
    padding: "22px",
  }}
>
  <div
    onClick={() => setShowDepartmentKpi(!showDepartmentKpi)}
    style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      cursor: "pointer",
      marginBottom: "18px",
      padding: "14px 18px",
      background: darkMode ? "#0f172a" : "#f8fafc",
      border: darkMode
        ? "1px solid #334155"
        : "1px solid #e2e8f0",
      borderRadius: "12px",
      borderBottom: showDepartmentKpi
        ? "3px solid #2563eb"
        : darkMode
        ? "1px solid #334155"
        : "1px solid #e2e8f0",
    }}
  >
    <h2 style={{ margin: 0 }}>Department KPI</h2>

    <div
      style={{
        background: darkMode ? "#1e293b" : "#dbeafe",
        color: darkMode ? "#bfdbfe" : "#1d4ed8",
        padding: "6px 10px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: "700",
      }}
    >
      {showDepartmentKpi ? "HIDE" : "SHOW"}
    </div>
  </div>

  {showDepartmentKpi && (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: isMobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      gap: "15px",
    }}
  >
    {["General", "Construction", "Systems", "Inventory"].map((department) => {
  const departmentTasks = kpiTasks.filter(
    (task) => task.department === department
  );

  const departmentOpenTasks = departmentTasks.filter(
    (task) => task.status !== "Completed"
  ).length;

  return (
    <div
  key={department}
  onClick={() => {
    if (categoryFilter === department) {
      setCategoryFilter("All");
    } else {
      setCategoryFilter(department);
    }

    setCurrentPage(1);
  }}
  style={{
    ...cardStyle,
    cursor: "pointer",
    border:
      categoryFilter === department
        ? "2px solid #2563eb"
        : "1px solid #e5e7eb",
    transform:
      categoryFilter === department
        ? "scale(1.03)"
        : "scale(1)",
    transition: "all 0.2s ease",
  }}
>
      <h3>{department}</h3>
      <p style={numberStyle}>{departmentOpenTasks}</p>
    </div>
  );
})}
  </div>
)}
</div>
<div
  style={{
    ...panelStyle,
    marginTop: "25px",
    padding: "22px",
  }}
>
<div
  onClick={() => setShowEmployeeKpi(!showEmployeeKpi)}
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    cursor: "pointer",
    marginBottom: "18px",
    padding: "14px 18px",
    background: darkMode ? "#0f172a" : "#f8fafc",
    border: darkMode
      ? "1px solid #334155"
      : "1px solid #e2e8f0",
    borderRadius: "12px",
    borderBottom: showEmployeeKpi
      ? "3px solid #2563eb"
      : darkMode
      ? "1px solid #334155"
      : "1px solid #e2e8f0",
    transition: "0.2s ease",
  }}
>
  <h3 style={{ margin: 0 }}>Employee KPI</h3>
  <div
  style={{
    background: darkMode ? "#1e293b" : "#dbeafe",
    color: darkMode ? "#bfdbfe" : "#1d4ed8",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: "700",
  }}
>
  {showEmployeeKpi ? "HIDE" : "SHOW"}
</div>
</div>

{showEmployeeKpi && (

  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
      gap: "16px",
    }}
  >
    {visibleEmployees.map((employee) => {
      const employeeTasks = tasks.filter(
        (task) => String(task.employee_id) === String(employee.id)
      );

      const completedTasks = employeeTasks.filter(
        (task) => task.status === "Completed"
      ).length;

      const openTasks = employeeTasks.filter(
        (task) => task.status !== "Completed"
      ).length;

      const urgentTasks = employeeTasks.filter(
        (task) => task.priority === "Urgent"
      ).length;

      const completionRate =
        employeeTasks.length > 0
          ? Math.round((completedTasks / employeeTasks.length) * 100)
          : 0;

      return (
        <div
  key={employee.id}
  onClick={() => {
    if (employeeFilter === String(employee.id)) {
      setEmployeeFilter("All");
    } else {
      setEmployeeFilter(String(employee.id));
    }
  
    setCurrentPage(1);
  }}
  style={{
    background: darkMode ? "#1e293b" : "white",
    cursor: "pointer",
            borderRadius: "16px",
            padding: "18px",
            boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
            border:
  employeeFilter === String(employee.id)
    ? "2px solid #2563eb"
    : urgentTasks > 0
    ? "2px solid #dc2626"
    : "1px solid #e5e7eb",

transform:
  employeeFilter === String(employee.id)
    ? "scale(1.02)"
    : "scale(1)",

transition: "all 0.2s ease",
          }}
        >
          <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "14px",
  }}
>
  <h3
    style={{
      margin: 0,
      fontSize: "18px",
      fontWeight: "700",
      color: darkMode ? "#f8fafc" : "#111827",
    }}
  >
    {employee.full_name}
  </h3>

  <div
    style={{
      background: darkMode ? "#334155" : "#eef2ff",
      color: darkMode ? "#cbd5e1" : "#4338ca",
      padding: "4px 10px",
      borderRadius: "999px",
      fontSize: "12px",
      fontWeight: "600",
    }}
  >
    {employee.department || "General"}
  </div>
</div>

          

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Total</span>
            <strong>{employeeTasks.length}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Open</span>
            <strong>{openTasks}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Completed</span>
            <strong>{completedTasks}</strong>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Urgent</span>
            <strong>{urgentTasks}</strong>
          </div>

          <div
            style={{
              marginTop: "14px",
              height: "8px",
              background: "#e5e7eb",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${completionRate}%`,
                height: "100%",
                background: completionRate >= 70 ? "#16a34a" : "#f59e0b",
              }}
            />
          </div>

          <p style={{ marginTop: "8px", fontSize: "13px", color: "#6b7280" }}>
            Completion: {completionRate}%
          </p>
        </div>
      );
    })}
  </div>
  )}
</div>

      {currentEmployee?.role?.toLowerCase() !== "technician" && (
  <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
    {showForm ? "Cancel" : "Add New Task"}
  </button>
)}

      {showForm && (
     <TaskForm>
<div
  style={{
    ...panelStyle,
    marginTop: "20px",
    background: panelBg,
color: textColor,
  }}
>
<h2>Add New Service Task</h2>

<div
  style={{
    display: "grid",
    gap: "22px",
    marginTop: "20px",
  }}
>
  <div>
    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
      Store
    </label>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "14px",
      }}
    >
      <input
        placeholder="Search store..."
        value={storeSearchText}
        onChange={(e) => setStoreSearchText(e.target.value)}
        style={inputStyle}
      />

      <select
        value={newTask.store_id}
        onChange={(e) => {
          const selectedStore = stores.find(
            (store) => store.id.toString() === e.target.value
          );
          const clientName = selectedStore ? getStoreClientName(selectedStore) : "";

          setNewTask({
            ...newTask,
            store_id: e.target.value,
            store: selectedStore ? formatTaskStoreLabel(selectedStore) : "",
            client_name: clientName,
            company_name: clientName,
            location: selectedStore?.location || "",
          });
        }}
        style={inputStyle}
      >
        <option value="">Select store</option>

        {stores
          .filter((store) => {
            const clientName = getStoreClientName(store);
            return `${clientName} ${store.store_name || ""} ${store.location || ""}`
              .toLowerCase()
              .includes(storeSearchText.toLowerCase());
          })
          .map((store) => {
            if (!store.store_name || !store.location) return null;

            const clientName = getStoreClientName(store);

            return (
              <option key={store.id} value={store.id}>
                {clientName ? `${clientName} / ` : ""}
                {store.store_name} / {store.location}
              </option>
            );
          })}
      </select>

<button
  type="button"
  onClick={() => setShowQuickAddStore(!showQuickAddStore)}
  style={{
    ...buttonStyle,
    background: "#2563eb",
  }}
>
  {showQuickAddStore ? "Cancel New Store" : "+ New Store"}
</button>
</div>

{showQuickAddStore && (
<div
  style={{
    marginTop: "16px",
    padding: "16px",
    borderRadius: "12px",
    background: darkMode ? "#0f172a" : "#f8fafc",
    border: "1px solid #e5e7eb",
    display: "grid",
    gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
    gap: "12px",
  }}
>
  <select
    value={quickStore.client_id}
    onChange={(e) =>
      setQuickStore({
        ...quickStore,
        client_id: e.target.value,
      })
    }
    style={inputStyle}
  >
    <option value="">Select Client</option>
    {taskClients.map((client) => (
      <option key={String(client.id)} value={String(client.id)}>
        {client.client_name?.trim() || "Unnamed Client"}
      </option>
    ))}
  </select>

  <input
    placeholder="Store Name"
    value={quickStore.store_name}
    onChange={(e) =>
      setQuickStore({
        ...quickStore,
        store_name: e.target.value,
      })
    }
    style={inputStyle}
  />

  <input
    placeholder="Location"
    value={quickStore.location}
    onChange={(e) =>
      setQuickStore({
        ...quickStore,
        location: e.target.value,
      })
    }
    style={inputStyle}
  />

  <input
    placeholder="Store Code (optional)"
    value={quickStore.store_code}
    onChange={(e) =>
      setQuickStore({
        ...quickStore,
        store_code: e.target.value,
      })
    }
    style={inputStyle}
  />

  <button
    type="button"
    onClick={quickAddStore}
    style={{
      ...buttonStyle,
      background: "#16a34a",
    }}
  >
    Save New Store
  </button>
</div>
)}
</div>

  <div>
    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
      Client
    </label>
    <input
      readOnly
      value={newTask.client_name || "Select a store to load client"}
      style={{
        ...inputStyle,
        background: darkMode ? "#1e293b" : "#f8fafc",
        color: darkMode ? "#cbd5e1" : "#475569",
        cursor: "not-allowed",
      }}
    />
  </div>

  <div>
    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
      Work Description
    </label>

    <textarea
      placeholder="Issue / Work Description"
      value={newTask.issue}
      onChange={(e) => setNewTask({ ...newTask, issue: e.target.value })}
      style={{
        ...inputStyle,
        minHeight: "120px",
        resize: "vertical",
        lineHeight: "1.5",
      }}
    />
  </div>

  <div>
    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
      Technicians
    </label>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
        gap: "14px",
      }}
    >
      <select
        value={newTask.employee_id}
        onChange={(e) =>
          setNewTask({
            ...newTask,
            employee_id: e.target.value,
            additional_employee_ids: newTask.additional_employee_ids.filter(
              (id) => id !== e.target.value
            ),
          })
        }
        style={inputStyle}
      >
        <option value="">Primary technician</option>

        {visibleEmployees.map((employee) => (
          <option key={employee.id} value={employee.id}>
            {employee.full_name} ({employee.role})
          </option>
        ))}
      </select>

      <select
        value=""
        onChange={(e) => {
          const selectedId = e.target.value;
          if (!selectedId) return;
          if (newTask.additional_employee_ids.includes(selectedId)) return;

          setNewTask({
            ...newTask,
            additional_employee_ids: [
              ...newTask.additional_employee_ids,
              selectedId,
            ],
          });
        }}
        style={inputStyle}
      >
        <option value="">Add additional technician</option>

        {visibleEmployees
          .filter(
            (employee) =>
              String(employee.id) !== String(newTask.employee_id) &&
              !newTask.additional_employee_ids.includes(String(employee.id))
          )
          .map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.full_name} ({employee.role})
            </option>
          ))}
      </select>
    </div>

    {newTask.additional_employee_ids.length > 0 && (
      <div
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginTop: "10px",
        }}
      >
        {newTask.additional_employee_ids.map((id) => {
          const employee = visibleEmployees.find(
            (e) => String(e.id) === String(id)
          );

          return (
            <div
              key={id}
              style={{
                background: "#dbeafe",
                color: "#1d4ed8",
                padding: "6px 10px",
                borderRadius: "999px",
                fontSize: "13px",
                fontWeight: "600",
              }}
            >
              {employee?.full_name || "Employee"}

              <button
                type="button"
                onClick={() =>
                  setNewTask({
                    ...newTask,
                    additional_employee_ids:
                      newTask.additional_employee_ids.filter(
                        (employeeId) => employeeId !== id
                      ),
                  })
                }
                style={{
                  marginLeft: "8px",
                  border: "none",
                  background: "transparent",
                  color: "#1d4ed8",
                  cursor: "pointer",
                  fontWeight: "700",
                }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>
    )}
  </div>

  <div>
    <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
      Task Details
    </label>

    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
        gap: "14px",
      }}
    >
      <select
        value={newTask.status}
        onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
        style={inputStyle}
      >
        <option>Open</option>
        <option>In Progress</option>
        <option>Waiting Parts</option>
        <option>Completed</option>
      </select>

      <select
        value={newTask.category}
        onChange={(e) => setNewTask({ ...newTask, category: e.target.value })}
        style={inputStyle}
      >
        <option>General</option>
        <option>Construction</option>
        <option>Systems</option>
        <option>Inventory</option>
      </select>

      <select
        value={newTask.priority}
        onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
        style={inputStyle}
      >
        <option>Low</option>
        <option>Medium</option>
        <option>High</option>
        <option>Urgent</option>
      </select>

      <input
        type="date"
        value={newTask.due_date}
        onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
        style={inputStyle}
      />
    </div>
  </div>
  </div>

{canCreateTask && (
  <button
    onClick={addTask}
    style={{ ...buttonStyle, marginTop: "20px" }}
  >
    Save Task
  </button>

)}
        </div>
        </TaskForm>
      )}

{(isAdmin || isGeneral || isManager) && (
      <div style={{ ...panelStyle, marginTop: "30px" }}>
        <h2>Filters / Reporting</h2>
        <div
  style={{
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "15px",
    marginBottom: "10px",
  }}
>

</div>

{false && (
<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "15px",
    marginTop: "20px",
    width: "100%",
  }}
>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              ...inputStyle,
              width: "100%",
              minWidth: "0",
            }}
          >
            <option>All</option>
            <option>Open</option>
            <option>In Progress</option>
            <option>Waiting Parts</option>
            <option>Completed</option>
          </select>

          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            style={{
              ...inputStyle,
              width: isMobile ? "100%" : "250px",
              minWidth: "0",
            }}
          >
            <option value="All">All employees</option>
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.full_name}
              </option>
            ))}
          </select>
          <select
  value={categoryFilter}
  onChange={(e) => setCategoryFilter(e.target.value)}
  style={{
    ...inputStyle,
    width: isMobile ? "100%" : "250px",
    minWidth: "0",
  }}
>
<option>All</option>
<option>General</option>
<option>Systems</option>
<option>Construction</option>
<option>Inventory</option>
</select>
<select
  value={companyFilter}
  onChange={(e) => setCompanyFilter(e.target.value)}
  style={inputStyle}
>
  <option value="All">All companies</option>

  {[...new Set(tasks.map((t) => getTaskCompanyName(t)))]
    .filter(Boolean)
    .map((company) => (
      <option key={company} value={company}>
        {company}
      </option>
    ))}
</select>

<select
  value={locationFilter}
  onChange={(e) => setLocationFilter(e.target.value)}
  style={inputStyle}
>
  <option value="All">All locations</option>

  {[...new Set(stores.map((s) => s.location))]
  .filter((location): location is string => Boolean(location))
  .map((location) => (
      <option key={location} value={location}>
        {location}
      </option>
    ))}
</select>

<input
  placeholder="Search store / issue / technician"
  value={searchText}
  onChange={(e) => setSearchText(e.target.value)}
  style={inputStyle}
/>
    
        </div>
        )}

<div
  style={{
    display: "grid",
    gridTemplateColumns: isMobile
      ? "1fr 1fr"
      : "repeat(4, minmax(140px, 1fr))",
    gap: "12px",
    marginTop: "20px",
  }}
>
<div
  style={{
    background: darkMode ? "#1e293b" : "white",
    color: darkMode ? "#f8fafc" : "#111827",
    padding: "16px",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "600",
  }}
>
  <span>Open</span>
  <strong>{reportingOpenTasks}</strong>
</div>

<div
  style={{
    background: darkMode ? "#1e293b" : "white",
    color: darkMode ? "#f8fafc" : "#111827",
    padding: "16px",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "600",
  }}
>
  <span>Completed</span>
  <strong>{reportingCompletedTasks}</strong>
</div>

<div
  style={{
    background: darkMode ? "#1e293b" : "white",
    color: darkMode ? "#f8fafc" : "#111827",
    padding: "16px",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "600",
  }}
>
  <span>Urgent</span>
  <strong>{reportingUrgentTasks}</strong>
</div>

<div
  style={{
    background: darkMode ? "#1e293b" : "white",
    color: darkMode ? "#f8fafc" : "#111827",
    padding: "16px",
    borderRadius: "14px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    fontSize: "14px",
    fontWeight: "600",
  }}
>
  <span>Overdue</span>
  <strong>{reportingOverdueTasks}</strong>
</div>
</div>

{reportType === "department" && (
  <div
    style={{
      ...panelStyle,
      marginTop: "15px",
      padding: "16px",
      overflowX: "auto",
    }}
  >
    <h3 style={{ marginTop: 0 }}>
      Department Report Preview
    </h3>

    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px" }}>
            Department
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Total
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Open
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Completed
          </th>
        </tr>
      </thead>

      <tbody>
        {["General", "Construction", "Systems", "Inventory"].map(
          (department) => {
            const departmentTasks = filteredTasks.filter(
              (task) => task.department === department
            );

            return (
              <tr key={department}>
                <td style={{ padding: "10px" }}>
                  {department}
                </td>

                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  {departmentTasks.length}
                </td>

                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  {
                    departmentTasks.filter(
                      (task) =>
                        task.status !== "Completed"
                    ).length
                  }
                </td>

                <td
                  style={{
                    padding: "10px",
                    textAlign: "center",
                  }}
                >
                  {
                    departmentTasks.filter(
                      (task) =>
                        task.status === "Completed"
                    ).length
                  }
                </td>
              </tr>
            );
          }
        )}
      </tbody>
    </table>
  </div>
)}
{reportType === "employee" && (
  <div
    style={{
      ...panelStyle,
      marginTop: "15px",
      padding: "16px",
      overflowX: "auto",
    }}
  >
    <h3 style={{ marginTop: 0 }}>
      Employee Report Preview
    </h3>

    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px" }}>
            Employee
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Total
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Open
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Completed
          </th>
        </tr>
      </thead>

      <tbody>
        {[
          ...new Set(
            filteredTasks
              .map((task) => task.technician)
              .filter(Boolean)
          ),
        ].map((employee) => {
          const employeeTasks = filteredTasks.filter(
            (task) => task.technician === employee
          );

          return (
            <tr key={employee}>
              <td style={{ padding: "10px" }}>
                {employee}
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {employeeTasks.length}
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {
                  employeeTasks.filter(
                    (task) => task.status !== "Completed"
                  ).length
                }
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {
                  employeeTasks.filter(
                    (task) => task.status === "Completed"
                  ).length
                }
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}
{reportType === "company" && (
  <div
    style={{
      ...panelStyle,
      marginTop: "15px",
      padding: "16px",
      overflowX: "auto",
    }}
  >
    <h3 style={{ marginTop: 0 }}>
      Company Report Preview
    </h3>

    <table
      style={{
        width: "100%",
        borderCollapse: "collapse",
      }}
    >
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px" }}>
            Company
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Total
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Open
          </th>
          <th style={{ textAlign: "center", padding: "10px" }}>
            Completed
          </th>
        </tr>
      </thead>

      <tbody>
        {[
          ...new Set(
            filteredTasks.map((task) => getTaskCompanyName(task)).filter(Boolean)
          ),
        ].map((company) => {
          const companyTasks = filteredTasks.filter(
            (task) => getTaskCompanyName(task) === company
          );

          return (
            <tr key={company}>
              <td style={{ padding: "10px" }}>
                {company}
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {companyTasks.length}
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {
                  companyTasks.filter(
                    (task) =>
                      task.status !== "Completed"
                  ).length
                }
              </td>

              <td style={{ padding: "10px", textAlign: "center" }}>
                {
                  companyTasks.filter(
                    (task) =>
                      task.status === "Completed"
                  ).length
                }
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}
{reportType === "store" && (
  <div
    style={{
      ...panelStyle,
      marginTop: "15px",
      padding: "16px",
      overflowX: "auto",
    }}
  >
    <h3 style={{ marginTop: 0 }}>Store Report Preview</h3>

    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th style={{ textAlign: "left", padding: "10px" }}>Store</th>
          <th style={{ textAlign: "center", padding: "10px" }}>Total</th>
          <th style={{ textAlign: "center", padding: "10px" }}>Open</th>
          <th style={{ textAlign: "center", padding: "10px" }}>Completed</th>
        </tr>
      </thead>

      <tbody>
        {[
          ...new Set(
            filteredTasks.map((task) => getTaskStoreLabel(task)).filter(Boolean)
          ),
        ].map((store) => {
          const storeTasks = filteredTasks.filter(
            (task) => getTaskStoreLabel(task) === store
          );

          return (
            <tr key={store}>
              <td style={{ padding: "10px" }}>{store}</td>
              <td style={{ padding: "10px", textAlign: "center" }}>{storeTasks.length}</td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {storeTasks.filter((task) => task.status !== "Completed").length}
              </td>
              <td style={{ padding: "10px", textAlign: "center" }}>
                {storeTasks.filter((task) => task.status === "Completed").length}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}

        <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "12px",
    flexWrap: "wrap",
    marginTop: "20px",
  }}
>
  <span
    style={{
      fontSize: "14px",
      color: darkMode ? "#cbd5e1" : "#6b7280",
      flex: "1 1 180px",
    }}
  >
    Showing {filteredTasks.length} of {tasks.length} tasks
  </span>

  {employeeFilter !== "All" && (
  <div
    style={{
      background: darkMode ? "#1e3a8a" : "#dbeafe",
      color: darkMode ? "#bfdbfe" : "#1d4ed8",
      padding: "6px 12px",
      borderRadius: "999px",
      fontSize: "13px",
      fontWeight: "600",
    }}
  >
    Active filter:{" "}
    {
      employees.find(
        (employee) =>
          String(employee.id) === String(employeeFilter)
      )?.full_name
    }
  </div>
)}

  <button
  onClick={() => {
    setStatusFilter("All");
    setEmployeeFilter("All");
    setCategoryFilter("All");
    setCompanyFilter("All");
    setLocationFilter("All");
    setSearchText("");
    setCurrentPage(1);
  }}
  style={{
    ...buttonStyle,
    background: "#f3f4f6",
    color: "#111827",
  }}
>
  Clear filters
</button>

<div
  style={{
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: "10px",
  }}
>
  <select
    value={reportType}
    onChange={(e) => setReportType(e.target.value)}
    style={{
      ...inputStyle,
      width: isMobile ? "100%" : "240px",
    }}
  >
    <option value="detailed">Detailed Tasks</option>
    <option value="store">By Store</option>
    <option value="company">By Company</option>
    <option value="department">By Department</option>
    <option value="employee">By Employee</option>
  </select>

  <button
    onClick={exportTasks}
    style={buttonStyle}
  >
    Export CSV
  </button>
</div>
</div>
      </div>
)}
      <div style={{ ...panelStyle, marginTop: "30px" }}>
        <h2>Service Tasks</h2>
  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
  {isMobile && (
    <div
  className="md:hidden"
  style={{
    flexDirection: "column",
    gap: "15px",
  }}
>
{paginatedTasks.map((task) => (
    <TaskMobileCard
      key={task.id}
      task={task}
      buttonStyle={buttonStyle}
      setSelectedTask={setSelectedTask}
      setSelectedTaskId={setSelectedTaskId}
      loadComments={loadComments}
      loadPhotos={loadPhotos}
      uploadPhoto={uploadPhoto}
      setSelectedPhotoTaskId={setSelectedPhotoTaskId}
      highlightStyle={{
        background: highlightedTaskIds.has(task.id) ? "#bbf7d0" : "white",
      }}
updateStatus={updateStatus}
currentEmployee={currentEmployee}
photos={photos}
    />
  ))}
</div>
)}
  </div>

  {!isMobile && (
  <TaskTable>
  <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: "16px",
    marginBottom: "20px",
  }}
>
  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    }}
  >
    <div style={{ fontSize: "14px", color: "#6b7280" }}>
      Total Tasks
    </div>

    <div style={{ fontSize: "32px", fontWeight: "bold" }}>
      {totalKpiTasks}
    </div>
  </div>

  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    }}
  >
    <div style={{ fontSize: "14px", color: "#6b7280" }}>
      Open Tasks
    </div>

    <div style={{ fontSize: "32px", fontWeight: "bold" }}>
      {openKpiTasks}
    </div>
  </div>

  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    }}
  >
    <div style={{ fontSize: "14px", color: "#6b7280" }}>
      Done Tasks
    </div>

    <div style={{ fontSize: "32px", fontWeight: "bold" }}>
      {doneKpiTasks}
    </div>
  </div>

  <div
    style={{
      background: "white",
      padding: "20px",
      borderRadius: "12px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.08)",
    }}
  >
    <div style={{ fontSize: "14px", color: "#6b7280" }}>
      Urgent Tasks
    </div>

    <div style={{ fontSize: "32px", fontWeight: "bold" }}>
      {urgentKpiTasks}
    </div>
  </div>
</div>
    <table
      style={{
        width: "100%",
        marginTop: "20px",
        borderCollapse: "collapse",
        background: darkMode ? "#111827" : "white",
        color: darkMode ? "#f8fafc" : "#111827",
      }}
    >
          <thead>
            <tr>
              <th style={thStyle}>Store</th>
              <th style={thStyle}>Issue</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Department</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Workflow</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
          {paginatedTasks.map((task) => (
  <tr
  key={task.id}
  data-task-id={task.id}
  className={
    highlightedTaskIds.has(task.id) ? "task-row-highlight" : undefined
  }
  style={{
    background: getTableRowBackground(
      task,
      highlightedTaskIds.has(task.id),
      darkMode
    ),
    color: darkMode ? "#f8fafc" : "#111827",
  }}
>
<td
  style={{
    ...tdStyle,
    color: darkMode ? "#f8fafc" : "#111827",
  }}
>
  <div>
    <div style={{ color: darkMode ? "#f8fafc" : "#111827" }}>
      {task.store}
    </div>
    {(task.location || task.stores?.location) && (
      <div
        style={{
          fontSize: "13px",
          color: darkMode ? "#94a3b8" : "#6b7280",
          marginTop: "4px",
          lineHeight: 1.4,
        }}
      >
        {task.location || task.stores?.location}
      </div>
    )}
  </div>
</td>

    <td style={tdStyle}>{task.issue}</td>
    <td style={tdStyle}>{task.category || task.ai_category || "General"}</td>
    <td style={tdStyle}>{task.department || task.ai_department || "-"}</td>
    <td style={{ ...tdStyle, color: getPriorityColor(task.priority || "Medium"), fontWeight: "bold" }}>
      {task.priority || "Medium"}
    </td>
    <td style={tdStyle}>{task.due_date || "-"}</td>
    <td style={tdStyle}>
  {task.task_assignments &&
  task.task_assignments.length > 0 ? (
    task.task_assignments.map((assignment) => (
      <div key={assignment.employee_id}>
        {assignment.employees?.full_name}
      </div>
    ))
  ) : (
    task.employees?.full_name ||
    task.technician ||
    "Not assigned"
  )}
</td>
    <td style={tdStyle}>
    {canEdit ? (
  <select
    value={task.status}
    onChange={(e) => updateStatus(task.id, e.target.value)}
    style={{
      padding: "8px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      color: getStatusColor(task.status),
    }}
  >
    <option>Open</option>
    <option>In Progress</option>
    <option>Waiting Parts</option>
    <option>Completed</option>
  </select>
) : (
  <span
  style={{
    background: getStatusColor(task.status),
    color: "white",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: "bold",
    fontSize: "12px",
    display: "inline-block",
    minWidth: "110px",
    textAlign: "center",
  }}
>
  {task.status}
</span>
)}

    </td>
    <td style={tdStyle}>
    <span
      style={{
        background: "#e0e7ff",
        color: "#3730a3",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        whiteSpace: "nowrap",
      }}
    >
      {task.workflow_status && task.workflow_status in WORKFLOW_LABELS
        ? WORKFLOW_LABELS[task.workflow_status as WorkflowStatus]
        : WORKFLOW_LABELS.new_request}
    </span>
    </td>
    <td style={tdStyle}>
  {task.created_at
    ? new Date(task.created_at).toLocaleDateString()
    : "-"}
</td>
    <td style={tdStyle}>
      <TaskActionsDropdown
        task={task}
        darkMode={darkMode}
        isOpen={openActionsTaskId === task.id}
        onToggle={() =>
          setOpenActionsTaskId((prev) => (prev === task.id ? null : task.id))
        }
        onClose={() => setOpenActionsTaskId(null)}
        showEdit={isAdmin || isGeneral || isManager}
        showDelete={currentEmployee?.role?.toLowerCase() === "admin"}
        showPhotos={getTaskAttachmentUrls(task.attachments).length > 0}
        showAiAnalysis={Boolean(task.ai_summary?.trim())}
        showAcceptRequest={
          !task.workflow_status || task.workflow_status === "new_request"
        }
        onAcceptRequest={() => acceptRequest(task.id)}
        showStartSiteInspection={task.workflow_status === "accepted"}
        onStartSiteInspection={() => startSiteInspection(task.id)}
        showSendQuotation={task.workflow_status === "site_inspection"}
        onSendQuotation={() => sendQuotation(task.id)}
        showApprove={task.workflow_status === "quotation_sent"}
        onApprove={() => approveRequest(task.id)}
        onComments={() => {
          setSelectedTask(task);
          setSelectedTaskId(task.id.toString());
          loadComments(task.id);
          loadPhotos(task.id);
          setSelectedPhotoTaskId(task.id);
        }}
        onPhotos={() => setAttachmentsModalTask(task)}
        onAiAnalysis={() => setAiAnalysisModalTask(task)}
        onEdit={() => {
          setEditingTask(task);
          setShowForm(true);
          setNewTask({
            store_id: task.store_id ? String(task.store_id) : "",
            store: task.store || "",
            issue: task.issue || "",
            employee_id: task.employee_id || "",
            additional_employee_ids: [],
            status: task.status || "Open",
            category: task.category || task.department || "General",
            priority: task.priority || "Medium",
            due_date: task.due_date || "",
            client_name: getTaskCompanyName(task),
            company_name: getTaskCompanyName(task),
            location: task.stores?.location || task.location || "",
          });
        }}
        onDelete={() => deleteTask(task.id)}
        onUploadPhoto={async (file) => {
          await uploadPhoto(task.id, file);
          setSelectedPhotoTaskId(task.id);
          loadPhotos(task.id);
        }}
      />
    </td>
  </tr>
))}
</tbody>
</table>
</TaskTable>
)}

<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "10px",
    marginTop: "20px",
  }}
>
  <button
    disabled={currentPage === 1}
    onClick={() => setCurrentPage((prev) => prev - 1)}
    style={buttonStyle}
  >
    Previous
  </button>

  <span>
    Page {currentPage} of {totalPages}
  </span>

  <button
    disabled={currentPage === totalPages}
    onClick={() => setCurrentPage((prev) => prev + 1)}
    style={buttonStyle}
  >
    Next
  </button>
</div>

</div>

{selectedTaskId && (
  <div>
    {selectedTask && (
      <div
      style={{
        background: darkMode ? "#334155" : "#eff6ff",
        color: darkMode ? "#f8fafc" : "#111827",
        padding: "20px",
        borderRadius: "14px",
        marginBottom: "20px",
      }}
      >
        <h2>{selectedTask.store}</h2>
        <p><strong>Issue:</strong> {selectedTask.issue}</p>
        {selectedTask.client_description?.trim() &&
          selectedTask.client_description !== selectedTask.issue && (
            <p><strong>Client Description:</strong> {selectedTask.client_description}</p>
          )}
        <p><strong>Category:</strong> {selectedTask.category || selectedTask.ai_category || "-"}</p>
        <p><strong>Department:</strong> {selectedTask.department || selectedTask.ai_department || "-"}</p>
        <p><strong>Priority:</strong> {selectedTask.priority}</p>
        <p><strong>Status:</strong> {selectedTask.status}</p>
        <p><strong>Assigned To:</strong> {selectedTask.technician}</p>
      </div>
    )}

    {selectedTask?.ai_summary?.trim() && (
      <div style={{ marginBottom: "20px" }}>
        <AIAnalysisCard
          ai_category={selectedTask.ai_category}
          ai_department={selectedTask.ai_department}
          ai_priority={selectedTask.ai_priority}
          ai_summary={selectedTask.ai_summary}
          ai_confidence={selectedTask.ai_confidence}
          client_description={selectedTask.client_description}
        />
      </div>
    )}

    {selectedTask && (
      <TaskAttachmentsPanel
        attachments={selectedTask.attachments}
        darkMode={darkMode}
      />
    )}

    {canUseTaskMessages && selectedTask && selectedTaskId && (
      <TaskMessagesPanel
        taskId={Number(selectedTaskId)}
        senderName={currentEmployee?.full_name || "ERP"}
        darkMode={darkMode}
        onUnreadChange={handleErpMessageUnreadChange}
      />
    )}

    <div
      style={{
        background: darkMode ? "#1f2937" : "white",
color: darkMode ? "#f9fafb" : "#111827",
        padding: "30px",
        borderRadius: "16px",
        marginTop: "30px",
      }}
    >
      <h2>Task Comments</h2>

      <div style={{ marginTop: "20px", marginBottom: "20px" }}>
        <h3>Photos</h3>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "10px" }}>
          {photos.map((photo) => (
            <img
              key={photo.id}
              src={photo.photo_url}
              alt="Task"
              style={{
                width: "140px",
                height: "140px",
                objectFit: "cover",
                borderRadius: "10px",
                border: "1px solid #ddd",
              }}
            />
          ))}
        </div>
      </div>

      <div
  style={{
    display: "flex",
    flexWrap: "wrap",
    gap: "10px",
    marginTop: "20px",
    alignItems: "center",
  }}
>
        <input
          placeholder="Write comment..."
          value={commentText}
          onChange={(e) => setCommentText(e.target.value)}
          style={{
            flex: 1,
            padding: "14px",
            borderRadius: "10px",
            border: "1px solid #ddd",
          }}
        />

        <button onClick={() => addComment(Number(selectedTaskId))} style={buttonStyle}>
          Add
        </button>
      </div>

      <div style={{ marginTop: "20px" }}>
        {comments.map((comment) => (
          <div
            key={comment.id}
            style={{
              padding: "14px",
              borderBottom: "1px solid #eee",
            }}
          >
            <strong>{comment.author}</strong>
            <p>{comment.comment}</p>
          </div>
        ))}
      </div>
    </div>
  </div>
)}

{attachmentsModalTask && (
  <TaskAttachmentsModal
    task={attachmentsModalTask}
    darkMode={darkMode}
    onClose={() => setAttachmentsModalTask(null)}
  />
)}

{aiAnalysisModalTask && (
  <TaskAiAnalysisModal
    task={aiAnalysisModalTask}
    darkMode={darkMode}
    onClose={() => setAiAnalysisModalTask(null)}
  />
)}

{(isAdmin || isGeneral) && (
  <ClientRequestToast
    notification={activeToast}
    onOpenTask={handleOpenTaskFromNotification}
    onDismiss={dismissToast}
  />
)}

{canUseTaskMessages && erpMessageToast && (
  <ErpMessageToast
    taskId={erpMessageToast.taskId}
    senderName={erpMessageToast.senderName}
    preview={erpMessageToast.preview}
    onOpenTask={handleOpenTaskFromMessage}
    onDismiss={() => setErpMessageToast(null)}
  />
)}

</main>
  );
}


const cardStyle = {
  background: "white",
  color: "#111827",
  padding: "16px",
  borderRadius: "12px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
  width: "100%",
  maxWidth: "160px",
};

const panelStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const numberStyle = {
  fontSize: "28px",
  fontWeight: "bold",
  margin: "8px 0",
  color: "#111827",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
};

const tdStyle = {
  padding: "12px",

  fontWeight: "500",
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px",
  borderRadius: "10px",
  border: "1px solid #ddd",
  fontSize: "16px",
};

const buttonStyle = {
  background: "#111827",
  color: "white",
  padding: "14px 24px",
  border: "none",
  borderRadius: "12px",
  fontSize: "16px",
  cursor: "pointer",
};



function getFirstName(fullName: string) {
  const trimmed = fullName.trim();
  if (!trimmed) return "there";
  return trimmed.split(/\s+/)[0];
}

function DashboardNavLink({
  href,
  icon,
  label,
  active = false,
}: {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        flex: "1 1 120px",
        minWidth: "120px",
        maxWidth: "180px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        padding: "14px 16px",
        borderRadius: "14px",
        textDecoration: "none",
        color: "#111827",
        background: hovered ? "#f3f4f6" : "white",
        border: active
          ? "2px solid #2563eb"
          : hovered
            ? "1px solid #cbd5e1"
            : "1px solid #e5e7eb",
        boxShadow: hovered
          ? "0 8px 20px rgba(15, 23, 42, 0.08)"
          : "0 2px 8px rgba(15, 23, 42, 0.04)",
        transform: hovered ? "translateY(-2px)" : "translateY(0)",
        transition: "transform 0.18s ease, box-shadow 0.18s ease, background 0.18s ease, border-color 0.18s ease",
        fontWeight: 600,
        fontSize: "14px",
      }}
    >
      <span style={{ fontSize: "22px", lineHeight: 1 }} aria-hidden="true">
        {icon}
      </span>
      <span>{label}</span>
    </a>
  );
}

function getStatusColor(status: string) {
  if (status === "Completed") return "green";
  if (status === "In Progress") return "orange";
  if (status === "Waiting Parts") return "red";
  return "blue";
}

function getPriorityColor(priority: string) {
  if (priority === "Urgent" || priority === "Critical") return "red";
  if (priority === "High") return "orange";
  if (priority === "Medium") return "blue";
  return "green";
}