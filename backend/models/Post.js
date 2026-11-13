const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isAnonymous: {
    type: Boolean,
    default: true
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  ],
  comments: [
    {
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      text: {
        type: String,
        required: true
      },
      isAnonymous: {
        type: Boolean,
        default: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    }
  ],
  isPoll: {
    type: Boolean,
    default: false
  },
  pollOptions: [
    {
      optionText: {
        type: String,
        required: true
      },
      votes: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        }
      ]
    }
  ],
  image: {
    type: String, // Base64 encoded compressed image payload
    default: null
  },
  isOfficial: {
    type: Boolean,
    default: false
  }
}, { timestamps: true });

module.exports = mongoose.model('Post', postSchema);
