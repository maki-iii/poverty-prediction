import { useState, useMemo } from "react";
import { UsersRound, UserPlus } from "lucide-react";
import { useUsers, useUserActions } from "../../hooks/useUserManagement";

import Loader from "../../components/common/Loader";
import SearchBar from "../../components/common/SearchBar";
import Pagination from "../../components/common/Pagination";
import usePagination from "../../hooks/usePagination";
import ConfirmModal from "../../components/common/ConfirmModal";
import UserTable from "../../components/admin/User_management/UserTable";
import UserFormModal from "../../components/admin/User_management/UserFormModal";
import ChangePasswordModal from "../../components/admin/User_management/ChangePasswordModal";
import { useToast } from "../../context/ToastContext"; 

export default function UserManagement() {
  const { data: users, loading, error, refetch } = useUsers();
  const { createUser, updateUser, changePassword, deleteUser, running } = useUserActions();

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  const [formModal, setFormModal] = useState(null); // { mode: "create" | "edit", user? }
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);
  const toast = useToast();

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    return users.filter((u) => {
      const matchesSearch =
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.username?.toLowerCase().includes(search.toLowerCase()) ||
        u.email?.toLowerCase().includes(search.toLowerCase());
      const matchesRole = roleFilter === "all" || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  const {
    paginatedItems: paginatedUsers,
    currentPage,
    totalItems,
    pageSize,
    goToPage,
  } = usePagination(filteredUsers, 10);

 const handleCreate = async (payload) => {
    try {
      await createUser(payload);
      toast.success(`User "${payload.username}" created successfully`);
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to create user");
      throw err; // re-throw so the modal still shows its inline error too
    }
  };

  const handleUpdate = async (id, payload) => {
    try {
      await updateUser(id, payload);
      toast.success("User updated successfully");
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to update user");
      throw err;
    }
  };

  const handleChangePassword = async (id, newPassword) => {
    try {
      await changePassword(id, newPassword);
      toast.success("Password changed successfully");
    } catch (err) {
      toast.error(err.message || "Failed to change password");
      throw err;
    }
  };

  const handleConfirmDelete = async () => {
    if (!userToDelete) return;
    try {
      await deleteUser(userToDelete.id);
      toast.success(`User "${userToDelete.username}" deleted`);
      refetch();
    } catch (err) {
      toast.error(err.message || "Failed to delete user");
    } finally {
      setUserToDelete(null);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-[#002366] to-[#003a99] shadow-md shadow-[#002366]/20">
            <UsersRound className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#002366] tracking-tight">User Management</h1>
            <p className="text-[11px] text-slate-500">Create, edit, and manage system users</p>
          </div>
        </div>
        <button
          onClick={() => setFormModal({ mode: "create" })}
          className="flex items-center gap-2 px-4 h-10 bg-[#002366] text-white rounded-xl text-sm
                     font-semibold hover:bg-[#001a4d] active:scale-[0.98] transition-all duration-150
                     shadow-md shadow-[#002366]/20"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-end gap-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Search by name, username, or email..." />
        <div>
          <label className="block text-[10px] text-slate-500 mb-1">Role</label>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 h-10 border border-slate-200 rounded-lg text-sm text-slate-700
                       focus:outline-none focus:ring-2 focus:ring-[#002366]/30 focus:border-[#002366]"
          >
            <option value="all">All Roles</option>
            <option value="admin">Admin</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <section>
        <div className="flex items-center gap-2 mb-2.5">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Users</h2>
          <span className="text-xs text-slate-400">({filteredUsers.length})</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <UserTable
              users={paginatedUsers}
              onEdit={(u) => setFormModal({ mode: "edit", user: u })}
              onChangePassword={setPasswordModalUser}
              onDelete={setUserToDelete}
            />
            <Pagination
              currentPage={currentPage}
              totalItems={totalItems}
              pageSize={pageSize}
              onPageChange={goToPage}
            />
          </>
        )}
      </section>

      {/* Create / Edit modal */}
      {formModal && (
        <UserFormModal
          mode={formModal.mode}
          user={formModal.user}
          onClose={() => setFormModal(null)}
          onSubmit={formModal.mode === "edit" ? handleUpdate : handleCreate}
          submitting={running}
        />
      )}

      {/* Change password modal */}
      {passwordModalUser && (
        <ChangePasswordModal
          user={passwordModalUser}
          onClose={() => setPasswordModalUser(null)}
          onSubmit={handleChangePassword}
          submitting={running}
        />
      )}

      {/* Delete confirmation */}
      {userToDelete && (
        <ConfirmModal
          isOpen={!!userToDelete}
          onConfirm={handleConfirmDelete}
          onCancel={() => setUserToDelete(null)}
          title="Delete User?"
          subtitle="This action cannot be undone."
          warning="The user's account will be permanently removed, including Firebase auth if applicable."
          confirmLabel={running ? "Deleting..." : "Delete"}
          cancelLabel="Cancel"
          fields={[
            { key: "name", label: "Name", value: userToDelete.name },
            { key: "username", label: "Username", value: userToDelete.username },
            { key: "role", label: "Role", value: userToDelete.role },
          ]}
        />
      )}
    </div>
  );
}