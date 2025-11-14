import { useState, useCallback, useEffect } from 'react'; // v18.0.0
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'; // v4.0.0
import { useDebounce } from 'use-debounce'; // v9.0.0
import { usePerformanceMonitor } from './usePerformanceMonitor';

import DocumentService from '../services/document.service';
import {
  Document,
  DocumentUploadRequest,
  DocumentType,
  DocumentStatus,
  DocumentListResponse,
  EncryptionMetadata
} from '../types/document.types';

// Performance monitoring configuration
const PERFORMANCE_CONFIG = {
  uploadTimeout: 3000, // 3 seconds as per requirements
  retryAttempts: 3,
  retryDelay: 1000,
};

// Document processing status type
interface DocumentProcessingStatus {
  isProcessing: boolean;
  currentStage: DocumentStatus;
  progress: number;
  error?: string;
}

// Encryption status type
interface EncryptionStatus {
  isEncrypted: boolean;
  algorithm: string;
  lastRotation: Date;
}

// Performance metrics type
interface PerformanceMetrics {
  uploadDuration: number;
  processingDuration: number;
  successRate: number;
}

/**
 * Custom hook for managing document operations with security and performance monitoring
 * @param enrollmentId - The enrollment ID for document association
 */
export const useDocuments = (enrollmentId: string) => {
  const queryClient = useQueryClient();
  const documentService = new DocumentService(null);
  const performanceMonitor = usePerformanceMonitor();

  // State management
  const [processingStatus, setProcessingStatus] = useState<DocumentProcessingStatus>({
    isProcessing: false,
    currentStage: DocumentStatus.PENDING,
    progress: 0,
  });

  const [encryptionStatus, setEncryptionStatus] = useState<EncryptionStatus>({
    isEncrypted: false,
    algorithm: 'AES-256-GCM',
    lastRotation: new Date(),
  });

  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    uploadDuration: 0,
    processingDuration: 0,
    successRate: 100,
  });

  // Debounced enrollment ID for query optimization
  const [debouncedEnrollmentId] = useDebounce(enrollmentId, 300);

  // Query for fetching documents
  const {
    data: documents,
    isLoading,
    error,
    refetch: refreshDocuments
  } = useQuery<DocumentListResponse, Error>(
    ['documents', debouncedEnrollmentId],
    () => documentService.getDocuments(debouncedEnrollmentId, {
      page: 1,
      pageSize: 10
    }),
    {
      enabled: !!debouncedEnrollmentId,
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      retry: PERFORMANCE_CONFIG.retryAttempts,
      retryDelay: PERFORMANCE_CONFIG.retryDelay,
    }
  );

  // Mutation for document upload
  const uploadMutation = useMutation<Document, Error, DocumentUploadRequest>(
    async (request: DocumentUploadRequest) => {
      const startTime = performance.now();
      setProcessingStatus({
        isProcessing: true,
        currentStage: DocumentStatus.VALIDATING,
        progress: 0,
      });

      try {
        performanceMonitor.startOperation('document-upload');
        const document = await documentService.uploadDocument(request);
        
        const duration = performance.now() - startTime;
        setPerformanceMetrics(prev => ({
          ...prev,
          uploadDuration: duration,
          successRate: ((prev.successRate * 9 + 100) / 10), // Rolling average
        }));

        return document;
      } catch (error) {
        setPerformanceMetrics(prev => ({
          ...prev,
          successRate: ((prev.successRate * 9 + 0) / 10),
        }));
        throw error;
      } finally {
        performanceMonitor.endOperation('document-upload');
        setProcessingStatus(prev => ({
          ...prev,
          isProcessing: false,
        }));
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['documents', debouncedEnrollmentId]);
      },
    }
  );

  // Mutation for document deletion
  const deleteMutation = useMutation<void, Error, string>(
    async (documentId: string) => {
      performanceMonitor.startOperation('document-delete');
      try {
        await documentService.deleteDocument(documentId);
      } finally {
        performanceMonitor.endOperation('document-delete');
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['documents', debouncedEnrollmentId]);
      },
    }
  );

  // Upload document handler with security and performance monitoring
  const uploadDocument = useCallback(async (
    file: File,
    type: DocumentType,
    metadata?: Record<string, string>
  ) => {
    if (!enrollmentId) {
      throw new Error('Enrollment ID is required');
    }

    const uploadRequest: DocumentUploadRequest = {
      enrollmentId,
      type,
      file,
      metadata: metadata || {},
    };

    return uploadMutation.mutateAsync(uploadRequest);
  }, [enrollmentId, uploadMutation]);

  // Delete document handler
  const deleteDocument = useCallback(async (documentId: string) => {
    return deleteMutation.mutateAsync(documentId);
  }, [deleteMutation]);

  // Get document by ID handler
  const getDocumentById = useCallback(async (documentId: string) => {
    return await documentService.getDocumentById(documentId);
  }, [documentService]);

  // Use document access handler
  const useDocumentAccess = useCallback(async (documentId: string, accessLevel?: string) => {
    // Stub implementation - would verify document access permissions
    return { hasAccess: true, accessLevel: accessLevel || 'read' };
  }, []);

  // Monitor document processing status
  useEffect(() => {
    const processingStatuses = [
      DocumentStatus.VALIDATING,
      DocumentStatus.SCANNING,
      DocumentStatus.OCR_PROCESSING,
      DocumentStatus.CLASSIFYING,
      DocumentStatus.ENCRYPTING
    ];
    if (documents?.items.some(doc => processingStatuses.includes(doc.status))) {
      const interval = setInterval(refreshDocuments, 2000);
      return () => clearInterval(interval);
    }
  }, [documents, refreshDocuments]);

  // Monitor encryption status
  useEffect(() => {
    if (documents?.items.length) {
      const lastDocument = documents.items[0];
      setEncryptionStatus({
        isEncrypted: true,
        algorithm: lastDocument.encryptionInfo.algorithm,
        lastRotation: new Date(lastDocument.encryptionInfo.keyRotationDate),
      });
    }
  }, [documents]);

  return {
    documents,
    isLoading,
    error,
    uploadDocument,
    deleteDocument,
    getDocumentById,
    useDocumentAccess,
    refreshDocuments,
    processingStatus,
    encryptionStatus,
    performanceMetrics,
  };
};

export default useDocuments;