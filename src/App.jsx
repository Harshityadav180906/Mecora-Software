import "./App.css";
import Navbar from "./Navbar";

import { BrowserRouter, Routes, Route } from "react-router";

import Home from "./Home";
import Inventory from "./Inventory";
import Order from "./Order";
import AddProduct from "./addProduct";

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Default Route */}
        <Route path="/" element={<Home />} />

        <Route path="/Home" element={<Home />} />

        <Route path="/Order" element={<Order />} />

        <Route path="/Inventory" element={<Inventory />} />

        <Route path="/add-product" element={<AddProduct />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
