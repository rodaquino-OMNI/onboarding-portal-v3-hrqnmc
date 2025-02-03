import React, { useCallback, useEffect } from 'react';
import { Box, Drawer, IconButton, useMediaQuery } from '@mui/material';
import { styled } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import Navigation from './Navigation';
import { useTheme } from '../../contexts/ThemeContext';

// Constants for sidebar dimensions and transitions
const SIDEBAR_WIDTH_DESKTOP = 240;
const SIDEBAR_WIDTH_DESKTOP_COLLAPSED = 64;
const SIDEBAR_WIDTH_MOBILE = 280;
const MOBILE_BREAKPOINT = 600;
const TABLET_BREAKPOINT = 1024;
const TRANSITION_DURATION = 225;

// Props interface with accessibility support
interface SidebarProps {
  className?: string;
  open: boolean;
  onToggle: () => void;
  role?: string;
  ariaLabel?: string;
  testId?: string;
}

// Styled drawer component with theme support
const StyledDrawer = styled(Drawer, {
  shouldForwardProp: (prop) => prop !== 'width' && prop !== 'open'
})<{ width: number; open: boolean }>(({ theme, width, open }) => ({
  width: open ? width : SIDEBAR_WIDTH_DESKTOP_COLLAPSED,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  transition: theme.transitions.create(['width'], {
    easing: theme.transitions.easing.sharp,
    duration: TRANSITION_DURATION,
  }),
  '& .MuiDrawer-paper': {
    width: open ? width : SIDEBAR_WIDTH_DESKTOP_COLLAPSED,
    backgroundColor: theme.palette.background.paper,
    overflowX: 'hidden',
    borderRight: `1px solid ${theme.palette.divider}`,
    transition: theme.transitions.create(['width'], {
      easing: theme.transitions.easing.sharp,
      duration: TRANSITION_DURATION,
    }),
  },
}));

// Styled drawer header
const DrawerHeader = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  padding: theme.spacing(0, 1),
  minHeight: 64,
  position: 'relative',
  borderBottom: `1px solid ${theme.palette.divider}`,
}));

// Custom hook for responsive sidebar width
const useSidebarWidth = (isCollapsed: boolean, isMobile: boolean): number => {
  if (isMobile) return SIDEBAR_WIDTH_MOBILE;
  return isCollapsed ? SIDEBAR_WIDTH_DESKTOP_COLLAPSED : SIDEBAR_WIDTH_DESKTOP;
};

// Memoized sidebar component
const Sidebar = React.memo<SidebarProps>(({
  className,
  open,
  onToggle,
  role = 'navigation',
  ariaLabel = 'Main Navigation',
  testId = 'sidebar'
}) => {
  const { theme, isDarkMode } = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.between('sm', 'md'));
  
  // Calculate sidebar width based on screen size and state
  const sidebarWidth = useSidebarWidth(open, isMobile);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape' && open) {
      onToggle();
    }
  }, [open, onToggle]);

  // Set up keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <StyledDrawer
      variant={isMobile ? 'temporary' : 'permanent'}
      open={open}
      width={sidebarWidth}
      className={className}
      role={role}
      aria-label={ariaLabel}
      data-testid={testId}
      onClose={isMobile ? onToggle : undefined}
      ModalProps={{
        keepMounted: true, // Better mobile performance
      }}
    >
      <DrawerHeader>
        <IconButton
          onClick={onToggle}
          aria-label={open ? 'Collapse sidebar' : 'Expand sidebar'}
          sx={{
            marginRight: 1,
            '&:focus-visible': {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: '2px',
            },
          }}
        >
          {open ? (
            isDarkMode ? <ChevronLeftIcon /> : <ChevronRightIcon />
          ) : (
            <MenuIcon />
          )}
        </IconButton>
      </DrawerHeader>

      <Box
        component="nav"
        sx={{
          height: '100%',
          overflowY: 'auto',
          overflowX: 'hidden',
          scrollbarWidth: 'thin',
          '&::-webkit-scrollbar': {
            width: '6px',
          },
          '&::-webkit-scrollbar-thumb': {
            backgroundColor: theme.palette.divider,
            borderRadius: '3px',
          },
        }}
      >
        <Navigation
          collapsed={!open}
          ariaLabel="Main navigation menu"
          testId="sidebar-navigation"
        />
      </Box>
    </StyledDrawer>
  );
});

// Display name for debugging
Sidebar.displayName = 'Sidebar';

export default Sidebar;