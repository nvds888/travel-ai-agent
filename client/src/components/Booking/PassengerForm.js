// client/src/components/Booking/PassengerForm.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
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
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import PersonIcon from '@mui/icons-material/Person';
import { useAuth } from '../../contexts/AuthContext';

const PassengerForm = ({ selectedFlight, onSubmit, loading, initialData }) => {
  const { isAuthenticated, user } = useAuth();
  
  const [formData, setFormData] = useState({
    title: '',
    firstName: '',
    lastName: '',
    dateOfBirth: null,
    gender: '',
    email: '',
    phoneNumber: '',
    nationality: '',
    passportNumber: '',
    passportExpiry: null,
  });

  const [errors, setErrors] = useState({});

  // Initialize form with user data if available
  useEffect(() => {
    if (initialData) {
      setFormData({
        ...formData,
        ...initialData
      });
    } else if (isAuthenticated && user) {
      // Prefill from authenticated user
      setFormData({
        title: user.title || '',
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        dateOfBirth: user.dateOfBirth ? new Date(user.dateOfBirth) : null,
        gender: user.gender || '',
        email: user.email || '',
        phoneNumber: user.phoneNumber || '',
        nationality: user.nationality || '',
        passportNumber: user.passportNumber || '',
        passportExpiry: user.passportExpiry ? new Date(user.passportExpiry) : null,
      });
    }
  }, [isAuthenticated, user, initialData]);

  const handleChange = (field) => (event) => {
    setFormData({
      ...formData,
      [field]: event.target.value,
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null,
      });
    }
  };

  const handleDateChange = (field) => (date) => {
    setFormData({
      ...formData,
      [field]: date,
    });
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: null,
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title) newErrors.title = 'Title is required';
    if (!formData.firstName) newErrors.firstName = 'First name is required';
    if (!formData.lastName) newErrors.lastName = 'Last name is required';
    if (!formData.dateOfBirth) newErrors.dateOfBirth = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Gender is required';
    if (!formData.email) newErrors.email = 'Email is required';
    if (!formData.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    if (formData.phoneNumber && !/^\+?[\d\s-()]+$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Invalid phone number format';
    }
    
    if (isInternationalFlight()) {
      if (!formData.nationality) newErrors.nationality = 'Nationality is required for international flights';
      if (!formData.passportNumber) newErrors.passportNumber = 'Passport number is required for international flights';
      if (!formData.passportExpiry) newErrors.passportExpiry = 'Passport expiry is required for international flights';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isInternationalFlight = () => {
    const origin = selectedFlight?.slices[0]?.origin?.iataCode;
    const destination = selectedFlight?.slices[0]?.destination?.iataCode;
    return origin && destination && origin.substring(0, 2) !== destination.substring(0, 2);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (validateForm()) {
      const passengerData = [{
        ...formData,
        dateOfBirth: formData.dateOfBirth?.toISOString().split('T')[0],
        passportExpiry: formData.passportExpiry?.toISOString().split('T')[0],
      }];
      
      onSubmit(passengerData);
    }
  };

  return (
    <Card sx={{ my: 3, boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <PersonIcon sx={{ fontSize: 28, color: 'primary.main', mr: 1.5 }} />
          <Typography variant="h5" fontWeight="bold">
            Passenger Details
          </Typography>
        </Box>
        
        {isAuthenticated && (
          <Alert severity="info" sx={{ mb: 4 }}>
            Your profile information has been pre-filled. Please review and update if needed.
          </Alert>
        )}
        
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          Please provide the passenger information for your flight
        </Typography>

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Personal Information Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2 }}>
                Personal Information
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

            {/* Contact Information Section */}
            <Grid item xs={12}>
              <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, mt: 2 }}>
                Contact Information
              </Typography>
            </Grid>

            {/* Email */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Email"
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

            {/* International Flight Fields */}
            {isInternationalFlight() && (
              <>
                <Grid item xs={12}>
                  <Typography variant="subtitle1" fontWeight="600" sx={{ mb: 2, mt: 2 }}>
                    Travel Documents
                  </Typography>
                </Grid>

                {/* Nationality */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Nationality"
                    value={formData.nationality}
                    onChange={handleChange('nationality')}
                    error={!!errors.nationality}
                    helperText={errors.nationality}
                    placeholder="US"
                  />
                </Grid>

                {/* Passport Number */}
                <Grid item xs={12} sm={4}>
                  <TextField
                    fullWidth
                    label="Passport Number"
                    value={formData.passportNumber}
                    onChange={handleChange('passportNumber')}
                    error={!!errors.passportNumber}
                    helperText={errors.passportNumber}
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
              </>
            )}

            {/* Submit Button */}
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
                size="large"
                fullWidth
                disabled={loading}
                sx={{ mt: 2, py: 1.5, fontSize: '1rem' }}
              >
                Continue to Additional Services
              </Button>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
};

export default PassengerForm;