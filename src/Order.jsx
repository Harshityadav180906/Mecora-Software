import { useState } from "react";
import jsPDF from "jspdf";
import "./Order.css";

function Order() {

  const [barcode, setBarcode] = useState("");
  const [product, setProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [orderPlaced, setOrderPlaced] = useState(false);

  // SEARCH PRODUCT

  function searchProduct() {

    fetch("http://localhost:3000/items")
      .then((response) => response.json())
      .then((data) => {

        const foundProduct = data.find(
          (item) => item.barcode === barcode
        );

        if (foundProduct) {

          setProduct(foundProduct);

        } else {

          alert("Product Not Found");
        }
      })
      .catch((error) => console.log(error));
  }

  // ADD TO CART

  function addToCart() {

    if (!product) return;

    if (product.stock_quantity <= 0) {

      alert("Out Of Stock");

      return;
    }

    setCart([...cart, product]);

    setProduct(null);

    setBarcode("");
  }

  // TOTAL

  const total = cart.reduce(
    (sum, item) => sum + item.price,
    0
  );

  // PLACE ORDER

  async function placeOrder() {

    try {

      // UPDATE STOCK

      for (const item of cart) {

        const updatedQuantity =
          item.stock_quantity - 1;

        await fetch(
          `http://localhost:3000/items/${item.id}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify({
              stock_quantity: updatedQuantity,
            }),
          }
        );
      }

      // SAVE ORDER

      const orderData = {

        id: Date.now(),

        products: cart,

        totalAmount: total,

        orderDate:
          new Date().toLocaleString(),
      };

      await fetch(
        "http://localhost:3000/orders",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
          },

          body: JSON.stringify(orderData),
        }
      );

      alert("Order Placed Successfully");

      setOrderPlaced(true);

    } catch (error) {

      console.log(error);
    }
  }

  // GENERATE BILL

  function generateBill() {

    const doc = new jsPDF();

    doc.setFontSize(22);

    doc.text("Mecora Store Bill", 20, 20);

    doc.setFontSize(14);

    let y = 40;

    cart.forEach((item, index) => {

      doc.text(
        `${index + 1}. ${item.name} - Rs.${item.price}`,
        20,
        y
      );

      y += 12;
    });

    doc.text(
      `Total Amount: Rs.${total}`,
      20,
      y + 20
    );

    doc.save("bill.pdf");

    setCart([]);

    setOrderPlaced(false);
  }

  // SKIP BILL

  function skipBill() {

    alert("Order Completed");

    setCart([]);

    setOrderPlaced(false);
  }

  return (

    <div className="order-container">

      <h1 className="order-title">
        Order Section
      </h1>

      {/* SEARCH */}

      <div className="barcode-section">

        <input
          type="text"
          placeholder="Scan Barcode"
          value={barcode}
          onChange={(e) =>
            setBarcode(e.target.value)
          }
        />

        <button onClick={searchProduct}>
          Search
        </button>

      </div>

      {/* PRODUCT DETAILS */}

      {product && (

        <div className="product-card">

          <h2>{product.name}</h2>

          <p>
            Barcode: {product.barcode}
          </p>

          <p>
            Category: {product.category}
          </p>

          <p>
            Price: Rs.{product.price}
          </p>

          <p>
            Supplier: {product.supplier}
          </p>

          <p>
            Stock: {product.stock_quantity}
          </p>

          <p>
            Available:
            {product.is_available
              ? " Yes"
              : " No"}
          </p>

          <button onClick={addToCart}>
            Add To Cart
          </button>

        </div>
      )}

      {/* CART */}

      <div className="cart-section">

        <h2>Cart Items</h2>

        {cart.length === 0 && (
          <p>No Products Added</p>
        )}

        {cart.map((item, index) => (

          <div
            key={index}
            className="cart-item"
          >

            <span>{item.name}</span>

            <span>
              Rs.{item.price}
            </span>

          </div>
        ))}

        <h2>
          Total: Rs.{total}
        </h2>

        {/* PLACE ORDER BUTTON */}

        {cart.length > 0 &&
          !orderPlaced && (

          <button
            className="place-btn"
            onClick={placeOrder}
          >
            Place Order
          </button>

        )}

        {/* BILL OPTIONS */}

        {orderPlaced && (

          <div className="bill-options">

            <button
              className="bill-btn"
              onClick={generateBill}
            >
              Generate Bill
            </button>

            <button
              className="skip-btn"
              onClick={skipBill}
            >
              Don't Generate Bill
            </button>

          </div>
        )}

      </div>

    </div>
  );
}

export default Order;