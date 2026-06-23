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

  const handlegooglesignin = async () => {
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
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Google sign-in failed. Try 'Demo Login' instead!");
    }
  };

  const handledemologin = async (customEmail) => {
    try {
      const email = customEmail || "tester@yourtube.com";
      const payload = {
        email: email,
        name: "Tester Account",
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
    } catch (error) {
      console.error(error);
      toast.error("Demo login failed. Please check backend connection.");
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
                <Button
                  onClick={() => triggerSendOtp(pendingUser, pendingState, phoneInput)}
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  disabled={!phoneInput.trim()}
                >
                  Send OTP
                </Button>
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
                  <Button
                    onClick={() => setShowOtpModal(false)}
                    variant="ghost"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleVerifyOtp}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    disabled={otpInput.length < 6}
                  >
                    Verify & Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
