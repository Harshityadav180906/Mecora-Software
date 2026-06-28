import { createContext, useState, useEffect } from "react";
import { supabase } from "../lib/supabaseClient";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("mecora_session_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);
  const [logs, setLogs] = useState([]);

  // ── FETCH LOGS FROM SUPABASE ──────────────────────────────────────────────
  async function fetchLogs() {
    try {
      const { data, error } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);

      if (error) {
        // Silently fail if table doesn't exist
        console.warn("Logs fetch warning:", error.message);
        return;
      }

      const formattedLogs = (data || []).map((log) => ({
        id: log.id,
        action: log.action,
        time: new Date(log.timestamp).toLocaleTimeString(),
        username: log.username,
        role: log.role,
        details: log.details,
      }));

      setLogs(formattedLogs);
    } catch (error) {
      console.error("Error fetching logs:", error.message);
    }
  }

  // ── ADD LOG TO SUPABASE ───────────────────────────────────────────────────
  async function addLog(actionText, details = {}) {
    const timestamp = new Date().toISOString();
    const username = user?.username || "SYSTEM";
    const role = user?.role || "system";

    const logEntry = {
      id: Date.now(),
      action: actionText,
      time: new Date().toLocaleTimeString(),
      username,
      role,
      details,
    };

    // Always update local state
    setLogs((prev) => [logEntry, ...prev.slice(0, 99)]);

    // Try to save to Supabase (silently fail if table missing/RLS blocked)
    try {
      const { error } = await supabase.from("activity_logs").insert([
        {
          action: actionText,
          username: username,
          role: role,
          timestamp: timestamp,
          details: details,
        },
      ]);

      if (error) {
        console.warn("Log save warning:", error.message);
      }
    } catch (error) {
      console.warn("Log save warning:", error.message);
    }
  }

  // ── FETCH ITEMS ───────────────────────────────────────────────────────────
  async function fetchItems() {
    const { data, error } = await supabase.from("items").select("*");
    if (error) {
      console.error("Error fetching items:", error.message);
    } else {
      setItems(data || []);
    }
  }

  // ── FETCH ORDERS ───────────────────────────────────────────────────────────
  async function fetchOrders() {
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching orders:", error.message);
    } else {
      setOrders(data || []);
    }
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────────
  function login(userObject) {
    if (!userObject || !userObject.id || !userObject.username) {
      return { success: false, message: "Invalid user data." };
    }

    setUser(userObject);
    localStorage.setItem("mecora_session_user", JSON.stringify(userObject));
    return { success: true };
  }

  // ── LOGOUT ────────────────────────────────────────────────────────────────
  function logout() {
    if (user) {
      addLog(`SECURITY: User "${user.username}" logged out`, {
        type: "logout",
        username: user.username,
        role: user.role,
      });
    }
    setUser(null);
    localStorage.removeItem("mecora_session_user");
  }

  useEffect(() => {
    fetchLogs();
    if (user) {
      fetchItems();
      fetchOrders();
      addLog(`SECURITY: User "${user.username}" logged in`, {
        type: "login",
        username: user.username,
        role: user.role,
      });
    }
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        login,
        logout,
        items,
        setItems,
        fetchItems,
        orders,
        setOrders,
        fetchOrders,
        logs,
        addLog,
        fetchLogs,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}