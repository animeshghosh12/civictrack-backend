const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// --- NEW CLOUDINARY TOOLS ---
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log("Success! Connected to MongoDB Atlas!"))
  .catch((error) => console.log("Error connecting to MongoDB:", error));

// --- NEW CLOUDINARY CONFIGURATION ---
// This uses the hidden keys in your .env file to log into your cloud
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Tell the engine where to put the files (in a folder called 'CivicTrack')
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'CivicTrack',
    allowedFormats: ['jpeg', 'png', 'jpg']
  },
});
const upload = multer({ storage: storage });

// The Blueprint (Schema)
const issueSchema = new mongoose.Schema({
  description: String,
  location: String,
  photoUrl: String, // This will now hold the real Cloudinary URL!
  status: { type: String, default: 'Captured' },
  category: { type: String, default: 'Unclassified' },
  rating: { type: Number, default: null },
  createdAt: { type: Date, default: Date.now }
});

const Issue = mongoose.model('Issue', issueSchema);

// --- UPDATED POST ROUTE ---
// Notice the `upload.single('image')` in the middle. This catches the file before saving to the database.
app.post('/api/issues', upload.single('image'), async (req, res) => {
  try {
    const issueData = req.body;
    
    // If an image was uploaded, Cloudinary automatically gives us the URL!
    if (req.file) {
      issueData.photoUrl = req.file.path; 
    }

    const newIssue = new Issue(issueData);
    
    // AI Classify (Same as before)
    const desc = newIssue.description.toLowerCase();
    if (desc.includes('pothole') || desc.includes('road')) {
        newIssue.category = 'Department of Transportation';
    } else if (desc.includes('light') || desc.includes('power')) {
        newIssue.category = 'Department of Energy';
    } else if (desc.includes('water') || desc.includes('pipe') || desc.includes('leak')) {
        newIssue.category = 'Water Authority';
    } else {
        newIssue.category = 'General Services';
    }

    await newIssue.save();
    res.status(201).json({ message: "Issue captured!", data: newIssue });
  } catch (error) {
    console.log("Error saving issue:", error);
    res.status(500).json({ error: "Failed to save issue." });
  }
});

// GET Route (Same as before)
app.get('/api/issues', async (req, res) => {
  try {
    const allIssues = await Issue.find().sort({ createdAt: -1 });
    res.status(200).json(allIssues);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch issues." });
  }
});

// PUT Route (Same as before)
app.put('/api/issues/:id', async (req, res) => {
  try {
    const updatedIssue = await Issue.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json(updatedIssue);
  } catch (error) {
    res.status(500).json({ error: "Failed to update issue." });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`CivicTrack backend server is running on port ${PORT}`);
});