// client/src/components/Auth/AuthModal.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Divider
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LoginForm from './LoginForm';
import RegisterForm from './RegisterForm';
import { useAuth } from '../../contexts/AuthContext';
import { useChat } from '../../contexts/ChatContext';

const AuthModal = ({ open, onClose, sessionId }) => {
  const [currentView, setCurrentView] = useState('login'); // 'login' or 'register'
  const { isAuthenticated, setAuthenticated } = useAuth();
  const { refreshConversation } = useChat();
  const [authSuccessful, setAuthSuccessful] = useState(false);

  // Effect to handle authentication success and close modal
  useEffect(() => {
    const handleAuthStateChange = async () => {
      if (isAuthenticated && open && !authSuccessful) {
        setAuthSuccessful(true);
        
        try {
          if (sessionId) {
            // Update the chat context with authenticated status
            await setAuthenticated(sessionId);
            
            // Refresh the conversation to get updated state
            if (refreshConversation) {
              await refreshConversation();
            }
          }
          
          // Close the modal after updating the state
          onClose();
        } catch (error) {
          console.error('Error setting authenticated status:', error);
        }
      }
    };
    
    handleAuthStateChange();
  }, [isAuthenticated, open, sessionId, setAuthenticated, refreshConversation, onClose, authSuccessful]);

  // Reset auth successful state when modal closes or opens
  useEffect(() => {
    if (!open) {
      setAuthSuccessful(false);
    }
  }, [open]);

  const handleAuthSuccess = async () => {
    // The useEffect above will handle the authenticated state change
    setAuthSuccessful(true);
  };

  const handleSwitchToRegister = () => {
    setCurrentView('register');
  };

  const handleSwitchToLogin = () => {
    setCurrentView('login');
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            {currentView === 'login' ? 'Sign in to continue' : 'Create your account'}
          </Typography>
          <IconButton onClick={onClose} aria-label="close" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <DialogContent sx={{ p: 4, bgcolor: 'background.paper' }}>
        {isAuthenticated ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              You are already signed in!
            </Typography>
            <Typography variant="body1" color="text.secondary">
              You can continue with your booking.
            </Typography>
          </Box>
        ) : currentView === 'login' ? (
          <LoginForm 
            onSuccess={handleAuthSuccess}
            onSwitchToRegister={handleSwitchToRegister}
          />
        ) : (
          <RegisterForm 
            onSuccess={handleAuthSuccess}
            onSwitchToLogin={handleSwitchToLogin}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;