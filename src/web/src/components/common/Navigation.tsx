import React, { useCallback, useMemo } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom'; // ^6.0.0
import { useTranslation } from 'react-i18next'; // ^13.0.0
import classNames from 'classnames'; // ^2.3.2

import Button from './Button';
import { ROUTES, ROUTE_ROLES } from '../../constants/routes.constants';
import { useAuth } from '../../contexts/AuthContext';
import { UserRole } from '../../types/auth.types';

// Navigation item interface with accessibility and tracking
interface NavigationItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
  roles: UserRole[];
  ariaLabel?: string;
  trackingId: string;
}

// Props interface with accessibility options
interface NavigationProps {
  className?: string;
  collapsed?: boolean;
  ariaLabel?: string;
  testId?: string;
}

// Base navigation items with role-based access
const BASE_NAVIGATION_ITEMS: NavigationItem[] = [
  // Administrator routes
  {
    label: 'navigation.dashboard',
    path: ROUTES.ADMIN.DASHBOARD,
    roles: [UserRole.ADMINISTRATOR],
    trackingId: 'nav_admin_dashboard',
    ariaLabel: 'Admin Dashboard'
  },
  {
    label: 'navigation.users',
    path: ROUTES.ADMIN.USERS,
    roles: [UserRole.ADMINISTRATOR],
    trackingId: 'nav_admin_users',
    ariaLabel: 'User Management'
  },
  // Broker routes
  {
    label: 'navigation.enrollments',
    path: ROUTES.BROKER.ENROLLMENTS,
    roles: [UserRole.BROKER],
    trackingId: 'nav_broker_enrollments',
    ariaLabel: 'Enrollments'
  },
  {
    label: 'navigation.clients',
    path: ROUTES.BROKER.CLIENTS,
    roles: [UserRole.BROKER],
    trackingId: 'nav_broker_clients',
    ariaLabel: 'Client Management'
  },
  // Beneficiary routes
  {
    label: 'navigation.health_assessment',
    path: ROUTES.BENEFICIARY.HEALTH_ASSESSMENT,
    roles: [UserRole.BENEFICIARY],
    trackingId: 'nav_beneficiary_health',
    ariaLabel: 'Health Assessment'
  },
  {
    label: 'navigation.documents',
    path: ROUTES.BENEFICIARY.DOCUMENTS,
    roles: [UserRole.BENEFICIARY],
    trackingId: 'nav_beneficiary_docs',
    ariaLabel: 'Documents'
  },
  // HR Personnel routes
  {
    label: 'navigation.employees',
    path: ROUTES.HR.EMPLOYEES,
    roles: [UserRole.HR_PERSONNEL],
    trackingId: 'nav_hr_employees',
    ariaLabel: 'Employee Management'
  },
  {
    label: 'navigation.bulk_enrollment',
    path: ROUTES.HR.BULK_ENROLLMENT,
    roles: [UserRole.HR_PERSONNEL],
    trackingId: 'nav_hr_bulk_enroll',
    ariaLabel: 'Bulk Enrollment'
  },
  // Underwriter routes
  {
    label: 'navigation.risk_assessment',
    path: ROUTES.UNDERWRITER.RISK_ASSESSMENT,
    roles: [UserRole.UNDERWRITER],
    trackingId: 'nav_underwriter_risk',
    ariaLabel: 'Risk Assessment'
  },
  {
    label: 'navigation.policies',
    path: ROUTES.UNDERWRITER.POLICIES,
    roles: [UserRole.UNDERWRITER],
    trackingId: 'nav_underwriter_policies',
    ariaLabel: 'Policy Management'
  }
];

// Custom hook for role-based navigation items
const useNavigationItems = (userRole: UserRole): NavigationItem[] => {
  const { t } = useTranslation();

  return useMemo(() => {
    return BASE_NAVIGATION_ITEMS
      .filter(item => item.roles.includes(userRole))
      .map(item => ({
        ...item,
        label: t(item.label)
      }));
  }, [userRole, t]);
};

export const Navigation: React.FC<NavigationProps> = React.memo(({
  className,
  collapsed = false,
  ariaLabel = 'Main Navigation',
  testId = 'main-navigation'
}) => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Get role-based navigation items
  const navigationItems = useNavigationItems(user?.role || UserRole.BENEFICIARY);

  // Handle navigation item click with tracking
  const handleNavClick = useCallback((item: NavigationItem) => {
    // Track navigation event
    // if (window.newrelic) {
    //   window.newrelic.addPageAction('navigation_click', {
    //     trackingId: item.trackingId,
    //     path: item.path,
    //     userRole: user?.role
    //   });
    // }
    navigate(item.path);
  }, [navigate, user]);

  // Compute navigation styles based on AUSTA design system
  const navClasses = classNames(
    'navigation',
    {
      'navigation--collapsed': collapsed,
      'navigation--expanded': !collapsed
    },
    className
  );

  return (
    <nav
      className={navClasses}
      aria-label={ariaLabel}
      data-testid={testId}
      style={{
        padding: `var(--spacing-unit) 0`,
        backgroundColor: 'var(--color-background-secondary)',
        borderRight: '1px solid var(--color-text-tertiary)'
      }}
    >
      <ul
        className="navigation__list"
        role="menubar"
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          width: collapsed ? '64px' : '240px',
          transition: 'width var(--transition-speed-normal)'
        }}
      >
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.path;
          const itemClasses = classNames(
            'navigation__item',
            { 'navigation__item--active': isActive }
          );

          return (
            <li
              key={item.path}
              className={itemClasses}
              role="none"
              style={{
                margin: `var(--spacing-unit) 0`
              }}
            >
              <Button
                variant="text"
                onClick={() => handleNavClick(item)}
                className="navigation__button"
                ariaLabel={item.ariaLabel}
                fullWidth
                style={{
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  padding: `var(--spacing-unit) var(--spacing-unit-lg)`,
                  color: isActive ? 'var(--color-primary)' : 'var(--color-text-primary)',
                  backgroundColor: isActive ? 'var(--color-background-tertiary)' : 'transparent'
                }}
              >
                {item.icon && (
                  <span className="navigation__icon" aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                {!collapsed && (
                  <span className="navigation__label">
                    {item.label}
                  </span>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
});

Navigation.displayName = 'Navigation';

export default Navigation;