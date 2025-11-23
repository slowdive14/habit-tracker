import React, { useState } from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  Typography,
  Grid,
  IconButton,
  Fade,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PaletteIcon from '@mui/icons-material/Palette';
import { useTheme, THEMES, Theme } from '../contexts/ThemeContext';

const ThemeSelector: React.FC = () => {
  const { theme: currentTheme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [hoveredTheme, setHoveredTheme] = useState<Theme | null>(null);

  const handleThemeSelect = (themeId: Theme) => {
    setTheme(themeId);
    setTimeout(() => setOpen(false), 300); // Delay close for animation
  };

  return (
    <>
      {/* Floating Theme Toggle Button */}
      <Box
        onClick={() => setOpen(true)}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 64,
          height: 64,
          borderRadius: currentTheme === 'brutalist' ? 0 : '50%',
          background:
            currentTheme === 'brutalist'
              ? 'linear-gradient(135deg, #000 0%, #FF4500 100%)'
              : 'linear-gradient(135deg, #2D5016 0%, #C97D60 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow:
            currentTheme === 'brutalist'
              ? '8px 8px 0 #000'
              : '0 8px 24px rgba(45, 80, 22, 0.3)',
          border: currentTheme === 'brutalist' ? '4px solid #000' : '2px solid #2D5016',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          zIndex: 1000,
          '&:hover': {
            transform:
              currentTheme === 'brutalist'
                ? 'translate(-4px, -4px)'
                : 'translateY(-8px) scale(1.1)',
            boxShadow:
              currentTheme === 'brutalist'
                ? '12px 12px 0 #000'
                : '0 16px 40px rgba(45, 80, 22, 0.4)',
          },
        }}
      >
        <PaletteIcon sx={{ color: '#fff', fontSize: 32 }} />
      </Box>

      {/* Theme Selection Dialog */}
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="md"
        fullWidth
        TransitionComponent={Fade}
        PaperProps={{
          sx: {
            borderRadius: currentTheme === 'brutalist' ? 0 : 4,
            border: currentTheme === 'brutalist' ? '8px solid #000' : '2px solid #2D5016',
            boxShadow:
              currentTheme === 'brutalist'
                ? '16px 16px 0 #000'
                : '0 20px 60px rgba(45, 80, 22, 0.2)',
          },
        }}
      >
        <DialogContent sx={{ p: 4, position: 'relative' }}>
          {/* Close Button */}
          <IconButton
            onClick={() => setOpen(false)}
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              color: currentTheme === 'brutalist' ? '#000' : '#2D5016',
            }}
          >
            <CloseIcon />
          </IconButton>

          {/* Title */}
          <Typography
            variant="h3"
            sx={{
              fontFamily:
                currentTheme === 'brutalist'
                  ? "'Bebas Neue', sans-serif"
                  : "'Playfair Display', serif",
              fontWeight: 700,
              mb: 1,
              textTransform: currentTheme === 'brutalist' ? 'uppercase' : 'none',
              letterSpacing: currentTheme === 'brutalist' ? '-0.02em' : '0.02em',
            }}
          >
            {currentTheme === 'brutalist' ? 'CHOOSE YOUR STYLE' : 'Choose Your Style'}
          </Typography>

          <Typography
            variant="body1"
            sx={{
              mb: 4,
              color: 'text.secondary',
              fontFamily:
                currentTheme === 'zen-garden' ? "'Crimson Pro', serif" : 'inherit',
              fontStyle: currentTheme === 'zen-garden' ? 'italic' : 'normal',
            }}
          >
            Select a theme that matches your mood
          </Typography>

          {/* Theme Grid */}
          <Grid container spacing={3}>
            {THEMES.map((themeOption) => {
              const isSelected = currentTheme === themeOption.id;
              const isHovered = hoveredTheme === themeOption.id;

              return (
                <Grid item xs={12} md={6} key={themeOption.id}>
                  <Box
                    onClick={() => handleThemeSelect(themeOption.id)}
                    onMouseEnter={() => setHoveredTheme(themeOption.id)}
                    onMouseLeave={() => setHoveredTheme(null)}
                    sx={{
                      p: 3,
                      border: isSelected ? '4px solid' : '2px solid',
                      borderColor: isSelected
                        ? themeOption.colors[0]
                        : isHovered
                        ? themeOption.colors[2]
                        : 'grey.300',
                      borderRadius: themeOption.id === 'brutalist' ? 0 : 3,
                      cursor: 'pointer',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative',
                      overflow: 'hidden',
                      background: isSelected
                        ? `linear-gradient(135deg, ${themeOption.colors[1]} 0%, ${themeOption.colors[2]}30 100%)`
                        : '#fff',
                      boxShadow:
                        themeOption.id === 'brutalist'
                          ? isHovered || isSelected
                            ? '8px 8px 0 #000'
                            : '4px 4px 0 #000'
                          : isHovered || isSelected
                          ? '0 12px 40px rgba(0,0,0,0.15)'
                          : '0 4px 12px rgba(0,0,0,0.08)',
                      transform:
                        themeOption.id === 'brutalist'
                          ? isHovered
                            ? 'translate(-4px, -4px)'
                            : 'none'
                          : isHovered
                          ? 'translateY(-8px) scale(1.03)'
                          : 'none',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background:
                          themeOption.id === 'zen-garden'
                            ? 'radial-gradient(circle at top right, rgba(168, 181, 160, 0.1) 0%, transparent 70%)'
                            : 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.02) 10px, rgba(0,0,0,0.02) 20px)',
                        opacity: isHovered ? 1 : 0.5,
                        transition: 'opacity 0.3s ease',
                      },
                    }}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 12,
                          right: 12,
                          background: themeOption.colors[0],
                          color: '#fff',
                          padding: '4px 12px',
                          borderRadius: themeOption.id === 'brutalist' ? 0 : 2,
                          fontFamily:
                            themeOption.id === 'brutalist'
                              ? "'Space Mono', monospace"
                              : "'Crimson Pro', serif",
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          textTransform: themeOption.id === 'brutalist' ? 'uppercase' : 'none',
                          letterSpacing: themeOption.id === 'brutalist' ? '0.1em' : '0.05em',
                          zIndex: 1,
                        }}
                      >
                        {themeOption.id === 'brutalist' ? 'ACTIVE' : 'Active'}
                      </Box>
                    )}

                    {/* Theme Emoji */}
                    <Typography
                      sx={{
                        fontSize: '4rem',
                        mb: 2,
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                        animation: isHovered
                          ? themeOption.id === 'brutalist'
                            ? 'glitch 0.5s infinite'
                            : 'float 2s ease-in-out infinite'
                          : 'none',
                        '@keyframes glitch': {
                          '0%, 100%': { transform: 'translate(0)' },
                          '33%': { transform: 'translate(-2px, 2px)' },
                          '66%': { transform: 'translate(2px, -2px)' },
                        },
                        '@keyframes float': {
                          '0%, 100%': { transform: 'translateY(0)' },
                          '50%': { transform: 'translateY(-10px)' },
                        },
                      }}
                    >
                      {themeOption.emoji}
                    </Typography>

                    {/* Theme Name */}
                    <Typography
                      variant="h5"
                      sx={{
                        fontFamily:
                          themeOption.id === 'brutalist'
                            ? "'Bebas Neue', sans-serif"
                            : "'Playfair Display', serif",
                        fontWeight: 700,
                        mb: 1,
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 1,
                        textTransform: themeOption.id === 'brutalist' ? 'uppercase' : 'none',
                        letterSpacing:
                          themeOption.id === 'brutalist' ? '-0.02em' : '0.02em',
                      }}
                    >
                      {themeOption.displayName}
                    </Typography>

                    {/* Theme Description */}
                    <Typography
                      variant="body2"
                      sx={{
                        textAlign: 'center',
                        color: 'text.secondary',
                        mb: 2,
                        position: 'relative',
                        zIndex: 1,
                        fontFamily:
                          themeOption.id === 'zen-garden'
                            ? "'Crimson Pro', serif"
                            : "'IBM Plex Sans', sans-serif",
                        fontStyle: themeOption.id === 'zen-garden' ? 'italic' : 'normal',
                      }}
                    >
                      {themeOption.description}
                    </Typography>

                    {/* Color Palette */}
                    <Box
                      sx={{
                        display: 'flex',
                        gap: 1,
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 1,
                      }}
                    >
                      {themeOption.colors.map((color, index) => (
                        <Box
                          key={index}
                          sx={{
                            width: 48,
                            height: 48,
                            backgroundColor: color,
                            border:
                              themeOption.id === 'brutalist'
                                ? '3px solid #000'
                                : '2px solid rgba(0,0,0,0.2)',
                            borderRadius: themeOption.id === 'brutalist' ? 0 : 1,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                              transform:
                                themeOption.id === 'brutalist'
                                  ? 'translate(-2px, -2px)'
                                  : 'scale(1.2)',
                              boxShadow:
                                themeOption.id === 'brutalist'
                                  ? '4px 4px 0 #000'
                                  : '0 4px 12px rgba(0,0,0,0.2)',
                            },
                          }}
                        />
                      ))}
                    </Box>
                  </Box>
                </Grid>
              );
            })}
          </Grid>

          {/* Footer Tip */}
          <Typography
            variant="caption"
            sx={{
              display: 'block',
              textAlign: 'center',
              mt: 3,
              color: 'text.secondary',
              fontStyle: 'italic',
            }}
          >
            Your theme preference is automatically saved
          </Typography>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default ThemeSelector;
