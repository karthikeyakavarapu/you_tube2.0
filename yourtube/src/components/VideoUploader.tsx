import { Check, FileVideo, Upload, X } from "lucide-react";
import React, { ChangeEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Progress } from "./ui/progress";
import axiosInstance from "@/lib/axiosinstance";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";

const VideoUploader = ({ channelId, channelName }: any) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadTaskRef = useRef<any>(null);

  const handlefilechange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (!file.type.startsWith("video/")) {
        toast.error("Please upload a valid video file.");
        return;
      }
      if (file.size > 100 * 1024 * 1024) {
        toast.error("File size exceeds 100MB limit.");
        return;
      }
      setVideoFile(file);
      const filename = file.name;
      if (!videoTitle) {
        setVideoTitle(filename);
      }
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setVideoTitle("");
    setIsUploading(false);
    setUploadProgress(0);
    setUploadComplete(false);
    uploadTaskRef.current = null;
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const cancelUpload = () => {
    if (uploadTaskRef.current) {
      uploadTaskRef.current.cancel();
      toast.error("Your video upload has been cancelled");
      resetForm();
    } else {
      resetForm();
    }
  };

  const uploadToBackend = async () => {
    if (!videoFile) return;
    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle);
    formdata.append("videochanel", channelName);
    formdata.append("uploader", channelId);

    try {
      setIsUploading(true);
      setUploadProgress(0);
      await axiosInstance.post("/video/upload", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(progress);
        },
      });
      toast.success("Upload successfully (via backup host)");
      setUploadComplete(true);
      setTimeout(() => {
        resetForm();
      }, 1200);
    } catch (error) {
      console.error("Backend fallback upload error:", error);
      toast.error("There was an error uploading your video. Please try again.");
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(0);

      let firebaseHangingTimeout: NodeJS.Timeout | null = null;
      let hasStartedTransfer = false;

      // Create unique path in Firebase storage bucket
      const fileRef = ref(storage, `videos/${Date.now()}-${videoFile.name}`);
      const uploadTask = uploadBytesResumable(fileRef, videoFile);
      uploadTaskRef.current = uploadTask;

      // Fall back if Firebase hangs for 6 seconds without transferring any bytes
      firebaseHangingTimeout = setTimeout(() => {
        if (!hasStartedTransfer) {
          console.warn("Firebase upload connection hanging. Switching to backend upload...");
          uploadTask.cancel();
          toast.error("Firebase Storage connection timed out! Please ensure Firebase Storage is activated/created in your Firebase Console.");
          toast.info("Switching to backup upload server...");
          uploadToBackend();
        }
      }, 6000);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          if (snapshot.bytesTransferred > 0) {
            hasStartedTransfer = true;
            if (firebaseHangingTimeout) {
              clearTimeout(firebaseHangingTimeout);
              firebaseHangingTimeout = null;
            }
          }
          const progress = Math.round(
            (snapshot.bytesTransferred / snapshot.totalBytes) * 100
          );
          setUploadProgress(progress);
        },
        (error) => {
          if (firebaseHangingTimeout) {
            clearTimeout(firebaseHangingTimeout);
          }
          // If cancelled due to timeout switch, ignore generic error toast
          if (error.code === "storage/canceled" && !hasStartedTransfer) {
            return;
          }
          if (error.code === "storage/canceled") {
            return;
          }
          console.error("Firebase upload error:", error);
          toast.error(`Firebase Storage error: ${error.message} (${error.code})`);
          console.warn("Firebase failed. Falling back to backend Multer upload...");
          uploadToBackend();
        },
        async () => {
          if (firebaseHangingTimeout) {
            clearTimeout(firebaseHangingTimeout);
          }
          try {
            // Get permanent URL on successful upload
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);

            // Register with backend database
            await axiosInstance.post("/video/upload", {
              videotitle: videoTitle,
              filename: videoFile.name,
              filepath: downloadURL,
              filetype: videoFile.type,
              filesize: videoFile.size,
              videochanel: channelName,
              uploader: channelId,
            });

            toast.success("Upload successfully");
            setUploadComplete(true);
            setTimeout(() => {
              resetForm();
            }, 1200);
          } catch (backendError) {
            console.error("Backend registration error:", backendError);
            toast.error("Could not register video with backend. Trying fallback...");
            uploadToBackend();
          } finally {
            setIsUploading(false);
          }
        }
      );
    } catch (error) {
      console.error("Upload preparation error:", error);
      uploadToBackend();
    }
  };
  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Upload a video</h2>

      <div className="space-y-4">
        {!videoFile ? (
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <p className="text-lg font-medium">
              Drag and drop video files to upload
            </p>
            <p className="text-sm text-gray-500 mt-1">
              or click to select files
            </p>
            <p className="text-xs text-gray-400 mt-4">
              MP4, WebM, MOV or AVI • Up to 100MB
            </p>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="video/*"
              onChange={handlefilechange}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-white rounded-lg border">
              <div className="bg-blue-100 p-2 rounded-md">
                <FileVideo className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{videoFile.name}</p>
                <p className="text-sm text-gray-500">
                  {(videoFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon" onClick={cancelUpload}>
                  <X className="w-5 h-5" />
                </Button>
              )}
              {uploadComplete && (
                <div className="bg-green-100 p-1 rounded-full">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="title">Title (required)</Label>
                <Input
                  id="title"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  placeholder="Add a title that describes your video"
                  disabled={isUploading || uploadComplete}
                  className="mt-1"
                />
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="flex justify-end gap-3">
              {!uploadComplete && (
                <>
                  <Button onClick={cancelUpload} disabled={uploadComplete}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleUpload}
                    disabled={
                      isUploading || !videoTitle.trim() || uploadComplete
                    }
                  >
                    {isUploading ? "Uploading..." : "Upload"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoUploader;
