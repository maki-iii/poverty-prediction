import { useState, useEffect, useCallback } from "react";
import UserManagementService from "../services/userManagementService";

export function useUsers() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await UserManagementService.getAllUsers();
      setData(result);
    } catch (err) {
      setError(err.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { data, loading, error, refetch: fetchUsers };
}

export function useUserActions() {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState(null);

  const runAction = async (actionFn) => {
    setRunning(true);
    setError(null);
    try {
      return await actionFn();
    } catch (err) {
      setError(err.message || "Action failed");
      throw err;
    } finally {
      setRunning(false);
    }
  };

  return {
    running,
    error,
    createUser: (payload) => runAction(() => UserManagementService.createUser(payload)),
    updateUser: (id, payload) => runAction(() => UserManagementService.updateUser(id, payload)),
    changePassword: (id, newPassword) => runAction(() => UserManagementService.changePassword(id, newPassword)),
    deleteUser: (id) => runAction(() => UserManagementService.deleteUser(id)),
  };
}