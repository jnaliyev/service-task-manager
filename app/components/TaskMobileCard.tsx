type Props = {
    task: any;
    buttonStyle: React.CSSProperties;
  
    setSelectedTask: (task: any) => void;
    setSelectedTaskId: (id: string) => void;
  
    loadComments: (taskId: number) => void;
    loadPhotos: (taskId: number) => void;
  
    setSelectedPhotoTaskId: (id: number) => void;
  };
  
  export default function TaskMobileCard({
    task,
    buttonStyle,
    setSelectedTask,
    setSelectedTaskId,
    loadComments,
    loadPhotos,
    setSelectedPhotoTaskId,
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
  
          <a
            href={`https://wa.me/?text=${encodeURIComponent(
              `Task: ${task.issue}
  Store: ${task.store}
  Status: ${task.status}`
            )}`}
            target="_blank"
            style={{
              background: "#25D366",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              textDecoration: "none",
            }}
          >
            WhatsApp
          </a>
        </div>
      </div>
    );
  }