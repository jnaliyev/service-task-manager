type Props = {
    task: any;
    buttonStyle: React.CSSProperties;
  
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
    setSelectedTask,
    setSelectedTaskId,
    loadComments,
    loadPhotos,
    setSelectedPhotoTaskId,
    currentEmployee,
  }: Props) {
    return (
      <div
        style={{
          background: "white",
          padding: "16px",
          borderRadius: "16px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
      >
        <h3 style={{ marginBottom: "10px" }}>
          {task.stores?.store_name || task.store}
        </h3>
  
        <p><b>Issue:</b> {task.issue}</p>
        <p><b>Status:</b> {task.status}</p>
        <p><b>Priority:</b> {task.priority}</p>
        <p><b>Technician:</b> {task.technician}</p>
  
        <div
          style={{
            display: "flex",
            gap: "10px",
            marginTop: "15px",
            flexWrap: "wrap",
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
            style={buttonStyle}
          >
            Comments
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

Created by: ${currentEmployee?.full_name || currentEmployee?.email || "Retail Systems"}
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