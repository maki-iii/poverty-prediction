export default function PredictionsResultTable({ predictions }) {
  if (!predictions || predictions.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No predictions yet. Click "Train Models" to generate them.
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
              Predicted Poverty Incidence
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Model Used
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Input Source
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {predictions.map((p) => (
            <tr key={`${p.region}-${p.year}`} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-700 font-medium">{p.region}</td>
              <td className="px-3 py-2 text-slate-600">{p.year}</td>
              <td className="px-3 py-2 text-slate-800 font-semibold">
                {p.predicted_poverty_incidence}%
              </td>
              <td className="px-3 py-2">
                <span className="px-2 py-1 rounded-full text-[10px] font-semibold bg-[#002366]/10 text-[#002366] capitalize">
                  {p.model_used?.replace("_", " ")}
                </span>
              </td>
              <td className="px-3 py-2 text-slate-500 capitalize">{p.input_source}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}