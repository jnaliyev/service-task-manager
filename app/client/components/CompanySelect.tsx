type CompanySelectProps = {
  companies: string[];
  value: string;
  onChange: (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => void;
};

export default function CompanySelect({
  companies,
  value,
  onChange,
}: CompanySelectProps) {
  return (
    <div>
      <label style={labelStyle}>Company</label>
      <select
        name="company"
        value={value}
        onChange={onChange}
        required
        style={inputStyle}
      >
        <option value="">Select company</option>
        {companies.map((company) => (
          <option key={company} value={company}>
            {company}
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
