import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css"; 

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleLogout() {
    try {
      // Calls global context logout, creating a timestamp record entry
      logout(); 
      navigate("/login");
    } catch (error) {
      console.error("Error executing during logout step:", error);
      navigate("/login");
    }
  }

  return (
    <nav className="navbar" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#101b40", padding: "15px 30px" }}>
      <div className="nav-logo">
        <Link to="/" style={{ color: "#38bdf8", fontWeight: "bold", fontSize: "20px", textDecoration: "none" }}>
          Mecora Medical
        </Link>
      </div>

      <div className="nav-links" style={{ display: "flex", gap: "20px", alignItems: "center" }}>
        {user ? (
          <>
            <Link to="/" className="nav-item" style={{ color: "#fff", textDecoration: "none" }}>Dashboard</Link>
            <Link to="/inventory" className="nav-item" style={{ color: "#fff", textDecoration: "none" }}>Inventory</Link>
            <Link to="/order" className="nav-item" style={{ color: "#fff", textDecoration: "none" }}>New Order</Link>
            <Link to="/all-orders" className="nav-item" style={{ color: "#fff", textDecoration: "none" }}>Order History</Link>
            <Link to="/add-product" className="nav-item" style={{ color: "#fff", textDecoration: "none" }}>Add Product</Link>

            {/* Hidden from manager roles, strictly accessible to Admin links */}
            {user.role === "admin" && (
              <Link to="/admin" className="nav-item" style={{ color: "#a78bfa", fontWeight: "bold", textDecoration: "none" }}>
                Admin Panel
              </Link>
            )}

            <button 
              onClick={handleLogout} 
              style={{ background: "#ef4444", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
            >
              Logout ({user.username})
            </button>
          </>
        ) : (
          <Link to="/login" style={{ color: "#38bdf8", textDecoration: "none", fontWeight: "bold" }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;