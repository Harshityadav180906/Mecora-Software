import { useEffect, useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { supabase } from "../lib/supabaseClient";
import "./Inventory.css";

function Inventory() {
  const { items, setItems, fetchItems } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [sortBy, setSortBy] = useState("");

  useEffect(() => {
    fetchItems();
  }, []);

  // DELETE PRODUCT FROM SUPABASE
  const handleDelete = async (id) => {
    const confirmDelete = window.confirm("Delete this product?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase.from("items").delete().eq("id", id);
      if (error) throw error;

      setItems((prev) => prev.filter((item) => item.id !== id));
      alert("Product deleted successfully");
    } catch (error) {
      console.error("Delete failed:", error.message);
      alert(`Delete failed: ${error.message}`);
    }
  };

  const exportCSV = () => {
    const headers = ["Barcode", "Name", "Pack", "Batch", "Price", "Stock", "GST", "Expiry"];
    const rows = items.map((item) => [
      item.barcode,
      item.name,
      item.pack || "",
      item.batch || "",
      item.price,
      item.stock_quantity,
      item.gst || "",
      item.expiry_date,
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "inventory.csv";
    link.click();
  };

  // NOTE: `category` doesn't exist in DB — falls back to "Uncategorized"
  const categories = ["All", ...new Set(items.map((item) => item.category || "Uncategorized"))];

  const filteredItems = items
    .filter((item) => {
      const matchesSearch =
        item.name?.toLowerCase().includes(search.toLowerCase()) ||
        item.barcode?.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        categoryFilter === "All"
          ? true
          : (item.category || "Uncategorized") === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "price":
          return Number(b.price) - Number(a.price);
        case "stock":
          return Number(b.stock_quantity) - Number(a.stock_quantity);
        case "expiry":
          return new Date(a.expiry_date) - new Date(b.expiry_date);
        default:
          return 0;
      }
    });

  // KPI calculations
  const totalProducts = items.length;
  const totalStock = items.reduce(
    (sum, item) => sum + Number(item.stock_quantity || 0),
    0
  );
  const inventoryValue = items.reduce(
    (sum, item) =>
      sum + Number(item.price || 0) * Number(item.stock_quantity || 0),
    0
  );
  const lowStockCount = items.filter(
    (item) => Number(item.stock_quantity) <= Number(item.reorder_level || 10)
  ).length;

  const expiringSoonCount = items.filter((item) => {
    if (!item.expiry_date) return false;
    const expiry = new Date(item.expiry_date);
    const today = new Date();
    const diffDays = (expiry - today) / (1000 * 60 * 60 * 24);
    return diffDays <= 90 && diffDays > 0;
  }).length;

  return (
    <div className="inventory-container">
      <h1 className="inventory-title">Inventory Management</h1>

      <div className="inventory-stats">
        <div className="stat-card products-card">
          <h3>Total Products</h3>
          <p>{totalProducts}</p>
        </div>
        <div className="stat-card stock-card">
          <h3>Total Stock</h3>
          <p>{totalStock}</p>
        </div>
        <div className="stat-card low-stock-card">
          <h3>Low Stock</h3>
          <p>{lowStockCount}</p>
        </div>
        <div className="stat-card value-card">
          <h3>Inventory Value</h3>
          <p>₹{inventoryValue.toLocaleString()}</p>
        </div>
        <div className="stat-card expiry-card">
          <h3>Expiring Soon</h3>
          <p>{expiringSoonCount}</p>
        </div>
      </div>

      <div className="inventory-controls">
        <input
          type="text"
          placeholder="Search Product / Barcode..."
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        <select
          className="filter-select"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>

        <select
          className="filter-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="">Sort By</option>
          <option value="price">Price</option>
          <option value="stock">Stock</option>
          <option value="expiry">Expiry</option>
        </select>

        <button className="refresh-btn" onClick={fetchItems}>Refresh</button>
        <button className="export-btn" onClick={exportCSV}>Export CSV</button>
      </div>

      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Barcode</th>
              <th>Name</th>
              <th>Pack</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Batch</th>
              <th>Expiry</th>
              <th>Status</th>
              <th>Alerts</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.length === 0 ? (
              <tr><td colSpan="10" className="no-data">No Products Found</td></tr>
            ) : (
              filteredItems.map((item) => {
                const stock = Number(item.stock_quantity || 0);
                const reorder = Number(item.reorder_level || 10);
                const isLowStock = stock <= reorder;
                const isAvailable = stock > 0;

                let expiringSoon = false;
                if (item.expiry_date) {
                  const diffDays =
                    (new Date(item.expiry_date) - new Date()) /
                    (1000 * 60 * 60 * 24);
                  expiringSoon = diffDays <= 90 && diffDays > 0;
                }

                return (
                  <tr key={item.id}>
                    <td>{item.barcode}</td>
                    <td>{item.name}</td>
                    <td>{item.pack || "N/A"}</td>
                    <td>₹{Number(item.price || 0).toFixed(2)}</td>
                    <td className={isLowStock ? "text-low-stock" : "text-in-stock"}>
                      {stock}
                    </td>
                    <td>{item.batch || "N/A"}</td>
                    <td>{item.expiry_date || "N/A"}</td>
                    <td>
                      <span className={isAvailable ? "available" : "not-available"}>
                        {isAvailable ? "Available" : "Out Of Stock"}
                      </span>
                    </td>
                    <td>
                      {isLowStock && <div className="low-stock">Low Stock</div>}
                      {expiringSoon && <div className="expiring">Expiring Soon</div>}
                    </td>
                    <td>
                      <button className="delete-btn" onClick={() => handleDelete(item.id)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Inventory;