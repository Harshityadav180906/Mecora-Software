import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import "./Login.css"; 

function Login() {
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  // Input Field States
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // SIGN IN SUBMISSION HANDLER
  async function handleLogin(e) {
    e.preventDefault();

    if (!username || !password) {
      alert("Please fill in all login fields!");
      return;
    }

    try {
      const response = await fetch("http://localhost:3000/users");
      const users = await response.json();

      // Look for credential matching inside your mock backend database
      const matchedUser = users.find(
        (u) =>
          u.username.toLowerCase() === username.toLowerCase() &&
          u.password === password
      );

      if (matchedUser) {
        login(matchedUser); // Saves user object securely in your AuthContext state
        alert(`Successfully signed in as ${matchedUser.role}!`);

        // Routes user smoothly based on their security rank
        if (matchedUser.role === "admin" || matchedUser.role === "manager") {
          navigate("/admin");
        } else {
          navigate("/");
        }
      } else {
        alert(
          "Invalid Username or Password. Please check your credentials or contact your administrator."
        );
      }
    } catch (error) {
      console.error("Login Connection Error:", error);
      alert("Backend server (port 3000) is offline!");
    }
  }

  // FORGOT PASSWORD ACTION HANDLER
  function handleForgotPassword() {
    const enteredUser = prompt(
      "Please enter your Username to recover your account security credentials:"
    );
    if (!enteredUser) return;

    alert(
      `A password reset request for "${enteredUser}" has been notified. Please contact your system manager to reset your password profile.`
    );
  }

  return (
    <div className="login-page-wrapper">
      <div className="auth-card-box">
        <h2>Mecora Staff Login</h2> 

        {/* LOGIN FORM VIEW */}
        <form onSubmit={handleLogin} className="auth-form-element">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="action-submit-btn">
            Sign In
          </button>
        </form>

        {/* COMPONENT FOOTER NAVIGATION ACTIONS */}
        <div className="auth-helper-links" style={{ display: "flex", justifyContent: "center", marginTop: "15px" }}>
          <button
            type="button"
            onClick={handleForgotPassword}
            className="link-style-btn forgot-btn"
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;