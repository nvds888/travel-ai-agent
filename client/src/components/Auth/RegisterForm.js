// client/src/components/Auth/RegisterForm.js
import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  Link,
  InputAdornment,
  IconButton,
  CircularProgress,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm = ({ onSuccess, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    title: '',
    dateOfBirth: null,
    gender: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: null
  });
  
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const { register, loading } = useAuth();

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
  };

  const validateStep1 = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (formData.password && formData.confirmPassword && 
        formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setCurrentStep(2);
    }
  };

  const handlePrevStep = () => {
    setCurrentStep(1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (currentStep === 1) {
      if (validateStep1()) {
        setCurrentStep(2);
      }
      return;
    }
    
    if (!validateStep2()) {
      return;
    }
    
    try {
      // Format data for API
      const userData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth?.toISOString().split('T')[0],
        passportExpiry: formData.passportExpiry?.toISOString().split('T')[0]
      };
      
      // Remove confirmPassword as it's not needed for the API
      delete userData.confirmPassword;
      
      await register(userData);
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Registration failed. Please try again.');
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        maxWidth: 650,
        width: '100%',
        mx: 'auto',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mb: 3 }}>
        <Box 
          sx={{ 
            bgcolor: 'primary.main', 
            color: 'white', 
            borderRadius: '50%', 
            p: 1,
            mb: 2 
          }}
        >
          <PersonAddIcon />
        </Box>
        <Typography variant="h5" fontWeight="bold">
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {currentStep === 1 
            ? 'Start by creating your login credentials' 
            : 'Now, tell us about yourself'}
        </Typography>
      </Box>
      
      {formError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formError}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        {currentStep === 1 ? (
          // Step 1: Account credentials
          <>
            <TextField
              label="Email Address"
              fullWidth
              margin="normal"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              required
              autoFocus
              error={!!errors.email}
              helperText={errors.email}
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Password"
              fullWidth
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              value={formData.password}
              onChange={handleChange('password')}
              required
              error={!!errors.password}
              helperText={errors.password}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton 
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                    >
                      {showPassword ? <VisibilityOffIcon /> : <VisibilityIcon />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
              sx={{ mb: 2 }}
            />
            
            <TextField
              label="Confirm Password"
              fullWidth
              margin="normal"
              type={showPassword ? 'text' : 'password'}
              value={formData.confirmPassword}
              onChange={handleChange('confirmPassword')}
              required
              error={!!errors.confirmPassword}
              helperText={errors.confirmPassword}
              sx={{ mb: 3 }}
            />
          </>
        ) : (
          // Step 2: Personal information
          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12} sm={2}>
              <FormControl fullWidth error={!!errors.title}>
                <InputLabel>Title</InputLabel>
                <Select
                  value={formData.title}
                  onChange={handleChange('title')}
                  label="Title"
                >
                  <MenuItem value="Mr">Mr</MenuItem>
                  <MenuItem value="Mrs">Mrs</MenuItem>
                  <MenuItem value="Ms">Ms</MenuItem>
                  <MenuItem value="Dr">Dr</MenuItem>
                </Select>
                {errors.title && <FormHelperText>{errors.title}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* First Name */}
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="First Name"
                value={formData.firstName}
                onChange={handleChange('firstName')}
                error={!!errors.firstName}
                helperText={errors.firstName}
              />
            </Grid>

            {/* Last Name */}
            <Grid item xs={12} sm={5}>
              <TextField
                fullWidth
                label="Last Name"
                value={formData.lastName}
                onChange={handleChange('lastName')}
                error={!!errors.lastName}
                helperText={errors.lastName}
              />
            </Grid>

            {/* Date of Birth */}
            <Grid item xs={12} sm={6}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Date of Birth"
                  value={formData.dateOfBirth}
                  onChange={handleDateChange('dateOfBirth')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                      error: !!errors.dateOfBirth,
                      helperText: errors.dateOfBirth,
                    },
                  }}
                  maxDate={new Date()}
                />
              </LocalizationProvider>
            </Grid>

            {/* Gender */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.gender}>
                <InputLabel>Gender</InputLabel>
                <Select
                  value={formData.gender}
                  onChange={handleChange('gender')}
                  label="Gender"
                >
                  <MenuItem value="male">Male</MenuItem>
                  <MenuItem value="female">Female</MenuItem>
                  <MenuItem value="other">Other</MenuItem>
                </Select>
                {errors.gender && <FormHelperText>{errors.gender}</FormHelperText>}
              </FormControl>
            </Grid>

            {/* Phone Number */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                value={formData.phoneNumber}
                onChange={handleChange('phoneNumber')}
                error={!!errors.phoneNumber}
                helperText={errors.phoneNumber}
                placeholder="+1 234 567 8900"
              />
            </Grid>

            {/* Optional Travel Documents */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
                Optional Travel Documents (Recommended for International Travel)
              </Typography>
            </Grid>

            {/* Nationality */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Nationality"
                value={formData.nationality}
                onChange={handleChange('nationality')}
                placeholder="Country Code (e.g., US)"
              />
            </Grid>

            {/* Passport Number */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Passport Number"
                value={formData.passportNumber}
                onChange={handleChange('passportNumber')}
              />
            </Grid>

            {/* Passport Expiry */}
            <Grid item xs={12} sm={4}>
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Passport Expiry"
                  value={formData.passportExpiry}
                  onChange={handleDateChange('passportExpiry')}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                  minDate={new Date()}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        )}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
          {currentStep === 2 && (
            <Button
              variant="outlined"
              size="large"
              onClick={handlePrevStep}
              sx={{ px: 4 }}
            >
              Back
            </Button>
          )}
          
          <Button
            type="submit"
            variant="contained"
            size="large"
            disabled={loading}
            sx={{ 
              py: 1.5,
              px: 4,
              ml: currentStep === 2 ? 'auto' : 0
            }}
          >
            {loading ? (
              <CircularProgress size={24} />
            ) : currentStep === 1 ? (
              'Continue'
            ) : (
              'Create Account'
            )}
          </Button>
        </Box>
        
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography variant="body2">
            Already have an account?{' '}
            <Link 
              component="button" 
              type="button"
              onClick={onSwitchToLogin}
              sx={{ fontWeight: 'bold' }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </form>
    </Paper>
  );
};

export default RegisterForm;