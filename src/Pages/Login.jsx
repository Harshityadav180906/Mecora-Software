import { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import "./Login.css";

function Login() {
  const { login, addLog } = useContext(AuthContext);
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    if (!username || !password) {
      alert("Please fill in all login fields!");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, username, password, role")
        .ilike("username", username.trim())
        .limit(1);

      if (error) throw error;

      if (!data || data.length === 0) {
        // Log failed login
        addLog(`SECURITY: Failed login attempt for username "${username}" - User not found`, {
          type: "login_failed",
          attemptedUsername: username,
          reason: "user_not_found",
        });
        alert("Invalid Username or Password.");
        return;
      }

      const matchedUser = data[0];

      if (matchedUser.password !== password) {
        // Log failed password
        addLog(`SECURITY: Failed login attempt for "${matchedUser.username}" - Wrong password`, {
          type: "login_failed",
          attemptedUsername: matchedUser.username,
          reason: "wrong_password",
        });
        alert("Invalid Username or Password.");
        return;
      }

      const safeUser = {
        id: matchedUser.id,
        username: matchedUser.username,
        role: matchedUser.role,
      };

      login(safeUser);
      alert(`Successfully signed in as ${safeUser.role}!`);

      if (safeUser.role === "admin" || safeUser.role === "manager") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login Connection Error:", error.message);
      addLog(`SYSTEM: Login error - ${error.message}`, {
        type: "system_error",
        error: error.message,
      });
      alert(`Login failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleForgotPassword() {
    const enteredUser = prompt("Enter your Username to recover password:");
    if (!enteredUser) return;

    addLog(`SECURITY: Password reset requested for "${enteredUser}"`, {
      type: "password_reset_request",
      requestedFor: enteredUser,
    });

    alert(`Password reset request for "${enteredUser}" has been notified to admin.`);
  }

  return (
    <div className="login-page-wrapper">
      <div className="auth-card-box">
        <h2>Mecora Staff Login</h2>

        <form onSubmit={handleLogin} className="auth-form-element">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            disabled={loading}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
          />
          <button type="submit" className="action-submit-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div className="auth-helper-links">
          <button type="button" onClick={handleForgotPassword} className="link-style-btn forgot-btn">
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;