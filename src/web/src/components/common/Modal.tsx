import React, { useEffect, useCallback, useRef } from 'react'; // v18.0.0
import ReactDOM from 'react-dom'; // v18.0.0
import classNames from 'classnames'; // v2.3.2
import Button from './Button';

interface ModalProps {
  /** Controls modal visibility */
  isOpen: boolean;
  /** Handler for closing the modal */
  onClose: () => void;
  /** Modal title displayed in header */
  title: string;
  /** Modal content */
  children: React.ReactNode;
  /** Modal size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Controls if clicking overlay closes modal */
  closeOnOverlayClick?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Element to receive initial focus */
  initialFocusRef?: React.RefObject<HTMLElement>;
  /** Element to return focus to on close */
  returnFocusRef?: React.RefObject<HTMLElement>;
  /** Accessible label */
  ariaLabel?: string;
  /** ID of element describing modal */
  ariaDescribedBy?: string;
}

const Modal = React.memo<ModalProps>(({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  closeOnOverlayClick = true,
  className,
  initialFocusRef,
  returnFocusRef,
  ariaLabel,
  ariaDescribedBy
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const portalRef = useRef<HTMLDivElement | null>(null);

  // Create portal container
  useEffect(() => {
    portalRef.current = document.createElement('div');
    portalRef.current.setAttribute('id', 'modal-root');
    document.body.appendChild(portalRef.current);

    return () => {
      if (portalRef.current) {
        document.body.removeChild(portalRef.current);
      }
    };
  }, []);

  // Handle ESC key press
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  // Manage body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleKeyDown]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      if (initialFocusRef?.current) {
        initialFocusRef.current.focus();
      } else if (contentRef.current) {
        contentRef.current.focus();
      }
    } else if (returnFocusRef?.current) {
      returnFocusRef.current.focus();
    }
  }, [isOpen, initialFocusRef, returnFocusRef]);

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === modalRef.current) {
      onClose();
    }
  }, [closeOnOverlayClick, onClose]);

  // Focus trap implementation
  const handleTabKey = useCallback((event: KeyboardEvent) => {
    if (!contentRef.current) return;

    const focusableElements = contentRef.current.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleTabKey);
    }
    return () => {
      document.removeEventListener('keydown', handleTabKey);
    };
  }, [isOpen, handleTabKey]);

  if (!isOpen || !portalRef.current) return null;

  const modalContent = (
    <div
      ref={modalRef}
      className="modal-overlay"
      onClick={handleOverlayClick}
      role="presentation"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-index-modal)',
        backdropFilter: 'blur(4px)'
      }}
    >
      <div
        ref={contentRef}
        className={classNames('modal-content', `modal-content--${size}`, className)}
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel || title}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        style={{
          background: 'var(--color-background-primary)',
          borderRadius: 'var(--border-radius-lg)',
          boxShadow: 'var(--box-shadow-lg)',
          maxHeight: '90vh',
          overflow: 'auto',
          position: 'relative',
          margin: 'var(--spacing-md)',
          width: size === 'sm' ? '400px' : size === 'md' ? '600px' : '800px',
          minWidth: size === 'sm' ? '320px' : size === 'md' ? '480px' : '640px',
          animation: 'modalEnter 0.2s ease-out'
        }}
      >
        <header
          className="modal-header"
          style={{
            padding: 'var(--spacing-lg)',
            borderBottom: '1px solid var(--color-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <h2
            className="modal-title"
            style={{
              margin: 0,
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-medium)'
            }}
          >
            {title}
          </h2>
          <Button
            variant="text"
            onClick={onClose}
            ariaLabel="Close modal"
            size="sm"
          >
            ✕
          </Button>
        </header>
        <div
          className="modal-body"
          style={{
            padding: 'var(--spacing-lg)'
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(modalContent, portalRef.current);
});

Modal.displayName = 'Modal';

export default Modal;