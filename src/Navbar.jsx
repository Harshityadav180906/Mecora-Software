import { Link } from "react-router";
import "./Navbar.css";

function Navbar() {
  return (
    <nav>
      <Link to="/">Home</Link>

      <Link to="/Order">Orders</Link>

      <Link to="/Inventory">View Item</Link>
      <Link to="/add-product">Add Product</Link>
    </nav>
  );
}

export default Navbar;
