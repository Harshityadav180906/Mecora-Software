import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import "./Dashboard.css"; // Ensure this matches your CSS filename

function Dashboard() {
  const { user } = useContext(AuthContext);

  const [orders, setOrders] = useState([]);
  const [items, setItems] = useState([]);

  // AUTH GUARD: If user session isn't active, redirect immediately to login page
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // FETCH ORDERS FROM API
  async function fetchOrders() {
    try {
      const response = await fetch("http://localhost:3000/orders");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    }
  }

  // FETCH ITEMS/PRODUCTS FROM API
  async function fetchItems() {
    try {
      const response = await fetch("http://localhost:3000/items");
      if (!response.ok) throw new Error("Network response was not ok");
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  }

  useEffect(() => {
    fetchOrders();
    fetchItems();
  }, []);

  // FINANCIAL & ANALYTICAL CALCULATIONS
  
  // Safe decimal aggregation for Total Revenue
  const totalRevenue = orders.reduce(
    (sum, order) => sum + parseFloat(order.totalAmount || 0),
    0
  );

  // If your backend doesn't split monthly yet, fallback cleanly to total revenue metric
  const monthlyRevenue = totalRevenue; 

  const totalOrdersCount = orders.length;
  const totalProductsCount = items.length;

  // Calculate Products Sold by counting product items inside orders array safely
  const productsSoldCount = orders.reduce((sum, order) => {
    if (order.products && Array.isArray(order.products)) {
      return sum + order.products.length;
    }
    return sum + 1; // Fallback to 1 product per order if nested array doesn't exist
  }, 0);

  // Filter Thresholds matching your system
  const lowStockCount = items.filter((item) => item.stock_quantity > 0 && item.stock_quantity <= 5).length;
  const outOfStockCount = items.filter((item) => item.stock_quantity <= 0).length;

  // CURRENCY FORMATTING UTILITY: Stops trailing decimals and adds localized formatting commas
  const formatCurrency = (val) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(val);
  };

  return (
    <div className="page-container">
      <h1 className="admin-title">Mecora Dashboard</h1>

      {/* DASHBOARD CARDS GRID */}
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

      {/* ANALYTICS SECTION */}
      <div className="admin-section analytics-section">
        <h2>Daily Sales Analytics</h2>
        <div className="chart-container" style={{ minHeight: "250px", marginTop: "20px" }}>
          <p style={{ color: "#aaa", fontSize: "14px" }}>Daily Sales Revenue</p>
          {/* Include your specific Chart.js, Recharts, or CSS bar implementation here */}
          <div className="bar-chart-placeholder" style={{ background: "#1e293b", height: "200px", borderRadius: "8px", marginTop: "10px" }}></div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;