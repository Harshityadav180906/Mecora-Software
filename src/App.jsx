import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "./context/AuthContext";
import Navbar from "./components/Navbar";
import Home from "./Pages/Home";
import Inventory from "./Pages/Inventory";
import Order from "./Pages/Order";
import AddProduct from "./Pages/AddProduct";
import AllOrders from "./Pages/AllOrders"; // ADDED: Import the new component
import Login from "./Pages/Login";
import AdminPanel from "./Pages/AdminPanel";
import "./styles/global.css";

// 1. SECURE WRAPPER FOR REGULAR STAFF (Employee/Manager/Admin)
function StaffProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);
  
  // If no user is logged in, force them to go to the login screen
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

// 2. STRICT SECURE WRAPPER FOR ADMINS ONLY
function AdminProtectedRoute({ children }) {
  const { user } = useContext(AuthContext);

  // If not logged in at all, go to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If logged in but NOT an admin, block them and send them back to Home/Dashboard
  if (user.role !== "admin") {
    alert("Access Denied: Admins Only!");
    return <Navigate to="/" replace />;
  }

  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Navbar />

      <Routes>
        {/* Public Route */}
        <Route path="/login" element={<Login />} />

        {/* Protected Staff Routes (Accessible by Employees, Managers, and Admins) */}
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
        
        {/* ADDED: Protected Route for viewing all placed orders */}
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

        {/* Strictly Protected Admin Route */}
        <Route 
          path="/admin" 
          element={
            <AdminProtectedRoute>
              <AdminPanel />
            </AdminProtectedRoute>
          } 
        />

        {/* Wildcard Fallback Route */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;