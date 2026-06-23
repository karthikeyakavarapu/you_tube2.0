import React, { useState, useRef, useEffect } from "react";
import { useUser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Video, VideoOff, Mic, MicOff, Monitor, Radio, Square, PhoneCall, PhoneOff, Download } from "lucide-react";

export default function VoIP() {
  const { user } = useUser();
  const [friend, setFriend] = useState("Alex");
  const [callState, setCallState] = useState<"idle" | "calling" | "active">("idle");
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSharingScreen, setIsSharingScreen] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const screenVideoRef = useRef<HTMLVideoElement>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunks = useRef<Blob[]>([]);

  // Cleanup streams on unmount
  useEffect(() => {
    return () => {
      stopStreams();
    };
  }, []);

  const stopStreams = () => {
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
  };

  const startCall = async () => {
    if (!user) {
      toast.error("Please sign in to make calls!");
      return;
    }
    setCallState("calling");
    toast.info(`Calling ${friend}...`);

    try {
      // Access camera and microphone
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Simulate connection delay
      setTimeout(() => {
        setCallState("active");
        toast.success(`Connected with ${friend}!`);
      }, 2000);

    } catch (err) {
      console.error(err);
      toast.error("Could not access camera/microphone.");
      setCallState("idle");
    }
  };

  const endCall = () => {
    stopStreams();
    if (isRecording) {
      stopRecording();
    }
    setCallState("idle");
    setIsSharingScreen(false);
    toast.error("Call ended.");
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      toast.info(isMuted ? "Microphone active" : "Microphone muted");
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach((track) => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
      toast.info(isVideoOff ? "Camera active" : "Camera turned off");
    }
  };

  const toggleScreenShare = async () => {
    if (isSharingScreen) {
      if (screenStream) {
        screenStream.getTracks().forEach((track) => track.stop());
        setScreenStream(null);
      }
      setIsSharingScreen(false);
      toast.info("Stopped sharing screen.");
    } else {
      try {
        toast.info("Select the YouTube tab or window to share...");
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        setScreenStream(stream);
        setIsSharingScreen(true);
        
        if (screenVideoRef.current) {
          screenVideoRef.current.srcObject = stream;
        }

        // When sharing ends from the browser's own UI
        stream.getVideoTracks()[0].onended = () => {
          setIsSharingScreen(false);
          setScreenStream(null);
          toast.info("Stopped sharing screen.");
        };
      } catch (err) {
        console.error(err);
        toast.error("Screen share canceled.");
      }
    }
  };

  const startRecording = () => {
    const streamToRecord = screenStream || localStream;
    if (!streamToRecord) {
      toast.error("No active stream to record.");
      return;
    }

    recordedChunks.current = [];
    try {
      const options = { mimeType: "video/webm;codecs=vp9" };
      let mediaRecorder;
      try {
        mediaRecorder = new MediaRecorder(streamToRecord, options);
      } catch (e) {
        mediaRecorder = new MediaRecorder(streamToRecord);
      }

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunks.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `YourTube_VoIP_Call_${Date.now()}.webm`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Recording saved locally!");
      };

      mediaRecorder.start(1000); // chunk every second
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      toast.success("Call recording started.");
    } catch (err) {
      console.error(err);
      toast.error("Failed to start recording.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.info("Recording stopped.");
    }
  };

  return (
    <div className="flex-1 min-h-screen bg-gray-50 dark:bg-neutral-900 p-6 transition-colors duration-300">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center border-b dark:border-neutral-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">VoIP Calling & Media Share</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Make video calls, share screen views of YouTube, and record call sessions locally.
            </p>
          </div>

          {callState === "idle" && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Call Friend:</label>
              <select
                value={friend}
                onChange={(e) => setFriend(e.target.value)}
                className="bg-white dark:bg-neutral-850 border dark:border-neutral-800 rounded px-2 py-1 text-sm dark:text-white focus:outline-none"
              >
                <option value="Alex">Alex</option>
                <option value="Emma">Emma</option>
                <option value="Sarah">Sarah</option>
                <option value="Liam">Liam</option>
              </select>
              <Button onClick={startCall} className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-xs">
                <PhoneCall className="w-4 h-4" /> Start Call
              </Button>
            </div>
          )}

          {callState !== "idle" && (
            <Button onClick={endCall} className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 text-xs">
              <PhoneOff className="w-4 h-4" /> End Call
            </Button>
          )}
        </div>

        {callState === "idle" && (
          <div className="bg-white dark:bg-neutral-850 border dark:border-neutral-800 p-12 rounded-xl text-center shadow-sm">
            <span className="text-5xl block mb-4">📞</span>
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Start a Call</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mt-2">
              Select one of your friends from the dropdown above and initiate a video call to discuss videos and share screens.
            </p>
          </div>
        )}

        {callState === "calling" && (
          <div className="bg-white dark:bg-neutral-850 border dark:border-neutral-800 p-16 rounded-xl text-center shadow-sm flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-full border-4 border-t-red-600 border-gray-200 animate-spin" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white animate-pulse">Calling {friend}...</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">Waiting for response...</p>
          </div>
        )}

        {callState === "active" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Main call grid */}
            <div className="lg:col-span-2 space-y-4">
              
              {/* Video Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Local Video */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-red-500 shadow-lg">
                  <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover transform -scale-x-100" />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    You (Webcam)
                  </span>
                </div>

                {/* Simulated Remote Friend Video (loops back or plays mock placeholder) */}
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border dark:border-neutral-800 shadow-lg">
                  <video 
                    ref={remoteVideoRef} 
                    autoPlay 
                    playsInline 
                    loop 
                    muted 
                    src="https://assets.mixkit.co/videos/preview/mixkit-man-holding-videocall-on-smartphone-in-office-40893-large.mp4" 
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                    {friend}
                  </span>
                </div>
              </div>

              {/* Screen Share Window */}
              {isSharingScreen && (
                <div className="relative aspect-video bg-black rounded-xl overflow-hidden border-2 border-dashed border-blue-500 shadow-2xl animate-in slide-in-from-bottom">
                  <video ref={screenVideoRef} autoPlay playsInline className="w-full h-full object-contain" />
                  <span className="absolute bottom-2 left-2 bg-blue-600 text-white text-xs px-3 py-1 rounded font-semibold flex items-center gap-1.5 shadow">
                    <Monitor className="w-3.5 h-3.5 animate-pulse" /> Sharing YouTube Window
                  </span>
                </div>
              )}
            </div>

            {/* Controls sidebar panel */}
            <div className="bg-white dark:bg-neutral-850 border dark:border-neutral-800 p-6 rounded-xl shadow-sm space-y-6">
              <h3 className="font-bold text-gray-800 dark:text-white border-b dark:border-neutral-800 pb-2">
                Call Management
              </h3>

              {/* Stream toggles */}
              <div className="space-y-3">
                <Button 
                  onClick={toggleMute} 
                  variant="outline" 
                  className={`w-full justify-start text-xs ${isMuted ? "bg-red-50 border-red-200 text-red-600" : ""}`}
                >
                  {isMuted ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
                  {isMuted ? "Unmute Mic" : "Mute Mic"}
                </Button>
                <Button 
                  onClick={toggleVideo} 
                  variant="outline" 
                  className={`w-full justify-start text-xs ${isVideoOff ? "bg-red-50 border-red-200 text-red-600" : ""}`}
                >
                  {isVideoOff ? <VideoOff className="w-4 h-4 mr-2" /> : <Video className="w-4 h-4 mr-2" />}
                  {isVideoOff ? "Turn Video On" : "Turn Video Off"}
                </Button>
                <Button 
                  onClick={toggleScreenShare} 
                  variant="outline" 
                  className={`w-full justify-start text-xs ${isSharingScreen ? "bg-blue-50 border-blue-200 text-blue-600" : ""}`}
                >
                  <Monitor className="w-4 h-4 mr-2" />
                  {isSharingScreen ? "Stop Screen Share" : "Share YouTube Tab"}
                </Button>
              </div>

              {/* Call recording widget */}
              <div className="border-t dark:border-neutral-800 pt-4 space-y-4">
                <h4 className="text-xs font-semibold uppercase text-gray-400">Recording Panel</h4>
                
                {isRecording && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                    <span className="text-xs text-red-700 dark:text-red-300 font-medium animate-pulse">
                      Recording Stream Session...
                    </span>
                  </div>
                )}

                {!isRecording ? (
                  <Button 
                    onClick={startRecording} 
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-xs flex items-center justify-center gap-2"
                  >
                    <Radio className="w-4 h-4 animate-pulse" /> Start Recording
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording} 
                    className="w-full bg-neutral-900 hover:bg-black text-white text-xs flex items-center justify-center gap-2"
                  >
                    <Square className="w-4 h-4" /> Stop & Download
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
