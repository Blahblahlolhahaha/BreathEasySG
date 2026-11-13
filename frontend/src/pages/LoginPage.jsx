// The log in / sign up page (/login, /signup), including the "enter the code from your email" step.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { useAuth } from "../auth/AuthContext";
import "./LoginPage.css";

export default function LoginPage() {
  const { signIn, signUp, confirmSignUp, resendCode, completeNewPassword} = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(
    location.pathname === "/signup" ? "signup" : "login",
  ); // login | signup | confirm
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [pendingCognitoUser, setPendingCognitoUser] = useState(null);

  const returnTo = location.state?.from?.pathname || "/dashboard";

  async function run(action) {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const handleLogin = (e) => {
    e.preventDefault();
    run(async () => {
      try {
        const result = await signIn(email, password);
        if (result.status === "NEW_PASSWORD_REQUIRED") {
          setPendingCognitoUser(result.cognitoUser);
          setMode("newPassword");
          return;
        }
      } catch (err) {
        if (err.code === "UserNotConfirmedException") {
          await resendCode(email);
          setMode("confirm");
          setInfo(
            "Your email isn’t confirmed yet. We sent a new code to your inbox.",
          );
          return;
        }
        throw err;
      }
      navigate(returnTo, { replace: true });
    });
  };

  const handleNewPassword = (e) => {
    e.preventDefault();

    if (newPassword !== confirmNewPassword) {
      setError("The passwords do not match.");
      return;
    }

    run(async () => {
      await completeNewPassword(pendingCognitoUser, newPassword, name);
      setPendingCognitoUser(null);
      navigate(returnTo, { replace: true });
    });
  };

  const handleSignup = (e) => {
    e.preventDefault();
    run(async () => {
      await signUp(name, email, password);
      setMode("confirm");
      setInfo(`We sent a 6-digit code to ${email}. Enter it below.`);
    });
  };

  const handleConfirm = (e) => {
    e.preventDefault();
    run(async () => {
      await confirmSignUp(email, code);
      await signIn(email, password);
      navigate("/setup", { replace: true });
    });
  };

  const handleResend = () =>
    run(async () => {
      await resendCode(email);
      setInfo("A new code is on its way.");
    });

  const switchMode = (next) => {
    setMode(next);
    setError("");
    setInfo("");
  };

  return (
    <div className="center-page">
      <Link to="/" className="center-logo">
        <Logo />
      </Link>

      <div className="card auth-card">
        <h1 className="page-title">
          {mode === "login" && "Log in"}
          {mode === "signup" && "Create your account"}
          {mode === "confirm" && "Check your email"}
          {mode === "newPassword" && "Set a new password"}
        </h1>

        {mode === "login" && (
          <form className="auth-form" onSubmit={handleLogin}>
            <label className="auth-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </label>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Logging in…" : "Log in"}
            </button>
          </form>
        )}

        {mode === "newPassword" && (
            <form className="auth-form" onSubmit={handleNewPassword}>
              <label className="auth-field">
                Name
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>

              <label className="auth-field">
                New password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <label className="auth-field">
                Confirm new password
                <input
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              <button className="btn" type="submit" disabled={busy}>
                {busy ? "Updating password…" : "Set new password"}
              </button>
            </form>
          )}

        {mode === "signup" && (
          <form className="auth-form" onSubmit={handleSignup}>
            <label className="auth-field">
              Name
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
              />
            </label>
            <label className="auth-field">
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </label>
            <label className="auth-field">
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={8}
                required
              />
              <span className="muted">
                At least 8 characters, with upper and lower case letters, a
                number and a symbol.
              </span>
            </label>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Creating account…" : "Sign up"}
            </button>
          </form>
        )}

        {mode === "confirm" && (
          <form className="auth-form" onSubmit={handleConfirm}>
            <label className="auth-field">
              Confirmation code
              <input
                type="text"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                autoComplete="one-time-code"
                required
              />
            </label>
            <button className="btn" type="submit" disabled={busy}>
              {busy ? "Confirming…" : "Confirm and continue"}
            </button>
            <button
              className="auth-link"
              type="button"
              onClick={handleResend}
              disabled={busy}
            >
              Send me a new code
            </button>
          </form>
        )}

        {info && (
          <p className="auth-info" role="status">
            {info}
          </p>
        )}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        {mode === "login" && (
          <p className="auth-switch muted">
            New here?{" "}
            <button
              className="auth-link"
              type="button"
              onClick={() => switchMode("signup")}
            >
              Create an account
            </button>
          </p>
        )}
        {mode === "signup" && (
          <p className="auth-switch muted">
            Already have an account?{" "}
            <button
              className="auth-link"
              type="button"
              onClick={() => switchMode("login")}
            >
              Log in
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
