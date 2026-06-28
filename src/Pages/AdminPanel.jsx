import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./AdminPanel.css";

function AdminPanel() {
  const { user, items, setItems, fetchItems, logs, addLog } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");

  // Edit state
  const [editingUser, setEditingUser] = useState(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState("employee");

  async function fetchUsers() {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password, role, created_at")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error.message);
    }
  }

  useEffect(() => {
    if (user && (user.role === "admin" || user.role === "manager")) {
      fetchUsers();
      fetchItems();
    }
  }, [user]);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return <Navigate to="/login" replace={true} />;
  }

  const isManager = user.role === "manager";

  // ── ADD STAFF ─────────────────────────────────────────────────────────────
  async function addStaff(e) {
    e.preventDefault();
    if (!username || !password) {
      alert("Please Fill All Fields");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            username: username.trim(),
            password: password,
            role: role,
          },
        ])
        .select();

      if (error) throw error;

      addLog(`ADMIN: Created staff "${username}" [Role: ${role}]`, {
        type: "staff_created",
        targetUser: username,
        targetRole: role,
        createdBy: user.username,
      });

      alert("Staff Added Successfully");
      setUsername("");
      setPassword("");
      setRole("employee");
      fetchUsers();
    } catch (error) {
      console.error("Add staff failed:", error.message);
      addLog(`ADMIN ERROR: Failed to create staff "${username}" - ${error.message}`, {
        type: "staff_create_failed",
        targetUser: username,
        error: error.message,
      });
      alert("Failed to add staff: " + error.message);
    }
  }

  // ── START EDIT ────────────────────────────────────────────────────────────
  function startEditUser(targetUser) {
    setEditingUser(targetUser);
    setEditUsername(targetUser.username);
    setEditPassword(targetUser.password);
    setEditRole(targetUser.role);

    addLog(`ADMIN: Started editing user "${targetUser.username}"`, {
      type: "staff_edit_started",
      targetUser: targetUser.username,
    });
  }

  function cancelEdit() {
    if (editingUser) {
      addLog(`ADMIN: Cancelled editing user "${editingUser.username}"`, {
        type: "staff_edit_cancelled",
        targetUser: editingUser.username,
      });
    }
    setEditingUser(null);
    setEditUsername("");
    setEditPassword("");
    setEditRole("employee");
  }

  // ── SAVE EDIT ─────────────────────────────────────────────────────────────
  async function saveEditUser(e) {
    e.preventDefault();
    if (!editUsername || !editPassword) {
      alert("Please fill all fields");
      return;
    }

    try {
      const { error } = await supabase
        .from("users")
        .update({
          username: editUsername.trim(),
          password: editPassword,
          role: editRole,
        })
        .eq("id", editingUser.id);

      if (error) throw error;

      addLog(`ADMIN: Updated staff "${editingUser.username}" → "${editUsername}" [Role: ${editRole}]`, {
        type: "staff_updated",
        oldUsername: editingUser.username,
        newUsername: editUsername,
        newRole: editRole,
        updatedBy: user.username,
      });

      alert("Staff updated successfully");
      cancelEdit();
      fetchUsers();
    } catch (error) {
      console.error("Update staff failed:", error.message);
      addLog(`ADMIN ERROR: Failed to update staff "${editingUser.username}" - ${error.message}`, {
        type: "staff_update_failed",
        targetUser: editingUser.username,
        error: error.message,
      });
      alert("Failed to update staff: " + error.message);
    }
  }

  // ── DELETE USER ───────────────────────────────────────────────────────────
  async function deleteUser(id, targetName) {
    if (!window.confirm(`Are you sure you want to delete ${targetName}?`)) {
      addLog(`ADMIN: Cancelled deletion of "${targetName}"`, {
        type: "staff_delete_cancelled",
        targetUser: targetName,
      });
      return;
    }

    try {
      const { error } = await supabase.from("users").delete().eq("id", id);

      if (error) throw error;

      addLog(`ADMIN: Revoked access for "${targetName}"`, {
        type: "staff_deleted",
        targetUser: targetName,
        deletedBy: user.username,
      });

      fetchUsers();
      alert(`User ${targetName} deleted successfully`);
    } catch (error) {
      console.error("Delete user failed:", error.message);
      addLog(`ADMIN ERROR: Failed to delete "${targetName}" - ${error.message}`, {
        type: "staff_delete_failed",
        targetUser: targetName,
        error: error.message,
      });
      alert("Failed to delete user: " + error.message);
    }
  }

  // ── RESTOCK ───────────────────────────────────────────────────────────────
  async function quickRestock(id, itemName, currentStock) {
    const additionalStock = prompt(
      `Restock ${itemName}\nEnter quantity to add (current: ${currentStock}):`,
      "50"
    );
    if (additionalStock === null) return;

    const parsedAdd = parseInt(additionalStock, 10);
    if (isNaN(parsedAdd) || parsedAdd <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }

    const updatedStock = Number(currentStock) + parsedAdd;

    try {
      const { error } = await supabase
        .from("items")
        .update({
          stock_quantity: updatedStock,
          quantity: updatedStock,
        })
        .eq("id", id);

      if (error) throw error;

      addLog(`INVENTORY: Restocked "${itemName}" +${parsedAdd} units (new total: ${updatedStock})`, {
        type: "restock",
        itemName: itemName,
        itemId: id,
        added: parsedAdd,
        newTotal: updatedStock,
        restockedBy: user.username,
      });

      alert("Stock replenished successfully!");

      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, stock_quantity: updatedStock, quantity: updatedStock }
            : item
        )
      );
    } catch (error) {
      console.error("Restock failed:", error.message);
      addLog(`INVENTORY ERROR: Failed to restock "${itemName}" - ${error.message}`, {
        type: "restock_failed",
        itemName: itemName,
        error: error.message,
      });
      alert("Failed to restock: " + error.message);
    }
  }

  const lowStockItems = items.filter((item) => {
    const stock = Number(item.stock_quantity || 0);
    const reorder = Number(item.reorder_level || 10);
    return stock > 0 && stock <= reorder;
  });

  const outOfStockItems = items.filter((item) => {
    const stock = Number(item.stock_quantity || 0);
    return stock <= 0;
  });

  return (
    <div className="page-container">
      <div className="admin-header">
        <h1 className="admin-title">
          {isManager ? "Manager Inventory Dashboard" : "Admin Dashboard"}
        </h1>
        <div className="user-badge">
          Active: <strong>{user.username}</strong> (
          <span className={`role-text ${isManager ? "manager" : "admin"}`}>
            {user.role.toUpperCase()}
          </span>
          )
        </div>
      </div>

      {/* STATS */}
      <div className="dashboard-cards">
        <div className="card card-blue">
          <h2>Total Products</h2>
          <p>{items.length}</p>
        </div>
        <div className="card card-warning">
          <h2>Low Stock</h2>
          <p>{lowStockItems.length}</p>
        </div>
        <div className="card card-danger">
          <h2>Out Of Stock</h2>
          <p>{outOfStockItems.length}</p>
        </div>
      </div>

      {/* ALERTS */}
      <div className="admin-section alert-section">
        <h2>Stock Alerts</h2>
        <div className="alert-box">
          {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
            <p className="no-alert">All items sufficiently stocked.</p>
          ) : (
            <>
              {outOfStockItems.map((item) => (
                <div key={item.id} className="alert-item critical">
                  <div className="alert-info">
                    <span className="alert-name">{item.name}</span>
                    <span className="badge badge-danger">OUT OF STOCK</span>
                  </div>
                  <button className="restock-btn" onClick={() => quickRestock(item.id, item.name, 0)}>
                    + Restock
                  </button>
                </div>
              ))}
              {lowStockItems.map((item) => (
                <div key={item.id} className="alert-item warning">
                  <div className="alert-info">
                    <span className="alert-name">{item.name}</span>
                    <span className="badge badge-warning">Only {item.stock_quantity} left</span>
                  </div>
                  <button className="restock-btn" onClick={() => quickRestock(item.id, item.name, item.stock_quantity)}>
                    + Restock
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* LOGS */}
      <div className="admin-section">
        <h2>Activity Audit Log</h2>
        <div className="logs-container">
          {logs.length === 0 ? (
            <p className="no-logs">No activity recorded yet.</p>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="log-entry">
                <span className="log-timestamp">[{log.time}]</span>
                <span className="log-user">{log.username}</span>
                <span className={`log-role ${log.role}`}>{log.role}</span>
                <span className={`log-msg ${log.action.includes("ERROR") ? "log-error" : ""} ${log.action.includes("SECURITY") ? "log-security" : ""}`}>
                  {log.action}
                </span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ADMIN ONLY */}
      {!isManager && (
        <>
          {/* ADD/EDIT FORM */}
          <div className="admin-section">
            <h2>{editingUser ? `Edit: ${editingUser.username}` : "Register New Staff"}</h2>

            {editingUser ? (
              <form className="staff-form" onSubmit={saveEditUser}>
                <div className="form-row">
                  <input type="text" placeholder="Username" value={editUsername} onChange={(e) => setEditUsername(e.target.value)} />
                  <input type="text" placeholder="Password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
                  <select value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="primary-btn">Update Staff</button>
                  <button type="button" className="secondary-btn" onClick={cancelEdit}>Cancel</button>
                </div>
              </form>
            ) : (
              <form className="staff-form" onSubmit={addStaff}>
                <div className="form-row">
                  <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                  <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <select value={role} onChange={(e) => setRole(e.target.value)}>
                    <option value="employee">Employee</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <button type="submit" className="primary-btn">Generate System Profile</button>
              </form>
            )}
          </div>

          {/* USERS TABLE */}
          <div className="admin-section">
            <h2>System Users</h2>
            <div className="table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Password</th>
                    <th>Role</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="user-name">{u.username}</td>
                      <td><code>{u.password}</code></td>
                      <td><span className={`role-tag ${u.role}`}>{u.role}</span></td>
                      <td>
                        <div className="action-buttons">
                          <button className="edit-btn" disabled={u.username === user.username} onClick={() => startEditUser(u)}>
                            {u.username === user.username ? "Active" : "Edit"}
                          </button>
                          <button className="delete-btn" disabled={u.username === user.username} onClick={() => deleteUser(u.id, u.username)}>
                            {u.username === user.username ? "Active" : "Revoke"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPanel;