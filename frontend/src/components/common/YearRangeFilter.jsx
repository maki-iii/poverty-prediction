import { useId } from "react";

export default function YearRangeFilter({ years, startYear, endYear, onChange }) {
  const id = useId();
  const changeStart = (value) => onChange({ startYear: value, endYear: value && endYear && Number(value) > Number(endYear) ? "" : endYear });
  const changeEnd = (value) => onChange({ startYear: value && startYear && Number(value) < Number(startYear) ? "" : startYear, endYear: value });
  return (
    <div className="flex items-center gap-2">
      {[{ key: "from", label: "From year", value: startYear, change: changeStart }, { key: "to", label: "To year", value: endYear, change: changeEnd }].map((field) => (
        <div className="flex flex-col" key={field.key}>
          <label htmlFor={`${id}-${field.key}`} className="text-xs text-gray-500 mb-1">{field.label}</label>
          <select id={`${id}-${field.key}`} value={field.value || ""} onChange={(event) => field.change(event.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">All years</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </div>
      ))}
      {(startYear || endYear) && <button type="button" onClick={() => onChange({ startYear: "", endYear: "" })} className="mt-5 text-xs text-gray-500 hover:text-gray-700 underline">Clear</button>}
    </div>
  );
}
