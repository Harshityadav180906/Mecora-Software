import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Home.css";

// Map orders row (snake_case DB) → UI shape (camelCase)
const orderFromDb = (row) => ({
  id: row.id,
  cashMemoNo: row.cash_memo_no,
  patientName: row.patient_name,
  patientPhone: row.patient_phone,
  patientAddress: row.patient_address,
  doctorName: row.doctor_name,
  products: row.products || [],
  totalAmount: row.total_amount,
  orderDate: row.order_date,
  paymentMethod: row.payment_method,
  createdBy: row.created_by,
  cashReceived: row.cash_received,
  changeReturned: row.change_returned,
  createdAt: row.created_at,
});

function Home() {
  const { user } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [timeframe, setTimeframe] = useState("days");

  // AUTH GUARD
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FETCH ORDERS FROM SUPABASE
  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders((data || []).map(orderFromDb));
    } catch (error) {
      console.error("Error fetching orders:", error.message);
    }
  }

  // FETCH ITEMS FROM SUPABASE
  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, stock_quantity");

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    }
  }

  useEffect(() => {
    fetchOrders();
    fetchItems();
  }, []);

  // --- REVENUE CALCULATIONS ---
  const totalRevenueRaw = orders.reduce((sum, order) => {
    const cleanAmount = String(order.totalAmount || 0).replace(/[^0-9.]/g, "");
    const parsedAmount = parseFloat(cleanAmount);
    return sum + (isNaN(parsedAmount) ? 0 : parsedAmount);
  }, 0);

  // --- DAILY FILTER FOR EMPLOYEE ---
  const employeeFilteredOrders = orders.filter((order) => {
    if (!order.orderDate) return false;

    let orderTimeStamp = 0;
    if (order.orderDate.includes("T")) {
      orderTimeStamp = new Date(order.orderDate).getTime();
    } else {
      const [datePart, timePart] = order.orderDate.split(", ");
      if (datePart && timePart) {
        const [day, month, year] = datePart.split("/");
        const [hours, minutes, seconds] = timePart.split(":");
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

    return (
      isToday &&
      (orderCreator === currentUsername ||
        (currentUsername === "jagrati" && orderCreator === "cashier system"))
    );
  });

  const employeeDailySalesRaw = employeeFilteredOrders.reduce((sum, order) => {
    const cleanAmount = String(order.totalAmount || 0).replace(/[^0-9.]/g, "");
    return sum + (isNaN(parseFloat(cleanAmount)) ? 0 : parseFloat(cleanAmount));
  }, 0);

  const totalRevenueClean = totalRevenueRaw.toFixed(2);
  const employeeSalesClean = employeeDailySalesRaw.toFixed(2);

  const totalProductsCount = items.length;
  const lowStockCount = items.filter(
    (item) => Number(item.stock_quantity) > 0 && Number(item.stock_quantity) <= 10
  ).length;
  const outOfStockCount = items.filter(
    (item) => Number(item.stock_quantity) <= 0
  ).length;

  // --- TIMEFRAME AGGREGATION ---
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
      const amt =
        parseFloat(String(order.totalAmount || 0).replace(/[^0-9.]/g, "")) || 0;
      let dateObj = new Date(order.orderDate);

      if (isNaN(dateObj.getTime()) && order.orderDate) {
        const [dPart] = order.orderDate.split(", ");
        if (dPart && dPart.includes("/")) {
          const [d, m, y] = dPart.split("/");
          dateObj = new Date(y, m - 1, d);
        }
      }
      if (isNaN(dateObj.getTime())) return;

      if (timeframe === "days") {
        const hours = String(dateObj.getHours()).padStart(2, "0");
        const minutes = String(dateObj.getMinutes()).padStart(2, "0");
        const labelKey = `${hours}:${minutes}`;
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;
      } else if (timeframe === "weeks") {
        const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const labelKey = weekdayNames[dateObj.getDay()];
        aggregated[labelKey] = (aggregated[labelKey] || 0) + amt;
      } else if (timeframe === "months") {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
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
      const customOrder = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
      outputArray.sort((a, b) => customOrder.indexOf(a.label) - customOrder.indexOf(b.label));
    } else if (timeframe === "months") {
      const customMonths = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      outputArray.sort((a, b) => customMonths.indexOf(a.label) - customMonths.indexOf(b.label));
    }

    return outputArray.length > 0 ? outputArray : [{ label: "No Sales", val: 0 }];
  };

  const chartData = getChartData();

  // ============================================
  // RESPONSIVE CHART DIMENSIONS (KEY FIX!)
  // ============================================
  // Use viewBox for scaling instead of fixed pixels
  const viewBoxWidth = 750;
  const viewBoxHeight = 250;
  const graphHeight = 140;
  const verticalPaddingOffset = 40;
  const maxChartVal = Math.max(...chartData.map((d) => d.val), 500);

  const points = chartData
    .map((d, index) => {
      const totalSteps = chartData.length > 1 ? chartData.length - 1 : 1;
      const x = (index / totalSteps) * (viewBoxWidth - 100) + 50;
      const y =
        graphHeight - (d.val / maxChartVal) * (graphHeight - 40) +
        verticalPaddingOffset;
      return `${x},${y}`;
    })
    .join(" ");

  const startX = 50;
  const endX = chartData.length > 1 ? viewBoxWidth - 100 + 50 : 50;
  const fillPoints = `${startX},${graphHeight + verticalPaddingOffset} ${points} ${endX},${graphHeight + verticalPaddingOffset}`;

  return (
    <div className="page-container">
      <h1 className="admin-title">Mecora Dashboard</h1>
      <p className="user-info">
        Logged in as:{" "}
        <strong style={{ color: "#0284c7" }}>
          {user.username} ({user.role})
        </strong>
      </p>

      {/* DASHBOARD CARDS */}
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
          <div
            className="card card-employee"
          >
            <h2>My Sales Today</h2>
            <p>₹{employeeSalesClean}</p>
          </div>
        )}

        <div className="card">
          <h2>Low Stock Products</h2>
          <p className={lowStockCount > 0 ? "text-warning" : ""}>
            {lowStockCount}
          </p>
        </div>

        <div className="card">
          <h2>Out Of Stock</h2>
          <p>{outOfStockCount}</p>
        </div>
      </div>

      {/* CHART */}
      {user.role === "admin" && (
        <div className="admin-section">
          <div className="section-header">
            <h2>Store Performance Analytics</h2>

            <div className="timeframe-controls">
              {["days", "weeks", "months", "years"].map((t) => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`timeframe-btn ${timeframe === t ? "active" : ""}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="chart-outer">
            <div className="chart-wrapper">
              <svg
                viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
                preserveAspectRatio="xMidYMid meet"
              >
                <defs>
                  <linearGradient id="homeChartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0284c7" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="#0284c7" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line x1="40" y1={verticalPaddingOffset} x2={viewBoxWidth - 40} y2={verticalPaddingOffset} stroke="#e2e8f0" strokeDasharray="3" />
                <line x1="40" y1={graphHeight / 2 + verticalPaddingOffset} x2={viewBoxWidth - 40} y2={graphHeight / 2 + verticalPaddingOffset} stroke="#e2e8f0" strokeDasharray="3" />
                <line x1="40" y1={graphHeight + verticalPaddingOffset} x2={viewBoxWidth - 40} y2={graphHeight + verticalPaddingOffset} stroke="#cbd5e1" strokeWidth="1.5" />

                {chartData.length > 1 && (
                  <>
                    <polygon points={fillPoints} fill="url(#homeChartGrad)" />
                    <polyline fill="none" stroke="#0284c7" strokeWidth="3.5" points={points} strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}

                {chartData.map((d, index) => {
                  const totalSteps = chartData.length > 1 ? chartData.length - 1 : 1;
                  const x = (index / totalSteps) * (viewBoxWidth - 100) + 50;
                  const y =
                    graphHeight - (d.val / maxChartVal) * (graphHeight - 40) +
                    verticalPaddingOffset;
                  return (
                    <g key={index}>
                      <circle cx={x} cy={y} r="5" fill="#ffffff" stroke="#0284c7" strokeWidth="3" />
                      <text x={x} y={y - 15} fill="#0f172a" fontSize="12px" fontWeight="bold" textAnchor="middle">
                        ₹{d.val.toFixed(0)}
                      </text>
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