import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

export function AuthProvider({ children }) {
  // Persistence handler
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem("mecora_session_user");
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [items, setItems] = useState([]);
  const [orders, setOrders] = useState([]);

  // NEW: Shared logs state initialized across all authorization modules
  const [logs, setLogs] = useState([
    { id: 1, action: "Core Auth Network Initialized", time: new Date().toLocaleTimeString() }
  ]);

  // Global helper to add system events with accurate local time stamps
  const addLog = (actionText) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [{ id: Date.now(), action: actionText, time: timestamp }, ...prev.slice(0, 15)]);
  };

  async function fetchItems() {
    try {
      const response = await fetch("http://localhost:3000/items");
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error("Global Error fetching items:", error);
    }
  }

  async function fetchOrders() {
    try {
      const response = await fetch("http://localhost:3000/orders");
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Global Error fetching orders:", error);
    }
  }

  // UPDATED: Captures dynamic user login details
  function login(userData) {
    setUser(userData);
    localStorage.setItem("mecora_session_user", JSON.stringify(userData));
    addLog(`SECURITY AUDIT: User "${userData.username}" successfully logged in [Role: ${userData.role}]`);
  }

  // UPDATED: Captures dynamic user logout details
  function logout() {
    if (user) {
      addLog(`SECURITY AUDIT: User "${user.username}" successfully logged out [Role: ${user.role}]`);
    }
    setUser(null);
    localStorage.removeItem("mecora_session_user");
  }

  useEffect(() => {
    if (user) {
      fetchItems();
      fetchOrders();
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
        logs,      // Exposed to display on dashboards
        addLog     // Exposed to log manual administrative updates
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}