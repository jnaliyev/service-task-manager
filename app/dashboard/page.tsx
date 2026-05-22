"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Employee = {
  id: string;
  full_name: string;
  role: string;
  department?: string;
  is_active: boolean;
};

type Task = {
  id: number;
  store: string;
  issue: string;
 technician: string;
  status: string;
  category?: string;
  department?: string;
assigned_to?: string;
created_by?: string;
  priority?: string;
  due_date?: string;
  employee_id?: string;
  created_at?: string;
  employees?: Employee;
  stores?: {
    company_name: string;
    store_name: string;
    location: string;
  };
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

export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhotoTaskId, setSelectedPhotoTaskId] = useState<number | null>(null); 
const [commentText, setCommentText] = useState("");
const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [currentEmployee, setCurrentEmployee] = useState<Employee | null>(null);
  const isAdmin = currentEmployee?.role === "Admin";
const isManager = currentEmployee?.role === "Manager";
const isTechnician = currentEmployee?.role === "Technician";
const isInventory = currentEmployee?.role === "Inventory";
const isViewer = currentEmployee?.role === "Viewer";

const canEdit =
  isAdmin || isManager || isTechnician || isInventory;

const canCreateTask =
  isAdmin || isManager;

const canManageEmployees =
  isAdmin;
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("All");
  const [employeeFilter, setEmployeeFilter] = useState("All");

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchText, setSearchText] = useState("");
  const [companyFilter, setCompanyFilter] = useState("All");
const [locationFilter, setLocationFilter] = useState("All");
  const [storeSearchText, setStoreSearchText] = useState("");
  const [newTask, setNewTask] = useState({
    store_id: "",
    store: "",
    issue: "",
    employee_id: "",
    status: "Open",
    category: "General",
    priority: "Medium",
    due_date: "",
    company_name: "",
location: "",
  });

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
        const matchCompany =
  companyFilter === "All" ||
  task.stores?.company_name === companyFilter;

  const matchLocation =
  locationFilter === "All" ||
  task.stores?.location === locationFilter;
  
  const search = searchText.toLowerCase();

  const matchSearch =
    task.store?.toLowerCase().includes(search) ||
    task.stores?.store_name?.toLowerCase().includes(search) ||
    task.stores?.company_name?.toLowerCase().includes(search) ||
    task.stores?.location?.toLowerCase().includes(search) ||
    task.issue?.toLowerCase().includes(search) ||
    task.technician?.toLowerCase().includes(search) ||
    task.employees?.full_name?.toLowerCase().includes(search);
  
    const roleAccess =
    isAdmin ||
    (isManager && task.department === currentEmployee?.department) ||
    (isTechnician && task.employee_id === currentEmployee?.id) ||
    isViewer;
      
      return (
        roleAccess &&
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
  ]);
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
  async function loadStores() {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .order("company_name", { ascending: true });
  
    if (error) {
      console.error(error);
      return;
    }
  
    setStores(data || []);
  }
  async function loadTasks(employee?: Employee | null) {
    let query = supabase
      .from("tasks")
      .select("*, employees(full_name, role)")
      .order("created_at", { ascending: false });
  
    if (employee?.role?.toLowerCase() === "technician") {
      query = query.eq("employee_id", employee.id);
    }
  
    const { data, error } = await query;
  
    if (error) {
      console.error(error);
      return;
    }
  
    setTasks(data || []);
  }

  async function addTask() {
    if (!newTask.store_id || !newTask.issue) {
      alert("Please fill Store and Issue");
      return;
    }

    const selectedEmployee = employees.find((e) => e.id === newTask.employee_id);

    const { error } = await supabase.from("tasks").insert([
      {
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
      },
    ]);

    if (error) {
      console.error(error);
      alert("Error while saving task");
      return;
    }

    setNewTask({
      store_id: "",
      store: "",
      issue: "",
      employee_id: "",
      status: "Open",
      category: "General",
      priority: "Medium",
      due_date: "",
      company_name: "",
      location: "",
    });

    setShowForm(false);
    loadTasks();
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
    const headers = [
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
  
    const rows = filteredTasks.map((task) => [
      task.store,
      task.stores?.company_name || "",
task.stores?.location || "",
      task.issue,
      task.category,
      task.priority,
      task.technician,
      task.status,
      task.due_date,
    ]);
  
    const csvContent =
      [headers, ...rows]
        .map((e) => e.join(","))
        .join("\n");
  
    const blob = new Blob([csvContent], {
      type: "text/csv;charset=utf-8;",
    });
  
    const link = document.createElement("a");
  
    link.href = URL.createObjectURL(blob);
  
    link.setAttribute(
      "download",
      `tasks-report-${Date.now()}.csv`
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
    <main style={{ padding: "40px", fontFamily: "Arial", background: "#f5f7fb", minHeight: "100vh" }}>
      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "30px",
  }}
>
<h1 style={{ fontSize: "clamp(28px, 5vw, 42px)" }}>
    Retail Systems Service Dashboard
  </h1>

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
    }}
  >
    Logout
  </button>
</div>
{currentEmployee && (
  <div
    style={{
      background: "white",
      padding: "12px 18px",
      borderRadius: "10px",
      marginBottom: "20px",
      color: "#374151",
    }}
  >
    Logged in as: {currentEmployee.full_name} / Role: {currentEmployee.role}
  </div>
)}

<div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: "20px",
    marginBottom: "30px",
  }}
>
        <div style={cardStyle}>
          <h3>Open Tasks</h3>
          <p style={numberStyle}>{tasks.filter((t) => t.status !== "Completed").length}</p>
   
        </div>
        <div style={cardStyle}>
  <h3>Total Tasks</h3>
  <p style={numberStyle}>{tasks.length}</p>
</div>

<div
  style={{
    ...cardStyle,
    background:
      tasks.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date) < new Date() &&
          task.status !== "Completed"
      ).length > 0
        ? "#fee2e2"
        : "white",
    border:
      tasks.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date) < new Date() &&
          task.status !== "Completed"
      ).length > 0
        ? "2px solid #dc2626"
        : "none",
  }}
>
<h3>Overdue</h3>
  <p style={numberStyle}>
    {
      tasks.filter(
        (task) =>
          task.due_date &&
          new Date(task.due_date) < new Date() &&
          task.status !== "Completed"
      ).length
    }
  </p>
</div>
        <div style={cardStyle}>
          <h3>Urgent</h3>
          <p style={numberStyle}>{tasks.filter((t) => t.priority === "Urgent").length}</p>
        </div>

        <div style={cardStyle}>
          <h3>Employees</h3>
          <p style={numberStyle}>{employees.length}</p>
        </div>
      </div>

      {currentEmployee?.role?.toLowerCase() !== "technician" && (
  <button onClick={() => setShowForm(!showForm)} style={buttonStyle}>
    {showForm ? "Cancel" : "Add New Task"}
  </button>
)}

      {showForm && (
        <div style={{ ...panelStyle, marginTop: "20px" }}>
          <h2>Add New Service Task</h2>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "15px", marginTop: "20px" }}>
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

    setNewTask({
      ...newTask,
      store_id: e.target.value,
      store: selectedStore
  ? `${selectedStore.company_name} / ${selectedStore.store_name} / ${selectedStore.location}`
  : "",
  company_name: selectedStore?.company_name || "",
location: selectedStore?.location || "",
    });
  }}
  style={inputStyle}
>
  <option value="">Select store</option>

  {stores
  .filter((store) =>
    `${store.company_name} ${store.store_name} ${store.location}`
      .toLowerCase()
      .includes(storeSearchText.toLowerCase())
  )
  .map((store) => {
  if (!store.company_name || !store.store_name || !store.location)
    return null;

  return (
    <option key={store.id} value={store.id}>
      {store.company_name} / {store.store_name} / {store.location}
    </option>
  );
})}
</select>

            <input
              placeholder="Issue / Work Description"
              value={newTask.issue}
              onChange={(e) => setNewTask({ ...newTask, issue: e.target.value })}
              style={inputStyle}
            />

            <select
              value={newTask.employee_id}
              onChange={(e) => setNewTask({ ...newTask, employee_id: e.target.value })}
              style={inputStyle}
            >
              <option value="">Select employee</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.full_name} ({employee.role})
                </option>
              ))}
            </select>

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

          {canCreateTask && (
  <button
    onClick={addTask}
    style={{ ...buttonStyle, marginTop: "20px" }}
  >
    Save Task
  </button>
)}
        </div>
      )}

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
{[...new Set(tasks.map((t) => t.stores?.company_name))]
  .filter(Boolean)
  .map((company) => (
      <div
        key={company}
        style={{
          background: "#eef2ff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "14px",
        }}
      >
        {company}:{" "}
        {
          tasks.filter((t) => t.stores?.company_name === company)
            .length
        }
      </div>
    ))}
</div>
<div
  style={{
    display: "flex",
    gap: "10px",
    flexWrap: "wrap",
    marginTop: "10px",
  }}
>
  {[...new Set(tasks.map((t) => t.technician))]
    .filter(Boolean)
    .map((technician) => (
      <div
        key={technician}
        style={{
          background: "#ecfeff",
          padding: "10px 14px",
          borderRadius: "10px",
          fontSize: "14px",
        }}
      >
        {technician}:{" "}
        {
          tasks.filter(
            (t) =>
              t.technician === technician &&
              t.status !== "Completed"
          ).length
        }
      </div>
    ))}
</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: "15px", marginTop: "20px" }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={inputStyle}
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
            style={inputStyle}
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
  style={inputStyle}
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

  {[...new Set(tasks.map((t) => t.stores?.company_name))]
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

  {[...new Set(tasks.map((t) => t.stores?.location))]
    .filter(Boolean)
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

        <p style={{ marginTop: "15px", color: "#6b7280" }}>
          Showing {filteredTasks.length} of {tasks.length} tasks
          <button
  onClick={exportTasks}
  style={{ ...buttonStyle, marginTop: "15px" }}
>
  Export CSV
</button>
        </p>
      </div>

      <div style={{ ...panelStyle, marginTop: "30px" }}>
        <h2>Service Tasks</h2>

        <div style={{ overflowX: "auto" }}>
  <table
    style={{
      width: "100%",
      marginTop: "20px",
      borderCollapse: "collapse",
      minWidth: "1100px",
    }}
  >
          <thead>
            <tr>
              <th style={thStyle}>Store</th>
              <th style={thStyle}>Issue</th>
              <th style={thStyle}>Category</th>
              <th style={thStyle}>Priority</th>
              <th style={thStyle}>Due Date</th>
              <th style={thStyle}>Assigned To</th>
              <th style={thStyle}>Status</th>
              <th style={thStyle}>Created</th>
              <th style={thStyle}>Action</th>
            </tr>
          </thead>

          <tbody>
          {filteredTasks.map((task) => (
  <tr
  key={task.id}
  style={{
    background:
      task.status === "Completed"
        ? "#ecfdf5"
        : task.priority === "Urgent"
        ? "#fee2e2"
        : task.priority === "High"
        ? "#fff7ed"
        : "white",
  }}
>
    <td style={tdStyle}>
  {task.stores
    ? `${task.stores.company_name} / ${task.stores.store_name} / ${task.stores.location}`
    : task.store}
</td>
    <td style={tdStyle}>{task.issue}</td>
    <td style={tdStyle}>{task.category || "General"}</td>
    <td style={{ ...tdStyle, color: getPriorityColor(task.priority || "Medium"), fontWeight: "bold" }}>
      {task.priority || "Medium"}
    </td>
    <td style={tdStyle}>{task.due_date || "-"}</td>
    <td style={tdStyle}>
      {task.employees?.full_name || task.technician || "Not assigned"}
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
  <span style={{ color: getStatusColor(task.status), fontWeight: "bold" }}>
    {task.status}
  </span>
)}
    </td>
    <td style={tdStyle}>
  {task.created_at
    ? new Date(task.created_at).toLocaleDateString()
    : "-"}
</td>
    <td style={tdStyle}>
      <button
        onClick={() => {
          setSelectedTask(task);

          setSelectedTaskId(task.id.toString());
        
          loadComments(task.id);
          loadPhotos(task.id);
        
          setSelectedPhotoTaskId(task.id);
        }}
        style={{
          background: "#2563eb",
          color: "white",
          padding: "8px 14px",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          marginRight: "10px",
        }}
      >
        Comments
      </button>
      <label
  style={{
    background: "#16a34a",
    color: "white",
    padding: "8px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    marginRight: "10px",
  }}
>
  Upload Photo

  <input
    type="file"
    hidden
    accept="image/*"
    onChange={async (e) => {
      const file = e.target.files?.[0];

      if (!file) return;

      await uploadPhoto(task.id, file);

      setSelectedPhotoTaskId(task.id);

      loadPhotos(task.id);
    }}
  />
</label>
      {currentEmployee?.role?.toLowerCase() !== "technician" && (
        <button
          onClick={() => deleteTask(task.id)}
          style={{
            background: "#dc2626",
            color: "white",
            padding: "8px 14px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      )}
    </td>
  </tr>
))}
</tbody>
</table>
</div>
</div>  

{selectedTaskId && (
  <div>
    {selectedTask && (
      <div
        style={{
          background: "#eff6ff",
          padding: "20px",
          borderRadius: "14px",
          marginBottom: "20px",
        }}
      >
        <h2>{selectedTask.store}</h2>
        <p><strong>Issue:</strong> {selectedTask.issue}</p>
        <p><strong>Priority:</strong> {selectedTask.priority}</p>
        <p><strong>Status:</strong> {selectedTask.status}</p>
        <p><strong>Assigned To:</strong> {selectedTask.technician}</p>
      </div>
    )}

    <div
      style={{
        background: "white",
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

      <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
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

</main>
  );
}


const cardStyle = {
  background: "white",
  padding: "25px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const panelStyle = {
  background: "white",
  padding: "30px",
  borderRadius: "16px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
};

const numberStyle = {
  fontSize: "40px",
  fontWeight: "bold",
};

const thStyle = {
  textAlign: "left" as const,
  padding: "12px",
};

const tdStyle = {
  padding: "12px",
};

const inputStyle = {
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

function getStatusColor(status: string) {
  if (status === "Completed") return "green";
  if (status === "In Progress") return "orange";
  if (status === "Waiting Parts") return "red";
  return "blue";
}

function getPriorityColor(priority: string) {
  if (priority === "Urgent") return "red";
  if (priority === "High") return "orange";
  if (priority === "Medium") return "blue";
  return "green";
}