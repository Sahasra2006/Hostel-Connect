const express = require('express');
const router = express.Router();
const Complaint = require('../models/Complaint');
const { protect, admin } = require('../middleware/authMiddleware');
const aiService = require('../services/aiService');

// The router now accepts `io` so it can emit real-time notifications
module.exports = (io) => {

  // @route   GET api/complaints
  // @desc    Get all complaints (Admin) or user complaints (Student)
  router.get('/', protect, async (req, res) => {
    try {
      let complaints;
      if (req.user.role === 'admin') {
        complaints = await Complaint.find().populate('user', 'name email').sort({ createdAt: -1 });
      } else {
        complaints = await Complaint.find({ user: req.user.id }).sort({ createdAt: -1 });
      }
      res.json(complaints);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST api/complaints
  // @desc    Create a complaint (AI Integrated)
  router.post('/', protect, async (req, res) => {
    try {
      const { title, description, category, hostelBlock, roomNumber } = req.body;

      // Query AI diagnostic engine (Gemini with offline fallback)
      const aiResult = await aiService.analyzeComplaint(title, description);

      const newComplaint = new Complaint({
        user: req.user.id,
        title,
        description,
        category: aiResult.aiCategory || category || 'Other',
        hostelBlock,
        roomNumber,
        priority: aiResult.priority || 'Low',
        aiSuggestedAction: aiResult.aiSuggestedAction || '',
        aiCategory: aiResult.aiCategory || ''
      });

      const complaint = await newComplaint.save();

      // Populate user info so we have their name for the notification
      const populatedComplaint = await Complaint.findById(complaint._id).populate('user', 'name');

      if (io) {
        io.emit('complaintCreated', {
          complaintId: populatedComplaint._id.toString(),
          title: populatedComplaint.title,
          studentName: populatedComplaint.user?.name || 'A student',
          hostelBlock: populatedComplaint.hostelBlock,
          roomNumber: populatedComplaint.roomNumber
        });
      }

      res.json(complaint);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   PUT api/complaints/:id
  // @desc    Update complaint status (Admin only) + emit real-time notification
  router.put('/:id', protect, admin, async (req, res) => {
    try {
      const { status, adminRemarks } = req.body;

      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      if (status) {
        if (!['Pending', 'In Progress', 'Resolved'].includes(status)) {
          return res.status(400).json({ message: 'Invalid status' });
        }
        complaint.status = status;
      }

      if (adminRemarks !== undefined) {
        complaint.adminRemarks = adminRemarks;
      }

      await complaint.save();

      // Emit real-time notification to the complaint owner
      if (io) {
        io.emit('complaintStatusChanged', {
          userId: complaint.user.toString(),
          complaintId: complaint._id.toString(),
          title: complaint.title,
          status: complaint.status,
          adminRemarks: complaint.adminRemarks
        });
      }

      res.json(complaint);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  // @route   POST api/complaints/:id/upvote
  // @desc    Upvote/remove upvote for a complaint
  router.post('/:id/upvote', protect, async (req, res) => {
    try {
      const complaint = await Complaint.findById(req.params.id);

      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      if (complaint.upvotes.includes(req.user.id)) {
        complaint.upvotes = complaint.upvotes.filter(id => id.toString() !== req.user.id);
      } else {
        complaint.upvotes.unshift(req.user.id);
      }

      await complaint.save();
      res.json(complaint.upvotes);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  });

  return router;
};
