const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const aiService = require('../services/aiService');
const { protect } = require('../middleware/authMiddleware');

// @route   GET api/posts
// @desc    Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'name role')
      .populate('comments.user', 'name role')
      .sort({ createdAt: -1 });

    // Mask user data if isAnonymous
    const maskedPosts = posts.map(post => {
      const postObj = post.toObject();
      if (post.isAnonymous) {
        postObj.user = { name: 'Anonymous Student' };
      }
      if (postObj.comments) {
        postObj.comments = postObj.comments.map(c => {
          if (c.isAnonymous) {
            c.user = { name: 'Anonymous Student' };
          }
          return c;
        });
      }
      return postObj;
    });

    res.json(maskedPosts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts
// @desc    Create a post or a poll
router.post('/', protect, async (req, res) => {
  try {
    const { content, isAnonymous, isPoll, pollOptions, image, isOfficial } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content/Question is required' });
    }

    // 1. Moderate content/question text
    const contentModeration = await aiService.moderateContent(content);
    if (contentModeration.isInappropriate) {
      return res.status(400).json({ message: `Inappropriate content: ${contentModeration.reason}` });
    }

    // 2. Moderate poll options if it is a poll
    if (isPoll && pollOptions && Array.isArray(pollOptions)) {
      for (const opt of pollOptions) {
        if (opt && opt.trim()) {
          const optMod = await aiService.moderateContent(opt);
          if (optMod.isInappropriate) {
            return res.status(400).json({ message: `Inappropriate poll option "${opt}": ${optMod.reason}` });
          }
        }
      }
    }

    // 3. Moderate image if provided
    if (image) {
      const imgModeration = await aiService.moderateImage(image);
      if (imgModeration.isInappropriate) {
        return res.status(400).json({ message: `Inappropriate image detected: ${imgModeration.reason}` });
      }
    }

    const isSenderAdmin = req.user.role === 'admin';
    const isOfficialPost = isSenderAdmin && isOfficial === true;
    const isAnonymousPost = isOfficialPost ? false : (isAnonymous !== undefined ? isAnonymous : true);

    // Create schema data
    const postData = {
      content,
      isAnonymous: isAnonymousPost,
      user: req.user.id,
      isPoll: isPoll === true,
      image: image || null,
      isOfficial: isOfficialPost
    };

    if (isPoll && pollOptions && Array.isArray(pollOptions)) {
      postData.pollOptions = pollOptions
        .filter(opt => opt && opt.trim())
        .map(opt => ({ optionText: opt.trim(), votes: [] }));
    }

    const newPost = new Post(postData);
    const post = await newPost.save();
    
    // Return populated and masked version
    const populated = await Post.findById(post._id)
      .populate('user', 'name role')
      .populate('comments.user', 'name role');

    const postObj = populated.toObject();
    if (postObj.isAnonymous) {
      postObj.user = { name: 'Anonymous Student' };
    }
    
    res.json(postObj);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts/:id/vote
// @desc    Cast or change a user's vote on a poll option
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { optionId } = req.body;
    if (!optionId) {
      return res.status(400).json({ message: 'Option ID is required to vote' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (!post.isPoll) {
      return res.status(400).json({ message: 'This post is not a poll' });
    }

    const userId = req.user.id;

    // 1. Remove the user's vote from any option in this poll (ensuring only one vote total)
    post.pollOptions.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.toString() !== userId);
    });

    // 2. Add the user's vote to the selected option
    const selectedOption = post.pollOptions.id(optionId);
    if (!selectedOption) {
      return res.status(404).json({ message: 'Poll option not found' });
    }
    
    selectedOption.votes.push(userId);
    await post.save();

    // Re-populate and return the post object
    const updatedPost = await Post.findById(post._id)
      .populate('user', 'name role')
      .populate('comments.user', 'name role');

    const postObj = updatedPost.toObject();
    if (postObj.isAnonymous) {
      postObj.user = { name: 'Anonymous Student' };
    }

    res.json(postObj);
  } catch (err) {
    console.error('Error voting on poll:', err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts/:id/like
// @desc    Like/Unlike a post
router.post('/:id/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if post has already been liked by this user
    if (post.likes.includes(req.user.id)) {
      // Unlike
      post.likes = post.likes.filter(id => id.toString() !== req.user.id);
    } else {
      // Like
      post.likes.unshift(req.user.id);
    }

    await post.save();
    res.json(post.likes);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/posts/:id/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text, isAnonymous } = req.body;
    if (!text) {
      return res.status(400).json({ message: 'Comment text is required' });
    }

    // AI content moderation check
    const moderation = await aiService.moderateContent(text);
    if (moderation.isInappropriate) {
      return res.status(400).json({ message: `Inappropriate comment: ${moderation.reason}` });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const newComment = {
      user: req.user.id,
      text,
      isAnonymous: isAnonymous !== undefined ? isAnonymous : true
    };

    post.comments.push(newComment);
    await post.save();

    // Re-query and populate to get commenter details
    const updatedPost = await Post.findById(req.params.id)
      .populate('user', 'name role')
      .populate('comments.user', 'name role');

    // Mask anonymous commenters
    const commentsObj = updatedPost.comments.map(c => {
      const cObj = c.toObject();
      if (cObj.isAnonymous) {
        cObj.user = { name: 'Anonymous Student' };
      }
      return cObj;
    });

    res.json(commentsObj);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/posts/:id
// @desc    Delete a post (Admin only)
// @access  Private/Admin
router.delete('/:id', protect, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Not authorized as an admin' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    await post.deleteOne();
    res.json({ message: 'Post removed successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
