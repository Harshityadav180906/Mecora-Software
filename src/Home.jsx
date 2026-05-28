import { useEffect, useState } from "react";
import "./Home.css";

function Home() {

  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);

  // FETCH ORDERS

  function fetchOrders() {

    fetch("http://localhost:3000/orders")

      .then((response) => response.json())

      .then((data) => setOrders(data))

      .catch((error) => console.log(error));
  }

  // FETCH PRODUCTS

  function fetchProducts() {

    fetch("http://localhost:3000/items")

      .then((response) => response.json())

      .then((data) => setProducts(data))

      .catch((error) => console.log(error));
  }

  useEffect(() => {

    fetchOrders();

    fetchProducts();

  }, []);

  // TOTAL REVENUE

  const totalRevenue = orders.reduce(

    (sum, order) =>
      sum + order.totalAmount,

    0
  );

  // TOTAL PRODUCTS SOLD

  const totalProductsSold = orders.reduce(

    (sum, order) =>
      sum + order.products.length,

    0
  );

  return (

    <div className="home-container">

      <h1 className="dashboard-title">
        Mecora Dashboard
      </h1>

      {/* DASHBOARD CARDS */}

      <div className="dashboard-cards">

        <div className="card">

          <h2>Total Orders</h2>

          <p>{orders.length}</p>

        </div>

        <div className="card">

          <h2>Total Products</h2>

          <p>{products.length}</p>

        </div>

        <div className="card">

          <h2>Products Sold</h2>

          <p>{totalProductsSold}</p>

        </div>

        <div className="card">

          <h2>Total Revenue</h2>

          <p>Rs.{totalRevenue}</p>

        </div>

      </div>

      {/* RECENT ORDERS */}

      <div className="recent-orders">

        <h2>Recent Orders</h2>

        {orders.length === 0 && (

          <p>No Orders Yet</p>

        )}

        {orders.map((order) => (

          <div
            key={order.id}
            className="order-card"
          >

            <h3>
              Order ID:
              {order.id}
            </h3>

            <p>
              Date:
              {order.orderDate}
            </p>

            <p>
              Total:
              Rs.{order.totalAmount}
            </p>

            <h4>Products:</h4>

            <ul>

              {order.products.map(
                (product, index) => (

                  <li key={index}>

                    {product.name}
                    {" - "}
                    Rs.{product.price}

                  </li>
                )
              )}

            </ul>

          </div>
        ))}

      </div>

    </div>
  );
}

export default Home;