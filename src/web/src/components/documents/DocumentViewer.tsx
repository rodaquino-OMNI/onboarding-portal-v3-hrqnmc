import React, { useState, useEffect, useCallback, useRef } from 'react'; // v18.0.0
import classnames from 'classnames'; // v2.3.2
import Modal from '../common/Modal';
import { useDocuments } from '../../hooks/useDocuments';
import { DocumentType, DocumentStatus } from '../../types/document.types';

// Document access level enumeration
enum DocumentAccessLevel {
  VIEW = 'VIEW',
  DOWNLOAD = 'DOWNLOAD',
  ADMIN = 'ADMIN'
}

// Document viewer props interface
interface DocumentViewerProps {
  documentId: string;
  isOpen: boolean;
  onClose: () => void;
  className?: string;
  accessLevel?: DocumentAccessLevel;
  watermarkText?: string;
  highContrastMode?: boolean;
  onDocumentLoad?: (status: DocumentLoadStatus) => void;
}

// Document load status interface
interface DocumentLoadStatus {
  loaded: boolean;
  error: string | null;
  encryptionStatus: {
    isEncrypted: boolean;
    algorithm: string;
  };
  accessVerified: boolean;
}

// Secure document context interface
interface SecureDocumentContext {
  content: Blob | null;
  encryptionInfo: {
    algorithm: string;
    keyId: string;
    iv: string;
  };
  accessToken: string;
}

const DocumentViewer: React.FC<DocumentViewerProps> = React.memo(({
  documentId,
  isOpen,
  onClose,
  className,
  accessLevel = DocumentAccessLevel.VIEW,
  watermarkText,
  highContrastMode = false,
  onDocumentLoad
}) => {
  // State management
  const [loadStatus, setLoadStatus] = useState<DocumentLoadStatus>({
    loaded: false,
    error: null,
    encryptionStatus: {
      isEncrypted: false,
      algorithm: ''
    },
    accessVerified: false
  });

  const [secureContent, setSecureContent] = useState<SecureDocumentContext | null>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const { getDocumentById, useDocumentAccess } = useDocuments();

  // Initialize document access verification
  const verifyAccess = useCallback(async () => {
    try {
      const accessResult = await useDocumentAccess(documentId, accessLevel);
      setLoadStatus(prev => ({
        ...prev,
        accessVerified: accessResult.verified
      }));
      return accessResult.verified;
    } catch (error) {
      setLoadStatus(prev => ({
        ...prev,
        error: 'Access verification failed',
        accessVerified: false
      }));
      return false;
    }
  }, [documentId, accessLevel, useDocumentAccess]);

  // Load and decrypt document content
  const loadDocument = useCallback(async () => {
    if (!loadStatus.accessVerified) return;

    try {
      const document = await getDocumentById(documentId);
      
      setLoadStatus(prev => ({
        ...prev,
        loaded: true,
        encryptionStatus: {
          isEncrypted: true,
          algorithm: document.encryptionInfo.algorithm
        }
      }));

      setSecureContent({
        content: (document as any).content || null,
        encryptionInfo: {
          algorithm: document.encryptionInfo.algorithm,
          keyId: document.encryptionInfo.keyId,
          iv: document.encryptionInfo.iv
        },
        accessToken: (document as any).accessToken || ''
      });

      onDocumentLoad?.({
        loaded: true,
        error: null,
        encryptionStatus: {
          isEncrypted: true,
          algorithm: document.encryptionInfo.algorithm
        },
        accessVerified: true
      });

    } catch (error) {
      setLoadStatus(prev => ({
        ...prev,
        error: 'Failed to load document',
        loaded: false
      }));

      onDocumentLoad?.({
        loaded: false,
        error: 'Document load failed',
        encryptionStatus: {
          isEncrypted: false,
          algorithm: ''
        },
        accessVerified: loadStatus.accessVerified
      });
    }
  }, [documentId, getDocumentById, loadStatus.accessVerified, onDocumentLoad]);

  // Initialize document loading
  useEffect(() => {
    if (isOpen && !loadStatus.loaded && !loadStatus.error) {
      verifyAccess().then(verified => {
        if (verified) {
          loadDocument();
        }
      });
    }
  }, [isOpen, loadStatus.loaded, loadStatus.error, verifyAccess, loadDocument]);

  // Cleanup on unmount or close
  useEffect(() => {
    return () => {
      setSecureContent(null);
      setLoadStatus({
        loaded: false,
        error: null,
        encryptionStatus: {
          isEncrypted: false,
          algorithm: ''
        },
        accessVerified: false
      });
    };
  }, [isOpen]);

  // Render document content
  const renderContent = () => {
    if (loadStatus.error) {
      return (
        <div style={styles.viewer.error} role="alert">
          <p>{loadStatus.error}</p>
        </div>
      );
    }

    if (!loadStatus.loaded || !secureContent) {
      return (
        <div style={styles.viewer.loading} role="status">
          <span>Loading document...</span>
        </div>
      );
    }

    return (
      <div
        style={styles.viewer.content}
        data-high-contrast={highContrastMode}
      >
        {watermarkText && (
          <div style={styles.viewer.watermark}>
            {watermarkText}
          </div>
        )}
        <iframe
          src={URL.createObjectURL(secureContent.content)}
          title="Document Viewer"
          className="document-frame"
          sandbox="allow-same-origin"
          style={{
            width: '100%',
            height: '100%',
            border: 'none'
          }}
        />
      </div>
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Document Viewer"
      size="lg"
      className={classnames('document-viewer-modal', className)}
      ariaLabel="Document viewer"
      closeOnOverlayClick={false}
    >
      <div
        ref={viewerRef}
        style={styles.viewer.container}
        role="document"
        aria-busy={!loadStatus.loaded}
      >
        {renderContent()}
        <div style={styles.viewer.accessibilityControls}>
          <button
            onClick={() => window.print()}
            aria-label="Print document"
            className="print-button"
          >
            Print
          </button>
        </div>
      </div>
    </Modal>
  );
});

// Component display name for debugging
DocumentViewer.displayName = 'DocumentViewer';

// Styles object
const styles = {
  viewer: {
    container: {
      width: '100%',
      height: '100%',
      maxHeight: '80vh',
      overflow: 'auto',
      backgroundColor: 'var(--color-background)',
      position: 'relative' as const
    },
    content: {
      padding: 'var(--spacing-lg)',
      display: 'flex',
      flexDirection: 'column' as const,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '200px'
    },
    error: {
      color: 'var(--color-error)',
      padding: 'var(--spacing-md)',
      textAlign: 'center' as const,
      backgroundColor: 'var(--color-error-bg)',
      borderRadius: 'var(--border-radius-sm)'
    },
    loading: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 'var(--spacing-xl)',
      backgroundColor: 'var(--color-background-secondary)'
    },
    watermark: {
      position: 'absolute' as const,
      opacity: '0.2',
      pointerEvents: 'none' as const,
      userSelect: 'none' as const
    },
    accessibilityControls: {
      position: 'absolute' as const,
      top: 'var(--spacing-md)',
      right: 'var(--spacing-md)',
      zIndex: 'var(--z-index-controls)'
    }
  }
};

export default DocumentViewer;