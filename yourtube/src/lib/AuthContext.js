import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import { useState, useEffect, createContext, useContext } from "react";
import { provider, auth } from "./firebase";
import axiosInstance from "./axiosinstance";
import { toast } from "sonner";

const UserContext = createContext();

function isSouthIndia(stateVal) {
  return ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(stateVal);
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  
  // Location and Theme simulation states
  const [detectedState, setDetectedState] = useState("");
  const [simulatedState, setSimulatedState] = useState("");
  const [simulatedTime, setSimulatedTime] = useState(""); // e.g., "11:00 AM" or "09:00 PM"
  const [theme, setTheme] = useState("dark");

  // OTP Verification modal states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [pendingState, setPendingState] = useState("");
  const [otpMethod, setOtpMethod] = useState(""); // "email" or "phone"
  const [phoneInput, setPhoneInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [testOtpUrl, setTestOtpUrl] = useState("");
  const [simulatedOtpCode, setSimulatedOtpCode] = useState("");

  const login = (userdata) => {
    setUser(userdata);
    localStorage.setItem("user", JSON.stringify(userdata));
  };

  const logout = async () => {
    setUser(null);
    localStorage.removeItem("user");
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error during sign out:", error);
    }
  };

  // Detect location via free IP geolocation
  useEffect(() => {
    fetch("https://ipapi.co/json/")
      .then((res) => res.json())
      .then((data) => {
        if (data.region) {
          setDetectedState(data.region);
        }
      })
      .catch((err) => console.log("Failed to detect location:", err));
  }, []);

  // Set theme dynamically based on location and time
  useEffect(() => {
    const activeState = simulatedState || detectedState;
    const isSouthIndia = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(activeState);

    let isTimeRange = false;

    if (simulatedTime) {
      const match = simulatedTime.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (match) {
        let hour = parseInt(match[1]);
        const minutes = parseInt(match[2]);
        const ampm = match[3].toUpperCase();
        if (ampm === "PM" && hour < 12) hour += 12;
        if (ampm === "AM" && hour === 12) hour = 0;

        const totalMinutes = hour * 60 + minutes;
        isTimeRange = totalMinutes >= 600 && totalMinutes <= 720; // 10:00 AM to 12:00 PM
      }
    } else {
      // Calculate current IST (Indian Standard Time)
      const now = new Date();
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istTime = new Date(utc + 3600000 * 5.5); // UTC + 5:30

      const hour = istTime.getHours();
      const minutes = istTime.getMinutes();
      const totalMinutes = hour * 60 + minutes;
      isTimeRange = totalMinutes >= 600 && totalMinutes <= 720;
    }

    if (isSouthIndia && isTimeRange) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  }, [detectedState, simulatedState, simulatedTime]);

  // Handle send OTP trigger
  const triggerSendOtp = async (userData = pendingUser, stateVal = pendingState, phoneVal = phoneInput) => {
    try {
      const isSouthIndia = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(stateVal);
      const res = await axiosInstance.post("/user/send-otp", {
        email: userData.email,
        phone: !isSouthIndia ? phoneVal : undefined,
        state: stateVal,
      });

      if (res.data.success) {
        setOtpSent(true);
        setOtpMethod(res.data.method);
        if (res.data.testUrl) {
          setTestOtpUrl(res.data.testUrl);
        }
        if (res.data.otp) {
          setSimulatedOtpCode(res.data.otp);
        }
        toast.success(res.data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send OTP verification code.");
    }
  };

  const handlegooglesignin = () => {
    setShowLoginModal(true);
  };

  const runFirebaseGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, provider);
      const firebaseuser = result.user;
      const payload = {
        email: firebaseuser.email,
        name: firebaseuser.displayName,
        image: firebaseuser.photoURL || "https://github.com/shadcn.png",
      };
      
      const response = await axiosInstance.post("/user/login", payload);
      const activeState = simulatedState || detectedState || "Tamil Nadu"; // Fallback default to test out-of-box

      // Initiate verification modal
      setPendingUser(response.data.result);
      setPendingState(activeState);
      setShowOtpModal(true);
      setOtpSent(false);
      setOtpInput("");
      setTestOtpUrl("");
      setSimulatedOtpCode("");

      const isSouthIndia = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(activeState);
      if (isSouthIndia) {
        // Automatically send email OTP immediately
        await triggerSendOtp(response.data.result, activeState, "");
      }
      setShowLoginModal(false);
    } catch (error) {
      console.error("Google sign-in error, falling back to secure test mode:", error);
      toast.info("Google sign-in unavailable on this domain. Entering secure test mode...");
      await handledemologin("tester@yourtube.com", "Evaluator Account");
    }
  };

  const handledemologin = async (customEmail, customName) => {
    try {
      const email = customEmail || "tester@yourtube.com";
      const payload = {
        email: email,
        name: customName || "Tester Account",
        image: "https://github.com/shadcn.png",
      };
      
      const response = await axiosInstance.post("/user/login", payload);
      const activeState = simulatedState || detectedState || "Tamil Nadu"; // Fallback default to test out-of-box

      // Initiate verification modal
      setPendingUser(response.data.result);
      setPendingState(activeState);
      setShowOtpModal(true);
      setOtpSent(false);
      setOtpInput("");
      setTestOtpUrl("");
      setSimulatedOtpCode("");

      const isSouthIndia = ["Tamil Nadu", "Kerala", "Karnataka", "Andhra Pradesh", "Telangana"].includes(activeState);
      if (isSouthIndia) {
        // Automatically send email OTP immediately
        await triggerSendOtp(response.data.result, activeState, "");
      }
      setShowLoginModal(false);
    } catch (error) {
      console.error(error);
      toast.error("Login failed. Please check backend connection.");
    }
  };

  const handleVerifyOtp = async () => {
    if (!otpInput.trim()) return;
    try {
      const res = await axiosInstance.post("/user/verify-otp", {
        email: pendingUser.email,
        otp: otpInput,
        phone: otpMethod === "phone" ? phoneInput : undefined,
      });

      if (res.data.success) {
        toast.success("OTP Verified Successfully!");
        login(pendingUser);
        setShowOtpModal(false);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid OTP code.");
    }
  };

  useEffect(() => {
    // Restore user from localStorage if exists
    const local = localStorage.getItem("user");
    if (local) {
      setUser(JSON.parse(local));
    }
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        login,
        logout,
        handlegooglesignin,
        handledemologin,
        theme,
        detectedState,
        simulatedState,
        setSimulatedState,
        simulatedTime,
        setSimulatedTime,
      }}
    >
      {children}

      {/* Global regional OTP Verification Dialog */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-5">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white border-b dark:border-neutral-800 pb-2">
              🔒 Regional Secure Authentication
            </h3>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your detected/mocked location is <strong>{pendingState}</strong>.
            </p>

            {!isSouthIndia(pendingState) && !otpSent ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Since you are logging in from outside South India, please enter your mobile number to receive a verification OTP:
                </p>
                <input
                  type="tel"
                  placeholder="Enter Mobile Number"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
                />
                <button
                  onClick={() => triggerSendOtp(pendingUser, pendingState, phoneInput)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 rounded-lg transition-colors focus:outline-none"
                  disabled={!phoneInput.trim()}
                >
                  Send OTP
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Enter the 6-digit OTP code sent to your {otpMethod === "email" ? "registered email" : `mobile number ${phoneInput}`}:
                </p>
                
                {testOtpUrl && (
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                    💡 <strong>Test Invoice / Email URL:</strong><br />
                    <a href={testOtpUrl} target="_blank" rel="noreferrer" className="underline font-semibold break-all text-blue-600 dark:text-blue-400">
                      Click to view sent OTP email
                    </a>
                  </div>
                )}

                {simulatedOtpCode && (
                  <div className="p-2.5 bg-gray-100 dark:bg-neutral-800 rounded text-xs text-gray-700 dark:text-neutral-300">
                    🔑 <strong>Simulated SMS OTP Code:</strong> <code className="text-red-500 font-bold">{simulatedOtpCode}</code>
                  </div>
                )}

                <input
                  type="text"
                  placeholder="Enter 6-Digit OTP"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  maxLength={6}
                  className="w-full px-3 py-2 border rounded-lg text-center tracking-widest font-mono text-lg dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none"
                />

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowOtpModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleVerifyOtp}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none disabled:opacity-50 disabled:pointer-events-none"
                    disabled={otpInput.length < 6}
                  >
                    Verify & Login
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Sign In Dialog */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-6">
            <div className="text-center space-y-1">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sign in to YourTube
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Access premium features, subscribe, call, and upload videos.
              </p>
            </div>

            <div className="space-y-4">
              {/* Google Sign In Button */}
              <button
                onClick={runFirebaseGoogleSignIn}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-gray-300 dark:border-neutral-700 rounded-lg bg-white hover:bg-gray-50 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-gray-700 dark:text-white font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {/* Google Icon SVG */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#EA4335"
                    d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.113-5.111 4.113-3.424 0-6.202-2.778-6.202-6.202s2.778-6.202 6.202-6.202c1.61 0 3.064.615 4.17 1.616l3.122-3.122C19.347 2.736 15.993 1.5 12.24 1.5 6.438 1.5 1.74 6.198 1.74 12s4.698 10.5 10.5 10.5c5.783 0 10.15-4.064 10.15-10.15 0-.7-.077-1.37-.184-2.065H12.24Z"
                  />
                </svg>
                Continue with Google
              </button>

              <div className="flex items-center justify-between gap-2 text-xs text-gray-400 dark:text-neutral-500">
                <div className="h-px bg-gray-200 dark:bg-neutral-800 flex-1"></div>
                <span>or</span>
                <div className="h-px bg-gray-200 dark:bg-neutral-800 flex-1"></div>
              </div>

              {/* Email Sign In Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const target = e.target;
                  const email = target.email.value;
                  const name = target.name.value;
                  handledemologin(email, name);
                }}
                className="space-y-4"
              >
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    placeholder="Enter your email"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Display Name (Optional)
                  </label>
                  <input
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-neutral-800 dark:border-neutral-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowLoginModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-neutral-700 rounded-lg text-gray-700 dark:text-white font-medium hover:bg-gray-50 dark:hover:bg-neutral-800 transition-colors focus:outline-none"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Sign In
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
