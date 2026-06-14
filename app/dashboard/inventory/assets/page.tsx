"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Asset = {
  id: number;
  asset_name: string;
  category: string;
  location: string;
  store: string;
  responsible_person: string;
  quantity: number;
  status: string;
  barcode: string;
  notes: string;
  photo_url: string;
  verified: boolean;
};

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
const assetsPerPage = 10;
  const [showAddAssetForm, setShowAddAssetForm] = useState(false);
  const [isAddingAsset, setIsAddingAsset] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  console.log(assets);

  const [newAsset, setNewAsset] = useState({
    asset_name: "",
    category: "",
    location: "",
    store: "",
    responsible_person: "",
    quantity: 1,
    status: "Active",
    notes: "",
  });

  useEffect(() => {
    loadAssets();
  }, []);

  async function loadAssets() {
    const projectId = new URLSearchParams(window.location.search).get("project");
  
    let query = supabase
      .from("fixed_assets")
      .select("*")
      .order("id", { ascending: false });
  
    if (projectId) {
      query = query.eq("project_id", Number(projectId));
    }
  
    const { data, error } = await query;
  
    if (!error && data) {
      setAssets(data);
    }
  }

  

  function generateBarcode() {
    return "AST-" + Date.now();
  }

  async function addAsset() {
    if (isAddingAsset) return;
  
    if (!newAsset.asset_name.trim()) {
      alert("Enter asset name");
      return;
    }
  
    setIsAddingAsset(true);
  
    try {
      const projectId = new URLSearchParams(window.location.search).get("project");
  
      const { error } = await supabase.from("fixed_assets").insert([
        {
          ...newAsset,
          project_id: projectId ? Number(projectId) : null,
          barcode: generateBarcode(),
        },
      ]);
  
      if (error) {
        alert(error.message);
        return;
      }
  
      setNewAsset({
        asset_name: "",
        category: "",
        location: "",
        store: "",
        responsible_person: "",
        quantity: 1,
        status: "Active",
        notes: "",
      });
  
      await loadAssets();
    } finally {
      setIsAddingAsset(false);
    }
  }


  async function uploadPhoto(assetId: number, file: File) {
    const fileExt = file.name.split(".").pop();
  
    const fileName = `${assetId}-${Date.now()}.${fileExt}`;
  
    const { error: uploadError } = await supabase.storage
      .from("asset-photos")
      .upload(fileName, file);
  
    if (uploadError) {
      alert(uploadError.message);
      return;
    }
  
    const publicUrl = supabase.storage
    .from("asset-photos")
    .getPublicUrl(fileName).data.publicUrl;
  
    const { error } = await supabase
      .from("fixed_assets")
      .update({
        photo_url: publicUrl,
      })
      .eq("id", assetId);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    loadAssets();
  }
  async function updateAsset(asset: Asset) {
    const { error } = await supabase
      .from("fixed_assets")
      .update({
        asset_name: asset.asset_name,
        category: asset.category,
        location: asset.location,
        store: asset.store,
        responsible_person: asset.responsible_person,
        quantity: asset.quantity,
        status: asset.status,
        notes: asset.notes,
      })
      .eq("id", asset.id);
  
    if (error) {
      alert(error.message);
      return;
    }
  
    setEditingId(null);
  
    loadAssets();
  }

  async function deleteAsset(id: number) {
    if (!confirm("Delete this asset?")) return;

    const { error } = await supabase
      .from("fixed_assets")
      .delete()
      .eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    loadAssets();
  }

  const inputStyle = {
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    width: "100%",
    background: "white",
    color: "black",
    minWidth: 140,
    fontSize: 14,
  };

  const tdStyle = {
    padding: 12,
    border: "1px solid #e5e7eb",
  };

 const filteredAssets = assets.filter((asset) => {
  const searchableText = [
    asset.id,
    asset.asset_name,
    asset.category,
    asset.location,
    asset.store,
    asset.responsible_person,
    asset.quantity,
    asset.status,
    asset.barcode,
    asset.notes,
    asset.verified ? "verified yes checked" : "pending no unchecked",
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(search.toLowerCase().trim());
});
  const totalPages = Math.ceil(
    filteredAssets.length / assetsPerPage
  );
  
  const paginatedAssets = filteredAssets.slice(
    (currentPage - 1) * assetsPerPage,
    currentPage * assetsPerPage
  );
  const totalAssets = assets.length;

  const verifiedAssets = assets.filter(
    (a) => a.verified === true
  ).length;
  
  const pendingAssets =
    totalAssets - verifiedAssets;
  
  const auditCompletion =
    totalAssets > 0
      ? Math.round(
          (verifiedAssets / totalAssets) * 100
        )
      : 0;
  
  const totalCategories = new Set(
    assets.map((a) => a.category)
  ).size;

const activeAssets = assets.filter(
  (a) => a.status === "Active"
).length;

const missingAssets = assets.filter(
  (a) => a.status === "Missing"
).length;

const damagedAssets = assets.filter(
  (a) => a.status === "Damaged"
).length;



 function exportToExcel() {
  const rows = filteredAssets.map((asset, index) => ({
    No: index + 1,
    Asset: asset.asset_name || "",
    Category: asset.category || "",
    Location: asset.location || "",
    Object: asset.store || "",
    Responsible: asset.responsible_person || "",
    Quantity: asset.quantity || "",
    Status: asset.status || "",
    Barcode: asset.barcode ? `="${asset.barcode}"` : "",
    Notes: asset.notes || "",
    Verified: asset.verified ? "Yes" : "No",
  }));

  const headers = [
    "No",
    "Asset",
    "Category",
    "Location",
    "Object",
    "Responsible",
    "Quantity",
    "Status",
    "Barcode",
    "Notes",
    "Verified",
  ];

  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header as keyof typeof row] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "fixed-assets-export.csv";
  link.click();

  URL.revokeObjectURL(url);
}
function exportAllAssets() {
  const rows = assets.map((asset, index) => ({
    No: index + 1,
    Asset: asset.asset_name || "",
    Category: asset.category || "",
    Location: asset.location || "",
    Object: asset.store || "",
    Responsible: asset.responsible_person || "",
    Quantity: asset.quantity || "",
    Status: asset.status || "",
    Barcode: asset.barcode ? `="${asset.barcode}"` : "",
    Notes: asset.notes || "",
    Verified: asset.verified ? "Yes" : "No",
  }));

  const headers = [
    "No",
    "Asset",
    "Category",
    "Location",
    "Object",
    "Responsible",
    "Quantity",
    "Status",
    "Barcode",
    "Notes",
    "Verified",
  ];

  const csv = [
    headers.join(";"),
    ...rows.map((row) =>
      headers
        .map((header) => {
          const value = String(row[header as keyof typeof row] ?? "");
          return `"${value.replace(/"/g, '""')}"`;
        })
        .join(";")
    ),
  ].join("\n");

  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "all-assets-export.csv";
  link.click();

  URL.revokeObjectURL(url);
}
function printSelectedLabels() {
  const selectedAssets = assets.filter((asset) =>
    selectedAssetIds.includes(asset.id)
  );

  if (selectedAssets.length === 0) {
    alert("Please select at least one asset");
    return;
  }

  const printWindow = window.open("", "_blank");

  if (!printWindow) return;

  printWindow.document.write(`
    <html>
      <head>
        <title>Print Selected Labels</title>
      </head>
      <body style="font-family: Arial; padding: 20px;">
        <div style="
          display: grid;
          grid-template-columns: repeat(2, 300px);
          gap: 20px;
        ">
          ${selectedAssets
            .map(
              (asset) => `
                <div style="
                  width: 300px;
                  text-align: center;
                  border: 1px solid #ddd;
                  padding: 12px;
                  box-sizing: border-box;
                  page-break-inside: avoid;
                ">
                  <h3 style="margin: 0 0 10px 0; font-size: 16px;">
                    ${asset.asset_name || ""}
                  </h3>

                  <img
                    src="https://barcodeapi.org/api/128/${asset.barcode}"
                    style="width: 260px; height: 70px;"
                  />

                  <div style="margin-top: 8px; font-size: 13px;">
                    ${asset.barcode || ""}
                  </div>

                  <div style="margin-top: 6px; font-size: 13px;">
                    ${asset.store || ""}
                  </div>
                </div>
              `
            )
            .join("")}
        </div>

        <script>
          window.onload = function() {
            window.print();
          }
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
}

  return (
    <div style={{ padding: 24, color: "#111827" }}>
      <div
  style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  }}
>
  <h1 style={{ fontSize: 30, fontWeight: 800 }}>
    Fixed Assets
  </h1>

  <button
    onClick={() => {
      window.location.href = "/dashboard/inventory";
    }}
    style={{
      background: "#111827",
      color: "white",
      border: "none",
      borderRadius: 8,
      padding: "10px 16px",
      cursor: "pointer",
      fontWeight: 700,
    }}
  >
    ← Back to Projects
  </button>
</div>
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
    gap: 16,
    marginTop: 24,
    marginBottom: 24,
  }}
>
  {[
    {
      title: "Total Assets",
      value: totalAssets,
      color: "#111827",
    },
    {
      title: "Active",
      value: activeAssets,
      color: "#16a34a",
    },
    {
      title: "Missing",
      value: missingAssets,
      color: "#dc2626",
    },
    {
      title: "Damaged",
      value: damagedAssets,
      color: "#d97706",
    },
    {
      title: "Verified",
      value: verifiedAssets,
      color: "#2563eb",
    },
    {
      title: "Pending",
      value: pendingAssets,
      color: "#7c3aed",
    },
    {
      title: "Audit Completion",
      value: `${auditCompletion}%`,
      color: "#059669",
    },
    {
      title: "Categories",
      value: totalCategories,
      color: "#0f766e",
    },
  ].map((card) => (
    <div
      key={card.title}
      style={{
        background: "white",
        border: "1px solid #e5e7eb",
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div
        style={{
          fontSize: 14,
          color: "#6b7280",
          marginBottom: 10,
        }}
      >
        {card.title}
      </div>

      <div
        style={{
          fontSize: 32,
          fontWeight: 800,
          color: card.color,
        }}
      >
        {card.value}
      </div>
    </div>
  ))}
</div>


      <input
  placeholder="Search assets..."
  value={search}
  onChange={(e) => setSearch(e.target.value)}
  style={{
    marginTop: 16,
    padding: "12px",
    border: "1px solid #d1d5db",
    borderRadius: 8,
    width: "100%",
    maxWidth: 400,
    background: "white",
    color: "black",
  }}
/>
<button
  onClick={exportAllAssets}
  style={{
    marginTop: 16,
    marginLeft: 12,
    background: "#16a34a",
    color: "white",
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  }}
>
  Export All Assets
</button>

<button
  onClick={exportToExcel}
  style={{
    marginTop: 16,
    marginLeft: 12,
    background: "#2563eb",
    color: "white",
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  }}
>
  Export Filtered Assets
</button>
<button
  onClick={printSelectedLabels}
  style={{
    marginTop: 16,
    marginLeft: 12,
    background: "#ea580c",
    color: "white",
    padding: "12px 18px",
    borderRadius: 8,
    border: "none",
    cursor: "pointer",
    fontWeight: 700,
  }}
>
  Print Selected Labels
</button>
      <div
        style={{
          marginTop: 24,
          padding: 20,
          border: "1px solid #e5e7eb",
          borderRadius: 12,
          maxWidth: 700,
          background: "#f9fafb",
        }}
      >

<button
  onClick={() =>
    setShowAddAssetForm(!showAddAssetForm)
  }
  style={{
    background: "#111827",
    color: "white",
    border: "none",
    borderRadius: 10,
    padding: "12px 18px",
    fontWeight: 700,
    cursor: "pointer",
    marginBottom: 16,
  }}
>
  {showAddAssetForm
    ? "Close Add Asset Form"
    : "+ Add New Asset"}
</button>

{showAddAssetForm && (
  <div>

        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>
          Add New Asset
        </h2>

        <div style={{ display: "grid", gap: 12 }}>
          <input style={inputStyle} placeholder="Asset Name" value={newAsset.asset_name} onChange={(e) => setNewAsset({ ...newAsset, asset_name: e.target.value })} />
          <input style={inputStyle} placeholder="Category" value={newAsset.category} onChange={(e) => setNewAsset({ ...newAsset, category: e.target.value })} />
          <input style={inputStyle} placeholder="Location" value={newAsset.location} onChange={(e) => setNewAsset({ ...newAsset, location: e.target.value })} />
          <input
  style={inputStyle}
  placeholder="Object / Branch"
  value={newAsset.store}
  onChange={(e) =>
    setNewAsset({
      ...newAsset,
      store: e.target.value,
    })
  }
/>
<input
  style={inputStyle}
  placeholder="Responsible Person / Contact Person"
  value={newAsset.responsible_person}
  onChange={(e) =>
    setNewAsset({
      ...newAsset,
      responsible_person: e.target.value,
    })
  }
/>
          <input style={inputStyle} type="number" placeholder="Quantity" value={newAsset.quantity} onChange={(e) => setNewAsset({ ...newAsset, quantity: Number(e.target.value) })} />
          <select
  value={newAsset.status}
  onChange={(e) =>
    setNewAsset({
      ...newAsset,
      status: e.target.value,
    })
  }
  style={{
    ...inputStyle,
    height: 48,
  }}
>
  <option value="Active">Active</option>
  <option value="Missing">Missing</option>
  <option value="Damaged">Damaged</option>
  <option value="Transferred">Transferred</option>
  <option value="Disposed">Disposed</option>
</select>
          <textarea style={inputStyle} placeholder="Notes" value={newAsset.notes} onChange={(e) => setNewAsset({ ...newAsset, notes: e.target.value })} />

          <button
  onClick={addAsset}
  disabled={isAddingAsset}
  style={{
    background: isAddingAsset ? "#9ca3af" : "#111827",
    color: "white",
    padding: "13px",
    borderRadius: 8,
    border: "none",
    cursor: isAddingAsset ? "not-allowed" : "pointer",
    fontWeight: 700,
  }}
>
  {isAddingAsset ? "Saving..." : "Add Asset"}
</button>
          </div>
      </div>
        )}
        </div>
  
        <div style={{ marginTop: 32, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", background: "white" }}>
          <thead>
          <tr style={{ background: "#f3f4f6" }}>
  {[
    "Select",
    "No.",
    "Photo",
    "Asset",
    "Category",
    "Location",
    "Object",
    "Responsible",
    "Qty",
    "Status",
    "Barcode",
    "Verified",
    "Action",
  ].map((h) => (
    <th
      key={h}
      style={{
        padding: 12,
        border: "1px solid #e5e7eb",
        textAlign: "left",
      }}
    >
      {h}
    </th>
  ))}
</tr>
          </thead>

          <tbody>
          {paginatedAssets.map((asset, index) => (
              <tr key={asset.id}>
<td style={tdStyle}>
  <input
    type="checkbox"
    checked={selectedAssetIds.includes(asset.id)}
    onChange={(e) => {
      if (e.target.checked) {
        setSelectedAssetIds((prev) => [...prev, asset.id]);
      } else {
        setSelectedAssetIds((prev) =>
          prev.filter((id) => id !== asset.id)
        );
      }
    }}
  />
</td>

                <td style={tdStyle}>
  {(currentPage - 1) * assetsPerPage + index + 1}
</td>
                <td style={tdStyle}>
  <div style={{ display: "grid", gap: 8 }}>
   {asset.photo_url && (
  <img
    src={asset.photo_url}
    alt=""
    onClick={() => setSelectedPhoto(asset.photo_url)}
    style={{
      width: 70,
      height: 70,
      objectFit: "cover",
      borderRadius: 8,
      cursor: "zoom-in",
      border: "1px solid #e5e7eb",
    }}
  />
)}

<label
  style={{
    background: "#111827",
    color: "white",
    padding: "7px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
    display: "inline-block",
    width: "fit-content",
  }}
>
  Upload / Replace
  <input
    type="file"
    style={{ display: "none" }}
    onChange={(e) => {
      if (e.target.files?.[0]) {
        uploadPhoto(asset.id, e.target.files[0]);
      }
    }}
  />
</label>
  </div>
</td>



<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      value={asset.asset_name}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, asset_name: e.target.value }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.asset_name
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      value={asset.category}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, category: e.target.value }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.category
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      value={asset.location}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, location: e.target.value }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.location
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      value={asset.store}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, store: e.target.value }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.store
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      value={asset.responsible_person}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, responsible_person: e.target.value }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.responsible_person
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <input
      type="number"
      value={asset.quantity}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, quantity: Number(e.target.value) }
              : a
          )
        );
      }}
      style={inputStyle}
    />
  ) : (
    asset.quantity
  )}
</td>
<td style={tdStyle}>
  {editingId === asset.id ? (
    <select
      value={asset.status}
      onChange={(e) => {
        setAssets((prev) =>
          prev.map((a) =>
            a.id === asset.id
              ? { ...a, status: e.target.value }
              : a
          )
        );
      }}
      style={{
        ...inputStyle,
        minWidth: 120,
        height: 48,
      }}
    >
      <option value="Active">Active</option>
      <option value="Missing">Missing</option>
      <option value="Damaged">Damaged</option>
      <option value="Transferred">Transferred</option>
      <option value="Disposed">Disposed</option>
    </select>
  ) : (
    <span
      style={{
        background:
          asset.status === "Active"
            ? "#dcfce7"
            : asset.status === "Missing"
            ? "#fee2e2"
            : asset.status === "Damaged"
            ? "#fef3c7"
            : asset.status === "Transferred"
            ? "#dbeafe"
            : "#e5e7eb",

        color:
          asset.status === "Active"
            ? "#166534"
            : asset.status === "Missing"
            ? "#991b1b"
            : asset.status === "Damaged"
            ? "#92400e"
            : asset.status === "Transferred"
            ? "#1d4ed8"
            : "#374151",

        padding: "8px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 700,
        display: "inline-block",
      }}
    >
      {asset.status}
    </span>
  )}
</td>

<td style={tdStyle}>
  <div style={{ display: "grid", gap: 6 }}>
    <img
    
      src={`https://barcodeapi.org/api/128/${asset.barcode}`}
      alt=""
      style={{
        width: 140,
        height: 40,
        objectFit: "contain",
      }}
    />

<button
  onClick={() => {
    const printWindow = window.open("", "_blank");

    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Print Label</title>
        </head>
        <body style="font-family: Arial; padding: 20px;">
          <div style="width: 300px; text-align: center;">
            <h3 style="margin-bottom: 10px;">
              ${asset.asset_name}
            </h3>

            <img
              src="https://barcodeapi.org/api/128/${asset.barcode}"
              style="width: 260px; height: 70px;"
            />

            <div style="margin-top: 10px; font-size: 14px;">
              ${asset.store}
            </div>
          </div>

          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }}
  style={{
    background: "#2563eb",
    color: "white",
    border: "none",
    borderRadius: 6,
    padding: "6px 10px",
    cursor: "pointer",
    fontSize: 12,
    fontWeight: 700,
  }}
>
  Print Label
</button>
  </div>
</td>
<td style={tdStyle}>
  <button
    onClick={async () => {
      const { error } = await supabase
        .from("fixed_assets")
        .update({ verified: !asset.verified })
        .eq("id", asset.id);

      if (error) {
        alert(error.message);
        return;
      }

      loadAssets();
    }}
    style={{
      background: asset.verified ? "#16a34a" : "#e5e7eb",
      color: asset.verified ? "white" : "#111827",
      border: "none",
      borderRadius: 8,
      padding: "8px 12px",
      cursor: "pointer",
      fontWeight: 700,
    }}
  >
    {asset.verified ? "Verified" : "Verify"}
  </button>
</td>

<td style={tdStyle}>
  {editingId === asset.id ? (
    <button
      onClick={() => updateAsset(asset)}
      style={{
        background: "#16a34a",
        color: "white",
        border: "none",
        borderRadius: 6,
        padding: "7px 10px",
        cursor: "pointer",
        marginRight: 8,
      }}
    >
      Save
    </button>
  ) : (
    <button
      onClick={() => setEditingId(asset.id)}
      style={{
        background: "#2563eb",
        color: "white",
        border: "none",
        borderRadius: 6,
        padding: "7px 10px",
        cursor: "pointer",
        marginRight: 8,
      }}
    >
      Edit
    </button>
  )}

  <button
    onClick={() => deleteAsset(asset.id)}
    style={{
      background: "#dc2626",
      color: "white",
      border: "none",
      borderRadius: 6,
      padding: "7px 10px",
      cursor: "pointer",
    }}
  >
    Delete
  </button>
</td>
              </tr>
            ))}
          </tbody>
          </table>

<div
  style={{
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  }}
>
  <button
    disabled={currentPage === 1}
    onClick={() => setCurrentPage(currentPage - 1)}
    style={{
      background: currentPage === 1 ? "#e5e7eb" : "#111827",
      color: currentPage === 1 ? "#9ca3af" : "white",
      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      cursor:
        currentPage === 1
          ? "not-allowed"
          : "pointer",
      fontWeight: 700,
    }}
  >
    Previous
  </button>

  <span style={{ fontWeight: 700 }}>
    Page {currentPage} of {totalPages || 1}
  </span>

  <button
    disabled={currentPage >= totalPages}
    onClick={() =>
      setCurrentPage(currentPage + 1)
    }
    style={{
      background:
        currentPage >= totalPages
          ? "#e5e7eb"
          : "#111827",

      color:
        currentPage >= totalPages
          ? "#9ca3af"
          : "white",

      border: "none",
      borderRadius: 8,
      padding: "10px 14px",
      cursor:
        currentPage >= totalPages
          ? "not-allowed"
          : "pointer",

      fontWeight: 700,
    }}
  >
    Next
  </button>
</div>

       </div>

      {selectedPhoto && (
        <div
          onClick={() => setSelectedPhoto(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "pointer",
          }}
        >
          <img
            src={selectedPhoto}
            alt=""
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 12,
              background: "white",
            }}
          />
        </div>
      )}
    </div>
   
  );
}

