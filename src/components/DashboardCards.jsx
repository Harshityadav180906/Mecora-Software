import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Dashboard.css";

function Dashboard() {
  const { user } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // AUTH GUARD
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FETCH ORDERS FROM SUPABASE
  async function fetchOrders() {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(
          "id, cash_memo_no, patient_name, products, total_amount, order_date, payment_method, created_at"
        )
        .order("order_date", { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error.message);
    }
  }

  // FETCH ITEMS FROM SUPABASE
  async function fetchItems() {
    try {
      const { data, error } = await supabase
        .from("items")
        .select("id, name, barcode, pack, batch, price, stock_quantity, quantity, gst");

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error.message);
    }
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([fetchOrders(), fetchItems()]);
      setLoading(false);
    })();
  }, []);

  // ---------- ANALYTICS ----------

  // Total Revenue (sum of all order.total_amount)
  const totalRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.total_amount || 0),
    0
  );

  // Monthly Revenue — current month based on order_date
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const monthlyRevenue = orders.reduce((sum, order) => {
    const dateStr = order.order_date || order.created_at;
    if (!dateStr) return sum;
    const d = new Date(dateStr);
    if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      return sum + parseFloat(order.total_amount || 0);
    }
    return sum;
  }, 0);

  const totalOrdersCount = orders.length;
  const totalProductsCount = items.length;

  // Products Sold — sum quantities from jsonb `products` array on each order
  const productsSoldCount = orders.reduce((sum, order) => {
    if (Array.isArray(order.products)) {
      // Try to sum quantity field; fallback to length of array
      const qtySum = order.products.reduce(
        (s, p) => s + parseInt(p?.quantity || p?.qty || 1, 10),
        0
      );
      return sum + qtySum;
    }
    return sum + 1;
  }, 0);

  const lowStockCount = items.filter(
    (item) => item.stock_quantity > 0 && item.stock_quantity <= 5
  ).length;
  const outOfStockCount = items.filter(
    (item) => item.stock_quantity <= 0
  ).length;

  // ---------- DAILY SALES (last 7 days) ----------
  const dailySales = (() => {
    const buckets = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
      buckets[key] = 0;
    }
    orders.forEach((o) => {
      const dateStr = o.order_date || o.created_at;
      if (!dateStr) return;
      const key = new Date(dateStr).toISOString().slice(0, 10);
      if (key in buckets) {
        buckets[key] += parseFloat(o.total_amount || 0);
      }
    });
    return Object.entries(buckets).map(([date, amount]) => ({ date, amount }));
  })();

  const maxDaily = Math.max(...dailySales.map((d) => d.amount), 1);

  // ---------- UTILS ----------
  const formatCurrency = (val) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);

  if (loading) {
    return (
      <div className="page-container">
        <h1 className="admin-title">Mecora Dashboard</h1>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="admin-title">Mecora Dashboard</h1>

      <div className="dashboard-cards">
        <div className="card">
          <h2>Total Orders</h2>
          <p>{totalOrdersCount}</p>
        </div>

        <div className="card">
          <h2>Total Products</h2>
          <p>{totalProductsCount}</p>
        </div>

        <div className="card">
          <h2>Products Sold</h2>
          <p>{productsSoldCount}</p>
        </div>

        <div className="card">
          <h2>Total Revenue</h2>
          <p className="revenue-text">{formatCurrency(totalRevenue)}</p>
        </div>

        <div className="card">
          <h2>Monthly Revenue</h2>
          <p className="revenue-text">{formatCurrency(monthlyRevenue)}</p>
        </div>

        <div className="card">
          <h2>Low Stock Products</h2>
          <p>{lowStockCount}</p>
        </div>

        <div className="card">
          <h2>Out Of Stock</h2>
          <p>{outOfStockCount}</p>
        </div>
      </div>

      <div className="admin-section analytics-section">
        <h2>Daily Sales Analytics (Last 7 Days)</h2>
        <div
          className="chart-container"
          style={{ minHeight: "250px", marginTop: "20px" }}
        >
          <p style={{ color: "#aaa", fontSize: "14px" }}>Daily Sales Revenue</p>

          <div
            style={{
              background: "#1e293b",
              height: "220px",
              borderRadius: "8px",
              marginTop: "10px",
              padding: "16px",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: "8px",
            }}
          >
            {dailySales.map(({ date, amount }) => {
              const heightPct = (amount / maxDaily) * 100;
              return (
                <div
                  key={date}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    height: "100%",
                    justifyContent: "flex-end",
                  }}
                  title={`${date}: ${formatCurrency(amount)}`}
                >
                  <div
                    style={{
                      width: "100%",
                      height: `${heightPct}%`,
                      background:
                        "linear-gradient(180deg, #38bdf8 0%, #0ea5e9 100%)",
                      borderRadius: "4px 4px 0 0",
                      minHeight: amount > 0 ? "4px" : "0",
                      transition: "height 0.4s ease",
                    }}
                  />
                  <span
                    style={{
                      color: "#94a3b8",
                      fontSize: "11px",
                      marginTop: "6px",
                    }}
                  >
                    {date.slice(5)}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;