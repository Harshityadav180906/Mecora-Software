import { useContext, useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import "./Navbar.css";

function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function handleLogout() {
    try {
      logout();
      navigate("/login");
    } catch (error) {
      console.error("Error during logout:", error);
      navigate("/login");
    }
    setMenuOpen(false);
  }

  function closeMenu() {
    setMenuOpen(false);
  }

  function isActive(path) {
    return location.pathname === path ? "nav-item active" : "nav-item";
  }

  return (
    <>
      {/* Add screen-only-view class here */}
      <nav className="navbar screen-only-view">
        <div className="nav-logo">
          <Link to="/" onClick={closeMenu}>
            Mecora Medical
          </Link>
        </div>

        {/* Desktop Links */}
        <div className="nav-links desktop-links screen-only-view">
          {user ? (
            <>
              <Link to="/" className={isActive("/")}>Dashboard</Link>
              <Link to="/inventory" className={isActive("/inventory")}>Inventory</Link>
              <Link to="/order" className={isActive("/order")}>New Order</Link>
              <Link to="/all-orders" className={isActive("/all-orders")}>Order History</Link>
              <Link to="/add-product" className={isActive("/add-product")}>Add Product</Link>
              {user.role === "admin" && (
                <Link to="/admin" className={`nav-item admin-link ${location.pathname === "/admin" ? "active" : ""}`}>
                  Admin Panel
                </Link>
              )}
              <button className="logout-btn" onClick={handleLogout}>
                Logout ({user.username})
              </button>
            </>
          ) : (
            <Link to="/login" className="login-link">Login</Link>
          )}
        </div>

        {/* Hamburger Button — mobile only */}
        {user && (
          <button
            className={`hamburger screen-only-view ${menuOpen ? "open" : ""}`}
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            <span />
            <span />
            <span />
          </button>
        )}
      </nav>

      {/* Mobile Slide-down Menu */}
      {user && (
        <>
          <div className={`mobile-menu screen-only-view ${menuOpen ? "mobile-menu--open" : ""}`}>
            <div className="mobile-user-badge">
              <span className="mobile-user-icon">👤</span>
              <div>
                <p className="mobile-username">{user.username}</p>
                <p className="mobile-role">{user.role.toUpperCase()}</p>
              </div>
            </div>

            <div className="mobile-nav-links">
              <Link to="/" className={isActive("/")} onClick={closeMenu}>
                <span className="nav-icon">🏠</span> Dashboard
              </Link>
              <Link to="/inventory" className={isActive("/inventory")} onClick={closeMenu}>
                <span className="nav-icon">📦</span> Inventory
              </Link>
              <Link to="/order" className={isActive("/order")} onClick={closeMenu}>
                <span className="nav-icon">🛒</span> New Order
              </Link>
              <Link to="/all-orders" className={isActive("/all-orders")} onClick={closeMenu}>
                <span className="nav-icon">📋</span> Order History
              </Link>
              <Link to="/add-product" className={isActive("/add-product")} onClick={closeMenu}>
                <span className="nav-icon">➕</span> Add Product
              </Link>
              {user.role === "admin" && (
                <Link
                  to="/admin"
                  className={`nav-item admin-link ${location.pathname === "/admin" ? "active" : ""}`}
                  onClick={closeMenu}
                >
                  <span className="nav-icon">⚙️</span> Admin Panel
                </Link>
              )}
            </div>

            <button className="mobile-logout-btn" onClick={handleLogout}>
              🚪 Logout
            </button>
          </div>

          {/* Backdrop to close menu on outside tap */}
          {menuOpen && (
            <div className="mobile-backdrop screen-only-view" onClick={closeMenu} />
          )}
        </>
      )}
    </>
  );
}

export default Navbar;