import { useEffect, useState } from "react";
import { Link } from "react-router";
import "./Inventory.css";

function Inventory() {
  const [items, setItems] = useState([]);

  function fetchItems() {
    fetch("http://localhost:3000/items")
      .then((response) => response.json())
      .then((data) => setItems(data))
      .catch((error) => console.log(error));
  }

  function handleDelete(id) {
    fetch(`http://localhost:3000/items/${id}`, {
      method: "DELETE",
    }).then(() => {
      const updatedItems = items.filter((item) => item.id !== id);

      setItems(updatedItems);
    });
  }
  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <div className="inventory-container">
      <h1 className="inventory-title">Inventory Table</h1>

      <table className="inventory-table">
        <thead>
          <tr>
            <th>Item barcode</th>
            <th>Name</th>
            <th>Category</th>
            <th>Price</th>
            <th>Currency</th>
            <th>Stock Quantity</th>
            <th>Supplier</th>
            <th>Available</th>
            <th>Action</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => (
            <tr key={item.barcode}>
              <td>{item.barcode}</td>
              <td>{item.name}</td>
              <td>{item.category}</td>
              <td>₹{item.price}</td>
              <td>{item.currency}</td>
              <td>{item.stock_quantity}</td>
              <td>{item.supplier}</td>

              <td>
                <span
                  className={item.is_available ? "available" : "not-available"}
                >
                  {item.is_available ? "Yes" : "No"}
                </span>
              </td>

              <td>
                <button
                  className="delete-btn"
                  onClick={() => handleDelete(item.id)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default Inventory;
