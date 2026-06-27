import { az } from "@/app/client/i18n/az";

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
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export default function StoreSelect({
  filteredStores,
  company,
  value,
  disabled = false,
  onChange,
}: StoreSelectProps) {
  return (
    <div>
      <label style={labelStyle}>{az.store}</label>
      <select
        name="store"
        value={value}
        onChange={onChange}
        required
        disabled={!company || disabled}
        className="portal-field-select"
        style={{
          background: company ? "#ffffff" : "#f9fafb",
          cursor: company && !disabled ? "pointer" : "not-allowed",
        }}
      >
        <option value="">
          {company ? az.selectStore : az.selectCompanyFirst}
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
  marginBottom: "10px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};
