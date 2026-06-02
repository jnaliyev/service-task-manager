"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function InventoryPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [newProject, setNewProject] = useState("");

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    const { data } = await supabase
      .from("asset_projects")
      .select("*")
      .order("id", { ascending: false });

    if (data) setProjects(data);
  }

  async function createProject() {
    if (!newProject) return;

    await supabase.from("asset_projects").insert([
      {
        name: newProject,
      },
    ]);

    setNewProject("");
    loadProjects();
  }
  async function deleteProject(id: number) {
    if (!confirm("Delete this project?")) return;
  
    const { error } = await supabase
      .from("asset_projects")
      .delete()
      .eq("id", id);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    loadProjects();
  }
  
  async function renameProject(id: number, currentName: string) {
    const newName = prompt("Project name", currentName);
  
    if (!newName) return;
  
    const { error } = await supabase
      .from("asset_projects")
      .update({
        name: newName,
      })
      .eq("id", id);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    loadProjects();
  }

  return (
    <div style={{ padding: 24 }}>
      <h1
        style={{
          fontSize: 32,
          fontWeight: 800,
          marginBottom: 24,
        }}
      >
        Inventory Projects
      </h1>

      <div
        style={{
          display: "flex",
          gap: 12,
          marginBottom: 32,
        }}
      >
        <input
          placeholder="New Project Name"
          value={newProject}
          onChange={(e) => setNewProject(e.target.value)}
          style={{
            padding: 12,
            border: "1px solid #d1d5db",
            borderRadius: 8,
            width: 320,
          }}
        />

        <button
          onClick={createProject}
          style={{
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "12px 18px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Start New Project
        </button>
      </div>

      <div
  style={{
    display: "grid",
    gap: 16,
  }}
>
  {projects.map((project) => (
    <div
      key={project.id}
      style={{
        padding: 20,
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        background: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: 18,
        }}
      >
        {project.name}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button
          onClick={() => {
            window.location.href = `/dashboard/inventory/assets?project=${project.id}`;
          }}
          style={{
            background: "#111827",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Open
        </button>

        <button
          onClick={() =>
            renameProject(project.id, project.name)
          }
          style={{
            background: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Rename
        </button>

        <button
          onClick={() => deleteProject(project.id)}
          style={{
            background: "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  ))}
</div>
    </div>
  );
}