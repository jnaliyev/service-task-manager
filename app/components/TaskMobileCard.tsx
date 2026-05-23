type Props = {
    task: any;
    buttonStyle: React.CSSProperties;
    highlightStyle: React.CSSProperties;
    updateStatus: (taskId: number, status: string) => void;
  
    setSelectedTask: (task: any) => void;
    setSelectedTaskId: (id: string) => void;
  
    loadComments: (taskId: number) => void;
    loadPhotos: (taskId: number) => void;
  
    setSelectedPhotoTaskId: (id: number) => void;
    currentEmployee: any;
  };
  
  export default function TaskMobileCard({
    task,
    buttonStyle,
    highlightStyle,
    setSelectedTask,
    setSelectedTaskId,
    loadComments,
    loadPhotos,
    setSelectedPhotoTaskId,
    currentEmployee,
    updateStatus,
 
  }: Props) {
    return (
      <div
        style={{
          ...highlightStyle,
          background: "white",
          padding: "16px",
          borderRadius: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>
          {task.stores?.store_name || task.store}
        </h3>
        <div
  style={{
    display: "flex",
    gap: "6px",
    flexWrap: "wrap",
    marginTop: "8px",
    marginBottom: "10px",
  }}
>
  {task.priority === "High" && (
    <span
      style={{
        background: "#f97316",
        color: "white",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      HIGH
    </span>
  )}

  {task.priority === "Urgent" && (
    <span
      style={{
        background: "#dc2626",
        color: "white",
        padding: "4px 8px",
        borderRadius: "999px",
        fontSize: "12px",
        fontWeight: 600,
      }}
    >
      URGENT
    </span>
  )}

  {task.due_date &&
    new Date(task.due_date).toDateString() ===
      new Date().toDateString() && (
      <span
        style={{
          background: "#2563eb",
          color: "white",
          padding: "4px 8px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        TODAY
      </span>
    )}

  {task.due_date &&
    new Date(task.due_date) < new Date(new Date().setHours(0, 0, 0, 0)) &&
    task.status !== "Done" && (
      <span
        style={{
          background: "#991b1b",
          color: "white",
          padding: "4px 8px",
          borderRadius: "999px",
          fontSize: "12px",
          fontWeight: 600,
        }}
      >
        OVERDUE
      </span>
    )}
</div>
  
        <p><b>Issue:</b> {task.issue}</p>
        <div style={{ marginTop: "10px", marginBottom: "10px" }}>
  <b>Status:</b>

  <select
    value={task.status}
    onChange={(e) => updateStatus(task.id, e.target.value)}
    style={{
      marginLeft: "10px",
      padding: "8px",
      borderRadius: "8px",
      border: "1px solid #ccc",
      background: "white",
      fontWeight: "bold",
    }}
  >
    <option>Open</option>
    <option>In Progress</option>
    <option>Waiting Parts</option>
    <option>Completed</option>
  </select>
</div>
        <p><b>Priority:</b> {task.priority}</p>
        <p><b>Technician:</b> {task.technician}</p>
        {task.status !== "Completed" && (
  <button
    onClick={() => updateStatus(task.id, "Completed")}
    style={{
      background: "#16a34a",
      color: "white",
      width: "100%",
      padding: "12px",
      borderRadius: "10px",
      border: "none",
      fontWeight: "bold",
      marginTop: "12px",
      fontSize: "15px",
      cursor: "pointer",
    }}
  >
    ✅ Mark as Completed
  </button>
)}
  
        <div
  style={{
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginTop: "15px",
    width: "100%",
  }}
>
<button
  onClick={() => {
    setSelectedTask(task);
    setSelectedTaskId(task.id.toString());

    loadComments(task.id);
    loadPhotos(task.id);

    setSelectedPhotoTaskId(task.id);
  }}
  style={{ ...buttonStyle, width: "100%" }}
>
  Comments
</button>

<button
  onClick={() => {
    setSelectedPhotoTaskId(task.id);
  }}
  style={{
    background: "#16a34a",
    color: "white",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
    width: "100%",
  }}
>
  Upload Photo
</button>
        
  
          <button
  onClick={() => {
    const text = `
🚨 NEW SERVICE TASK

Store: ${task.stores?.store_name || task.store || ""}

Issue: ${task.issue || ""}
Priority: ${task.priority || ""}
Status: ${task.status || ""}
Technician: ${task.technician || "Not assigned"}

Created by: ${task.created_by || currentEmployee?.full_name || "Retail Systems"}
`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(text.trim())}`,
      "_blank"
    );
  }}
  style={{
    background: "#25D366",
    color: "white",
    padding: "10px 14px",
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  }}
>
  WhatsApp Message
</button>
        </div>
      </div>
    );
  }