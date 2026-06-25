import video from "../Modals/video.js";
import fs from "fs";

export const uploadvideo = async (req, res) => {
  // Support direct Firebase URL upload
  if (req.body.filepath) {
    try {
      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.body.filename || "video.mp4",
        filepath: req.body.filepath,
        filetype: req.body.filetype || "video/mp4",
        filesize: req.body.filesize || 0,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error("Error creating video with URL:", error);
      return res.status(500).json({ message: "Something went wrong" });
    }
  }

  // Multer local file upload fallback (will forward to permanent Catbox host)
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
    try {
      console.log("Local file received. Uploading to permanent Catbox storage...");
      
      const fileBuffer = fs.readFileSync(req.file.path);
      const fileBlob = new Blob([fileBuffer], { type: req.file.mimetype });
      
      const formData = new FormData();
      formData.append("reqtype", "fileupload");
      formData.append("fileToUpload", fileBlob, req.file.originalname);
      
      const catboxResponse = await fetch("https://catbox.moe/user/api.php", {
        method: "POST",
        body: formData,
      });
      
      if (!catboxResponse.ok) {
        throw new Error(`Catbox upload failed: ${catboxResponse.statusText}`);
      }
      
      const permanentUrl = await catboxResponse.text();
      console.log("Successfully uploaded to Catbox. Permanent URL is:", permanentUrl);
      
      // Clean up the temporary file on Vercel/local disk
      try {
        fs.unlinkSync(req.file.path);
      } catch (err) {
        console.error("Failed to delete temp file:", err);
      }

      const file = new video({
        videotitle: req.body.videotitle,
        filename: req.file.originalname,
        filepath: permanentUrl, // Store the permanent URL!
        filetype: req.file.mimetype,
        filesize: req.file.size,
        videochanel: req.body.videochanel,
        uploader: req.body.uploader,
      });
      
      await file.save();
      return res.status(201).json("file uploaded successfully");
    } catch (error) {
      console.error("Catbox fallback upload error:", error);
      
      // If Catbox fails, fallback to local Vercel /tmp path (so it doesn't fail the request)
      try {
        const file = new video({
          videotitle: req.body.videotitle,
          filename: req.file.originalname,
          filepath: `uploads/${req.file.filename}`,
          filetype: req.file.mimetype,
          filesize: req.file.size,
          videochanel: req.body.videochanel,
          uploader: req.body.uploader,
        });
        await file.save();
        return res.status(201).json("file uploaded successfully");
      } catch (fallbackError) {
        console.error("Local fallback failed:", fallbackError);
        return res.status(500).json({ message: "Something went wrong" });
      }
    }
  }
};
export const getallvideo = async (req, res) => {
  try {
    const files = await video.find();
    return res.status(200).send(files);
  } catch (error) {
    console.error(" error:", error);
    return res.status(500).json({ message: "Something went wrong" });
  }
};
