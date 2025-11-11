import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../Button';

describe('Button Component', () => {
  describe('Rendering', () => {
    it('should render with children text', () => {
      render(<Button>Click me</Button>);
      expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
    });

    it('should render with default props', () => {
      render(<Button>Default Button</Button>);
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('should render with primary variant', () => {
      render(<Button variant="primary">Primary Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with secondary variant', () => {
      render(<Button variant="secondary">Secondary Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with outline variant', () => {
      render(<Button variant="outline">Outline Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with text variant', () => {
      render(<Button variant="text">Text Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Sizes', () => {
    it('should render with small size', () => {
      render(<Button size="sm">Small Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with medium size (default)', () => {
      render(<Button size="md">Medium Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should render with large size', () => {
      render(<Button size="lg">Large Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('States', () => {
    it('should be disabled when disabled prop is true', () => {
      render(<Button disabled>Disabled Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should show loading state', () => {
      render(<Button loading>Loading Button</Button>);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should be disabled when loading', () => {
      render(<Button loading>Loading Button</Button>);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should render with full width', () => {
      render(<Button fullWidth>Full Width Button</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClick handler when clicked', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Clickable Button</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('should not call onClick when disabled', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} disabled>Disabled Button</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });

    it('should not call onClick when loading', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick} loading>Loading Button</Button>);

      fireEvent.click(screen.getByRole('button'));
      expect(handleClick).not.toHaveBeenCalled();
    });
  });

  describe('Button Types', () => {
    it('should render as submit button', () => {
      render(<Button type="submit">Submit Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
    });

    it('should render as reset button', () => {
      render(<Button type="reset">Reset Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'reset');
    });

    it('should render as button type by default', () => {
      render(<Button>Default Type Button</Button>);
      expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label when provided', () => {
      render(<Button ariaLabel="Accessible Button">Button</Button>);
      const button = screen.getByRole('button', { name: /button/i });
      expect(button).toBeInTheDocument();
    });

    it('should have progressbar role when loading', () => {
      render(<Button loading>Loading</Button>);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should be keyboard accessible', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Keyboard Button</Button>);

      const button = screen.getByRole('button');
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('Custom Styling', () => {
    it('should apply custom className', () => {
      render(<Button className="custom-class">Custom Button</Button>);
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });

    it('should apply inline styles', () => {
      render(<Button style={{ color: 'red' }}>Styled Button</Button>);
      expect(screen.getByRole('button')).toHaveStyle({ color: 'red' });
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid clicks', () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Multi-click Button</Button>);

      const button = screen.getByRole('button');
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);

      expect(handleClick).toHaveBeenCalledTimes(3);
    });

    it('should render with React element as children', () => {
      render(
        <Button>
          <span>Icon</span> Button Text
        </Button>
      );
      expect(screen.getByText('Button Text')).toBeInTheDocument();
    });

    it('should handle empty children gracefully', () => {
      render(<Button>{''}</Button>);
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });
});
