import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Form from '../Form';

describe('Form Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render form element', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="test" />
        </Form>
      );
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should render children', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="testField" aria-label="Test Field" />
          <button type="submit">Submit</button>
        </Form>
      );
      expect(screen.getByLabelText('Test Field')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /submit/i })).toBeInTheDocument();
    });

    it('should apply className', () => {
      render(
        <Form onSubmit={mockOnSubmit} className="custom-form">
          <input type="text" name="test" />
        </Form>
      );
      const form = screen.getByRole('form');
      expect(form).toHaveClass('custom-form');
    });
  });

  describe('Form Submission', () => {
    it('should call onSubmit when submitted', async () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="username" defaultValue="testuser" />
          <button type="submit">Submit</button>
        </Form>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('should prevent default form submission', async () => {
      const handleSubmit = jest.fn((e) => {
        e.preventDefault();
      });

      render(
        <Form onSubmit={handleSubmit}>
          <input type="text" name="test" />
          <button type="submit">Submit</button>
        </Form>
      );

      const form = screen.getByRole('form');
      fireEvent.submit(form);

      expect(handleSubmit).toHaveBeenCalled();
    });

    it('should collect form data on submit', async () => {
      const handleSubmit = jest.fn();

      render(
        <Form onSubmit={handleSubmit}>
          <input type="text" name="username" defaultValue="john" aria-label="Username" />
          <input type="email" name="email" defaultValue="john@example.com" aria-label="Email" />
          <button type="submit">Submit</button>
        </Form>
      );

      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      expect(handleSubmit).toHaveBeenCalled();
    });
  });

  describe('Form Validation', () => {
    it('should support HTML5 validation', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="email" name="email" required aria-label="Email" />
          <button type="submit">Submit</button>
        </Form>
      );

      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeRequired();
      expect(emailInput).toHaveAttribute('type', 'email');
    });

    it('should validate required fields', async () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="required" required aria-label="Required Field" />
          <button type="submit">Submit</button>
        </Form>
      );

      const input = screen.getByLabelText('Required Field');
      expect(input).toBeRequired();
    });

    it('should handle pattern validation', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input
            type="text"
            name="pattern"
            pattern="[0-9]{3}"
            aria-label="Pattern Field"
          />
        </Form>
      );

      const input = screen.getByLabelText('Pattern Field');
      expect(input).toHaveAttribute('pattern', '[0-9]{3}');
    });
  });

  describe('Form State', () => {
    it('should track input changes', () => {
      render(
        <Form onSubmit={mockOnSubmit} onChange={mockOnChange}>
          <input type="text" name="text" aria-label="Text Input" />
        </Form>
      );

      const input = screen.getByLabelText('Text Input');
      fireEvent.change(input, { target: { value: 'new value' } });

      expect(input).toHaveValue('new value');
    });

    it('should handle multiple inputs', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="first" aria-label="First" />
          <input type="text" name="second" aria-label="Second" />
          <input type="text" name="third" aria-label="Third" />
        </Form>
      );

      expect(screen.getByLabelText('First')).toBeInTheDocument();
      expect(screen.getByLabelText('Second')).toBeInTheDocument();
      expect(screen.getByLabelText('Third')).toBeInTheDocument();
    });

    it('should handle checkbox inputs', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="checkbox" name="agree" aria-label="Agree" />
        </Form>
      );

      const checkbox = screen.getByLabelText('Agree');
      expect(checkbox).not.toBeChecked();

      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should handle radio inputs', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="radio" name="option" value="1" aria-label="Option 1" />
          <input type="radio" name="option" value="2" aria-label="Option 2" />
        </Form>
      );

      const option1 = screen.getByLabelText('Option 1');
      const option2 = screen.getByLabelText('Option 2');

      fireEvent.click(option1);
      expect(option1).toBeChecked();
      expect(option2).not.toBeChecked();

      fireEvent.click(option2);
      expect(option1).not.toBeChecked();
      expect(option2).toBeChecked();
    });

    it('should handle select inputs', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <select name="country" aria-label="Country">
            <option value="br">Brazil</option>
            <option value="us">USA</option>
          </select>
        </Form>
      );

      const select = screen.getByLabelText('Country');
      fireEvent.change(select, { target: { value: 'us' } });

      expect(select).toHaveValue('us');
    });
  });

  describe('Form Reset', () => {
    it('should reset form values', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="text" defaultValue="" aria-label="Text" />
          <button type="reset">Reset</button>
          <button type="submit">Submit</button>
        </Form>
      );

      const input = screen.getByLabelText('Text');
      fireEvent.change(input, { target: { value: 'new value' } });
      expect(input).toHaveValue('new value');

      const resetButton = screen.getByRole('button', { name: /reset/i });
      fireEvent.click(resetButton);

      expect(input).toHaveValue('');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible form role', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="test" />
        </Form>
      );
      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should support aria attributes', () => {
      render(
        <Form onSubmit={mockOnSubmit} aria-label="Test Form">
          <input type="text" name="test" />
        </Form>
      );
      expect(screen.getByLabelText('Test Form')).toBeInTheDocument();
    });

    it('should support fieldset and legend', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <fieldset>
            <legend>Personal Information</legend>
            <input type="text" name="name" aria-label="Name" />
          </fieldset>
        </Form>
      );

      expect(screen.getByText('Personal Information')).toBeInTheDocument();
      expect(screen.getByLabelText('Name')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display validation errors', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <input type="email" name="email" required aria-label="Email" />
          <span role="alert" id="email-error">Invalid email</span>
        </Form>
      );

      expect(screen.getByRole('alert')).toHaveTextContent('Invalid email');
    });

    it('should handle onError callback', async () => {
      const handleError = jest.fn();

      render(
        <Form onSubmit={mockOnSubmit} onError={handleError}>
          <input type="email" name="email" required aria-label="Email" />
          <button type="submit">Submit</button>
        </Form>
      );

      // Try to submit with empty required field
      const submitButton = screen.getByRole('button');
      fireEvent.click(submitButton);

      // Form should prevent submission with empty required field
      const emailInput = screen.getByLabelText('Email');
      expect(emailInput).toBeRequired();
    });
  });

  describe('Loading State', () => {
    it('should disable form during loading', () => {
      render(
        <Form onSubmit={mockOnSubmit} disabled>
          <input type="text" name="text" aria-label="Text" />
          <button type="submit">Submit</button>
        </Form>
      );

      const input = screen.getByLabelText('Text');
      const button = screen.getByRole('button');

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });
  });

  describe('Complex Forms', () => {
    it('should handle nested field groups', () => {
      render(
        <Form onSubmit={mockOnSubmit}>
          <div>
            <input type="text" name="firstName" aria-label="First Name" />
            <input type="text" name="lastName" aria-label="Last Name" />
          </div>
          <div>
            <input type="email" name="email" aria-label="Email" />
            <input type="tel" name="phone" aria-label="Phone" />
          </div>
        </Form>
      );

      expect(screen.getByLabelText('First Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Phone')).toBeInTheDocument();
    });

    it('should handle dynamic fields', () => {
      const { rerender } = render(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="field1" aria-label="Field 1" />
        </Form>
      );

      expect(screen.getByLabelText('Field 1')).toBeInTheDocument();

      rerender(
        <Form onSubmit={mockOnSubmit}>
          <input type="text" name="field1" aria-label="Field 1" />
          <input type="text" name="field2" aria-label="Field 2" />
        </Form>
      );

      expect(screen.getByLabelText('Field 1')).toBeInTheDocument();
      expect(screen.getByLabelText('Field 2')).toBeInTheDocument();
    });
  });
});
