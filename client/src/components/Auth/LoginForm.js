// client/src/components/Auth/LoginForm.js
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
  CircularProgress
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../../contexts/AuthContext';

const LoginForm = ({ onSuccess, onSwitchToRegister }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState('');
  const { login, loading } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    
    if (!email.trim() || !password.trim()) {
      setFormError('Please enter both email and password');
      return;
    }
    
    try {
      await login(email, password);
      if (onSuccess) onSuccess();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 4, 
        maxWidth: 450,
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
          <LockOutlinedIcon />
        </Box>
        <Typography variant="h5" fontWeight="bold">
          Sign In
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Continue with your booking by signing in
        </Typography>
      </Box>
      
      {formError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {formError}
        </Alert>
      )}
      
      <form onSubmit={handleSubmit}>
        <TextField
          label="Email Address"
          fullWidth
          margin="normal"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
          sx={{ mb: 2 }}
        />
        
        <TextField
          label="Password"
          fullWidth
          margin="normal"
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
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
          sx={{ mb: 3 }}
        />
        
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={loading}
          sx={{ 
            py: 1.5,
            fontWeight: 'bold',
            mb: 2
          }}
        >
          {loading ? <CircularProgress size={24} /> : 'Sign In'}
        </Button>
        
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Typography variant="body2">
            Don't have an account?{' '}
            <Link 
              component="button" 
              type="button"
              onClick={onSwitchToRegister}
              sx={{ fontWeight: 'bold' }}
            >
              Create Account
            </Link>
          </Typography>
        </Box>
      </form>
    </Paper>
  );
};

export default LoginForm;