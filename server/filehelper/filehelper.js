"use strict";
import multer from "multer";
import os from "os";
import fs from "fs";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = process.env.VERCEL ? os.tmpdir() : "uploads";
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      new Date().toISOString().replace(/:/g, "-") + "-" + file.originalname
    );
  },
});
const filefilter = (req, file, cb) => {
  if (file.mimetype === "video/mp4") {
    cb(null, true);
  } else {
    cb(null, false);
  }
};
const upload = multer({ storage: storage, fileFilter: filefilter });
export default upload;
