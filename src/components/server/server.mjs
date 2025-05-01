import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";

const app = express();
const PORT = 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // Add this to handle form data properly

const upload = multer({ storage: multer.memoryStorage() });

// OCR endpoint
app.post("/extract-text", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // OCR process
    const result = await Tesseract.recognize(
      req.file.buffer,        // The uploaded image buffer
      'eng',                  // Language: English
      { logger: m => console.log(m) } // Optional logger
    );

    res.json({ text: result.data.text });

  } catch (error) {
    console.error('OCR Error:', error);
    res.status(500).json({ error: "Failed to extract text" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 OCR Server running on port ${PORT}`);
});
