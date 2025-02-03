# AUSTA Health Portal Frontend

## Project Overview

The AUSTA Health Portal frontend is a React-based Single Page Application (SPA) that provides a comprehensive interface for health plan enrollment and management. This application is built using enterprise-grade technologies and follows strict security and compliance guidelines.

### Key Features
- Role-based access control with multi-factor authentication
- Dynamic health questionnaire with AI-powered flow
- Secure document upload and management
- Real-time policy status tracking
- Responsive design supporting all device sizes
- Full LGPD compliance implementation
- Comprehensive accessibility support (WCAG 2.1 AA)

### Technology Stack
- React 18.0+ (Frontend library)
- TypeScript 5.0+ (Type safety)
- Redux Toolkit (State management)
- React Query v4 (Server state management)
- Material-UI v5 (UI components)
- React Hook Form (Form handling)
- Jest & Testing Library (Testing)
- Vite (Build tool)

## Getting Started

### Prerequisites
- Node.js (v20 LTS)
- npm (v9+)
- Git

### Installation
```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables
```bash
# Required
VITE_API_URL=http://localhost:8080/api
VITE_AUTH_URL=http://localhost:8081/auth
VITE_ENVIRONMENT=development

# Optional
VITE_SENTRY_DSN=[your-sentry-dsn]
VITE_ANALYTICS_ID=[your-analytics-id]
```

## Development

### Available Scripts
```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run type checking
npm run type-check

# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Project Structure
```
src/
├── api/          # API integration modules
├── components/   # Reusable UI components
├── config/       # Application configuration
├── contexts/     # React context providers
├── hooks/        # Custom React hooks
├── pages/        # Application pages
├── services/     # Business logic
├── types/        # TypeScript definitions
├── utils/        # Utility functions
├── locales/      # i18n resources
└── theme/        # MUI theme customization
```

## Architecture

### Component Architecture
- Atomic design methodology
- Container/Presenter pattern
- Custom hooks for business logic
- Context API for global state
- Redux for complex state management

### State Management
- Redux Toolkit for global application state
- React Query for server state
- Context API for theme and authentication
- Local component state for UI-specific logic

### API Integration
- Axios for HTTP requests
- React Query for data fetching and caching
- Type-safe API clients
- Comprehensive error handling
- Request/response interceptors

## Security

### Authentication
- JWT-based authentication
- Refresh token rotation
- Multi-factor authentication support
- Secure token storage
- Session management

### Authorization
- Role-based access control (RBAC)
- Route protection
- Component-level permissions
- API request authorization

### LGPD Compliance
- Consent management
- Data minimization
- Purpose limitation
- User rights implementation
- Audit logging

## Deployment

### Build Process
```bash
# Production build
npm run build

# Build output: dist/
```

### Environment Configuration
- Development: `.env.development`
- Staging: `.env.staging`
- Production: `.env.production`

### Production Optimizations
- Code splitting
- Tree shaking
- Asset optimization
- Caching strategies
- Performance monitoring

## Troubleshooting

### Common Issues
1. **Build Failures**
   - Clear npm cache: `npm cache clean --force`
   - Delete node_modules: `rm -rf node_modules`
   - Reinstall dependencies: `npm install`

2. **Type Errors**
   - Run type checking: `npm run type-check`
   - Update TypeScript definitions
   - Check tsconfig.json settings

3. **Performance Issues**
   - Use React DevTools profiler
   - Check bundle size analysis
   - Review render optimization
   - Monitor network requests

### Support
- Technical Lead: [contact information]
- Security Team: [contact information]
- DevOps Support: [contact information]

## Contributing
- Follow TypeScript best practices
- Maintain 80%+ test coverage
- Use conventional commits
- Submit PRs against develop branch
- Include documentation updates

## License
Proprietary - AUSTA Health Systems