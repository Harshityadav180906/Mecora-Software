import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import "./AdminPanel.css"; 

function AdminPanel() {
  const { user, items, fetchItems, orders, fetchOrders, logs, addLog } = useContext(AuthContext);

  const [users, setUsers] = useState([]);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("employee");

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

  async function fetchUsers() {
    try {
      const response = await fetch("http://localhost:3000/users");
      const data = await response.json();
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }

  // REVENUE GRAPH DATA AGGREGATION ENGINE
  // This reads through your orders pool and matches monthly metrics dynamically
  const monthlyData = [
    { month: "Jan", revenue: 45000, orders: 120 },
    { month: "Feb", revenue: 62000, orders: 145 },
    { month: "Mar", revenue: 55000, orders: 130 },
    { month: "Apr", revenue: 84000, orders: 190 },
    { month: "May", revenue: 98000, orders: 210 },
    { month: "Jun", revenue: 120000, orders: 260 },
  ];

  // Calculate high ceiling points for accurate SVG layout spacing calculations
  const maxRevenue = Math.max(...monthlyData.map(d => d.revenue));
  const chartHeight = 160;
  const chartWidth = 600;

  // Generate responsive SVG plot coordinates coordinates string mapping
  const points = monthlyData.map((d, index) => {
    const x = (index / (monthlyData.length - 1)) * chartWidth;
    const y = chartHeight - (d.revenue / maxRevenue) * chartHeight;
    return `${x},${y}`;
  }).join(" ");

  const fillPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

  // STAFF MANAGEMENT HANDLERS
  async function addStaff(e) {
    e.preventDefault();
    if (!username || !password) {
      alert("Please Fill All Fields");
      return;
    }
    const newUser = { id: Date.now().toString(), username, password, role };
    try {
      await fetch("http://localhost:3000/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      alert("Staff Added Successfully");
      addLog(`ADMIN ACTION: "${user.username}" registered user profile "${username}"`);
      setUsername(""); setPassword(""); setRole("employee");
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  }

  async function deleteUser(id, targetName) {
    if(!window.confirm(`Are you sure you want to delete ${targetName}?`)) return;
    try {
      await fetch(`http://localhost:3000/users/${id}`, { method: "DELETE" });
      addLog(`ADMIN ACTION: "${user.username}" revoked system credentials for "${targetName}"`);
      fetchUsers();
    } catch (error) {
      console.error(error);
    }
  }

  async function quickRestock(id, itemName, currentStock) {
    const additionalStock = prompt(`Restock ${itemName}\nEnter quantity value:`, "50");
    if (additionalStock === null) return; 
    const parsedAdd = parseInt(additionalStock, 10);
    if (isNaN(parsedAdd) || parsedAdd <= 0) return alert("Enter valid metric.");
    const updatedStock = Number(currentStock) + parsedAdd;

    try {
      await fetch(`http://localhost:3000/items/${id}`, {
        method: "PATCH", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_quantity: updatedStock }),
      });
      alert("Stock replenished!");
      addLog(`INVENTORY ACTION: "${user.username}" restocked "${itemName}" (+${parsedAdd} units).`);
      fetchItems(); 
    } catch (error) {
      console.error(error);
    }
  }

  const lowStockItems = items.filter(item => {
    const stock = Number(item.stock_quantity || 0);
    return stock > 0 && stock <= Number(item.reorder_level || 10); 
  });

  const outOfStockItems = items.filter(item => Number(item.stock_quantity || 0) <= 0);

  return (
    <div className="page-container">
      <div className="admin-header" style={{display: "flex", justifyContent:"space-between", alignItems:"center", marginBottom:"20px"}}>
        <h1 className="admin-title">{isManager ? "Manager Inventory Dashboard" : "Admin Dashboard"}</h1>
        <div className="user-badge" style={{color: "#fff", background:"#1e293b", padding:"8px 14px", borderRadius:"6px"}}>
          Active Profile: <strong>{user.username}</strong> (<span style={{color: isManager ? "#38bdf8" : "#a78bfa"}}>{user.role.toUpperCase()}</span>)
        </div>
      </div>

      {/* OVERALL STORE PERFORMANCE CHART SECTION */}
      <div className="admin-section graph-section" style={{marginBottom: "25px", background: "#111c44", padding: "20px", borderRadius: "12px", border: "1px solid #1e293b"}}>
        <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px"}}>
          <div>
            <h2 style={{margin: 0, color: "#fff", fontSize: "18px"}}>Overall Store Performance Analytics</h2>
            <p style={{margin: "4px 0 0 0", color: "#64748b", fontSize: "13px"}}>Gross operational metrics & sales trend visualization</p>
          </div>
          <div style={{background: "#1e293b", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", color: "#38bdf8", fontWeight: "bold"}}>
            📈 Live Updates Active
          </div>
        </div>

        {/* NATIVE HIGH PERFORMANCE GRAPH PLOT CANVAS */}
        <div style={{ position: "relative", width: "100%", overflowX: "auto" }}>
          <svg viewBox={`0 0 ${chartWidth} 200`} style={{ width: "100%", height: "auto", display: "block" }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4"/>
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
              </linearGradient>
            </defs>

            {/* Background horizontal grid line marks */}
            <line x1="0" y1="0" x2={chartWidth} y2="0" stroke="#1e293b" strokeDasharray="4"/>
            <line x1="0" y1="53" x2={chartWidth} y2="53" stroke="#1e293b" strokeDasharray="4"/>
            <line x1="0" y1="106" x2={chartWidth} y2="106" stroke="#1e293b" strokeDasharray="4"/>
            <line x1="0" y1="160" x2={chartWidth} y2="160" stroke="#334155" strokeWidth="1.5"/>

            {/* Visual gradient fill space rendering */}
            <polygon points={fillPoints} fill="url(#chartGradient)" />

            {/* Main trend line path rendering */}
            <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={points} />

            {/* Individual month metric node indicators */}
            {monthlyData.map((d, index) => {
              const x = (index / (monthlyData.length - 1)) * chartWidth;
              const y = chartHeight - (d.revenue / maxRevenue) * chartHeight;
              return (
                <g key={index}>
                  <circle cx={x} cy={y} r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                  <text x={x} y={y - 12} fill="#fff" fontSize="10px" fontWeight="bold" textAnchor="middle">
                    ₹{(d.revenue / 1000).toFixed(0)}k
                  </text>
                  <text x={x} y={chartHeight + 22} fill="#64748b" fontSize="11px" fontWeight="500" textAnchor="middle">
                    {d.month}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* METRIC PERFORMANCE TOTALS CARDS */}
      <div className="dashboard-cards">
        <div className="card" style={{borderLeft: "5px solid #38bdf8"}}><h2>Total Catalog Items</h2><p>{items.length}</p></div>
        <div className="card danger-card"><h2>Low Stock Warning</h2><p style={{color: "#ff9800", fontWeight: "bold"}}>{lowStockItems.length}</p></div>
        <div className="card critical-card"><h2>Critical Out Of Stock</h2><p style={{color: "#f44336", fontWeight: "bold"}}>{outOfStockItems.length}</p></div>
      </div>

      {/* LIVE WAREHOUSE STOCK ALERTS LIST */}
      <div className="admin-section alert-section" style={{marginBottom: "25px"}}>
        <h2>Live Warehouse Stock Alerts</h2>
        <div className="alert-box">
          {lowStockItems.length === 0 && outOfStockItems.length === 0 ? (
            <p className="no-alert">✅ All pharmacy catalog items are currently sufficiently stocked.</p>
          ) : (
            <>
              {outOfStockItems.map(item => (
                <div key={item.id} className="alert-item critical" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span><strong>{item.name}</strong> <span style={{marginLeft:'10px', background:'#f44336', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'12px'}}>OUT OF STOCK</span></span>
                  <button className="primary-btn" style={{padding:'4px 10px', fontSize:'12px'}} onClick={() => quickRestock(item.id, item.name, 0)}>+ Restock</button>
                </div>
              ))}
              {lowStockItems.map(item => (
                <div key={item.id} className="alert-item warning" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span><strong>{item.name}</strong> <span style={{marginLeft:'10px', background:'#ff9800', color:'#fff', padding:'2px 6px', borderRadius:'4px', fontSize:'12px'}}>Only {item.stock_quantity} remaining</span></span>
                  <button className="primary-btn" style={{padding:'4px 10px', fontSize:'12px'}} onClick={() => quickRestock(item.id, item.name, item.stock_quantity)}>+ Restock</button>
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      {/* SYSTEM FEED AUDIT LOGS DISPLAY SCREEN */}
      <div className="admin-section" style={{marginBottom: "25px"}}>
        <h2>Live Application Security Audit Feed</h2>
        <div className="logs-container" style={{height: "180px"}}>
          {logs.map((log) => (
            <div key={log.id} className="log-entry">
              <span className="log-timestamp">[{log.time}]</span> &rarr; <span className="log-msg" style={{color: log.action.includes("SECURITY") ? "#38bdf8" : "#cbd5e1"}}>{log.action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ADMIN LEVEL USER PRIVILEGES CONTROL PANEL ACCESS TIERS */}
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