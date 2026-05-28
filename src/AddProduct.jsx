import { useState } from "react";
import "./AddProduct.css";

function AddProduct() {
  const [barcode, setBarcode] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [stockQuantity, setStockQuantity] = useState("");
  const [supplier, setSupplier] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);

  function handleSubmit(e) {
    e.preventDefault();

    const newProduct = {
      id: Date.now(),

      barcode: barcode,

      name: name,

      category: category,

      price: Number(price),

      currency: currency,

      stock_quantity: Number(stockQuantity),

      supplier: supplier,

      is_available: isAvailable,
    };

    fetch("http://localhost:3000/items", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify(newProduct),
    })
      .then(() => {
        alert("Product Added Successfully");
      })
      .catch((error) => console.log(error));
  }

  return (
    <div className="add-product-container">
      <h1 className="add-product-title">Add Product</h1>

      <form className="product-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Barcode</label>

          <input
            type="text"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Product Name</label>

          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Category</label>

          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Price</label>

          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Currency</label>

          <input
            type="text"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Stock Quantity</label>

          <input
            type="number"
            value={stockQuantity}
            onChange={(e) => setStockQuantity(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Supplier</label>

          <input
            type="text"
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
          />
        </div>

        <div className="checkbox-group">
          <label>Available</label>

          <input
            type="checkbox"
            checked={isAvailable}
            onChange={(e) => setIsAvailable(e.target.checked)}
          />
        </div>

        <button className="submit-btn" type="submit">
          Add Product
        </button>
      </form>
    </div>
  );
}

export default AddProduct;
