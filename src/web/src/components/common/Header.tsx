import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
  Badge,
  styled
} from '@mui/material';
import {
  LightMode,
  DarkMode,
  AccountCircle,
  Notifications,
  ExitToApp
} from '@mui/icons-material';

import { Navigation } from './Navigation';
import ErrorBoundary from './ErrorBoundary';
import Notification from './Notification';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { THEME } from '../../constants/app.constants';

// Styled components with AUSTA design system
const HeaderContainer = styled('header')(({ theme }) => ({
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  height: '64px',
  backgroundColor: theme.palette.background.paper,
  color: theme.palette.text.primary,
  boxShadow: theme.shadows[2],
  zIndex: THEME.Z_INDEX.HEADER,
  display: 'flex',
  alignItems: 'center',
  padding: theme.spacing(0, 3),
  transition: 'background-color 300ms ease-in-out',
}));

const HeaderContent = styled('div')({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  width: '100%',
  maxWidth: '1440px',
  margin: '0 auto',
});

const HeaderActions = styled('div')(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(2),
}));

// Props interface with accessibility support
interface HeaderProps {
  className?: string;
  testId?: string;
}

// Custom hook for session monitoring
const useSessionMonitor = () => {
  const { checkSessionTimeout } = useAuth();
  
  useEffect(() => {
    const interval = setInterval(checkSessionTimeout, 60000); // Check every minute
    return () => clearInterval(interval);
  }, [checkSessionTimeout]);
};

export const Header: React.FC<HeaderProps> = React.memo(({ 
  className,
  testId = 'header'
}) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { isDarkMode, toggleTheme } = useTheme();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  // Monitor session timeout
  useSessionMonitor();

  // Memoized values
  const isMenuOpen = Boolean(anchorEl);
  const menuId = 'primary-account-menu';
  const notificationId = 'notification-menu';

  // Handle profile menu
  const handleProfileMenuOpen = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  }, []);

  const handleProfileMenuClose = useCallback(() => {
    setAnchorEl(null);
  }, []);

  // Handle logout with cleanup
  const handleLogout = useCallback(async () => {
    handleProfileMenuClose();
    await logout();
  }, [logout]);

  // Render profile menu
  const renderMenu = useMemo(() => (
    <Menu
      anchorEl={anchorEl}
      id={menuId}
      keepMounted
      open={isMenuOpen}
      onClose={handleProfileMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
      PaperProps={{
        elevation: 3,
        'aria-label': t('header.profileMenu'),
      }}
    >
      <MenuItem onClick={handleProfileMenuClose}>
        {t('header.profile')}
      </MenuItem>
      <MenuItem onClick={handleLogout}>
        <ExitToApp sx={{ mr: 1 }} />
        {t('header.logout')}
      </MenuItem>
    </Menu>
  ), [anchorEl, isMenuOpen, handleProfileMenuClose, handleLogout, t]);

  return (
    <ErrorBoundary fallback={<div>Error loading header</div>}>
      <HeaderContainer 
        className={className}
        data-testid={testId}
        role="banner"
      >
        <HeaderContent>
          <Navigation />
          
          <HeaderActions>
            {/* Theme Toggle */}
            <Tooltip title={t('header.toggleTheme')} arrow>
              <IconButton
                onClick={toggleTheme}
                color="inherit"
                aria-label={t('header.toggleTheme')}
                edge="end"
              >
                {isDarkMode ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>

            {/* Notifications */}
            <Tooltip title={t('header.notifications')} arrow>
              <IconButton
                color="inherit"
                aria-label={t('header.notifications')}
                aria-controls={notificationId}
                edge="end"
              >
                <Badge badgeContent={notificationCount} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            {/* User Profile */}
            <Tooltip title={t('header.profile')} arrow>
              <IconButton
                edge="end"
                aria-label={t('header.profile')}
                aria-controls={menuId}
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                {user?.firstName ? (
                  <Avatar
                    alt={`${user.firstName} ${user.lastName}`}
                    src={user.avatarUrl}
                    sx={{ width: 32, height: 32 }}
                  >
                    {user.firstName[0]}
                  </Avatar>
                ) : (
                  <AccountCircle />
                )}
              </IconButton>
            </Tooltip>
          </HeaderActions>
        </HeaderContent>

        {/* Render Profile Menu */}
        {renderMenu}
      </HeaderContainer>
    </ErrorBoundary>
  );
});

Header.displayName = 'Header';

export default Header;