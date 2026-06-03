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
      // Clean fallback parameters if database fields haven't finished mounting yet
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
      
      // Fallback fallback verification step for raw locale string representations
      if (isNaN(dateObj.getTime()) && order.orderDate) {
        const [dPart] = order.orderDate.split(', ');
        if (dPart && dPart.includes('/')) {
          const [d, m, y] = dPart.split('/');
          dateObj = new Date(y, m - 1, d);
        }
      }

      if (isNaN(dateObj.getTime())) return;

      if (timeframe === "days") {
        // Option 1: Chronological Order Hours / Days Time Slots
        const hours = String(dateObj.getHours()).padStart(2, '0');
        const minutes = String(dateObj.getMinutes()).padStart(2, '0');
        const labelKey = `${hours}:${minutes}`;
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "weeks") {
        // Option 2: Group by Calendar Days of Current Week
        const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const labelKey = weekdayNames[dateObj.getDay()];
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "months") {
        // Option 3: Calendar Months 
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const labelKey = monthNames[dateObj.getMonth()];
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;

      } else if (timeframe === "years") {
        // Option 4: Complete Calendar Fiscal Years
        const labelKey = String(dateObj.getFullYear());
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;
      }
    });

    // Translate aggregated dynamic dictionary mapping into standard iterable data formats array
    let outputArray = Object.keys(aggregated).map((key) => ({
      label: key,
      val: aggregated[key],
    }));

    // If viewing days data, show max of last 7 entries to avoid scaling congestion bugs
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

  // Dynamic SVG Vector Math Coordinates generators
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
    <div className="page-container">
      <h1 className="admin-title">Mecora Dashboard</h1>
      <p style={{ color: "#94a3b8", marginTop: "-10px", marginBottom: "25px", fontSize: "14px" }}>
        Logged in as: <strong style={{ color: "#38bdf8" }}>{user.username} ({user.role})</strong>
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
          <div className="card" style={{ borderColor: "#8b5cf6", borderWidth: "1px", borderStyle: "solid" }}>
            <h2 style={{ color: "#a78bfa" }}>My Sales Today</h2>
            <p>₹{employeeSalesClean}</p>
          </div>
        )}

        <div className="card">
          <h2>Low Stock Products</h2>
          <p style={{ color: lowStockCount > 0 ? "#ff9800" : "inherit" }}>{lowStockCount}</p>
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
            <h2 style={{ color: "#fff", fontSize: "18px", margin: 0 }}>Store Performance Analytics</h2>
            
            {/* TIMEFRAME CONTROLLERS BUTTON SEGMENTATION MATRIX */}
            <div style={{ display: "flex", gap: "8px", background: "#111827", padding: "4px", borderRadius: "8px", border: "1px solid #1e293b" }}>
              {["days", "weeks", "months", "years"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  style={{
                    background: timeframe === t ? "#38bdf8" : "transparent",
                    color: timeframe === t ? "#0f172a" : "#94a3b8",
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

          <div style={{ background: "#111827", border: "1px solid #1e293b", padding: "25px", borderRadius: "14px" }}>
            
            {/* Native SVG Visualization Window */}
            <div style={{ width: "100%", background: "#0f172a", padding: "25px 10px 10px 10px", borderRadius: "8px", overflow: "hidden" }}>
              <svg viewBox={`0 0 ${graphWidth} 250`} style={{ width: "100%", height: "auto", display: "block" }}>
                <defs>
                  <linearGradient id="homeChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35"/>
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0"/>
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1="40" y1={verticalPaddingOffset} x2={graphWidth - 40} y2={verticalPaddingOffset} stroke="#1e293b" strokeDasharray="3" />
                <line x1="40" y1={graphHeight / 2 + verticalPaddingOffset} x2={graphWidth - 40} y2={graphHeight / 2 + verticalPaddingOffset} stroke="#1e293b" strokeDasharray="3" />
                <line x1="40" y1={graphHeight + verticalPaddingOffset} x2={graphWidth - 40} y2={graphHeight + verticalPaddingOffset} stroke="#334155" strokeWidth="1.5" />

                {/* Render geometric content paths only if we have sufficient tracking vector points */}
                {chartData.length > 1 && (
                  <>
                    <polygon points={fillPoints} fill="url(#homeChartGrad)" />
                    <polyline fill="none" stroke="#38bdf8" strokeWidth="3.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {/* Map dynamic elements onto custom timeframe points layout */}
                {chartData.map((d, index) => {
                  const totalSteps = chartData.length > 1 ? chartData.length - 1 : 1;
                  const x = (index / totalSteps) * (graphWidth - 100) + 50;
                  const y = (graphHeight - (d.val / maxChartVal) * (graphHeight - 40)) + verticalPaddingOffset;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r="5" fill="#0f172a" stroke="#38bdf8" strokeWidth="3" />
                      
                      {/* Currency metrics value tooltip string flags */}
                      <text x={x} y={y - 15} fill="#ffffff" fontSize="12px" fontWeight="bold" textAnchor="middle">
                        ₹{d.val.toFixed(0)}
                      </text>
                      
                      {/* X-Axis time data parameters text markers string values */}
                      <text 
                        x={x} 
                        y={graphHeight + verticalPaddingOffset + 25} 
                        fill="#94a3b8" 
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