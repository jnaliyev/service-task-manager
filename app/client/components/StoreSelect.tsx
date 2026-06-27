type Store = {
  id: number;
  company_name: string | null;
  store_name: string | null;
  location: string | null;
  store_code: string | null;
};

type StoreSelectProps = {
  filteredStores: Store[];
  company: string;
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => void;
};

export default function StoreSelect({
  filteredStores,
  company,
  value,
  onChange,
}: StoreSelectProps) {
  return (
    <div>
      <label style={labelStyle}>Store</label>
      <select
        name="store"
        value={value}
        onChange={onChange}
        required
        disabled={!company}
        style={{
          ...inputStyle,
          background: company ? "#ffffff" : "#f9fafb",
          cursor: company ? "pointer" : "not-allowed",
        }}
      >
        <option value="">
          {company ? "Select store" : "Select company first"}
        </option>

        {filteredStores.map((store) => (
          <option key={store.id} value={store.store_name || ""}>
            {store.store_name}
            {store.location ? ` — ${store.location}` : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: "46px",
  padding: "0 13px",
  borderRadius: "12px",
  border: "1px solid #d1d5db",
  fontSize: "15px",
  color: "#111827",
  background: "#ffffff",
  outline: "none",
  boxSizing: "border-box",
};
