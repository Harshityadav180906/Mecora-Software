import { useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  function handleLogout() {
    try {
      logout();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/login");
    }
  }

  return (
    <nav className="navbar">
      <div className="nav-logo">
        <Link to="/">
          Mecora Medical
        </Link>
      </div>

      <div className="nav-links">
        {user ? (
          <>
            <Link to="/" className="nav-item">
              Dashboard
            </Link>

            <Link to="/inventory" className="nav-item">
              Inventory
            </Link>

            <Link to="/order" className="nav-item">
              New Order
            </Link>

            <Link to="/all-orders" className="nav-item">
              Order History
            </Link>

            <Link to="/add-product" className="nav-item">
              Add Product
            </Link>

            {user.role === "admin" && (
              <Link to="/admin" className="nav-item admin-link">
                Admin Panel
              </Link>
            )}

            <button
              className="logout-btn"
              onClick={handleLogout}
            >
              Logout ({user.username})
            </button>
          </>
        ) : (
          <Link to="/login" className="login-link">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;