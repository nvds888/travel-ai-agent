// client/src/components/Chat/MessageBubble.js
import React from 'react';
import { Box, Paper, Typography, Avatar, Fade } from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import { format } from 'date-fns';

const MessageBubble = ({ message, isLast }) => {
  const isUser = message.role === 'user';

  const formatTime = (timestamp) => {
    try {
      return format(new Date(timestamp), 'HH:mm');
    } catch (error) {
      return new Date(timestamp).toLocaleTimeString();
    }
  };

  return (
    <Fade in={true} timeout={300}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: isUser ? 'flex-end' : 'flex-start',
          gap: 2,
          mb: isLast ? 0 : 1,
        }}
      >
        {!isUser && (
          <Avatar
            sx={{
              bgcolor: 'primary.main',
              width: 36,
              height: 36,
              boxShadow: 1,
            }}
          >
            <AutoFixHighIcon sx={{ fontSize: 20 }} />
          </Avatar>
        )}
        
        <Paper
          elevation={0}
          sx={{
            p: 2,
            maxWidth: '70%',
            backgroundColor: isUser ? 'primary.main' : 'grey.100',
            color: isUser ? 'white' : 'text.primary',
            borderRadius: 3,
            borderTopLeftRadius: isUser ? 24 : 4,
            borderTopRightRadius: isUser ? 4 : 24,
            borderBottomLeftRadius: 24,
            borderBottomRightRadius: 24,
            border: '1px solid',
            borderColor: isUser ? 'primary.main' : 'divider',
          }}
        >
          <Typography
            variant="body1"
            sx={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              lineHeight: 1.6,
            }}
          >
            {message.content}
          </Typography>
          {message.timestamp && (
            <Typography
              variant="caption"
              sx={{
                display: 'block',
                mt: 1,
                opacity: 0.7,
                textAlign: 'right',
                color: isUser ? 'white' : 'text.secondary',
              }}
            >
              {formatTime(message.timestamp)}
            </Typography>
          )}
        </Paper>
        
        {isUser && (
          <Avatar
            sx={{
              bgcolor: 'grey.100',
              width: 36,
              height: 36,
              color: 'primary.main',
              boxShadow: 1,
            }}
          >
            <PersonIcon sx={{ fontSize: 20 }} />
          </Avatar>
        )}
      </Box>
    </Fade>
  );
};

export default MessageBubble;