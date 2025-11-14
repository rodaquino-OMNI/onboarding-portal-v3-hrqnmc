import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { toast } from 'react-toastify'; // v9.1.3

import DocumentList from '../../components/documents/DocumentList';
import DocumentUpload from '../../components/documents/DocumentUpload';
import DocumentViewer from '../../components/documents/DocumentViewer';
import ErrorBoundary from '../../components/common/ErrorBoundary';
import { useDocuments } from '../../hooks/useDocuments';
import { Document, DocumentType, DocumentStatus } from '../../types/document.types';
import { THEME } from '../../constants/app.constants';

const Documents: React.FC = React.memo(() => {
  const { t } = useTranslation();
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  // Initialize document management hooks with encryption
  const {
    documents,
    isLoading,
    error,
    uploadDocument,
    refreshDocuments,
    processingStatus,
    encryptionStatus,
    performanceMetrics
  } = useDocuments();

  // Document type requirements based on enrollment
  const requiredDocuments = useMemo(() => [
    {
      type: DocumentType.ID_DOCUMENT,
      label: t('document.type.idDocument'),
      required: true
    },
    {
      type: DocumentType.CPF,
      label: t('document.type.cpf'),
      required: true
    },
    {
      type: DocumentType.PROOF_OF_ADDRESS,
      label: t('document.type.proofOfAddress'),
      required: true
    },
    {
      type: DocumentType.MEDICAL_RECORD,
      label: t('document.type.medicalRecord'),
      required: false
    }
  ], [t]);

  // Handle document upload completion
  const handleUploadComplete = useCallback((document: Document) => {
    refreshDocuments();
    toast.success(t('document.upload.success'));
  }, [refreshDocuments, t]);

  // Handle document upload error with retry mechanism
  const handleUploadError = useCallback((error: { code: string; message: string; retryCount: number }) => {
    toast.error(t('document.upload.error', { message: error.message }));
  }, [t]);

  // Handle document selection for viewing
  const handleDocumentClick = useCallback((document: Document) => {
    if (document.status === DocumentStatus.COMPLETED) {
      setSelectedDocument(document);
      setIsViewerOpen(true);
    } else {
      toast.warning(t('document.view.notReady'));
    }
  }, [t]);

  // Monitor document processing status
  useEffect(() => {
    if (processingStatus.isProcessing) {
      const timer = setInterval(refreshDocuments, 2000);
      return () => clearInterval(timer);
    }
  }, [processingStatus.isProcessing, refreshDocuments]);

  return (
    <ErrorBoundary>
      <div className="documents-page">
        <header className="documents-page__header">
          <h1 className="documents-page__title">
            {t('document.page.title')}
          </h1>
          <p className="documents-page__description">
            {t('document.page.description')}
          </p>
        </header>

        <section 
          className="documents-page__upload-section"
          aria-labelledby="upload-section-title"
        >
          <h2 id="upload-section-title" className="documents-page__section-title">
            {t('document.upload.title')}
          </h2>
          
          <div className="documents-page__upload-grid">
            {requiredDocuments.map(doc => (
              <DocumentUpload
                key={doc.type}
                documentType={doc.type}
                onUploadComplete={handleUploadComplete}
                onUploadError={handleUploadError}
                className="documents-page__uploader"
              />
            ))}
          </div>
        </section>

        <section 
          className="documents-page__list-section"
          aria-labelledby="list-section-title"
        >
          <h2 id="list-section-title" className="documents-page__section-title">
            {t('document.list.title')}
          </h2>
          
          <DocumentList
            onDocumentClick={handleDocumentClick}
            className="documents-page__list"
          />
        </section>

        {selectedDocument && (
          <DocumentViewer
            documentId={selectedDocument.id}
            isOpen={isViewerOpen}
            onClose={() => setIsViewerOpen(false)}
            watermarkText={t('document.watermark.confidential')}
          />
        )}

        <style>{`
          .documents-page {
            padding: var(--spacing-lg);
            max-width: var(--container-max-width);
            margin: 0 auto;
          }

          .documents-page__header {
            margin-bottom: var(--spacing-xl);
          }

          .documents-page__title {
            font-size: var(--font-size-xxl);
            font-weight: var(--font-weight-bold);
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-sm);
          }

          .documents-page__description {
            color: var(--color-text-secondary);
            font-size: var(--font-size-md);
            max-width: 800px;
          }

          .documents-page__section-title {
            font-size: var(--font-size-xl);
            font-weight: var(--font-weight-medium);
            color: var(--color-text-primary);
            margin-bottom: var(--spacing-lg);
          }

          .documents-page__upload-section {
            margin-bottom: var(--spacing-xxl);
          }

          .documents-page__upload-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: var(--spacing-lg);
          }

          .documents-page__list-section {
            margin-bottom: var(--spacing-xxl);
          }

          @media (max-width: ${THEME.BREAKPOINTS.MOBILE}) {
            .documents-page {
              padding: var(--spacing-md);
            }

            .documents-page__upload-grid {
              grid-template-columns: 1fr;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            * {
              animation-duration: 0.01ms !important;
              transition-duration: 0.01ms !important;
            }
          }
        `}</style>
      </div>
    </ErrorBoundary>
  );
});

Documents.displayName = 'Documents';

export default Documents;