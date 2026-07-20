import multer from "multer";
import fs from "fs";
import path from "path";

// Create uploads folder automatically if it doesn't exist
const uploadPath = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      new Date().toISOString().replace(/:/g, "-") +
      "-" +
      file.originalname;

    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("video/")) {
    cb(null, true);
  } else {
    cb(new Error("Only video files are allowed."), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
});

export default upload;