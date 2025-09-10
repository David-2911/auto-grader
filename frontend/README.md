# Auto-Grader Frontend

A modern, scalable React frontend built with TypeScript, Material-UI, and comprehensive state management for the Auto-Grader system.

## 🚀 Features

### 🏗️ Architecture
- **React 18** with TypeScript for type safety
- **Vite** for fast development and optimized builds
- **Material-UI (MUI)** for consistent, accessible UI components
- **Redux Toolkit** with RTK Query for state management and API calls
- **React Router v6** for routing with protected routes
- **React Hook Form** with Yup validation for forms

### 🎨 Design System
- **Custom theme system** with light/dark mode support
- **Responsive design** with mobile-first approach
- **CSS-in-JS** with styled components
- **Global CSS variables** for consistent spacing and colors
- **Utility classes** for rapid development

### 🔐 Authentication & Security
- **JWT-based authentication**
- **Role-based access control** (Student, Teacher, Admin)
- **Protected routes** with automatic redirects
- **Token refresh** handling
- **Secure API communication**

### 📊 Data Management
- **RTK Query** for efficient API state management
- **Real-time updates** with optimistic updates
- **Caching and invalidation** strategies
- **Background refetching**
- **Error handling and retry logic**

### 🧪 Testing & Quality
- **Vitest** for unit and integration testing
- **Testing Library** for component testing
- **ESLint** and **Prettier** for code quality
- **TypeScript** for compile-time error checking
- **Storybook** for component documentation

## 📁 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── ui/              # Basic UI components (Button, Modal, etc.)
│   ├── forms/           # Form components and validation
│   ├── layout/          # Layout components (Header, Sidebar, etc.)
│   ├── charts/          # Data visualization components
│   └── features/        # Feature-specific components
├── pages/               # Page components
│   ├── auth/           # Authentication pages
│   ├── dashboard/      # Dashboard pages
│   ├── courses/        # Course management pages
│   ├── assignments/    # Assignment pages
│   └── users/          # User management pages
├── hooks/               # Custom React hooks
├── services/            # API services and utilities
├── store/               # Redux store configuration
│   ├── slices/         # Redux slices
│   └── api/            # RTK Query API definitions
├── routes/              # Routing configuration
├── styles/              # Global styles and theme
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── test/                # Test configuration and utilities
```

## 🛠️ Available Scripts

### Development
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run serve        # Preview production build
```

### Code Quality
```bash
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format with Prettier
npm run format:check # Check Prettier formatting
npm run typecheck    # Run TypeScript compiler
```

### Testing
```bash
npm run test         # Run tests
npm run test:ui      # Run tests with UI
npm run test:coverage # Run tests with coverage
```

### Storybook
```bash
npm run storybook    # Start Storybook dev server
npm run build-storybook # Build Storybook
```

## 🏃‍♂️ Getting Started

### Prerequisites
- Node.js 18+ and npm
- Backend API server running on port 5000

### Installation
```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

The application will be available at `http://localhost:3000`

## 🔧 Configuration

### Environment Variables
Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:5000/api
VITE_APP_NAME=Auto-Grader
VITE_APP_VERSION=1.0.0
```

### Theme Customization
Modify `src/styles/theme.ts` to customize:
- Color palette
- Typography
- Spacing
- Component styles
- Breakpoints

### API Configuration
Update `src/services/api.service.ts` for:
- Base URL configuration
- Request/response interceptors
- Error handling
- Authentication headers

## 🎯 Key Components

### UI Components
- **Button**: Enhanced button with loading states
- **Card**: Flexible card component with actions
- **Modal**: Accessible modal dialogs
- **DataTable**: Feature-rich data table with sorting, filtering, pagination
- **FormField**: Controlled form inputs with validation

### Layout Components
- **Header**: Application header with navigation and user menu
- **Sidebar**: Collapsible navigation sidebar with role-based menu items
- **Layout**: Main layout wrapper with responsive design

### Form Components
- **FormField**: Integrated with React Hook Form and validation
- **Custom validators**: Role-specific validation rules
- **Error handling**: Comprehensive error display and recovery

## 🔄 State Management

### Redux Store Structure
```
store/
├── auth         # User authentication state
├── ui           # UI state (theme, sidebar, modals)
├── notifications # Toast notifications
└── api          # RTK Query cache and API state
```

### API Integration
- **Automatic caching** with smart invalidation
- **Optimistic updates** for better UX
- **Background refetching** for fresh data
- **Error boundaries** for graceful error handling

## 🎨 Styling System

### CSS Variables
Global design tokens available throughout the application:
- Colors, spacing, typography
- Shadows, borders, animations
- Responsive breakpoints

### Utility Classes
Ready-to-use classes for:
- Flexbox layouts
- Spacing and sizing
- Typography styles
- Color schemes

### Component Styling
- **Material-UI theming** for consistent component styling
- **Styled components** for custom styling
- **CSS-in-JS** for dynamic styles

## 🧪 Testing Strategy

### Unit Tests
- Component testing with React Testing Library
- Hook testing with custom test utilities
- Service and utility function testing

### Integration Tests
- User flow testing
- API integration testing
- State management testing

### E2E Tests
- Critical user journeys
- Cross-browser compatibility
- Accessibility testing

## 🚀 Deployment

### Build Optimization
- **Code splitting** by route and feature
- **Tree shaking** for minimal bundle size
- **Asset optimization** for faster loading
- **Caching strategies** for better performance

### Production Checklist
- [ ] Environment variables configured
- [ ] API endpoints updated
- [ ] Error tracking enabled
- [ ] Performance monitoring setup
- [ ] Security headers configured

## 🤝 Contributing

### Code Style
- Use TypeScript for all new code
- Follow ESLint and Prettier configurations
- Write tests for new components and features
- Update documentation for new features

### Component Development
1. Create component in appropriate directory
2. Add TypeScript interfaces
3. Implement with Material-UI components
4. Add tests and stories
5. Update exports

## 📝 Best Practices

### Component Design
- Keep components small and focused
- Use TypeScript interfaces for props
- Implement error boundaries
- Follow accessibility guidelines

### State Management
- Use RTK Query for server state
- Keep local state minimal
- Normalize complex data structures
- Use selectors for derived state

### Performance
- Lazy load routes and components
- Memoize expensive calculations
- Optimize re-renders with React.memo
- Use proper dependency arrays in hooks

## 🐛 Troubleshooting

### Common Issues
1. **Build errors**: Check TypeScript types and imports
2. **API errors**: Verify backend is running and CORS is configured
3. **Routing issues**: Check protected route configurations
4. **State issues**: Use Redux DevTools for debugging

### Development Tips
- Use React DevTools for component debugging
- Use Redux DevTools for state inspection
- Check network tab for API issues
- Use browser dev tools for styling issues

## 📚 Additional Resources

- [React Documentation](https://reactjs.org/)
- [Material-UI Documentation](https://mui.com/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Router Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
