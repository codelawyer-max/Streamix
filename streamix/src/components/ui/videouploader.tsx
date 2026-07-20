import React, { useState, useRef, ChangeEvent } from "react";
import { UploadCloud, X, FileVideo, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import axiosInstance from "@/lib/AxiosInstance";

interface VideoUploaderProps {
  channelId: string | string[] | undefined;
  channelName: string;
}

export default function VideoUploader({ channelId, channelName }: VideoUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoTitle, setVideoTitle] = useState("");
  const [uploadComplete, setUploadComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleResetForm = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setVideoFile(null);
    setVideoTitle("");
    setUploadComplete(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCancelUpload = () => {
    setIsUploading(false);
    setUploadProgress(0);
    setVideoFile(null);
    setError("Upload canceled by user.");
    toast.error("Your video upload has been cancelled");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const processFile = (file: File) => {
    setError(null);

    // Validate file type
    if (!file.type.startsWith("video/")) {
      setError("Please upload a valid video file.");
      toast.error("Please upload a valid video file.");
      return;
    }

    // Validate file size (100MB limit matching the trainer's backend filter)
    const maxSizeInBytes = 100 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      setError("Video size must be less than 100MB.");
      toast.error("File size exceeds 100MB limit.");
      return;
    }

    setVideoFile(file);
    // Auto-populate title field with file name minus extension
    setVideoTitle(file.name.replace(/\.[^/.]+$/, ""));
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!videoFile || !videoTitle.trim()) {
      toast.error("Please provide file and title");
      return;
    }

    // Create formal payload matching backend expected keys
    const formdata = new FormData();
    formdata.append("file", videoFile);
    formdata.append("videotitle", videoTitle);
    formdata.append("videochannel", channelName);
    formdata.append("uploader", channelId as string);

    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Network POST call leveraging the trainer's backend logic
      await axiosInstance.post("/video/upload", formdata, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent: any) => {
          const total = progressEvent.total || progressEvent.target?.response?.length;
          if (total) {
            const progress = Math.round((progressEvent.loaded * 100) / total);
            setUploadProgress(progress);
          }
        },
      });

      toast.success("Upload successfully");
      setUploadComplete(true);
    } catch (err: any) {
      console.error("Error uploading video:", err);
      toast.error("There was an error uploading your video. Please try again.");
      setError("An error occurred during upload. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex flex-col gap-1 mb-4">
        <h2 className="text-lg font-bold text-gray-900">Upload Creator Studio</h2>
        <p className="text-xs text-gray-500">Publishing directly to {channelName}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      {/* State 1: Fresh Upload Target Area */}
      {!videoFile && !uploadComplete && (
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="w-full border-2 border-dashed border-gray-200 hover:border-gray-400 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-all duration-200 bg-gray-50 hover:bg-gray-100/50"
        >
          <div className="p-4 bg-white rounded-full shadow-sm text-gray-600">
            <UploadCloud className="h-7 w-7" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-gray-800">Drag and drop video files to upload</p>
            <p className="text-xs text-gray-500 mt-1">or click to browse local storage files</p>
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Supported formats: MP4, WebM, MOV, or AVI (Max 100MB)
          </p>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            accept="video/*"
            className="hidden"
          />
        </div>
      )}

      {/* State 2: Selected Video Details View & Live Upload Tracker */}
      {videoFile && !uploadComplete && (
        <form onSubmit={handleUpload} className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-100 rounded-xl">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
              <FileVideo className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">{videoFile.name}</p>
              <p className="text-[10px] text-gray-400">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            {!isUploading && (
              <button
                type="button"
                onClick={handleCancelUpload}
                className="p-1 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-700">Video Title (Required)</label>
            <input
              type="text"
              required
              disabled={isUploading}
              value={videoTitle}
              onChange={(e) => setVideoTitle(e.target.value)}
              placeholder="Add a title that describes your video"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 disabled:opacity-50"
            />
          </div>

          {isUploading && (
            <div className="space-y-1.5">
              <div className="flex justify-between text-[11px] text-gray-500 font-medium">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 rounded-full transition-all duration-150"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={handleCancelUpload}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50 rounded-xl border border-gray-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUploading || !videoTitle.trim()}
              className="px-4 py-2 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl disabled:opacity-50 transition-colors shadow-sm"
            >
              {isUploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      )}

      {/* State 3: Successful upload screen */}
      {uploadComplete && (
        <div className="flex flex-col items-center justify-center py-6 text-center gap-3">
          <div className="text-green-500 p-2 bg-green-50 rounded-full">
            <CheckCircle2 className="h-10 w-10" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Upload Completed!</h3>
            <p className="text-xs text-gray-500 mt-0.5">Your video is now live on your channel.</p>
          </div>
          <button
            type="button"
            onClick={handleResetForm}
            className="mt-2 px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
          >
            Upload Another Video
          </button>
        </div>
      )}
    </div>
  );
}