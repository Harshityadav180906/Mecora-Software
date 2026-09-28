import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./Pages/Home";
import Inventory from "./Pages/Inventory";
import Order from "./Pages/Order";
import AddProduct from "./Pages/AddProduct";
import AllOrders from "./Pages/AllOrders";
import Login from "./Pages/Login";
import AdminPanel from "./Pages/AdminPanel";
import "./styles/global.css";

// Staff routes (Employee/Manager/Admin)
function StaffProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Admin-only routes (no alert - just redirect)
function AdminProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/" replace />;

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <StaffProtectedRoute>
              <Home />
            </StaffProtectedRoute>
          }
        />

        <Route
          path="/inventory"
          element={
            <StaffProtectedRoute>
              <Inventory />
            </StaffProtectedRoute>
          }
        />

        <Route
          path="/order"
          element={
            <StaffProtectedRoute>
              <Order />
            </StaffProtectedRoute>
          }
        />

        <Route
          path="/all-orders"
          element={
            <StaffProtectedRoute>
              <AllOrders />
            </StaffProtectedRoute>
          }
        />

        <Route
          path="/add-product"
          element={ 
            <StaffProtectedRoute>
              <AddProduct />
            </StaffProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <AdminProtectedRoute>
              <AdminPanel />
            </AdminProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;