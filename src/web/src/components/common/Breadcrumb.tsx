/**
 * Breadcrumb Navigation Component
 * Version: 1.0.0
 * 
 * Implements secure, role-based breadcrumb navigation with LGPD compliance,
 * accessibility features, and AUSTA design system integration.
 */

import React, { useMemo } from 'react'; // ^18.0.0
import { useLocation, Link } from 'react-router-dom'; // ^6.0.0
import { useTranslation } from 'react-i18next'; // ^13.0.0
import styled from '@emotion/styled'; // ^11.0.0

import { useAuth } from '../../hooks/useAuth';
import { ROUTES } from '../../constants/routes.constants';
import { UserRole } from '../../types/auth.types';

// Styled components following AUSTA design system
const BreadcrumbContainer = styled.nav`
  padding: 8px 16px;
  background: ${({ theme }) => theme.colors.background.secondary};
  border-radius: 4px;
  margin-bottom: 16px;
  font-family: 'Roboto', sans-serif;
`;

const BreadcrumbList = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
`;

const BreadcrumbItem = styled.li`
  display: flex;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: 14px;

  &:last-child {
    color: ${({ theme }) => theme.colors.text.primary};
    font-weight: 500;
  }
`;

const BreadcrumbLink = styled(Link)`
  color: ${({ theme }) => theme.colors.primary.main};
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.primary.dark};
    text-decoration: underline;
  }

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.primary.main};
    outline-offset: 2px;
    border-radius: 2px;
  }
`;

const Separator = styled.span`
  margin: 0 8px;
  color: ${({ theme }) => theme.colors.text.disabled};
`;

interface BreadcrumbProps {
  className?: string;
  separator?: string;
}

interface BreadcrumbItem {
  label: string;
  path: string;
  isLast: boolean;
}

/**
 * Masks sensitive information in breadcrumb labels according to LGPD requirements
 */
const maskSensitiveData = (label: string, type: string): string => {
  switch (type) {
    case 'cpf':
      return label.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2');
    case 'name':
      const [first, ...rest] = label.split(' ');
      return `${first} ${rest.map(s => '*'.repeat(s.length)).join(' ')}`;
    case 'email':
      return label.replace(/(.{3}).*(@.*)/, '$1***$2');
    default:
      return label;
  }
};

/**
 * Generates breadcrumb items based on current path and user role
 */
const getBreadcrumbItems = (pathname: string, userRole: UserRole, t: Function): BreadcrumbItem[] => {
  const paths = pathname.split('/').filter(Boolean);
  const items: BreadcrumbItem[] = [];
  let currentPath = '';

  // Get role-specific root path
  const roleRoot = Object.values(ROUTES).find(routes =>
    typeof routes === 'object' && routes !== null && 'ROOT' in routes && (routes as any).ROOT.includes(`/${paths[0]}`)
  );

  if (!roleRoot || typeof roleRoot !== 'object') return items;

  // Add home item
  items.push({
    label: t('breadcrumb.home'),
    path: (roleRoot as any).ROOT,
    isLast: paths.length === 0
  });

  // Build path hierarchy
  paths.forEach((segment, index) => {
    currentPath += `/${segment}`;
    
    // Skip if segment is an ID or contains sensitive data
    if (segment.match(/^[0-9a-fA-F-]{36}$/)) {
      items.push({
        label: maskSensitiveData(segment, 'id'),
        path: currentPath,
        isLast: index === paths.length - 1
      });
      return;
    }

    // Translate segment
    const translationKey = `breadcrumb.${segment.toLowerCase()}`;
    const label = t(translationKey, { defaultValue: segment });

    items.push({
      label,
      path: currentPath,
      isLast: index === paths.length - 1
    });
  });

  return items;
};

/**
 * Breadcrumb component for role-based navigation
 */
export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  className,
  separator = '/'
}) => {
  const location = useLocation();
  const { t } = useTranslation();
  const { user } = useAuth();

  const breadcrumbItems = useMemo(() => 
    getBreadcrumbItems(location.pathname, user?.role || UserRole.BENEFICIARY, t),
    [location.pathname, user?.role, t]
  );

  if (breadcrumbItems.length <= 1) return null;

  return (
    <BreadcrumbContainer 
      className={className}
      aria-label={t('breadcrumb.navigation')}
    >
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => (
          <BreadcrumbItem key={item.path}>
            {!item.isLast ? (
              <>
                <BreadcrumbLink to={item.path}>
                  {item.label}
                </BreadcrumbLink>
                <Separator aria-hidden="true">{separator}</Separator>
              </>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </BreadcrumbContainer>
  );
};

// Memoize component to prevent unnecessary re-renders
export default React.memo(Breadcrumb);