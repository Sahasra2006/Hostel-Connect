const express = require('express');
const router = express.Router();
const aiService = require('../services/aiService');
const Post = require('../models/Post');
const { protect } = require('../middleware/authMiddleware');

// @desc    Interact with the Resident Assistant chatbot (HostelConnect Warden AI)
// @route   POST /api/ai/chat
// @access  Private
router.post('/chat', protect, async (req, res) => {
  const { message, history } = req.body;
  
  if (!message || !message.trim()) {
    return res.status(400).json({ message: 'Message is required' });
  }

  try {
    // Fetch latest 5 posts to provide community context
    const latestPosts = await Post.find()
      .populate('user', 'name isAnonymous')
      .sort({ createdAt: -1 })
      .limit(5);

    const result = await aiService.chatResidentAssistant(message, history || [], latestPosts);
    res.json(result);
  } catch (error) {
    console.error('Chat route error:', error);
    res.status(500).json({ message: 'Server Error' });
  }
});

module.exports = router;
