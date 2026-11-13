const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/authMiddleware');
const { body, validationResult } = require('express-validator');

// Strict input validation rules
const registerValidationRules = [
  body('name').trim().notEmpty().withMessage('Name is required').escape(),
  body('registrationNumber')
    .trim()
    .notEmpty()
    .withMessage('Registration number or Admin ID is required')
    .matches(/^(\d{5}|\d{8})$/)
    .withMessage('Registration number must be exactly 5 or 8 digits')
    .escape(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase, one lowercase, one digit, and one special character (@$!%*?&).')
];

const changePasswordValidationRules = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase, one lowercase, one digit, and one special character (@$!%*?&).')
];

// Initial seeder route to easily setup a test user
router.post('/seed', async (req, res) => {
  try {
    const existingUser = await User.findOne({ registrationNumber: '12345678' });
    if (existingUser) {
      return res.json({ message: 'Test user already exists. Registration Number: 12345678, password: password123' });
    }

    const newUser = new User({
      name: 'Test User',
      registrationNumber: '12345678',
      password: 'password123',
      role: 'student'
    });

    await newUser.save();
    res.json({ message: 'Test user created! Registration Number: 12345678, password: password123' });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
});

router.post('/register', registerValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  console.log('Registration attempt received:', req.body.registrationNumber);
  const { name, registrationNumber, password, role, hostelBlock, roomNumber } = req.body;

  try {
    if (!name || !registrationNumber || !password) {
      return res.status(400).json({ message: 'Please enter all required fields' });
    }

    if (!/^(\d{5}|\d{8})$/.test(registrationNumber)) {
      return res.status(400).json({ message: 'Registration number must be exactly 5 or 8 digits' });
    }

    const assignedRole = role === 'admin' ? 'admin' : (registrationNumber.length === 5 ? 'admin' : 'student');

    const userExists = await User.findOne({ registrationNumber });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const user = await User.create({
      name,
      registrationNumber,
      password,
      role: assignedRole,
      hostelBlock,
      roomNumber
    });

    if (user) {
      const payload = {
        user: {
          id: user.id
        }
      };

      jwt.sign(
        payload,
        process.env.JWT_SECRET || 'secret123',
        { expiresIn: 360000 },
        (err, token) => {
          if (err) throw err;
          res.status(201).json({
            token,
            user: {
              id: user.id,
              name: user.name,
              registrationNumber: user.registrationNumber,
              role: user.role,
              hostelBlock: user.hostelBlock,
              roomNumber: user.roomNumber
            }
          });
        }
      );
    } else {
      console.log('Registration failed: Invalid user data');
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    console.error('Registration Error:', error.message);
    res.status(500).send('Server Error');
  }
});

// @route   POST api/auth/login
// @desc    Authenticate user & get token
router.post('/login', async (req, res) => {
  const { registrationNumber, password } = req.body;

  try {
    if (!registrationNumber || !password) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    // Check for existing user
    const user = await User.findOne({ registrationNumber });
    if (!user) {
      return res.status(400).json({ message: 'User Does not exist' });
    }

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            registrationNumber: user.registrationNumber,
            role: user.role,
            hostelBlock: user.hostelBlock,
            roomNumber: user.roomNumber
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

router.put('/change-password', protect, changePasswordValidationRules, async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ message: errors.array()[0].msg });
  }

  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Please enter all fields' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Incorrect current password' });
    }

    // Update password (pre-save hook in User model will automatically salt and hash it)
    user.password = newPassword;
    await user.save();

    res.json({ message: 'Password updated successfully!' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/auth/update-profile
// @desc    Update user profile details (Name, Room Number)
// @access  Private
router.put('/update-profile', protect, async (req, res) => {
  const { name, roomNumber } = req.body;
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (name) user.name = name;
    if (user.role === 'student' && roomNumber !== undefined) {
      user.roomNumber = roomNumber;
    }

    await user.save();
    res.json({
      message: 'Profile updated successfully!',
      user: {
        id: user.id,
        name: user.name,
        registrationNumber: user.registrationNumber,
        role: user.role,
        hostelBlock: user.hostelBlock,
        roomNumber: user.roomNumber
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
