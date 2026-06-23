import ChannelHeader from "@/components/ChannelHeader";
import Channeltabs from "@/components/Channeltabs";
import ChannelVideos from "@/components/ChannelVideos";
import VideoUploader from "@/components/VideoUploader";
import { useUser } from "@/lib/AuthContext";
import { notFound } from "next/navigation";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";
import axiosInstance from "@/lib/axiosinstance";

const index = () => {
  const router = useRouter();
  const { id } = router.query;
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("videos");
  const [downloadedVideos, setDownloadedVideos] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "downloads" && user) {
      axiosInstance.get(`/payment/downloads/${user._id}`)
        .then((res) => {
          const mapped = res.data.map((d: any) => d.videoId).filter(Boolean);
          setDownloadedVideos(mapped);
        })
        .catch((err) => console.log("Error fetching downloads:", err));
    }
  }, [activeTab, user]);

  try {
    let channel = user;
   
    const videos = [
      {
        _id: "1",
        videotitle: "Amazing Nature Documentary",
        filename: "nature-doc.mp4",
        filetype: "video/mp4",
        filepath: "/videos/nature-doc.mp4",
        filesize: "500MB",
        videochanel: "Nature Channel",
        Like: 1250,
        views: 45000,
        uploader: "nature_lover",
        createdAt: new Date().toISOString(),
      },
      {
        _id: "2",
        videotitle: "Cooking Tutorial: Perfect Pasta",
        filename: "pasta-tutorial.mp4",
        filetype: "video/mp4",
        filepath: "/videos/pasta-tutorial.mp4",
        filesize: "300MB",
        videochanel: "Chef's Kitchen",
        Like: 890,
        views: 23000,
        uploader: "chef_master",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];

    return (
      <div className="flex-1 min-h-screen bg-white dark:bg-neutral-900 dark:text-white">
        <div className="max-w-full mx-auto">
          <ChannelHeader channel={channel} user={user} />
          <Channeltabs activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === "videos" && (
            <div className="px-4 pb-8">
              <VideoUploader channelId={id} channelName={channel?.channelname} />
            </div>
          )}
          <div className="px-4 pb-8 mt-4">
            {activeTab === "downloads" ? (
              <div>
                <h2 className="text-xl font-semibold mb-4">Downloaded Videos</h2>
                <ChannelVideos videos={downloadedVideos} />
              </div>
            ) : (
              <ChannelVideos videos={videos} />
            )}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error fetching channel data:", error);
  }
};

export default index;
