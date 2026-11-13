const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const { protect } = require('../middleware/authMiddleware');

// @route   GET /api/messages
// @desc    Get recent messages for Global, Room, or private DM
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { room, recipient } = req.query;
    const currentUserId = req.user.id;

    let query = {};

    if (recipient) {
      // Private DM between current user and the recipient user
      query = {
        $or: [
          { user: currentUserId, recipient: recipient },
          { user: recipient, recipient: currentUserId }
        ]
      };
    } else if (room) {
      // Chatroom messages (e.g. My Room Chat)
      query = { room, recipient: null };
    } else {
      // Default Global Chat messages
      query = { room: 'Global', recipient: null };
    }

    const messages = await Message.find(query)
      .populate('user', 'name role')
      .populate('recipient', 'name role')
      .sort({ createdAt: -1 })
      .limit(50);
    
    // Process anonymous masking: if isAnonymous, mask user name
    const processedMessages = messages.reverse().map(msg => {
      const msgObj = msg.toObject();
      if (msgObj.isAnonymous) {
        msgObj.user = { _id: msgObj.user?._id, name: 'Anonymous Resident', role: 'student' };
      }
      return msgObj;
    });

    res.json(processedMessages);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
