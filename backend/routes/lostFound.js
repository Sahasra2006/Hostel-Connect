const express = require('express');
const router = express.Router();
const LostItem = require('../models/LostItem');
const aiService = require('../services/aiService');
const { protect } = require('../middleware/authMiddleware');

module.exports = (io) => {

  // @route   GET api/lost-found
  // @desc    Get all lost and found items
  router.get('/', protect, async (req, res) => {
    try {
      const items = await LostItem.find()
        .populate('user', 'name role')
        .populate('comments.user', 'name role')
        .sort({ createdAt: -1 });
      res.json(items);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST api/lost-found
  // @desc    Create a lost or found item
  router.post('/', protect, async (req, res) => {
    try {
      const { title, description, location, type, contact, image } = req.body;

      if (!title || !title.trim() || !description || !description.trim() || !location || !location.trim() || !type) {
        return res.status(400).json({ message: 'Title, description, location, and type are required' });
      }

      // 1. Moderate title and description text
      const textToModerate = `${title} ${description}`;
      const textModeration = await aiService.moderateContent(textToModerate);
      if (textModeration.isInappropriate) {
        return res.status(400).json({ message: `Inappropriate content detected: ${textModeration.reason}` });
      }

      // 2. Moderate image if provided
      if (image) {
        const imgModeration = await aiService.moderateImage(image);
        if (imgModeration.isInappropriate) {
          return res.status(400).json({ message: `Inappropriate image detected: ${imgModeration.reason}` });
        }
      }

      const newItem = new LostItem({
        title,
        description,
        location,
        type,
        contact,
        image: image || null,
        user: req.user.id
      });

      const item = await newItem.save();

      const populated = await LostItem.findById(item._id)
        .populate('user', 'name role')
        .populate('comments.user', 'name role');

      if (io) {
        io.emit('lostItemCreated', {
          itemId: populated._id.toString(),
          title: populated.title,
          type: populated.type,
          studentName: populated.user?.name || 'A resident',
          location: populated.location
        });
      }

      res.json(populated);
    } catch (err) {
      console.error('Error creating lost/found item:', err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST api/lost-found/:id/comment
  // @desc    Add a comment to an item
  router.post('/:id/comment', protect, async (req, res) => {
    try {
      const { text } = req.body;
      if (!text || !text.trim()) {
        return res.status(400).json({ message: 'Comment text is required' });
      }

      // AI content moderation check
      const moderation = await aiService.moderateContent(text);
      if (moderation.isInappropriate) {
        return res.status(400).json({ message: `Inappropriate comment: ${moderation.reason}` });
      }

      const item = await LostItem.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      const newComment = {
        user: req.user.id,
        text
      };

      item.comments.push(newComment);
      await item.save();

      const updated = await LostItem.findById(req.params.id)
        .populate('comments.user', 'name role');

      res.json(updated.comments);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   PUT api/lost-found/:id/resolve
  // @desc    Toggle item status (open/resolved)
  router.put('/:id/resolve', protect, async (req, res) => {
    try {
      const item = await LostItem.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Check if user is owner or admin
      if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }

      item.status = item.status === 'open' ? 'resolved' : 'open';
      await item.save();

      const updated = await LostItem.findById(req.params.id)
        .populate('user', 'name role')
        .populate('comments.user', 'name role');

      if (io) {
        io.emit('lostItemStatusChanged', {
          itemId: updated._id.toString(),
          title: updated.title,
          status: updated.status
        });
      }

      res.json(updated);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   DELETE api/lost-found/:id
  // @desc    Delete an item
  router.delete('/:id', protect, async (req, res) => {
    try {
      const item = await LostItem.findById(req.params.id);
      if (!item) {
        return res.status(404).json({ message: 'Item not found' });
      }

      // Check if user is owner or admin
      if (item.user.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(401).json({ message: 'Not authorized' });
      }

      await item.deleteOne();

      if (io) {
        io.emit('lostItemDeleted', { itemId: req.params.id });
      }

      res.json({ message: 'Item removed successfully' });
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  return router;
};
