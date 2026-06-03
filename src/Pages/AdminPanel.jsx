import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import "./AdminPanel.css"; 

function AdminPanel() {
  // Consuming global logs and addLog engines from global app context
  const { user, items, fetchItems, orders, fetchOrders, logs, addLog } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");

  async function fetchUsers() {
    try {
      const response = await fetch("http://localhost:3000/users");
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  useEffect(() => {
    if (user && user.role === "admin") {
      fetchUsers();
    }
    fetchItems();
    fetchOrders();
  }, [user]);

  if (!user || (user.role !== "admin" && user.role !== "manager")) {
    return <Navigate to="/login" replace={true} />;
  }

  const isManager = user.role === "manager";

  // ADD STAFF
  async function addStaff(e) {
    e.preventDefault();
    if (!username || !password) {
      alert("Please Fill All Fields");
      return;
    }

    const newUser = {
      id: Date.now().toString(),
      username: username,
      password: password,
      role: role,
    };

    try {
      await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      alert("Staff Added Successfully");
      addLog(`ADMIN ACTION: "${user.username}" created staff account "${username}" [Role: ${role}]`);
      setUsername("");
      setPassword("");
      setRole("employee");
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  }

  // DELETE USER
  async function deleteUser(id, targetName) {
    if(!window.confirm(`Are you sure you want to delete ${targetName}?`)) return;
    try {
      await fetch(`http://localhost:3000/users/${id}`, {
        method: "DELETE",
      });
      addLog(`ADMIN ACTION: "${user.username}" revoked system access for account "${targetName}"`);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  }

  // RESTOCK PROCESSING TRIGGER
  async function quickRestock(id, itemName, currentStock) {
    const additionalStock = prompt(`Restock ${itemName}\nEnter quantity value to add to stock (${currentStock} left):`, "50");
    if (additionalStock === null) return; 
    
    const parsedAdd = parseInt(additionalStock, 10);
    if (isNaN(parsedAdd) || parsedAdd <= 0) {
      alert("Please enter a valid positive number.");
      return;
    }

    const updatedStock = Number(currentStock) + parsedAdd;

    try {
      const response = await fetch(`http://localhost:3000/items/${id}`, {
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: updatedStock }),
      });

      if(response.ok) {
        alert("Stock replenished successfully!");
        addLog(`INVENTORY ACTION: "${user.username}" restocked "${itemName}" (+${parsedAdd} units).`);
        fetchItems(); 
      } else {
        throw new Error("Server database error");
      }
    } catch (error) {
      console.error("Failed stock patching transaction:", error);
      alert("Failed to modify backend values.");
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
      <div className="admin-header" style={{display: "flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
        <h1 className="admin-title">{isManager ? "Manager Inventory Dashboard" : "Admin Dashboard"}</h1>
        <div className="user-badge" style={{color: "#fff", background:"#1e293b", padding:"8px 14px", borderRadius:"6px"}}>
          Active Profile: <strong>{user.username}</strong> (<span style={{color: isManager ? "#38bdf8" : "#a78bfa"}}>{user.role.toUpperCase()}</span>)
        </div>
      </div>

      {/* RENDER STATS CARDS */}
      <div className="dashboard-cards">
        <div className="card" style={{borderLeft: "5px solid #38bdf8"}}><h2>Total Tracked Products</h2><p>{items.length}</p></div>
        <div className="card danger-card"><h2>Low Stock Warning</h2><p style={{color: "#ff9800", fontWeight: "bold"}}>{lowStockItems.length}</p></div>
        <div className="card critical-card"><h2>Critical Out Of Stock</h2><p style={{color: "#f44336", fontWeight: "bold"}}>{outOfStockItems.length}</p></div>
      </div>

      {/* STOCK ALERT LAYOUT ENGINE */}
      <div className="admin-section alert-section" style={{marginBottom: "25px"}}>
        <h2>Live Warehouse Stock Alerts</h2>
        <div className="alert-box">
          {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
            <p className="no-alert">✅ All pharmacy catalog items are currently sufficiently stocked.</p>
          ) : (
            <>
              {outOfStockItems.map((item) => (
                <div key={item.id} className="alert-item critical" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <span><strong>{item.name}</strong></span>
                    <span className="badge out-of-stock-badge" style={{marginLeft:'10px', background:'#f44336', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'12px'}}>OUT OF STOCK</span>
                  </div>
                  <button className="primary-btn" style={{padding:'4px 10px', fontSize:'12px'}} onClick={() => quickRestock(item.id, item.name, 0)}>
                    + Restock Product
                  </button>
                </div>
              ))}
              
              {lowStockItems.map((item) => (
                <div key={item.id} className="alert-item warning" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <div>
                    <span><strong>{item.name}</strong></span>
                    <span className="badge low-stock-badge" style={{marginLeft:'10px', background:'#ff9800', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'12px'}}>Only {item.stock_quantity} left</span>
                  </div>
                  <button className="primary-btn" style={{padding:'4px 10px', fontSize:'12px'}} onClick={() => quickRestock(item.id, item.name, item.stock_quantity)}>
                    + Restock Product
                  </button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* EVERYONE (MANAGER & ADMIN) CAN VIEW AUDIT LOGS IN REALTIME */}
      <div className="admin-section" style={{marginBottom: "25px"}}>
        <h2>Live Application Security Audit Feed</h2>
        <div className="logs-container" style={{height: "220px"}}>
          {logs.map((log) => (
            <div key={log.id} className="log-entry">
              <span className="log-timestamp">[{log.time}]</span> &rarr; <span className="log-msg" style={{color: log.action.includes("SECURITY") ? "#38bdf8" : "#cbd5e1"}}>{log.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ISOLATED VIEW CHANNELS FOR ADMIN PRIVILEGES ONLY */}
      {!isManager && (
        <>
          <div className="admin-section" style={{marginBottom: "25px"}}>
            <h2>Register New Staff Member</h2>
            <form className="staff-form" onSubmit={addStaff}>
              <div style={{display: "flex", gap:"10px"}}>
                <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} />
                <select value={role} onChange={(e) => setRole(e.target.value)}>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button type="submit" className="primary-btn" style={{marginTop:'10px'}}>Generate System Profile</button>
            </form>
          </div>

          <div className="admin-section">
            <h2>Active Verified System Security Logins</h2>
            <table className="inventory-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Masked Pass Key String</th>
                  <th>Clearance Profile Role</th>
                  <th>Access Control Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td><strong>{u.username}</strong></td>
                    <td><code>{u.password}</code></td>
                    <td><span className={`role-tag ${u.role}`} style={{padding:'2px 6px', borderRadius:'4px', fontSize:'12px', background:'#334155'}}>{u.role}</span></td>
                    <td>
                      <button className="delete-btn" disabled={u.username === user.username} onClick={() => deleteUser(u.id, u.username)}>
                        {u.username === user.username ? "Active Current Self" : "Revoke Access Token"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default AdminPanel;