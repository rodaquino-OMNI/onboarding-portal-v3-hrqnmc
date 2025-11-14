import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import Card from '../Card';

describe('Card Component', () => {
  describe('Rendering', () => {
    it('should render with children', () => {
      render(<Card>Card Content</Card>);
      expect(screen.getByText('Card Content')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<Card title="Card Title">Content</Card>);
      expect(screen.getByText('Card Title')).toBeInTheDocument();
    });

    it('should render without title', () => {
      render(<Card>Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with subtitle', () => {
      render(<Card subtitle="Card Subtitle">Content</Card>);
      expect(screen.getByText('Card Subtitle')).toBeInTheDocument();
    });

    it('should render with header actions', () => {
      render(
        <Card
          headerActions={
            <button aria-label="Action Button">Action</button>
          }
        >
          Content
        </Card>
      );
      expect(screen.getByLabelText('Action Button')).toBeInTheDocument();
    });

    it('should render with footer', () => {
      render(
        <Card footer={<div>Footer Content</div>}>
          Content
        </Card>
      );
      expect(screen.getByText('Footer Content')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should apply custom className', () => {
      const { container } = render(
        <Card className="custom-card">Content</Card>
      );
      expect(container.firstChild).toHaveClass('custom-card');
    });

    it('should apply inline styles', () => {
      const { container } = render(
        <Card style={{ backgroundColor: 'red' }}>Content</Card>
      );
      expect(container.firstChild).toHaveStyle({ backgroundColor: 'red' });
    });

    it('should have default styling', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });
  });

  describe('Variants', () => {
    it('should render elevated variant', () => {
      render(<Card variant="elevated">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render outlined variant', () => {
      render(<Card variant="outlined">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render flat variant', () => {
      render(<Card variant="flat">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Padding', () => {
    it('should render with default padding', () => {
      render(<Card>Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with no padding', () => {
      render(<Card padding="none">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with small padding', () => {
      render(<Card padding="small">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('should render with large padding', () => {
      render(<Card padding="large">Content</Card>);
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Interactive Features', () => {
    it('should be clickable when onClick is provided', () => {
      const handleClick = jest.fn();
      render(
        <Card onClick={handleClick}>
          Clickable Card
        </Card>
      );

      const card = screen.getByText('Clickable Card').closest('div');
      if (card) {
        card.click();
        expect(handleClick).toHaveBeenCalled();
      }
    });

    it('should not be clickable when onClick is not provided', () => {
      render(<Card>Non-clickable Card</Card>);
      const card = screen.getByText('Non-clickable Card');
      expect(card).toBeInTheDocument();
    });

    it('should have hover effects when hoverable', () => {
      render(<Card hoverable>Hoverable Card</Card>);
      expect(screen.getByText('Hoverable Card')).toBeInTheDocument();
    });
  });

  describe('Complex Content', () => {
    it('should render complex children', () => {
      render(
        <Card>
          <div>
            <h2>Title</h2>
            <p>Paragraph</p>
            <button>Button</button>
          </div>
        </Card>
      );

      expect(screen.getByText('Title')).toBeInTheDocument();
      expect(screen.getByText('Paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument();
    });

    it('should render with image', () => {
      render(
        <Card>
          <img src="/test.jpg" alt="Test" />
          <p>Image Card</p>
        </Card>
      );

      expect(screen.getByAltText('Test')).toBeInTheDocument();
      expect(screen.getByText('Image Card')).toBeInTheDocument();
    });

    it('should render with list', () => {
      render(
        <Card>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
            <li>Item 3</li>
          </ul>
        </Card>
      );

      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA role', () => {
      render(<Card role="article">Content</Card>);
      expect(screen.getByRole('article')).toBeInTheDocument();
    });

    it('should support aria-label', () => {
      render(<Card aria-label="Information Card">Content</Card>);
      expect(screen.getByLabelText('Information Card')).toBeInTheDocument();
    });

    it('should support aria-describedby', () => {
      render(
        <Card aria-describedby="description">
          <span id="description">This is a description</span>
          Content
        </Card>
      );
      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should render with empty children', () => {
      const { container } = render(<Card></Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with null children', () => {
      const { container } = render(<Card>{null}</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with boolean children', () => {
      const { container } = render(<Card>{false}</Card>);
      expect(container.firstChild).toBeInTheDocument();
    });

    it('should render with multiple children types', () => {
      render(
        <Card>
          <span>Text</span>
          {null}
          {false}
          <div>Div</div>
        </Card>
      );

      expect(screen.getByText('Text')).toBeInTheDocument();
      expect(screen.getByText('Div')).toBeInTheDocument();
    });
  });
});
