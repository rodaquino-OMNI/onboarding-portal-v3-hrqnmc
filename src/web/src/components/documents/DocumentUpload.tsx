import React, { useState, useCallback, useRef } from 'react'; // v18.0.0
import { useTranslation } from 'react-i18next'; // v13.0.0
import { toast } from 'react-toastify'; // v9.1.3
import CryptoJS from 'crypto-js'; // v4.1.1

import FileUpload from '../common/FileUpload';
import { useDocuments } from '../../hooks/useDocuments';
import type { Document } from '../../types/document.types';
import { DocumentType, DocumentStatus } from '../../types/document.types';
import { UPLOAD_CONFIG } from '../../constants/api.constants';

interface DocumentUploadProps {
  enrollmentId: string;
  documentType: DocumentType;
  onUploadComplete: (document: Document) => void;
  onUploadError: (error: Error) => void;
  onUploadProgress?: (progress: number) => void;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = React.memo(({
  enrollmentId,
  documentType,
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  className
}) => {
  const { t } = useTranslation();
  const { uploadDocument, documents } = useDocuments(enrollmentId);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Handle file upload with encryption and security measures
  const handleUpload = useCallback(async (file: File) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);

      // Validate file size and type
      if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
        throw new Error(t('document.error.fileTooLarge'));
      }
      if (!UPLOAD_CONFIG.SUPPORTED_TYPES.includes(file.type as any)) {
        throw new Error(t('document.error.invalidFileType'));
      }

      // Generate file hash for integrity check
      const arrayBuffer = await file.arrayBuffer();
      const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
      const hash = CryptoJS.SHA256(wordArray).toString();

      // Create abort controller for upload cancellation
      abortControllerRef.current = new AbortController();

      // Upload document with progress tracking
      const uploadedDocument = await uploadDocument(file, documentType, {
        hash,
        contentType: file.type,
        filename: file.name,
        metadata: {
          originalName: file.name,
          contentHash: hash,
          uploadTimestamp: new Date().toISOString()
        }
      }, {
        onProgress: (progress) => {
          setUploadProgress(progress);
          onUploadProgress?.(progress);
        },
        signal: abortControllerRef.current.signal
      });

      onUploadComplete(uploadedDocument);
      toast.success(t('document.success.uploaded'));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('document.error.uploadFailed');
      onUploadError(new Error(errorMessage));
      toast.error(errorMessage);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      abortControllerRef.current = null;
    }
  }, [documentType, enrollmentId, onUploadComplete, onUploadError, onUploadProgress, t, uploadDocument]);

  // Handle upload cancellation
  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsUploading(false);
      setUploadProgress(0);
      toast.info(t('document.info.uploadCancelled'));
    }
  }, [t]);

  return (
    <div className={`document-upload ${className || ''}`}>
      <div className="document-upload__header">
        <h3 className="document-upload__title">
          {t(`document.type.${documentType}`)}
        </h3>
        <div className="document-upload__info">
          <span>{t('document.info.maxSize', { size: UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024) })}</span>
          <span>{t('document.info.supportedTypes', { types: UPLOAD_CONFIG.SUPPORTED_TYPES.join(', ') })}</span>
        </div>
      </div>

      <FileUpload
        enrollmentId={enrollmentId}
        documentType={documentType}
        onUploadComplete={handleUpload}
        onUploadError={onUploadError}
        maxSize={UPLOAD_CONFIG.MAX_FILE_SIZE}
        allowedTypes={UPLOAD_CONFIG.SUPPORTED_TYPES}
        className="document-upload__uploader"
      />

      {isUploading && (
        <div className="document-upload__progress">
          <div className="document-upload__progress-bar">
            <div
              className="document-upload__progress-fill"
              style={{ width: `${uploadProgress}%` }}
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <div className="document-upload__progress-info">
            <span>{uploadProgress}%</span>
            <button
              onClick={handleCancel}
              className="document-upload__cancel-btn"
              aria-label={t('document.action.cancel')}
            >
              {t('document.action.cancel')}
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        .document-upload {
          margin-bottom: var(--spacing-lg);
          position: relative;
        }

        .document-upload__header {
          margin-bottom: var(--spacing-md);
        }

        .document-upload__title {
          font-size: var(--font-size-lg);
          font-weight: var(--font-weight-medium);
          color: var(--color-text-primary);
          margin-bottom: var(--spacing-xs);
        }

        .document-upload__info {
          display: flex;
          gap: var(--spacing-md);
          font-size: var(--font-size-sm);
          color: var(--color-text-secondary);
        }

        .document-upload__progress {
          margin-top: var(--spacing-md);
        }

        .document-upload__progress-bar {
          height: 4px;
          background-color: var(--color-background-secondary);
          border-radius: var(--border-radius-sm);
          overflow: hidden;
        }

        .document-upload__progress-fill {
          height: 100%;
          background-color: var(--color-primary);
          transition: width var(--transition-speed-normal) ease-in-out;
        }

        .document-upload__progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }

        .document-upload__cancel-btn {
          color: var(--color-error);
          background: none;
          border: none;
          cursor: pointer;
          padding: var(--spacing-xs);
          font-size: var(--font-size-sm);
        }

        .document-upload__cancel-btn:hover {
          text-decoration: underline;
        }

        @media (prefers-reduced-motion: reduce) {
          .document-upload__progress-fill {
            transition: none;
          }
        }
      `}</style>
    </div>
  );
});

DocumentUpload.displayName = 'DocumentUpload';

export default DocumentUpload;