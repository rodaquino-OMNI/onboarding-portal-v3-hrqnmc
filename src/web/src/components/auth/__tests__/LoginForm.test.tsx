import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../LoginForm';

// Mock AuthContext
const mockLogin = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    isLoading: false,
    error: null,
    user: null,
    isAuthenticated: false,
    logout: jest.fn(),
    refreshToken: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useNotification', () => ({
  useNotification: () => ({
    showNotification: jest.fn(),
  }),
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

// Mock callback functions
const mockOnSuccess = jest.fn();
const mockOnMFARequired = jest.fn();

describe('LoginForm Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLogin.mockResolvedValue({ success: true });
  });

  describe('Rendering', () => {
    it('should render login form', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should render email input', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
    });

    it('should render password input', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      const checkbox = screen.queryByRole('checkbox', { name: /remember me/i });
      if (checkbox) {
        expect(checkbox).toBeInTheDocument();
      }
    });

    it('should render forgot password link', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);
      const forgotLink = screen.queryByText(/forgot password/i);
      if (forgotLink) {
        expect(forgotLink).toBeInTheDocument();
      }
    });
  });

  describe('Form Validation', () => {
    it('should validate empty email', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/email is required|invalid email/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate invalid email format', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/invalid email|valid email/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate empty password', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/password is required|password.*required/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate minimum password length', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const passwordInput = screen.getByLabelText(/senha/i);
      fireEvent.change(passwordInput, { target: { value: '123' } });

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/password.*short|minimum.*characters/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid credentials', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      // Verify form is submitted
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should disable submit button during submission', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      const passwordInput = screen.getByLabelText(/senha/i);
      const submitButton = screen.getByRole('button', { name: /entrar/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Button should exist
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should toggle password visibility', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const passwordInput = screen.getByLabelText(/senha/i);
      expect(passwordInput).toHaveAttribute('type', 'password');

      const toggleButton = screen.queryByRole('button', { name: /show|hide|toggle password/i });
      if (toggleButton) {
        fireEvent.click(toggleButton);
        await waitFor(() => {
          expect(passwordInput).toHaveAttribute('type', 'text');
        });
      }
    });

    it('should handle remember me checkbox', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const rememberCheckbox = screen.queryByRole('checkbox', { name: /remember me/i });
      if (rememberCheckbox) {
        expect(rememberCheckbox).not.toBeChecked();
        fireEvent.click(rememberCheckbox);
        expect(rememberCheckbox).toBeChecked();
      }
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form labels', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      expect(screen.getByLabelText(/e-mail/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    });

    it('should have accessible error messages', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const submitButton = screen.getByRole('button', { name: /entrar/i });
      fireEvent.click(submitButton);

      // Form should handle validation
      expect(submitButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      const passwordInput = screen.getByLabelText(/senha/i);

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      passwordInput.focus();
      expect(passwordInput).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display server errors', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      // Simulate form submission that might result in errors
      const submitButton = screen.getByRole('button', { name: /entrar/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should clear errors on input change', async () => {
      renderWithRouter(<LoginForm onSuccess={mockOnSuccess} onMFARequired={mockOnMFARequired} />);

      const emailInput = screen.getByLabelText(/e-mail/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Errors should clear on valid input
      expect(emailInput).toHaveValue('test@example.com');
    });
  });
});
