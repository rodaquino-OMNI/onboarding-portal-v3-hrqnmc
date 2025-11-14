import React, { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next'; // v13.0.0
import { useVirtualizer } from '@tanstack/react-virtual'; // v3.0.0
import { Dialog } from '@mui/material'; // v5.0.0

import type { TableColumn } from '../common/Table';
import type { Document } from '../../types/document.types';
import { Table } from '../common/Table';
import StatusBadge from '../common/StatusBadge';
import ErrorBoundary from '../common/ErrorBoundary';
import DocumentViewer from './DocumentViewer';
import { DocumentType, DocumentStatus } from '../../types/document.types';
import { useDocuments } from '../../hooks/useDocuments';

interface DocumentListProps {
  enrollmentId?: string;
  onDocumentClick?: (document: Document) => void;
  className?: string;
  virtualScrolling?: boolean;
  retentionPeriod?: number;
}

const DocumentList: React.FC<DocumentListProps> = ({
  enrollmentId,
  onDocumentClick,
  className,
  virtualScrolling = false,
  retentionPeriod = 365 // Default 1 year retention
}) => {
  const { t } = useTranslation();
  const {
    documents,
    isLoading,
    error,
    deleteDocument,
    refreshDocuments,
    processingStatus,
    encryptionStatus
  } = useDocuments(enrollmentId);

  const [selectedDocument, setSelectedDocument] = React.useState<Document | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
  const [documentToDelete, setDocumentToDelete] = React.useState<Document | null>(null);

  // Document type localization
  const getDocumentTypeLabel = useCallback((type: DocumentType): string => {
    return t(`document.type.${type.toLowerCase()}`);
  }, [t]);

  // Table columns configuration
  const columns = useMemo<TableColumn<Document>[]>(() => [
    {
      key: 'type',
      header: t('document.column.type'),
      render: (document) => getDocumentTypeLabel(document.type)
    },
    {
      key: 'filename',
      header: t('document.column.filename'),
      width: '30%'
    },
    {
      key: 'status',
      header: t('document.column.status'),
      render: (document) => (
        <span className={`status-badge status-${document.status.toLowerCase()}`}>
          {document.status}
        </span>
      )
    },
    {
      key: 'createdAt',
      header: t('document.column.uploadDate'),
      render: (document) => new Date(document.createdAt).toLocaleDateString('pt-BR')
    },
    {
      key: 'id' as any,
      header: t('document.column.actions'),
      render: (document) => (
        <div style={styles.documentList__actions as React.CSSProperties}>
          <button
            onClick={() => handleDocumentView(document)}
            className="view-button"
            aria-label={t('document.action.view')}
            disabled={document.status !== DocumentStatus.COMPLETED}
          >
            {t('document.action.view')}
          </button>
          <button
            onClick={() => handleDeleteClick(document)}
            className="delete-button"
            aria-label={t('document.action.delete')}
          >
            {t('document.action.delete')}
          </button>
        </div>
      )
    }
  ], [t, getDocumentTypeLabel]);

  // Virtual scrolling configuration
  const rowVirtualizer = useVirtualizer({
    count: documents?.items.length || 0,
    getScrollElement: () => document.querySelector('.document-list-container'),
    estimateSize: () => 56, // Estimated row height
    overscan: 5
  });

  // Document view handler
  const handleDocumentView = useCallback(async (document: Document) => {
    try {
      setSelectedDocument(document);
      onDocumentClick?.(document);
    } catch (error) {
      console.error('Error viewing document:', error);
    }
  }, [onDocumentClick]);

  // Delete handlers
  const handleDeleteClick = useCallback((document: Document) => {
    setDocumentToDelete(document);
    setShowDeleteDialog(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!documentToDelete) return;

    try {
      await deleteDocument(documentToDelete.id);
      setShowDeleteDialog(false);
      setDocumentToDelete(null);
      refreshDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  }, [documentToDelete, deleteDocument, refreshDocuments]);

  if (error) {
    return (
      <div style={styles.documentList__empty as React.CSSProperties} role="alert">
        {t('document.error.loading')}
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div style={styles.documentList as React.CSSProperties} className={className}>
        <Table
          columns={columns}
          data={documents?.items || []}
          virtualizeRows={virtualScrolling}
          className="document-list-container"
          emptyMessage={t('document.empty.message')}
          ariaLabel={t('document.list.aria.label')}
        />

        {selectedDocument && (
          <DocumentViewer
            documentId={selectedDocument.id}
            isOpen={!!selectedDocument}
            onClose={() => setSelectedDocument(null)}
          />
        )}

        <Dialog
          open={showDeleteDialog}
          onClose={() => setShowDeleteDialog(false)}
          aria-labelledby="delete-dialog-title"
        >
          <div className="delete-dialog">
            <h2 id="delete-dialog-title">{t('document.delete.confirmation.title')}</h2>
            <p>{t('document.delete.confirmation.message')}</p>
            <div className="dialog-actions">
              <button
                onClick={() => setShowDeleteDialog(false)}
                className="cancel-button"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                className="confirm-button"
              >
                {t('common.confirm')}
              </button>
            </div>
          </div>
        </Dialog>
      </div>
    </ErrorBoundary>
  );
};

// Styles
const styles = {
  documentList: {
    width: '100%',
    borderRadius: 'var(--border-radius-lg)',
    background: 'var(--color-background-paper)',
    boxShadow: 'var(--shadow-sm)'
  },
  documentList__empty: {
    padding: 'var(--spacing-6)',
    textAlign: 'center' as const,
    color: 'var(--color-text-secondary)'
  },
  documentList__virtualRow: {
    height: 'var(--row-height)',
    display: 'flex',
    alignItems: 'center'
  },
  documentList__actions: {
    display: 'flex',
    gap: 'var(--spacing-2)',
    justifyContent: 'flex-end' as const
  }
};

export default DocumentList;