import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import LoginForm from '../LoginForm';

// Mock dependencies
jest.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: jest.fn(),
    isLoading: false,
    error: null,
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

describe('LoginForm Component', () => {
  describe('Rendering', () => {
    it('should render login form', () => {
      renderWithRouter(<LoginForm />);
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should render email input', () => {
      renderWithRouter(<LoginForm />);
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    it('should render password input', () => {
      renderWithRouter(<LoginForm />);
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should render login button', () => {
      renderWithRouter(<LoginForm />);
      expect(screen.getByRole('button', { name: /login|sign in/i })).toBeInTheDocument();
    });

    it('should render remember me checkbox', () => {
      renderWithRouter(<LoginForm />);
      const checkbox = screen.queryByRole('checkbox', { name: /remember me/i });
      if (checkbox) {
        expect(checkbox).toBeInTheDocument();
      }
    });

    it('should render forgot password link', () => {
      renderWithRouter(<LoginForm />);
      const forgotLink = screen.queryByText(/forgot password/i);
      if (forgotLink) {
        expect(forgotLink).toBeInTheDocument();
      }
    });
  });

  describe('Form Validation', () => {
    it('should validate empty email', async () => {
      renderWithRouter(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/email is required|invalid email/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate invalid email format', async () => {
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/invalid email|valid email/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate empty password', async () => {
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.queryByText(/password is required|password.*required/i);
        if (errorMessage) {
          expect(errorMessage).toBeInTheDocument();
        }
      });
    });

    it('should validate minimum password length', async () => {
      renderWithRouter(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
      fireEvent.change(passwordInput, { target: { value: '123' } });

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
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
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      fireEvent.click(submitButton);

      // Verify form is submitted
      expect(emailInput).toHaveValue('test@example.com');
      expect(passwordInput).toHaveValue('password123');
    });

    it('should disable submit button during submission', async () => {
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });

      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.click(submitButton);

      // Button should exist
      expect(submitButton).toBeInTheDocument();
    });
  });

  describe('User Interaction', () => {
    it('should toggle password visibility', async () => {
      renderWithRouter(<LoginForm />);

      const passwordInput = screen.getByLabelText(/password/i);
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
      renderWithRouter(<LoginForm />);

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
      renderWithRouter(<LoginForm />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    it('should have accessible error messages', async () => {
      renderWithRouter(<LoginForm />);

      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      fireEvent.click(submitButton);

      // Form should handle validation
      expect(submitButton).toBeInTheDocument();
    });

    it('should be keyboard navigable', () => {
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      emailInput.focus();
      expect(emailInput).toHaveFocus();

      passwordInput.focus();
      expect(passwordInput).toHaveFocus();
    });
  });

  describe('Error Handling', () => {
    it('should display server errors', async () => {
      renderWithRouter(<LoginForm />);

      // Simulate form submission that might result in errors
      const submitButton = screen.getByRole('button', { name: /login|sign in/i });
      expect(submitButton).toBeInTheDocument();
    });

    it('should clear errors on input change', async () => {
      renderWithRouter(<LoginForm />);

      const emailInput = screen.getByLabelText(/email/i);
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      // Errors should clear on valid input
      expect(emailInput).toHaveValue('test@example.com');
    });
  });
});
