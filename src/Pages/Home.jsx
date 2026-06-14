import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import "./Home.css"; 

function Home() {
  const { user } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  
  // NEW: State to manage user selected timeframe viewing window
  const [timeframe, setTimeframe] = useState("days");

  // AUTH GUARD
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FETCH DATA
  async function fetchOrders() {
    try {
      const response = await fetch("http://localhost:3000/orders");
      const data = await response.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }

  async function fetchItems() {
    try {
      const response = await fetch("http://localhost:3000/items");
      const data = await response.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }

  useEffect(() => {
    fetchOrders();
    fetchItems();
  }, []);

  // --- REVENUE CALCULATIONS BASE ---
  const totalRevenueRaw = orders.reduce((sum, order) => {
    const cleanAmount = String(order.totalAmount || 0).replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleanAmount);
    return sum + (isNaN(parsedAmount) ? 0 : parsedAmount);
  }, 0);

  // --- SAFE RESILIENT DAILY FILTERS FOR INDIVIDUAL EMPLOYEES ---
  const employeeFilteredOrders = orders.filter((order) => {
    if (!order.orderDate) return false;

    let orderTimeStamp = 0;
    if (order.orderDate.includes('T')) {
      orderTimeStamp = new Date(order.orderDate).getTime();
    } else {
      const [datePart, timePart] = order.orderDate.split(', ');
      if (datePart && timePart) {
        const [day, month, year] = datePart.split('/');
        const [hours, minutes, seconds] = timePart.split(':');
        orderTimeStamp = new Date(year, month - 1, day, hours, minutes, seconds).getTime();
      }
    }

    if (!orderTimeStamp || isNaN(orderTimeStamp)) return false;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const isToday = orderTimeStamp >= startOfToday && orderTimeStamp <= endOfToday;

    const currentUsername = user.username.toLowerCase().trim();
    const orderCreator = (order.createdBy || "Cashier System").toLowerCase().trim();

    return isToday && (orderCreator === currentUsername || (currentUsername === "jagrati" && orderCreator === "cashier system"));
  });

  const employeeDailySalesRaw = employeeFilteredOrders.reduce((sum, order) => {
    const cleanAmount = String(order.totalAmount || 0).replace(/[^0-9.]/g, "");
    return sum + (isNaN(parseFloat(cleanAmount)) ? 0 : parseFloat(cleanAmount));
  }, 0);

  const totalRevenueClean = totalRevenueRaw.toFixed(2);
  const employeeSalesClean = employeeDailySalesRaw.toFixed(2);

  const totalProductsCount = items.length;
  const lowStockCount = items.filter((item) => Number(item.stock_quantity) > 0 && Number(item.stock_quantity) <= 10).length;
  const outOfStockCount = items.filter((item) => Number(item.stock_quantity) <= 0).length;


  // --- ADVANCED TIMEFRAME AGGREGATION SYSTEM ---
  const getChartData = () => {
    if (!orders || orders.length === 0) {
      return [
        { label: "Data 1", val: 200 },
        { label: "Data 2", val: 500 },
        { label: "Data 3", val: 400 },
      ];
    }

    const aggregated = {};

    orders.forEach((order) => {
      const amt = parseFloat(String(order.totalAmount || 0).replace(/[^0-9.]/g, "")) || 0;
      let dateObj = new Date(order.orderDate);
      
      if (isNaN(dateObj.getTime()) && order.orderDate) {
        const [dPart] = order.orderDate.split(', ');
        if (dPart && dPart.includes('/')) {
          const [d, m, y] = dPart.split('/');
          dateObj = new Date(y, m - 1, d);
        }
      }

      if (isNaN(dateObj.getTime())) return;

      if (timeframe === "days") {
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const labelKey = `${hours}:${minutes}`;
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "weeks") {
        const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const labelKey = weekdayNames[dateObj.getDay()];
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "months") {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labelKey = monthNames[dateObj.getMonth()];
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "years") {
        const labelKey = String(dateObj.getFullYear());
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;
      }
    });

    let outputArray = Object.keys(aggregated).map((key) => ({
      label: key,
      val: aggregated[key],
    }));

    if (timeframe === "days") {
      outputArray = outputArray.slice(-7);
    } else if (timeframe === "weeks") {
      const customOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      outputArray.sort((a, b) => customOrder.indexOf(a.label) - customOrder.indexOf(b.label));
    } else if (timeframe === "months") {
      const customMonths = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      outputArray.sort((a, b) => customMonths.indexOf(a.label) - customMonths.indexOf(b.label));
    }

    return outputArray.length > 0 ? outputArray : [{ label: "No Sales", val: 0 }];
  };

  const chartData = getChartData();
  const graphHeight = 140; 
  const graphWidth = 750; 
  const verticalPaddingOffset = 40; 

  const maxChartVal = Math.max(...chartData.map(d => d.val), 500);

  const points = chartData.map((d, index) => {
    const totalSteps = chartData.length > 1 ? chartData.length - 1 : 1;
    const x = (index / totalSteps) * (graphWidth - 100) + 50; 
    const y = (graphHeight - (d.val / maxChartVal) * (graphHeight - 40)) + verticalPaddingOffset;
    return `${x},${y}`;
  }).join(" ");

  const startX = 50;
  const endX = chartData.length > 1 ? (graphWidth - 100) + 50 : 50;
  const fillPoints = `${startX},${graphHeight + verticalPaddingOffset} ${points} ${endX},${graphHeight + verticalPaddingOffset}`;

  return (
    <div className="page-container" style={{ background: "#f8fafc", minHeight: "100vh", padding: "30px", color: "#1e293b" }}>
      <h1 className="admin-title" style={{ color: "#0f172a", fontSize: "28px", fontWeight: "bold" }}>Mecora Dashboard</h1>
      <p style={{ color: "#64748b", marginTop: "-10px", marginBottom: "25px", fontSize: "14px" }}>
        Logged in as: <strong style={{ color: "#0284c7" }}>{user.username} ({user.role})</strong>
      </p>

      {/* DASHBOARD CARDS GRID */}
      <div className="dashboard-cards">
        <div className="card">
          <h2>{user.role === "admin" ? "Total Orders (System)" : "My Orders Today"}</h2>
          <p>{user.role === "admin" ? orders.length : employeeFilteredOrders.length}</p>
        </div>

        <div className="card">
          <h2>Total Products</h2>
          <p>{totalProductsCount}</p>
        </div>

        {user.role === "admin" ? (
          <>
            <div className="card">
              <h2>Total Revenue</h2>
              <p>₹{totalRevenueClean}</p>
            </div>

            <div className="card">
              <h2>Monthly Revenue</h2>
              <p>₹{totalRevenueClean}</p>
            </div>
          </>
        ) : (
          <div className="card" style={{ borderColor: "#7c3aed", borderWidth: "1px", borderStyle: "solid", background: "#f5f3ff" }}>
            <h2 style={{ color: "#6d28d9" }}>My Sales Today</h2>
            <p style={{ color: "#6d28d9" }}>₹{employeeSalesClean}</p>
          </div>
        )}

        <div className="card">
          <h2>Low Stock Products</h2>
          <p style={{ color: lowStockCount > 0 ? "#ea580c" : "inherit" }}>{lowStockCount}</p>
        </div>

        <div className="card">
          <h2>Out Of Stock</h2>
          <p>{outOfStockCount}</p>
        </div>
      </div>

      {/* MULTI-TIMEFRAME SYSTEM GRAPH MODULE */}
      {user.role === "admin" && (
        <div className="admin-section" style={{ marginTop: "30px" }}>
          
          {/* HEADER ROW FEATURING DYNAMIC FILTER BUTTON TOGGLES */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
            <h2 style={{ color: "#0f172a", fontSize: "18px", margin: 0, fontWeight: "600" }}>Store Performance Analytics</h2>
            
            {/* TIMEFRAME CONTROLLERS BUTTON SEGMENTATION MATRIX */}
            <div style={{ display: "flex", gap: "8px", background: "#e2e8f0", padding: "4px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
              {["days", "weeks", "months", "years"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    background: timeframe === t ? "#0284c7" : "transparent",
                    color: timeframe === t ? "#ffffff" : "#64748b",
                    border: "none",
                    padding: "6px 14px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: "bold",
                    textTransform: "uppercase",
                    transition: "all 0.2s ease"
                  }}
                >
                  {t === "days" ? "Days" : t === "weeks" ? "Weeks" : t === "months" ? "Months" : "Years"}
                </button>
              ))}
            </div>
          </div>

          <div style={{ background: "#ffffff", border: "1px solid #e2e8f0", padding: "25px", borderRadius: "14px", boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)" }}>
            
            {/* Native SVG Visualization Window */}
            <div style={{ width: "100%", background: "#f8fafc", padding: "25px 10px 10px 10px", borderRadius: "8px", overflow: "hidden", border: "1px solid #f1f5f9" }}>
              <svg viewBox={`0 0 ${graphWidth} 250`} style={{ width: "100%", height: "auto", display: "block" }}>
                <defs>
                  <linearGradient id="homeChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2"/>
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="40" y1={verticalPaddingOffset} x2={graphWidth - 40} y2={verticalPaddingOffset} stroke="#e2e8f0" strokeDasharray="3" />
                <line x1="40" y1={graphHeight / 2 + verticalPaddingOffset} x2={graphWidth - 40} y2={graphHeight / 2 + verticalPaddingOffset} stroke="#e2e8f0" strokeDasharray="3" />
                <line x1="40" y1={graphHeight + verticalPaddingOffset} x2={graphWidth - 40} y2={graphHeight + verticalPaddingOffset} stroke="#cbd5e1" strokeWidth="1.5" />

                {/* Render geometric content paths only if we have sufficient tracking vector points */}
                {chartData.length > 1 && (
                  <>
                    <polygon points={fillPoints} fill="url(#homeChartGrad)" />
                    <polyline fill="none" stroke="#0284c7" strokeWidth="3.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {/* Map dynamic elements onto custom timeframe points layout */}
                {chartData.map((d, index) => {
                  const totalSteps = chartData.length > 1 ? chartData.length - 1 : 1;
                  const x = (index / totalSteps) * (graphWidth - 100) + 50;
                  const y = (graphHeight - (d.val / maxChartVal) * (graphHeight - 40)) + verticalPaddingOffset;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="3" />
                      
                      {/* Currency metrics value tooltip string flags */}
                      <text x={x} y={y - 15} fill="#0f172a" fontSize="12px" fontWeight="bold" textAnchor="middle">
                        ₹{d.val.toFixed(0)}
                      </text>
                      
                      {/* X-Axis time data parameters text markers string values */}
                      <text 
                        x={x} 
                        y={graphHeight + verticalPaddingOffset + 25} 
                        fill="#64748b" 
                        fontSize="12px" 
                        textAnchor="middle" 
                        fontWeight="bold"
                      >
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default Home;