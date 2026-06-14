export default function UserDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-[#002366]">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back!</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { label: "Total Population", value: "12,345", change: "+2.5%" },
          { label: "Poverty Rate", value: "18.3%", change: "-1.2%" },
          { label: "Regions Monitored", value: "24", change: "+3" },
          { label: "Forecast Accuracy", value: "94.7%", change: "+0.8%" },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-[#002366] mt-1">{stat.value}</p>
            <p className="text-xs text-green-500 mt-1">{stat.change} this month</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="text-base font-semibold text-[#002366] mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {[
            { action: "New forecast generated", region: "Region IV-A", time: "2 hours ago" },
            { action: "Regional data updated", region: "Region III", time: "5 hours ago" },
            { action: "Visualization exported", region: "NCR", time: "Yesterday" },
            { action: "Analysis report ready", region: "Region VII", time: "2 days ago" },
          ].map((item, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-700">{item.action}</p>
                <p className="text-xs text-gray-400">{item.region}</p>
              </div>
              <span className="text-xs text-gray-400">{item.time}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}