import React, { useEffect, useState } from "react";

import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  ArrowRight,
  Briefcase,
  Diamond,
  Eye,
  EyeOff,
  User,
} from "lucide-react";

import { useAuth } from "../context/AuthContext";

import { Button } from "../components/Button";

import {
  LoginAlerts,
  AlertType,
} from "../components/Alert/LoginAlerts";

import { Role } from "../types";

// ============================================================
// Login Page
// ============================================================

export const Login: React.FC = () => {
  const location = useLocation();

  const navigate = useNavigate();

  const {
    login,
    registerUser,
  } = useAuth();

  // ==========================================================
  // Mode
  // ==========================================================

  const initialMode =
    location.state?.mode !== "signup";

  const [isLoginMode, setIsLoginMode] =
    useState(initialMode);

  // ==========================================================
  // Registration Role
  // ==========================================================

  const [selectedRole, setSelectedRole] =
    useState<Role>("User");

  // ==========================================================
  // Form State
  // ==========================================================

  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [fullName, setFullName] =
    useState("");

  // ==========================================================
  // UI State
  // ==========================================================

  const [isLoading, setIsLoading] =
    useState(false);

  const [showPassword, setShowPassword] =
    useState(false);

  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // ==========================================================
  // Redirect Destination
  // ==========================================================

  // ==========================================================
  // Update Mode From Navigation
  // ==========================================================

  useEffect(() => {
    if (location.state?.mode === "signup") {
      setIsLoginMode(false);
    }
  }, [location.state]);

  // ==========================================================
  // Password Validation
  // Matches API Documentation:
  // Minimum 6 characters
  // ==========================================================

  const validatePassword = (
    value: string,
  ): {
    isValid: boolean;
    message: string;
  } => {
    if (value.length < 6) {
      return {
        isValid: false,
        message:
          "Password must be at least 6 characters long.",
      };
    }

    return {
      isValid: true,
      message: "",
    };
  };

  // ==========================================================
  // Authentication
  // ==========================================================

  const handleAuth = async (
    event: React.FormEvent,
  ): Promise<void> => {
    event.preventDefault();

    const trimmedEmail =
      email.trim();

    const trimmedName =
      fullName.trim();

    // --------------------------------------------------------
    // Email Validation
    // --------------------------------------------------------

    if (!trimmedEmail) {
      setAlert({
        type: "warning",
        message:
          "Please enter your email address.",
      });

      return;
    }

    // --------------------------------------------------------
    // Password Validation
    // --------------------------------------------------------

    if (!password) {
      setAlert({
        type: "warning",
        message:
          "Please enter your password.",
      });

      return;
    }

    // --------------------------------------------------------
    // Registration Validation
    // --------------------------------------------------------

    if (!isLoginMode) {
      if (!trimmedName) {
        setAlert({
          type: "warning",
          message:
            "Please enter your full name.",
        });

        return;
      }

      const passwordValidation =
        validatePassword(password);

      if (!passwordValidation.isValid) {
        setAlert({
          type: "warning",
          message:
            passwordValidation.message,
        });

        return;
      }

      if (password !== confirmPassword) {
        setAlert({
          type: "warning",
          message:
            "Passwords do not match. Please try again.",
        });

        return;
      }
    }

    // --------------------------------------------------------
    // Start Request
    // --------------------------------------------------------

    setIsLoading(true);
    setAlert(null);

    try {
      // ======================================================
      // REGISTER
      // POST /api/auth/register
      // ======================================================

      if (!isLoginMode) {
        const registeredUser =
          await registerUser({
            name: trimmedName,

            email: trimmedEmail,

            password,

            role:
              selectedRole as
              | "User"
              | "Partner"
              | "Admin",
          });

        setAlert({
          type: "success",
          message:
            `Welcome to Stylus, ${registeredUser.name}! ` +
            "Your account has been created successfully.",
        });

        setIsLoginMode(true);
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");

        navigate("/login", {
          replace: true,
          state: { mode: "login" },
        });

        return;
      }

      // ======================================================
      // LOGIN
      // POST /api/auth/login
      // ======================================================

      const authenticatedUser = await login(
        trimmedEmail,
        password,
      );

      navigate(authenticatedUser.role === "Admin" ? "/admin/dashboard" : "/", {
        replace: true,
      });
    } catch (error: unknown) {
      console.error(
        "Authentication error:",
        error,
      );

      const message =
        error instanceof Error
          ? error.message
          : "Authentication failed. Please check your details and try again.";

      setAlert({
        type: "error",
        message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================================
  // Toggle Login / Signup
  // ==========================================================

  const toggleMode = (): void => {
    setIsLoginMode(
      (previous) => !previous,
    );

    setEmail("");

    setPassword("");

    setConfirmPassword("");

    setFullName("");

    setAlert(null);
  };

  // ==========================================================
  // Render
  // ==========================================================

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center relative overflow-hidden animate-fade-in">
      {/* ====================================================
          Alert
      ===================================================== */}

      {alert && (
        <LoginAlerts
          type={alert.type}
          message={alert.message}
          onClose={() =>
            setAlert(null)
          }
        />
      )}

      {/* ====================================================
          Background
      ===================================================== */}

      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-golden-orange/5 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-golden-light/5 rounded-full blur-[120px]" />
      </div>

      {/* ====================================================
          Main Container
      ===================================================== */}

      <div className="relative z-10 w-full max-w-md px-6 py-12">
        {/* ==================================================
            Header
        =================================================== */}

        <div className="text-center mb-10">
          <div className="flex justify-center mb-6">
            <Diamond className="h-12 w-12 text-golden-orange" />
          </div>

          <h1 className="font-serif text-4xl text-cream mb-2">
            {isLoginMode
              ? "Welcome Back"
              : "Join Stylus"}
          </h1>

          <p className="text-golden-orange text-xs uppercase tracking-[0.2em]">
            {isLoginMode
              ? "Enter the Inner Circle"
              : "Create Your Account"}
          </p>
        </div>

        {/* ==================================================
            Card
        =================================================== */}

        <div className="bg-[#1f0c05]/80 backdrop-blur-md border border-white/10 p-8 shadow-2xl rounded-sm">
          {/* ==================================================
              Registration Role
          =================================================== */}

          {!isLoginMode && (
            <div className="flex mb-6 bg-black/20 p-1 rounded">
              {/* User */}

              <button
                type="button"
                onClick={() =>
                  setSelectedRole("User")
                }
                disabled={isLoading}
                className={`
                  flex-1
                  py-2
                  text-xs
                  uppercase
                  tracking-widest
                  font-bold
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded
                  transition-all
                  ${selectedRole === "User"
                    ? "bg-golden-orange text-espresso shadow-lg"
                    : "text-cream/50 hover:text-white"
                  }
                `}
              >
                <User size={14} />

                User
              </button>

              {/* Partner */}

              <button
                type="button"
                onClick={() =>
                  setSelectedRole("Partner")
                }
                disabled={isLoading}
                className={`
                  flex-1
                  py-2
                  text-xs
                  uppercase
                  tracking-widest
                  font-bold
                  flex
                  items-center
                  justify-center
                  gap-2
                  rounded
                  transition-all
                  ${selectedRole === "Partner"
                    ? "bg-golden-orange text-espresso shadow-lg"
                    : "text-cream/50 hover:text-white"
                  }
                `}
              >
                <Briefcase size={14} />

                Partner
              </button>
            </div>
          )}

          {/* ==================================================
              Form
          =================================================== */}

          <form
            onSubmit={handleAuth}
            className="space-y-6"
          >
            {/* =================================================
                Full Name
            ================================================== */}

            {!isLoginMode && (
              <div>
                <label
                  htmlFor="fullName"
                  className="block text-xs uppercase tracking-widest text-cream/50 mb-2"
                >
                  Full Name
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(event) =>
                    setFullName(
                      event.target.value,
                    )
                  }
                  className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                  placeholder="Enter your full name"
                  autoComplete="name"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* =================================================
                Email
            ================================================== */}

            <div>
              <label
                htmlFor="email"
                className="block text-xs uppercase tracking-widest text-cream/50 mb-2"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) =>
                  setEmail(
                    event.target.value,
                  )
                }
                className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                placeholder="email@example.com"
                autoComplete="email"
                required
                disabled={isLoading}
              />
            </div>

            {/* =================================================
                Password
            ================================================== */}

            <div className="relative">
              <div className="flex justify-between mb-2">
                <label
                  htmlFor="password"
                  className="block text-xs uppercase tracking-widest text-cream/50"
                >
                  Password
                </label>
              </div>

              <input
                id="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value,
                  )
                }
                className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 pr-12 focus:border-golden-orange outline-none transition-colors"
                placeholder={
                  isLoginMode
                    ? "Enter your password"
                    : "Create a password"
                }
                autoComplete={
                  isLoginMode
                    ? "current-password"
                    : "new-password"
                }
                required
                disabled={isLoading}
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (previous) =>
                      !previous,
                  )
                }
                disabled={isLoading}
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                className="absolute right-3 top-[34px] text-cream/30 hover:text-cream transition-colors disabled:opacity-50"
              >
                {showPassword ? (
                  <EyeOff size={16} />
                ) : (
                  <Eye size={16} />
                )}
              </button>
            </div>

            {/* =================================================
                Confirm Password
            ================================================== */}

            {!isLoginMode && (
              <div className="relative">
                <label
                  htmlFor="confirmPassword"
                  className="block text-xs uppercase tracking-widest text-cream/50 mb-2"
                >
                  Confirm Password
                </label>

                <input
                  id="confirmPassword"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value,
                    )
                  }
                  className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 pr-12 focus:border-golden-orange outline-none transition-colors"
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  required
                  disabled={isLoading}
                />
              </div>
            )}

            {/* =================================================
                Submit
            ================================================== */}

            <Button
              fullWidth
              disabled={isLoading}
              className="mt-4"
            >
              {isLoading ? (
                <span className="animate-pulse">
                  Processing...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  {isLoginMode
                    ? "Sign In"
                    : selectedRole ===
                      "Partner"
                      ? "Register Partner"
                      : "Create Account"}

                  <ArrowRight size={16} />
                </span>
              )}
            </Button>
          </form>
        </div>

        {/* ====================================================
            Toggle Login / Signup
        ===================================================== */}

        <div className="text-center mt-8">
          <p className="text-cream/60 text-sm">
            {isLoginMode
              ? "Not a member yet? "
              : "Already have an account? "}

            <button
              type="button"
              onClick={toggleMode}
              disabled={isLoading}
              className="text-golden-orange font-bold hover:text-white transition-colors border-b border-golden-orange hover:border-white pb-0.5 disabled:opacity-50"
            >
              {isLoginMode
                ? "Request Access"
                : "Log In"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};