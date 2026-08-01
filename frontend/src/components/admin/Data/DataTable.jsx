import StatusBadge from "../../admin/Dataset_management/StatusBadge";

export default function DataTable({ actuals, onDelete }) {
  if (!actuals || actuals.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No data available.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Region
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Year
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
              Employ.
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Educ.
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Inflation
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Poverty
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Source
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {actuals.map((row) => (
            <tr key={`${row.region}-${row.year}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 font-medium">{row.region}</td>
              <td className="px-3 py-2 text-slate-600">{row.year}</td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {row.avg_household_income?.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {row.avg_household_expenditure?.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-slate-600">{row.avg_family_size}</td>
              <td className="px-3 py-2 text-slate-600">{row.employment_rate}%</td>
              <td className="px-3 py-2 text-slate-600">{row.avg_educational_attainment}%</td>
              <td className="px-3 py-2 text-slate-600">{row.inflation_rate}%</td>
              <td className="px-3 py-2 text-slate-600 font-medium">{row.poverty_incidence}%</td>
              <td className="px-3 py-2">
                <StatusBadge status={row.source} />
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap">
                <button
                  onClick={() => onDelete(row)}
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