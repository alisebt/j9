// server/index.js
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// اتصال به MongoDB Atlas
mongoose.connect('mongodb://127.0.0.1:27017/J9', { useNewUrlParser: true, useUnifiedTopology: true });


// Tag model
const tagSchema = new mongoose.Schema({
  shotId: { type: String, required: true },
  value: { type: String, required: true }
});
const Tag = mongoose.model('Tag', tagSchema);

// Playlist model
const playlistSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  shotIds: { type: [String], default: [] }
});
const Playlist = mongoose.model('Playlist', playlistSchema);

// Tag routes
app.get('/api/tags', async (req, res) => {
  const tags = await Tag.find();
  const result = {};
  tags.forEach(t => {
    if (!result[t.shotId]) result[t.shotId] = [];
    result[t.shotId].push(t.value);
  });
  res.json(result);
});

app.post('/api/tags/:shotId', async (req, res) => {
  const { shotId } = req.params;
  const { tag } = req.body;
  if (!tag) return res.status(400).json({ error: 'Tag required' });
  await new Tag({ shotId, value: tag }).save();
  const tags = await Tag.find({ shotId });
  res.json(tags.map(t => t.value));
});

app.delete('/api/tags/:shotId/:tag', async (req, res) => {
  const { shotId, tag } = req.params;
  await Tag.deleteOne({ shotId, value: tag });
  const tags = await Tag.find({ shotId });
  res.json(tags.map(t => t.value));
});

app.put('/api/tags/rename', async (req, res) => {
  const { oldTag, newTag } = req.body;
  if (!oldTag || !newTag) return res.status(400).json({ error: 'Tags required' });
  await Tag.updateMany({ value: oldTag }, { $set: { value: newTag } });
  res.json({ success: true });
});

// Playlist routes
app.get('/api/playlists', async (req, res) => {
  const lists = await Playlist.find();
  const result = {};
  lists.forEach(p => {
    result[p.name] = p.shotIds;
  });
  res.json(result);
});

app.post('/api/playlists', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const playlist = new Playlist({ name });
  await playlist.save();
  res.json(playlist);
});

app.put('/api/playlists/:name', async (req, res) => {
  const { name } = req.params;
  const { newName } = req.body;
  const playlist = await Playlist.findOneAndUpdate(
    { name },
    { $set: { name: newName } },
    { new: true }
  );
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json(playlist);
});

app.delete('/api/playlists/:name', async (req, res) => {
  const { name } = req.params;
  await Playlist.deleteOne({ name });
  res.json({ success: true });
});

app.post('/api/playlists/:name/shots', async (req, res) => {
  const { name } = req.params;
  const { shotId } = req.body;
  const playlist = await Playlist.findOneAndUpdate(
    { name },
    { $addToSet: { shotIds: shotId } },
    { new: true }
  );
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json(playlist);
});

app.delete('/api/playlists/:name/shots/:shotId', async (req, res) => {
  const { name, shotId } = req.params;
  const playlist = await Playlist.findOneAndUpdate(
    { name },
    { $pull: { shotIds: shotId } },
    { new: true }
  );
  if (!playlist) return res.status(404).json({ error: 'Playlist not found' });
  res.json(playlist);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
