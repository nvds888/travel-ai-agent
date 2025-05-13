// client/src/components/Profile/ProfileForm.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Alert,
  Divider,
  CircularProgress
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import SaveIcon from '@mui/icons-material/Save';
import { useUser } from '../../contexts/UserContext';

const ProfileForm = ({ initialData, onSuccess }) => {
  const { updateProfile, loading } = useUser();

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    title: '',
    gender: '',
    dateOfBirth: null,
    nationality: '',
    passportNumber: '',
    passportExpiry: null
  });

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Initialize form with user data
  useEffect(() => {
    if (initialData) {
      setFormData({
        email: initialData.email || '',
        firstName: initialData.firstName || '',
        lastName: initialData.lastName || '',
        phoneNumber: initialData.phoneNumber || '',
        title: initialData.title || '',
        gender: initialData.gender || '',
        dateOfBirth: initialData.dateOfBirth ? new Date(initialData.dateOfBirth) : null,
        nationality: initialData.nationality || '',
        passportNumber: initialData.passportNumber || '',
        passportExpiry: initialData.passportExpiry ? new Date(initialData.passportExpiry) : null
      });
    }
  }, [initialData]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
    
    // Clear errors when field is updated
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
    
    // Clear success message when any field changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date
    });
    
    // Clear errors when field is updated
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null
      });
    }
    
    // Clear success message when any field changes
    if (successMessage) {
      setSuccessMessage('');
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    
    // Email validation
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Phone validation
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }
    
    // If passport number is provided, passport expiry is required
    if (formData.passportNumber && !formData.passportExpiry) {
      newErrors.passportExpiry = 'Passport expiry date is required if passport number is provided';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    
    if (!validateForm()) {
      return;
    }
    
    try {
      const updateData = {
        ...formData,
        dateOfBirth: formData.dateOfBirth?.toISOString().split('T')[0],
        passportExpiry: formData.passportExpiry?.toISOString().split('T')[0]
      };
      
      await updateProfile(updateData);
      setSuccessMessage('Profile updated successfully');
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <Box>
      <Typography variant="h6" fontWeight="bold" gutterBottom>
        Personal Information
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Update your profile information for bookings and communications
      </Typography>
      
      {formError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formError}
        </Alert>
      )}
      
      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }}>
          {successMessage}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          {/* Personal Information Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1 }}>
              Basic Details
            </Typography>
          </Grid>

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

          {/* Email */}
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={formData.email}
              onChange={handleChange('email')}
              error={!!errors.email}
              helperText={errors.email}
            />
          </Grid>

          {/* Phone Number */}
          <Grid item xs={12} sm={6}>
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

          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Travel Documents Section */}
          <Grid item xs={12}>
            <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 1 }}>
              Travel Documents (Optional)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Add your travel document details for faster booking of international flights
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
                    error: !!errors.passportExpiry,
                    helperText: errors.passportExpiry,
                  },
                }}
                minDate={new Date()}
              />
            </LocalizationProvider>
          </Grid>

          {/* Submit Button */}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              size="large"
              startIcon={<SaveIcon />}
              disabled={loading}
              sx={{ mt: 2, py: 1.5, px: 4 }}
            >
              {loading ? <CircularProgress size={24} /> : 'Save Changes'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Box>
  );
};

export default ProfileForm;