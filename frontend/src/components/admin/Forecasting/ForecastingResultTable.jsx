export default function ForecastResultTable({ forecasts }) {
  if (!forecasts || forecasts.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No forecasts yet. Click "Run Forecast" to generate them.
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
              Family Size
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Employment
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Education
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Inflation
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {forecasts.map((f) => (
            <tr key={`${f.region}-${f.year}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 font-medium">{f.region}</td>
              <td className="px-3 py-2 text-slate-600">{f.year}</td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {f.avg_household_income?.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                {f.avg_household_expenditure?.toLocaleString()}
              </td>
              <td className="px-3 py-2 text-slate-600">{f.avg_family_size}</td>
              <td className="px-3 py-2 text-slate-600">{f.employment_rate}%</td>
              <td className="px-3 py-2 text-slate-600">{f.avg_educational_attainment}%</td>
              <td className="px-3 py-2 text-slate-600">{f.inflation_rate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}