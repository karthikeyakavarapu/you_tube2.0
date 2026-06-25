import React, { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Button } from "./ui/button";
import {
  Clock,
  Download,
  MoreHorizontal,
  Share,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import { toast } from "sonner";

const VideoInfo = ({ video }: any) => {
  const [likes, setlikes] = useState(video.Like || 0);
  const [dislikes, setDislikes] = useState(video.Dislike || 0);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showFullDescription, setShowFullDescription] = useState(false);
  const { user, login } = useUser();
  const [isWatchLater, setIsWatchLater] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  useEffect(() => {
    setlikes(video.Like || 0);
    setDislikes(video.Dislike || 0);
    setIsLiked(false);
    setIsDisliked(false);
  }, [video]);

  useEffect(() => {
    const handleviews = async () => {
      if (user) {
        try {
          return await axiosInstance.post(`/history/${video._id}`, {
            userId: user?._id,
          });
        } catch (error) {
          return console.log(error);
        }
      } else {
        return await axiosInstance.post(`/history/views/${video?._id}`);
      }
    };
    handleviews();
  }, [user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.liked) {
        if (isLiked) {
          setlikes((prev: any) => prev - 1);
          setIsLiked(false);
        } else {
          setlikes((prev: any) => prev + 1);
          setIsLiked(true);
          if (isDisliked) {
            setDislikes((prev: any) => prev - 1);
            setIsDisliked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleWatchLater = async () => {
    try {
      const res = await axiosInstance.post(`/watch/${video._id}`, {
        userId: user?._id,
      });
      if (res.data.watchlater) {
        setIsWatchLater(!isWatchLater);
      } else {
        setIsWatchLater(false);
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDislike = async () => {
    if (!user) return;
    try {
      const res = await axiosInstance.post(`/like/${video._id}`, {
        userId: user?._id,
      });
      if (!res.data.liked) {
        if (isDisliked) {
          setDislikes((prev: any) => prev - 1);
          setIsDisliked(false);
        } else {
          setDislikes((prev: any) => prev + 1);
          setIsDisliked(true);
          if (isLiked) {
            setlikes((prev: any) => prev - 1);
            setIsLiked(false);
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const handleDownload = async () => {
    if (!user) {
      toast.error("Please sign in to download videos!");
      return;
    }

    try {
      // Record and check limits in backend
      const res = await axiosInstance.post("/payment/download", {
        userId: user._id,
        videoId: video._id,
      });

      if (res.data.success) {
        toast.success("Download started!");

        const parts = video.filepath.split(/[/\\]/);
        const filename = parts[parts.length - 1];
        const downloadUrl = (video.filepath.startsWith("http://") || video.filepath.startsWith("https://"))
          ? video.filepath
          : `${axiosInstance.defaults.baseURL}/uploads/${filename}`;

        try {
          const response = await fetch(downloadUrl);
          if (!response.ok) throw new Error("Fetch failed");
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = `${video.videotitle || "video"}.mp4`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
        } catch (fetchErr) {
          console.warn("CORS fetch blocked, falling back to direct tab download:", fetchErr);
          const a = document.createElement("a");
          a.href = downloadUrl;
          a.target = "_blank";
          a.download = `${video.videotitle || "video"}.mp4`;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }
    } catch (error: any) {
      if (error.response?.data?.limitReached) {
        toast.error(error.response.data.message);
        setShowUpgradeModal(true);
      } else {
        console.error(error);
        toast.error("Download failed. Make sure server is running.");
      }
    }
  };

  const handleUpgrade = async (planName: string, amount: number) => {
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
              toast.success(`Upgraded to ${planName} plan! Invoice emailed.`);
              login(verifyRes.data.user);
              setShowUpgradeModal(false);
            }
          } catch (err) {
            console.error("Verification failed:", err);
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
        // Fallback simulated payment checkout for testing without Razorpay SDK script
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
              setShowUpgradeModal(false);
            }
          } catch (err) {
            console.error(err);
            toast.error("Simulated verification failed.");
          }
        }, 1000);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate payment.");
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{video.videotitle}</h1>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Avatar className="w-10 h-10">
            <AvatarFallback>{video.videochanel[0]}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{video.videochanel}</h3>
            <p className="text-sm text-gray-600">1.2M subscribers</p>
          </div>
          <Button className="ml-4">Subscribe</Button>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-100 dark:bg-neutral-800 rounded-full">
            <Button
              variant="ghost"
              size="sm"
              className="rounded-l-full text-gray-700 dark:text-neutral-200"
              onClick={handleLike}
            >
              <ThumbsUp
                className={`w-5 h-5 mr-2 ${
                  isLiked ? "fill-black text-black dark:fill-white dark:text-white" : ""
                }`}
              />
              {likes.toLocaleString()}
            </Button>
            <div className="w-px h-6 bg-gray-300 dark:bg-neutral-700" />
            <Button
              variant="ghost"
              size="sm"
              className="rounded-r-full text-gray-700 dark:text-neutral-200"
              onClick={handleDislike}
            >
              <ThumbsDown
                className={`w-5 h-5 mr-2 ${
                  isDisliked ? "fill-black text-black dark:fill-white dark:text-white" : ""
                }`}
              />
              {dislikes.toLocaleString()}
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={`bg-gray-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-full ${
              isWatchLater ? "text-primary" : ""
            }`}
            onClick={handleWatchLater}
          >
            <Clock className="w-5 h-5 mr-2" />
            {isWatchLater ? "Saved" : "Watch Later"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-full"
          >
            <Share className="w-5 h-5 mr-2" />
            Share
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="bg-gray-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-full"
            onClick={handleDownload}
          >
            <Download className="w-5 h-5 mr-2" />
            Download
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-100 dark:bg-neutral-800 dark:text-neutral-200 rounded-full"
            onClick={() => setShowUpgradeModal(true)}
            title="Upgrade Plan / Premium options"
          >
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="bg-gray-100 dark:bg-neutral-800 rounded-lg p-4">
        <div className="flex gap-4 text-sm font-medium mb-2 text-gray-700 dark:text-neutral-200">
          <span>{video.views.toLocaleString()} views</span>
          <span>{formatDistanceToNow(new Date(video.createdAt))} ago</span>
          {user && (
            <span className="text-red-500 font-semibold uppercase">
              Plan: {user.plan || "Free"}
            </span>
          )}
        </div>
        <div className={`text-sm text-gray-800 dark:text-neutral-200 ${showFullDescription ? "" : "line-clamp-3"}`}>
          <p>
            Sample video description. This would contain the actual video
            description from the database.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 p-0 h-auto font-medium text-gray-600 dark:text-neutral-400"
          onClick={() => setShowFullDescription(!showFullDescription)}
        >
          {showFullDescription ? "Show less" : "Show more"}
        </Button>
      </div>

      {/* Subscription Upgrade Modal */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
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
              Upgrade to a premium plan to increase video watch limits and unlock unlimited downloads!
            </p>
            
            <div className="space-y-4">
              {/* Bronze Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Bronze Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Allows 7 minutes watch time</p>
                </div>
                <Button onClick={() => handleUpgrade("Bronze", 10)} className="bg-amber-600 hover:bg-amber-700 text-white text-xs">
                  Pay ₹10
                </Button>
              </div>

              {/* Silver Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Silver Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Allows 10 minutes watch time</p>
                </div>
                <Button onClick={() => handleUpgrade("Silver", 50)} className="bg-slate-400 hover:bg-slate-500 text-white text-xs">
                  Pay ₹50
                </Button>
              </div>

              {/* Gold Plan */}
              <div className="flex justify-between items-center p-3 border dark:border-neutral-800 rounded-lg hover:bg-gray-50 dark:hover:bg-neutral-800/50 transition">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">Gold Plan</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Unlimited watch time & downloads</p>
                </div>
                <Button onClick={() => handleUpgrade("Gold", 100)} className="bg-yellow-500 hover:bg-yellow-600 text-white text-xs">
                  Pay ₹100
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoInfo;
