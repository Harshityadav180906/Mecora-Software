import { useState } from "react";
import "./AddProduct.css";

const INITIAL_FORM_STATE = {
  barcode: "",
  name: "",
  category: "",
  price: "",
  currency: "INR",
  stockQuantity: "",
  supplier: "",
  expiryDate: "",
  reorderLevel: 5,
  isAvailable: true,
};

function AddProduct() {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [existingProductId, setExistingProductId] = useState(null);

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  }

  async function handleBarcodeCheck() {
    const barcode = formData.barcode.trim();

    if (!barcode) return;

    try {
      const response = await fetch(
        `http://localhost:3000/items?barcode=${barcode}`
      );

      const data = await response.json();

      console.log("Barcode Search:", barcode);
      console.log("Result:", data);

      if (data.length > 0) {
        const item = data[0];

        setExistingProductId(item.id);

        setFormData({
          barcode: item.barcode || "",
          name: item.name || "",
          category: item.category || "",
          price: item.price || "",
          currency: item.currency || "INR",
          stockQuantity:
            item.stock_quantity !== undefined
              ? Number(item.stock_quantity) + 1
              : 1,
          supplier: item.supplier || "",
          expiryDate: item.expiry_date || "",
          reorderLevel: item.reorder_level || 5,
          isAvailable: item.is_available ?? true,
        });

        alert(`Existing product found: ${item.name}`);
      } else {
        setExistingProductId(null);

        setFormData((prev) => ({
          ...INITIAL_FORM_STATE,
          barcode: barcode,
        }));
      }
    } catch (error) {
      console.error("Barcode lookup failed:", error);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const payload = {
      barcode: formData.barcode,
      name: formData.name,
      category: formData.category,
      price: Number(formData.price),
      currency: formData.currency,
      stock_quantity: Number(formData.stockQuantity),
      supplier: formData.supplier || "NA",
      expiry_date: formData.expiryDate || "",
      reorder_level: Number(formData.reorderLevel),
      is_available: formData.isAvailable,
    };

    let url = "http://localhost:3000/items";
    let method = "POST";

    if (existingProductId) {
      url = `http://localhost:3000/items/${existingProductId}`;
      method = "PUT";
      payload.id = existingProductId;
    } else {
      payload.id = Date.now().toString();
      payload.sold_count = 0;
      payload.last_sold = "";
    }

    try {
      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save product");
      }

      alert(
        existingProductId
          ? "Inventory updated successfully!"
          : "New product added successfully!"
      );

      setFormData(INITIAL_FORM_STATE);
      setExistingProductId(null);
    } catch (error) {
      console.error("Save failed:", error);
      alert("Failed to save product");
    }
  }

  return (
    <div className="add-product-page">
      <div className="add-product-container">
        <h1 className="add-product-title">
          {existingProductId ? "Update Existing" : "Add New"} Product
        </h1>

        <form className="product-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Barcode</label>
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              onBlur={handleBarcodeCheck}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleBarcodeCheck();
                }
              }}
              placeholder="Type barcode and press Enter"
              required
            />
          </div>

          <div className="form-group">
            <label>Product Name</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Category</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Price</label>
            <input
              type="number"
              name="price"
              value={formData.price}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Currency</label>
            <select
              name="currency"
              value={formData.currency}
              onChange={handleChange}
            >
              <option value="INR">INR</option>
              <option value="USD">USD</option>
            </select>
          </div>

          <div className="form-group">
            <label>Stock Quantity</label>
            <input
              type="number"
              name="stockQuantity"
              value={formData.stockQuantity}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Supplier</label>
            <input
              type="text"
              name="supplier"
              value={formData.supplier}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label>Expiry Date</label>
            <input
              type="date"
              name="expiryDate"
              value={formData.expiryDate}
              onChange={handleChange}
            />
          </div>

          <button type="submit" className="submit-btn">
            {existingProductId
              ? "Update Inventory Stock"
              : "Add New Product"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddProduct;