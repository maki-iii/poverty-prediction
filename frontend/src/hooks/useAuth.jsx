// src/hooks/useAuth.jsx
import { createContext, useContext, useEffect, useState } from "react";
import { getMe, logout as logoutAPI } from "../api/authAPI";

const AuthContext = createContext({
  user: null,
  loading: true,
  logout: () => {},
  refetch: () => {},
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = () => {
    setLoading(true);
    return getMe()
      .then(res => {
        setUser(res.data.user);
        return res.data.user;
      })
      .catch((err) => {
        setUser(null);
        return null;
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const logout = async () => {
    await logoutAPI();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, logout, refetch: fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};