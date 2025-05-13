// server/src/routes/auth.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// Generate JWT token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id);
  
  const options = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000
    ),
    httpOnly: true
  };
  
  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }
  
  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      token,
      user: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        preferences: user.preferences
      }
    });
};

// Register user with enhanced profile
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('dateOfBirth').isISO8601().toDate(),
  body('gender').isIn(['male', 'female', 'other']),
  body('phoneNumber').notEmpty(),
  body('nationality').optional().isAlpha(),
  body('passportNumber').optional().trim(),
  body('passportExpiry').optional().isISO8601().toDate()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const {
      email,
      password,
      firstName,
      lastName,
      title,
      dateOfBirth,
      gender,
      phoneNumber,
      nationality,
      passportNumber,
      passportExpiry,
      preferences
    } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with enhanced profile
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      title,
      dateOfBirth,
      gender,
      phoneNumber,
      nationality,
      passportNumber,
      passportExpiry,
      preferences: preferences || {}
    });
    
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { email, password } = req.body;
    
    // Check for user
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error logging in',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get current logged in user
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: req.user
  });
});

// Logout user
router.get('/logout', (req, res) => {
  res.cookie('token', 'none', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  
  res.status(200).json({
    success: true,
    message: 'User logged out successfully'
  });
});

// Update user details
router.put('/updatedetails', protect, [
  body('email').optional().isEmail().normalizeEmail(),
  body('firstName').optional().notEmpty().trim(),
  body('lastName').optional().notEmpty().trim(),
  body('phoneNumber').optional().notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const fieldsToUpdate = {
      email: req.body.email,
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      phoneNumber: req.body.phoneNumber
    };
    
    // Remove undefined fields
    Object.keys(fieldsToUpdate).forEach(key => 
      fieldsToUpdate[key] === undefined && delete fieldsToUpdate[key]
    );
    
    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Update details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating user details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update password
router.put('/updatepassword', protect, [
  body('currentPassword').notEmpty(),
  body('newPassword').isLength({ min: 6 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const user = await User.findById(req.user.id).select('+password');
    
    // Check current password
    if (!(await bcrypt.compare(req.body.currentPassword, user.password))) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(req.body.newPassword, salt);
    await user.save();
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating password',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update travel preferences
router.put('/updatepreferences', protect, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    if (!preferences || typeof preferences !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid preferences format'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        preferences: {
          ...req.user.preferences,
          ...preferences
        }
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating preferences',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Update passport details
router.put('/updatepassport', protect, [
  body('passportNumber').notEmpty().trim(),
  body('passportExpiry').isISO8601().toDate(),
  body('nationality').notEmpty().isAlpha()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const {
      passportNumber,
      passportExpiry,
      nationality,
      passportIssuingCountry
    } = req.body;
    
    // Validate passport expiry is in the future
    if (new Date(passportExpiry) <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Passport expiry must be in the future'
      });
    }
    
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        passportNumber,
        passportExpiry,
        nationality,
        passportIssuingCountry: passportIssuingCountry || nationality
      },
      {
        new: true,
        runValidators: true
      }
    );
    
    res.status(200).json({
      success: true,
      data: {
        passportNumber: user.passportNumber,
        passportExpiry: user.passportExpiry,
        nationality: user.nationality,
        passportIssuingCountry: user.passportIssuingCountry
      }
    });
  } catch (error) {
    console.error('Update passport error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating passport details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get passenger details format
router.get('/passenger', protect, (req, res) => {
  try {
    const passengerDetails = req.user.toPassengerFormat();
    
    res.status(200).json({
      success: true,
      data: passengerDetails
    });
  } catch (error) {
    console.error('Get passenger details error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting passenger details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Quick registration for checkout
router.post('/quick-register', [
  body('email').isEmail().normalizeEmail(),
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phoneNumber').notEmpty()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        errors: errors.array()
      });
    }
    
    const { email, firstName, lastName, phoneNumber } = req.body;
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-8);
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);
    
    // Create user with minimal details
    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      phoneNumber,
      isVerified: false,
      registrationType: 'quick'
    });
    
    // Send email with temporary password (implement email service)
    // await emailService.sendQuickRegistrationEmail(email, tempPassword);
    
    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Quick registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating user',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Social login callback (Google, Facebook, etc.)
router.post('/social-login', async (req, res) => {
  try {
    const { provider, accessToken, profile } = req.body;
    
    if (!provider || !accessToken || !profile) {
      return res.status(400).json({
        success: false,
        message: 'Invalid social login data'
      });
    }
    
    // Verify the access token with the provider
    // This would need implementation based on the provider
    // const isValid = await verifySocialToken(provider, accessToken);
    
    // Find or create user
    let user = await User.findOne({ email: profile.email });
    
    if (!user) {
      // Create new user from social profile
      user = await User.create({
        email: profile.email,
        password: await bcrypt.hash(Math.random().toString(36), 10), // Random password
        firstName: profile.firstName || profile.name.split(' ')[0],
        lastName: profile.lastName || profile.name.split(' ')[1] || '',
        profilePicture: profile.picture,
        socialAccounts: [{
          provider,
          providerId: profile.id
        }],
        isVerified: true
      });
    } else {
      // Link social account if not already linked
      const accountLinked = user.socialAccounts.some(
        account => account.provider === provider && account.providerId === profile.id
      );
      
      if (!accountLinked) {
        user.socialAccounts.push({
          provider,
          providerId: profile.id
        });
        await user.save();
      }
    }
    
    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Social login error:', error);
    res.status(500).json({
      success: false,
      message: 'Error with social login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;