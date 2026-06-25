import video from "../Modals/video.js";

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

  // Multer local file upload fallback
  if (req.file === undefined) {
    return res
      .status(404)
      .json({ message: "plz upload a mp4 video file only" });
  } else {
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
    } catch (error) {
      console.error(" error:", error);
      return res.status(500).json({ message: "Something went wrong" });
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
