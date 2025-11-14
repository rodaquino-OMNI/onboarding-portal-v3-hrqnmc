import React, { useCallback, useRef, useState, useEffect } from 'react'; // v18.0.0
import classnames from 'classnames'; // v2.3.2
import axios from 'axios'; // v1.6.0
import CryptoJS from 'crypto-js'; // v4.1.1
import type { Document } from '../../types/document.types';
import { DocumentType, DocumentStatus } from '../../types/document.types';
import Button from './Button';

// Constants for file upload configuration
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks

interface FileUploadProps {
  enrollmentId?: string;
  documentType?: DocumentType;
  onUploadComplete?: (document: Document) => void;
  onUploadError?: (error: UploadError) => void;
  onUploadProgress?: (progress: UploadProgress) => void;
  onUpload?: (files: File[] | any) => void | Promise<void>;
  acceptedFormats?: string[];
  maxSizeMB?: number;
  maxFiles?: number;
  maxSize?: number;
  allowedTypes?: string[];
  maxRetries?: number;
  className?: string;
  label?: string;
  multiple?: boolean;
  concurrent?: boolean;
}

interface UploadState {
  files: File[];
  progress: Record<string, UploadProgress>;
  errors: Record<string, UploadError>;
  status: Record<string, DocumentStatus>;
}

interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

interface UploadError {
  code: string;
  message: string;
  retryCount: number;
}

const FileUpload: React.FC<FileUploadProps> = React.memo(({
  enrollmentId,
  documentType,
  onUploadComplete,
  onUploadError,
  onUploadProgress,
  maxSize = DEFAULT_MAX_SIZE,
  allowedTypes = DEFAULT_ALLOWED_TYPES,
  maxRetries = MAX_RETRIES,
  className,
  multiple = false,
  concurrent = false
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    files: [],
    progress: {},
    errors: {},
    status: {}
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileHashMap = useRef<Map<string, string>>(new Map());
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // File validation with security checks
  const validateFile = useCallback(async (file: File): Promise<boolean> => {
    if (file.size > maxSize) {
      throw new Error('FILE_TOO_LARGE');
    }

    if (!allowedTypes.includes(file.type)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    // Calculate file hash for integrity check
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const hash = CryptoJS.SHA256(wordArray).toString();

    // Store hash for later verification
    fileHashMap.current.set(file.name, hash);
    return true;
  }, [maxSize, allowedTypes]);

  // File encryption using AES-256
  const encryptFile = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(arrayBuffer);
    const iv = CryptoJS.lib.WordArray.random(16);

    const encrypted = CryptoJS.AES.encrypt(wordArray, process.env.REACT_APP_ENCRYPTION_KEY!, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });

    return encrypted.toString();
  };

  // Handle file upload with chunking and retry logic
  const handleUpload = async (file: File): Promise<void> => {
    const fileId = `${file.name}-${Date.now()}`;
    let retryCount = 0;

    try {
      await validateFile(file);
      const encryptedString = await encryptFile(file);
      // Convert encrypted string to Uint8Array for chunking
      const encoder = new TextEncoder();
      const encryptedData = encoder.encode(encryptedString);
      const chunks = Math.ceil(encryptedData.byteLength / CHUNK_SIZE);

      setUploadState(prev => ({
        ...prev,
        status: { ...prev.status, [fileId]: DocumentStatus.ENCRYPTING }
      }));

      for (let i = 0; i < chunks; i++) {
        const start = i * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, encryptedData.byteLength);
        const chunk = encryptedData.slice(start, end);

        const formData = new FormData();
        formData.append('chunk', new Blob([chunk]));
        formData.append('chunkIndex', i.toString());
        formData.append('totalChunks', chunks.toString());
        formData.append('fileId', fileId);
        formData.append('documentType', documentType);
        formData.append('enrollmentId', enrollmentId);
        formData.append('hash', fileHashMap.current.get(file.name) || '');

        let uploaded = false;
        while (!uploaded && retryCount < maxRetries) {
          try {
            const response = await axios.post('/api/v1/documents/upload', formData, {
              headers: {
                'Content-Type': 'multipart/form-data'
              },
              onUploadProgress: (progressEvent) => {
                const percentage = (progressEvent.loaded / progressEvent.total) * 100;
                setUploadState(prev => ({
                  ...prev,
                  progress: {
                    ...prev.progress,
                    [fileId]: {
                      loaded: progressEvent.loaded,
                      total: progressEvent.total,
                      percentage
                    }
                  }
                }));
                onUploadProgress?.({
                  loaded: progressEvent.loaded,
                  total: progressEvent.total,
                  percentage
                });
              }
            });

            if (response.data.status === 'success') {
              uploaded = true;
              if (i === chunks - 1) {
                onUploadComplete(response.data.document);
              }
            }
          } catch (error) {
            retryCount++;
            if (retryCount === maxRetries) {
              throw error;
            }
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY * retryCount));
          }
        }
      }
    } catch (error) {
      setUploadState(prev => ({
        ...prev,
        errors: {
          ...prev.errors,
          [fileId]: {
            code: error.code || 'UPLOAD_ERROR',
            message: error.message,
            retryCount
          }
        },
        status: { ...prev.status, [fileId]: DocumentStatus.FAILED }
      }));
      onUploadError({
        code: error.code || 'UPLOAD_ERROR',
        message: error.message,
        retryCount
      });
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (!multiple && droppedFiles.length > 1) {
      onUploadError({ code: 'MULTIPLE_FILES', message: 'Multiple files not allowed', retryCount: 0 });
      return;
    }

    setUploadState(prev => ({
      ...prev,
      files: [...prev.files, ...droppedFiles]
    }));

    if (concurrent) {
      await Promise.all(droppedFiles.map(file => handleUpload(file)));
    } else {
      for (const file of droppedFiles) {
        await handleUpload(file);
      }
    }
  }, [multiple, concurrent, handleUpload]);

  // Click handler for file input
  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // File input change handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!multiple && selectedFiles.length > 1) {
      onUploadError({ code: 'MULTIPLE_FILES', message: 'Multiple files not allowed', retryCount: 0 });
      return;
    }

    setUploadState(prev => ({
      ...prev,
      files: [...prev.files, ...selectedFiles]
    }));

    if (concurrent) {
      await Promise.all(selectedFiles.map(file => handleUpload(file)));
    } else {
      for (const file of selectedFiles) {
        await handleUpload(file);
      }
    }
  };

  return (
    <div
      ref={dropZoneRef}
      className={classnames(
        'file-upload',
        {
          'file-upload--dragging': isDragging,
          'file-upload--error': Object.keys(uploadState.errors).length > 0
        },
        className
      )}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
      aria-label="File upload area"
    >
      <input
        ref={fileInputRef}
        type="file"
        className="file-upload__input"
        onChange={handleFileChange}
        accept={allowedTypes.join(',')}
        multiple={multiple}
        aria-hidden="true"
        tabIndex={-1}
      />
      
      <div className="file-upload__content">
        <div className="file-upload__icon" aria-hidden="true">
          <svg width="48" height="48" viewBox="0 0 48 48">
            <path d="M24 32V16M24 16L16 24M24 16L32 24" stroke="currentColor" strokeWidth="2"/>
          </svg>
        </div>
        
        <div className="file-upload__text">
          <p>Drag and drop files here or</p>
          <Button
            variant="secondary"
            onClick={handleClick}
            aria-label="Select files to upload"
          >
            Browse Files
          </Button>
          <p className="file-upload__help">
            Supported formats: {allowedTypes.join(', ')}
            <br />
            Maximum file size: {Math.floor(maxSize / (1024 * 1024))}MB
          </p>
        </div>
      </div>

      {Object.entries(uploadState.progress).map(([fileId, progress]) => (
        <div key={fileId} className="file-upload__progress">
          <div className="file-upload__progress-bar">
            <div
              className="file-upload__progress-fill"
              style={{ width: `${progress.percentage}%` }}
              role="progressbar"
              aria-valuenow={progress.percentage}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <span className="file-upload__progress-text">
            {Math.round(progress.percentage)}%
          </span>
        </div>
      ))}

      {Object.entries(uploadState.errors).map(([fileId, error]) => (
        <div key={fileId} className="file-upload__error" role="alert">
          {error.message}
        </div>
      ))}
    </div>
  );
});

FileUpload.displayName = 'FileUpload';

export default FileUpload;