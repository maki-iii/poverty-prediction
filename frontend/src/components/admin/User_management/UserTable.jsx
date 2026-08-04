const ROLE_STYLES = {
  admin: "bg-[#002366]/10 text-[#002366]",
  user: "bg-slate-100 text-slate-600",
};

export default function UserTable({ users, onEdit, onChangePassword, onDelete }) {
  if (!users || users.length === 0) {
    return (
      <div className="text-center text-xs text-slate-400 py-6 border border-dashed border-slate-200 rounded-xl">
        No users found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-slate-200 rounded-xl">
      <table className="min-w-full divide-y divide-slate-100 text-xs">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              ID
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Username
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Email
            </th>
            <th className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider">
              Role
            </th>
            <th className="px-3 py-2 text-right font-semibold text-slate-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {users.map((u) => (
            <tr key={u.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-3 py-2 text-slate-500">{u.id}</td>
              <td className="px-3 py-2 text-slate-700 font-medium">{u.name}</td>
              <td className="px-3 py-2 text-slate-600">{u.username}</td>
              <td className="px-3 py-2 text-slate-600">{u.email}</td>
              <td className="px-3 py-2">
                <span className={`px-2 py-1 rounded-full text-[10px] font-bold capitalize ${ROLE_STYLES[u.role] || "bg-slate-100 text-slate-600"}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-3 py-2 text-right whitespace-nowrap space-x-1.5">
                <button
                  onClick={() => onEdit(u)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-[#002366]/10 text-[#002366]
                             hover:bg-[#002366]/20 active:scale-[0.97] transition-all duration-150"
                >
                  Edit
                </button>
                <button
                  onClick={() => onChangePassword(u)}
                  className="px-2.5 py-1 text-[11px] font-semibold rounded-lg bg-amber-50 text-amber-700
                             hover:bg-amber-100 active:scale-[0.97] transition-all duration-150"
                >
                  Password
                </button>
                <button
                  onClick={() => onDelete(u)}
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