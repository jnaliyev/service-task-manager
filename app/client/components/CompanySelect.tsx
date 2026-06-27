import { az } from "@/app/client/i18n/az";

type CompanySelectProps = {
  companies: string[];
  value: string;
  disabled?: boolean;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export default function CompanySelect({
  companies,
  value,
  disabled = false,
  onChange,
}: CompanySelectProps) {
  return (
    <div>
      <label style={labelStyle}>{az.company}</label>
      <select
        name="company"
        value={value}
        onChange={onChange}
        required
        disabled={disabled}
        className="portal-field-select"
      >
        <option value="">{az.selectCompany}</option>
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
  marginBottom: "10px",
  color: "#374151",
  fontSize: "14px",
  fontWeight: 600,
};
