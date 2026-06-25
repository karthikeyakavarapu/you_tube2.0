"use client";

import { useRef, useEffect, useState } from "react";
import { useUser } from "@/lib/AuthContext";
import { toast } from "sonner";
import { useRouter } from "next/router";
import { Button } from "./ui/button";
import axiosInstance from "@/lib/axiosinstance";

interface VideoPlayerProps {
  video: {
    _id: string;
    videotitle: string;
    filepath: string;
  };
}

const planLimits: Record<string, number> = {
  "Free": 300, // 5 minutes in seconds
  "Bronze": 420, // 7 minutes in seconds
  "Silver": 600, // 10 minutes in seconds
  "Gold": Infinity,
};

export default function VideoPlayer({ video }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const router = useRouter();
  const { user, login } = useUser();

  const [isPlaying, setIsPlaying] = useState(false);
  const [limitReached, setLimitReached] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [cumulativeWatchTime, setCumulativeWatchTime] = useState(0);

  // Gesture click tracking
  const [clickCount, setClickCount] = useState(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  const userPlan = user?.plan || "Free";
  const currentLimit = planLimits[userPlan] || 300;

  // Load cumulative watch time from session
  useEffect(() => {
    const saved = sessionStorage.getItem("youtube_cumulative_watch_time");
    if (saved) {
      setCumulativeWatchTime(parseInt(saved));
    }
  }, []);

  // Reload video source when video changes
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.load();
    }
  }, [video]);

  // Timer interval to count play duration
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    
    if (isPlaying && !limitReached && currentLimit !== Infinity) {
      interval = setInterval(() => {
        setCumulativeWatchTime((prev) => {
          const nextVal = prev + 1;
          sessionStorage.setItem("youtube_cumulative_watch_time", nextVal.toString());
          
          if (nextVal >= currentLimit) {
            setLimitReached(true);
            if (videoRef.current) {
              videoRef.current.pause();
            }
            toast.warning(`Watch limit reached for ${userPlan} plan!`);
          }
          return nextVal;
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, limitReached, currentLimit, userPlan]);

  // Reset limitReached if plan changes
  useEffect(() => {
    if (cumulativeWatchTime < currentLimit) {
      setLimitReached(false);
    }
  }, [userPlan, cumulativeWatchTime, currentLimit]);

  const handlePlay = () => setIsPlaying(true);
  const handlePause = () => setIsPlaying(false);

  // Gesture Click Handler
  const handleGestureClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickWidth = rect.width;
    
    let position: "left" | "center" | "right" = "center";
    if (clickX < clickWidth * 0.35) {
      position = "left";
    } else if (clickX > clickWidth * 0.65) {
      position = "right";
    }

    setClickCount((prev) => {
      const nextCount = prev + 1;
      
      if (clickTimerRef.current) {
        clearTimeout(clickTimerRef.current);
      }
      
      clickTimerRef.current = setTimeout(() => {
        executeGestureAction(nextCount, position);
        setClickCount(0);
      }, 280); // 280ms threshold for double/triple tap detection
      
      return nextCount;
    });
  };

  const executeGestureAction = (count: number, position: "left" | "center" | "right") => {
    if (limitReached) return;

    if (count === 1) {
      // Single tap center -> Play/Pause
      if (position === "center") {
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      }
    } else if (count === 2) {
      // Double tap right -> Seek 10s forward
      if (position === "right") {
        if (videoRef.current) {
          videoRef.current.currentTime += 10;
          toast.success("⏩ Skip 10s Forward");
        }
      }
      // Double tap left -> Seek 10s backward
      if (position === "left") {
        if (videoRef.current) {
          videoRef.current.currentTime -= 10;
          toast.success("⏪ Skip 10s Backward");
        }
      }
    } else if (count === 3) {
      // Triple tap center -> Skip to next video
      if (position === "center") {
        toast.info("⏭️ Skipping to next video...");
        router.push("/");
      }
      // Triple tap right -> Close website (Redirect to google)
      if (position === "right") {
        toast.error("🚪 Closing website...");
        setTimeout(() => {
          window.location.href = "https://www.google.com";
        }, 800);
      }
      // Triple tap left -> Open comment section
      if (position === "left") {
        toast.info("💬 Scrolling to comment section...");
        const commentSec = document.getElementById("comments-section");
        if (commentSec) {
          commentSec.scrollIntoView({ behavior: "smooth" });
        }
      }
    }
  };

  const handleUpgradeFromPlayer = async (planName: string, amount: number) => {
    if (!user) {
      toast.error("Please sign in to upgrade!");
      return;
    }
    try {
      const orderRes = await axiosInstance.post("/payment/order", { amount });
      const orderData = orderRes.data;

      const options = {
        key: "rzp_test_51234567890abcdef",
        amount: orderData.amount,
        currency: orderData.currency,
        name: "YourTube Premium",
        description: `Upgrade to ${planName} Plan`,
        order_id: orderData.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              planName,
              amount,
            });

            if (verifyRes.data.success) {
              toast.success(`Upgraded to ${planName} plan! invoice sent.`);
              login(verifyRes.data.user);
              setLimitReached(false);
              setShowUpgradeModal(false);
            }
          } catch (err) {
            console.error(err);
            toast.error("Payment verification failed.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#ea4335",
        },
      };

      if ((window as any).Razorpay) {
        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      } else {
        toast.info("Simulating payment checkout...");
        setTimeout(async () => {
          try {
            const verifyRes = await axiosInstance.post("/payment/verify", {
              razorpay_order_id: orderData.id,
              razorpay_payment_id: `pay_mock_${Date.now()}`,
              razorpay_signature: "mock_signature",
              userId: user._id,
              planName,
              amount,
            });

            if (verifyRes.data.success) {
              toast.success(`Upgraded to ${planName} plan! Invoice emailed.`);
              login(verifyRes.data.user);
              setLimitReached(false);
              setShowUpgradeModal(false);
            }
          } catch (err) {
            console.error(err);
            toast.error("Simulated verification failed.");
          }
        }, 1000);
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to initiate payment.");
    }
  };

  const getVideoSrc = () => {
    if (!video?.filepath) return "";
    const parts = video.filepath.split(/[/\\]/);
    const filename = parts[parts.length - 1];
    return `${axiosInstance.defaults.baseURL}/uploads/${filename}`;
  };

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden select-none">
      
      {/* Gesture Tap Detector overlay (covering top 85% area of player) */}
      {!limitReached && (
        <div 
          onClick={handleGestureClick}
          className="absolute inset-x-0 top-0 bottom-[55px] z-10 cursor-pointer"
        />
      )}

      {/* Watch limit blocker screen */}
      {limitReached && (
        <div className="absolute inset-0 bg-neutral-950/95 flex flex-col items-center justify-center p-4 text-center z-20 animate-in fade-in">
          <span className="text-4xl mb-2">🛑</span>
          <h3 className="text-red-500 font-bold text-lg mb-1">Watch Limit Reached</h3>
          <p className="text-xs text-gray-300 max-w-xs mb-4">
            You have exceeded your daily watch limit of {currentLimit / 60} minutes for the <strong>{userPlan}</strong> plan.
          </p>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                sessionStorage.setItem("youtube_cumulative_watch_time", "0");
                setCumulativeWatchTime(0);
                setLimitReached(false);
              }}
              variant="outline"
              className="text-xs text-black border-white bg-white hover:bg-gray-100"
            >
              Reset Session (Demo)
            </Button>
            <Button
              onClick={() => setShowUpgradeModal(true)}
              className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold"
            >
              Upgrade Plan
            </Button>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        onPlay={handlePlay}
        onPause={handlePause}
        poster={`/placeholder.svg?height=480&width=854`}
      >
        <source
          src={getVideoSrc()}
          type="video/mp4"
        />
        Your browser does not support the video tag.
      </video>

      {/* Subscription Upgrade Modal Inside Player */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-neutral-900 border border-gray-200 dark:border-neutral-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-3">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Upgrade Subscription Plan</h2>
              <button
                onClick={() => setShowUpgradeModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xl font-semibold focus:outline-none"
              >
                &times;
              </button>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upgrade to a premium plan to watch videos longer and get unlimited video downloads!
            </p>
            
            <div className="space-y-4">
              {/* Bronze Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Bronze Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Allows 7 minutes watch time</p>
                </div>
                <Button onClick={() => handleUpgradeFromPlayer("Bronze", 10)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                  Pay ₹10
                </Button>
              </div>

              {/* Silver Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Silver Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Allows 10 minutes watch time</p>
                </div>
                <Button onClick={() => handleUpgradeFromPlayer("Silver", 50)} className="bg-slate-400 hover:bg-slate-500 text-white text-xs">
                  Pay ₹50
                </Button>
              </div>

              {/* Gold Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Gold Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unlimited watch time & downloads</p>
                </div>
                <Button onClick={() => handleUpgradeFromPlayer("Gold", 100)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
                  Pay ₹100
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
