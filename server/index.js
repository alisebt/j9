// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به MongoDB Atlas
mongoose.connect('mongodb+srv://rtsharebox:JVDD5dELVrah8wY9@cluster0.jqrnlot.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// مدل نمونه
const Item = mongoose.model('Item', { name: String });

// مسیرها
app.get('/api/items', async (req, res) => {
  const items = await Item.find();
  res.json(items);
});

app.post('/api/items', async (req, res) => {
  const newItem = new Item({ name: req.body.name });
  await newItem.save();
  res.json(newItem);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
