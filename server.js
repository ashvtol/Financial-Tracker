const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;
const MODEL_PATH = path.join(__dirname, 'src', 'models', 'ai-model.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Ensure models directory exists
async function ensureModelsDir() {
  const modelsDir = path.join(__dirname, 'src', 'models');
  try {
    await fs.access(modelsDir);
  } catch {
    await fs.mkdir(modelsDir, { recursive: true });
  }
}

// Load AI model from file
app.get('/api/model', async (req, res) => {
  try {
    await ensureModelsDir();
    const data = await fs.readFile(MODEL_PATH, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty model
      res.json({
        version: '1.0',
        timestamp: new Date().toISOString(),
        learningModel: {},
        customCategories: []
      });
    } else {
      console.error('Error loading model:', error);
      res.status(500).json({ error: 'Failed to load model' });
    }
  }
});

// Save AI model to file
app.post('/api/model', async (req, res) => {
  try {
    await ensureModelsDir();
    const modelData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      ...req.body
    };
    await fs.writeFile(MODEL_PATH, JSON.stringify(modelData, null, 2), 'utf-8');
    console.log('AI model saved to:', MODEL_PATH);
    res.json({ success: true, message: 'Model saved successfully' });
  } catch (error) {
    console.error('Error saving model:', error);
    res.status(500).json({ error: 'Failed to save model' });
  }
});

app.listen(PORT, () => {
  console.log(`Model API server running on http://localhost:${PORT}`);
  console.log(`Model file location: ${MODEL_PATH}`);
});
