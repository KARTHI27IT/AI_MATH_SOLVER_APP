const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(cors());
app.use(express.json());

// Gemini init
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Helper to get correct MIME type based on file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.png':
      return 'image/png';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.gif':
      return 'image/gif';
    case '.bmp':
      return 'image/bmp';
    default:
      return 'image/png'; // fallback MIME type
  }
}

app.post('/process', upload.single('image'), async (req, res) => {
  try {
    const description = req.body.description;
    if (!description) {
      return res.status(400).json({ error: "Description is required" });
    }
    if (!req.file) {
      return res.status(400).json({ error: "Image file is required" });
    }

    const imagePath = req.file.path;
    console.log("Received description:", description);
    console.log("Image file path:", imagePath);

    // Read image file as base64 string
    const imageBase64 = fs.readFileSync(imagePath, { encoding: 'base64' });

    // Fix mimeType to something Gemini supports
    const mimeType = getMimeType(req.file.originalname || req.file.filename);

    // Select Gemini model
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Prepare prompt
    const prompt = `Description: ${description}. Analyze and solve/explain the math equation in this image.`;

    // Send request to Gemini with prompt and image inline data
    const result = await model.generateContent([
      { text: prompt },
      {
        inlineData: {
          mimeType: mimeType,
          data: imageBase64,
        },
      },
    ]);

    const responseText = result.response.text();
    console.log("Gemini response:", responseText);

    // Delete uploaded image after processing
    fs.unlinkSync(imagePath);

    // Send response back to client
    res.json({ result: responseText });
  } catch (err) {
    console.error("Error processing /process request:", err);
    res.status(500).json({ error: "Error processing request" });
  }
});

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
