import { formatNumber } from "../../../utils/formatNumber.js";
import StatusBadge from "./StatusBadge";

export default function ProcessedDatasetsTable({ datasets, onMerge, onDelete }) {
  if (!datasets || datasets.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No processed datasets ready to merge.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Filename
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Region / Year
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Income
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Expenditure
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Family
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Poverty threshold
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Poverty
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {datasets.map((d) => (
            <tr key={d.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 max-w-[140px] truncate">
                {d.original_filename}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {d.region} / {d.processed_year}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {formatNumber(d.processed_avg_household_income, true)}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {formatNumber(d.processed_avg_household_expenditure, true)}
              </td>
              <td className="px-3 py-2 text-slate-600">{formatNumber(d.processed_avg_family_size)}</td>
              <td className="px-3 py-2 text-slate-600">{formatNumber(d.processed_poverty_threshold, true)}</td>
              <td className="px-3 py-2 text-slate-600">
                {d.processed_poverty_incidence != null ? `${formatNumber(d.processed_poverty_incidence)}%` : "—"}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={d.status} />
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap space-x-1.5">
                <button
                  onClick={() => onMerge(d.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-emerald-600 text-white
                             hover:bg-emerald-700 active:scale-[0.97] transition-all duration-150"
                >
                  Merge
                </button>
                <button
                  onClick={() => onDelete(d.id)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-red-50 text-red-600
                             hover:bg-red-100 active:scale-[0.97] transition-all duration-150"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
