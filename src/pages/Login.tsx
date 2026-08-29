import React, {
  useState,
  useEffect,
} from 'react';

import {
  useNavigate,
  useLocation,
} from 'react-router-dom';

import {
  Diamond,
  ArrowRight,
  Eye,
  EyeOff,
  Briefcase,
  User,
} from 'lucide-react';

import {
  useAuth,
} from '../context/AuthContext';

import {
  Button,
} from '../components/Button';

import {
  LoginAlerts,
  AlertType,
} from '../components/Alert/LoginAlerts';

import {
  Role,
} from '../types';

export const Login: React.FC = () => {

  const location =
    useLocation();

  const navigate =
    useNavigate();

  // ==========================================================
  // INITIAL MODE
  // ==========================================================

  const initialMode =
    location.state?.mode !==
    'signup';

  const [
    isLoginMode,
    setIsLoginMode,
  ] = useState(
    initialMode
  );

  // ==========================================================
  // ROLE
  // ==========================================================

  const [
    selectedRole,
    setSelectedRole,
  ] = useState<Role>(
    'User'
  );

  // ==========================================================
  // FORM STATE
  // ==========================================================

  const [
    email,
    setEmail,
  ] = useState('');

  const [
    password,
    setPassword,
  ] = useState('');

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('');

  const [
    fullName,
    setFullName,
  ] = useState('');

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    alert,
    setAlert,
  ] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  // ==========================================================
  // AUTH
  // ==========================================================

  const {
    login,
    registerUser,
  } = useAuth();

  // ==========================================================
  // LOGIN REDIRECT
  // ==========================================================

  const from =
    location.state?.from
      ?.pathname ||
    '/dashboard';

  // ==========================================================
  // HANDLE SIGNUP MODE
  // ==========================================================

  useEffect(() => {

    if (
      location.state?.mode ===
      'signup'
    ) {
      setIsLoginMode(false);
    }

    // Show message if redirected here
    // after registration.

    if (
      location.state
        ?.registrationSuccess
    ) {
      setAlert({
        type: 'success',
        message:
          'Your account has been created successfully. Please log in to continue.',
      });

      // Remove the registration state
      // from browser history.

      navigate('/login', {
        replace: true,
        state: {},
      });
    }

  }, [
    location.state,
    navigate,
  ]);

  // ==========================================================
  // PASSWORD VALIDATION
  // ==========================================================

  const validatePassword = (
    password: string
  ): {
    isValid: boolean;
    message: string;
  } => {

    if (
      password.length < 8
    ) {
      return {
        isValid: false,
        message:
          'Password must be at least 8 characters long',
      };
    }

    if (
      !/[A-Z]/.test(
        password
      )
    ) {
      return {
        isValid: false,
        message:
          'Password must contain at least one uppercase letter',
      };
    }

    if (
      !/[!@#$%^&*(),.?":{}|<>]/.test(
        password
      )
    ) {
      return {
        isValid: false,
        message:
          'Password must contain at least one special character',
      };
    }

    return {
      isValid: true,
      message: '',
    };
  };

  // ==========================================================
  // LOGIN / REGISTRATION
  // ==========================================================

  const handleAuth = async (
    e: React.FormEvent
  ) => {

    e.preventDefault();

    // --------------------------------------------------------
    // BASIC VALIDATION
    // --------------------------------------------------------

    if (
      !email.trim() ||
      !password
    ) {

      setAlert({
        type: 'warning',
        message:
          'Please enter your email and password.',
      });

      return;
    }

    // --------------------------------------------------------
    // REGISTRATION VALIDATION
    // --------------------------------------------------------

    if (!isLoginMode) {

      if (
        !fullName.trim()
      ) {

        setAlert({
          type: 'warning',
          message:
            'Please enter your full name.',
        });

        return;
      }

      const passwordValidation =
        validatePassword(
          password
        );

      if (
        !passwordValidation.isValid
      ) {

        setAlert({
          type: 'warning',
          message:
            passwordValidation.message,
        });

        return;
      }

      if (
        password !==
        confirmPassword
      ) {

        setAlert({
          type: 'warning',
          message:
            'Passwords do not match. Please try again.',
        });

        return;
      }
    }

    setIsLoading(true);

    setAlert(null);

    // ========================================================
    // REGISTRATION
    // ========================================================

    if (!isLoginMode) {

      try {

        await registerUser(
          fullName.trim(),
          email.trim(),
          password,
          selectedRole
        );

        // ----------------------------------------------------
        // REGISTRATION SUCCESS
        // ----------------------------------------------------
        //
        // IMPORTANT:
        // registerUser() does NOT authenticate the user.
        //
        // We send the user to /login.
        // ----------------------------------------------------

        setIsLoading(false);

        setAlert({
          type: 'success',
          message:
            'Your account has been created successfully. Please log in to continue.',
        });

        setTimeout(() => {

          navigate('/login', {
            replace: true,
            state: {
              registrationSuccess:
                true,
            },
          });

        }, 1500);

        return;

      } catch (
        error: any
      ) {

        console.error(
          'Registration error:',
          error
        );

        setAlert({
          type: 'error',
          message:
            error?.message ||
            'Registration failed. Please check your details and try again.',
        });

        setIsLoading(false);

        return;
      }
    }

    // ========================================================
    // LOGIN
    // ========================================================

    try {

      const success =
        await login(
          email.trim(),
          password
        );

      if (!success) {

        setAlert({
          type: 'error',
          message:
            'Invalid email or password. Please check your credentials and try again.',
        });

        setIsLoading(false);

        return;
      }

      // ------------------------------------------------------
      // LOGIN SUCCESS
      // ------------------------------------------------------

      setIsLoading(false);

      navigate(
        from,
        {
          replace: true,
        }
      );

    } catch (
      error: any
    ) {

      console.error(
        'Login error:',
        error
      );

      setAlert({
        type: 'error',
        message:
          error?.message ||
          'Login failed. Please check your credentials and try again.',
      });

      setIsLoading(false);
    }
  };

  // ==========================================================
  // SOCIAL LOGIN
  // ==========================================================

  const handleSocialLogin =
    async (
      provider:
        | 'Google'
        | 'Apple'
    ) => {

      /*
       * These are still mock social-login credentials.
       *
       * They are NOT Google OAuth or Apple Sign-In.
       *
       * When you are ready to implement real Google/Apple
       * authentication, this function should be replaced
       * with the actual OAuth flow.
       */

      const mockName =
        provider ===
        'Google'
          ? 'Alex Mercer'
          : 'Jordan Lee';

      const mockEmail =
        provider ===
        'Google'
          ? 'alex.m@gmail.com'
          : 'jordan.l@icloud.com';

      const mockPassword =
        'SocialLogin123!';

      setIsLoading(true);

      setAlert(null);

      try {

        // ----------------------------------------------------
        // SOCIAL REGISTRATION
        // ----------------------------------------------------

        if (!isLoginMode) {

          await registerUser(
            mockName,
            mockEmail,
            mockPassword,
            'User'
          );

          setIsLoading(false);

          setAlert({
            type: 'success',
            message:
              `Your account has been created successfully with ${provider}. Please log in to continue.`,
          });

          setTimeout(() => {

            navigate('/login', {
              replace: true,
              state: {
                registrationSuccess:
                  true,
              },
            });

          }, 1500);

          return;
        }

        // ----------------------------------------------------
        // SOCIAL LOGIN
        // ----------------------------------------------------

        const success =
          await login(
            mockEmail,
            mockPassword
          );

        if (!success) {

          setAlert({
            type: 'error',
            message:
              `${provider} login failed. Please try again.`,
          });

          setIsLoading(false);

          return;
        }

        setIsLoading(false);

        navigate(
          from,
          {
            replace: true,
          }
        );

      } catch (
        error: any
      ) {

        console.error(
          `${provider} authentication error:`,
          error
        );

        setAlert({
          type: 'error',
          message:
            error?.message ||
            `${provider} authentication failed. Please try again.`,
        });

        setIsLoading(false);
      }
    };

  // ==========================================================
  // TOGGLE LOGIN / SIGNUP
  // ==========================================================

  const toggleMode = () => {

    setIsLoginMode(
      !isLoginMode
    );

    setEmail('');

    setPassword('');

    setConfirmPassword('');

    setFullName('');

    setAlert(null);
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="min-h-screen bg-espresso flex items-center justify-center relative overflow-hidden animate-fade-in">

      {/* ======================================================
          ALERT
      ====================================================== */}

      {alert && (
        <LoginAlerts
          type={
            alert.type
          }
          message={
            alert.message
          }
          onClose={() =>
            setAlert(null)
          }
        />
      )}

      {/* ======================================================
          BACKGROUND
      ====================================================== */}

      <div className="absolute inset-0 z-0">

        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-golden-orange/5 rounded-full blur-[120px]" />

        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-golden-light/5 rounded-full blur-[120px]" />

      </div>

      {/* ======================================================
          MAIN CONTENT
      ====================================================== */}

      <div className="relative z-10 w-full max-w-md px-6 py-12">

        {/* ====================================================
            HEADER
        ==================================================== */}

        <div className="text-center mb-10">

          <div className="flex justify-center mb-6">

            <Diamond className="h-12 w-12 text-golden-orange" />

          </div>

          <h1 className="font-serif text-4xl text-cream mb-2">

            {isLoginMode
              ? 'Welcome Back'
              : 'Join Stylus'}

          </h1>

          <p className="text-golden-orange text-xs uppercase tracking-[0.2em]">

            {isLoginMode
              ? 'Enter the Inner Circle'
              : 'Create Your Account'}

          </p>

        </div>

        {/* ====================================================
            AUTH CARD
        ==================================================== */}

        <div className="bg-[#1f0c05]/80 backdrop-blur-md border border-white/10 p-8 shadow-2xl rounded-sm">

          {/* ==================================================
              ROLE SELECTOR
          ================================================== */}

          {!isLoginMode && (

            <div className="flex mb-6 bg-black/20 p-1 rounded">

              <button
                type="button"
                onClick={() =>
                  setSelectedRole(
                    'User'
                  )
                }
                className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded transition-all ${
                  selectedRole ===
                  'User'
                    ? 'bg-golden-orange text-espresso shadow-lg'
                    : 'text-cream/50 hover:text-white'
                }`}
              >

                <User size={14} />

                User

              </button>

              <button
                type="button"
                onClick={() =>
                  setSelectedRole(
                    'Partner'
                  )
                }
                className={`flex-1 py-2 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2 rounded transition-all ${
                  selectedRole ===
                  'Partner'
                    ? 'bg-golden-orange text-espresso shadow-lg'
                    : 'text-cream/50 hover:text-white'
                }`}
              >

                <Briefcase
                  size={14}
                />

                Partner

              </button>

            </div>
          )}

          {/* ==================================================
              FORM
          ================================================== */}

          <form
            onSubmit={
              handleAuth
            }
            className="space-y-6"
          >

            {/* =================================================
                FULL NAME
            ================================================= */}

            {!isLoginMode && (

              <div>

                <label className="block text-xs uppercase tracking-widest text-cream/50 mb-2">
                  Full Name
                </label>

                <input
                  type="text"
                  value={
                    fullName
                  }
                  onChange={e =>
                    setFullName(
                      e.target.value
                    )
                  }
                  className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                  required
                />

              </div>
            )}

            {/* =================================================
                EMAIL
            ================================================= */}

            <div>

              <label className="block text-xs uppercase tracking-widest text-cream/50 mb-2">
                Email Address
              </label>

              <input
                type="email"
                value={
                  email
                }
                onChange={e =>
                  setEmail(
                    e.target.value
                  )
                }
                className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                placeholder="email@example.com"
                required
              />

            </div>

            {/* =================================================
                PASSWORD
            ================================================= */}

            <div className="relative">

              <div className="flex justify-between mb-2">

                <label className="block text-xs uppercase tracking-widest text-cream/50">
                  Password
                </label>

              </div>

              <input
                type={
                  showPassword
                    ? 'text'
                    : 'password'
                }
                value={
                  password
                }
                onChange={e =>
                  setPassword(
                    e.target.value
                  )
                }
                className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                required
              />

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    !showPassword
                  )
                }
                className="absolute right-3 top-[34px] text-cream/30 hover:text-cream transition-colors"
              >

                {showPassword ? (
                  <EyeOff
                    size={16}
                  />
                ) : (
                  <Eye
                    size={16}
                  />
                )}

              </button>

            </div>

            {/* =================================================
                CONFIRM PASSWORD
            ================================================= */}

            {!isLoginMode && (

              <div>

                <label className="block text-xs uppercase tracking-widest text-cream/50 mb-2">
                  Confirm Password
                </label>

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  value={
                    confirmPassword
                  }
                  onChange={e =>
                    setConfirmPassword(
                      e.target.value
                    )
                  }
                  className="w-full bg-black/20 border border-white/10 text-cream px-4 py-3 focus:border-golden-orange outline-none transition-colors"
                  required
                />

              </div>
            )}

            {/* =================================================
                SUBMIT
            ================================================= */}

            <Button
              fullWidth
              disabled={
                isLoading
              }
              className="mt-4"
            >

              {isLoading ? (

                <span className="animate-pulse">
                  Processing...
                </span>

              ) : (

                <span className="flex items-center justify-center gap-2">

                  {isLoginMode
                    ? 'Sign In'
                    : selectedRole ===
                      'Partner'
                    ? 'Register Partner'
                    : 'Create Account'}

                  <ArrowRight
                    size={16}
                  />

                </span>

              )}

            </Button>

          </form>

        </div>

        {/* ====================================================
            TOGGLE
        ==================================================== */}

        <div className="text-center mt-8">

          <p className="text-cream/60 text-sm">

            {isLoginMode
              ? 'Not a member yet? '
              : 'Already have an account? '}

            <button
              type="button"
              onClick={
                toggleMode
              }
              className="text-golden-orange font-bold hover:text-white transition-colors border-b border-golden-orange hover:border-white pb-0.5"
            >

              {isLoginMode
                ? 'Request Access'
                : 'Log In'}

            </button>

          </p>

        </div>

      </div>

    </div>
  );
};

