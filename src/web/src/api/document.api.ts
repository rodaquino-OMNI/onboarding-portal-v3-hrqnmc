/**
 * Document Management API Module
 * Version: 1.0.0
 * 
 * Implements secure document upload, retrieval, and management functionality
 * with LGPD compliance, performance monitoring, and comprehensive error handling.
 */

import axios from 'axios'; // ^1.5.0
import axiosRetry from 'axios-retry'; // ^3.8.0
import { trace, SpanStatusCode } from '@opentelemetry/api'; // ^1.4.0

import {
  Document,
  DocumentUploadRequest,
  DocumentType,
  DocumentStatus,
  DocumentListResponse
} from '../types/document.types';
import { apiConfig, retryConfig, createAxiosConfig } from '../config/api.config';
import { API_ENDPOINTS, UPLOAD_CONFIG, HTTP_STATUS } from '../constants/api.constants';

// Initialize tracer for performance monitoring
const tracer = trace.getTracer('document-api');

// Configure axios instance with retry capability
const axiosInstance = axios.create(createAxiosConfig());
axiosRetry(axiosInstance, retryConfig);

/**
 * Validates file before upload
 * @param file File to validate
 * @throws Error if validation fails
 */
const validateFile = (file: File): void => {
  if (file.size > UPLOAD_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds maximum limit of ${UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB`);
  }
  if (!UPLOAD_CONFIG.SUPPORTED_TYPES.includes(file.type)) {
    throw new Error(`File type ${file.type} not supported`);
  }
};

/**
 * Uploads a document with progress tracking and validation
 * @param request Document upload request
 * @param onProgress Optional progress callback
 * @returns Promise resolving to uploaded document
 */
export const uploadDocument = async (
  request: DocumentUploadRequest,
  onProgress?: (progress: number) => void
): Promise<Document> => {
  const span = tracer.startSpan('uploadDocument');
  
  try {
    validateFile(request.file);
    
    const formData = new FormData();
    formData.append('file', request.file);
    formData.append('enrollmentId', request.enrollmentId);
    formData.append('type', request.type);
    formData.append('metadata', JSON.stringify(request.metadata));

    const totalChunks = Math.ceil(request.file.size / UPLOAD_CONFIG.CHUNK_SIZE);
    let uploadedChunks = 0;

    const response = await axiosInstance.post<Document>(API_ENDPOINTS.DOCUMENT.UPLOAD, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      onUploadProgress: (progressEvent) => {
        const progress = (progressEvent.loaded / progressEvent.total!) * 100;
        onProgress?.(progress);
        uploadedChunks = Math.floor((progressEvent.loaded / request.file.size) * totalChunks);
        span.setAttribute('upload.progress', progress);
      }
    });

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Upload failed'
    });
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Retrieves paginated list of documents
 * @param enrollmentId Enrollment ID
 * @param options Pagination and filtering options
 * @returns Promise resolving to paginated document list
 */
export const getDocuments = async (
  enrollmentId: string,
  options: {
    cursor?: string;
    limit: number;
    sort?: string;
    filter?: Record<string, any>;
  }
): Promise<DocumentListResponse> => {
  const span = tracer.startSpan('getDocuments');
  
  try {
    const params = new URLSearchParams({
      enrollmentId,
      limit: options.limit.toString(),
      ...(options.cursor && { cursor: options.cursor }),
      ...(options.sort && { sort: options.sort }),
      ...(options.filter && { filter: JSON.stringify(options.filter) })
    });

    const response = await axiosInstance.get<DocumentListResponse>(
      `${API_ENDPOINTS.DOCUMENT.LIST}?${params.toString()}`
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Failed to retrieve documents'
    });
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Retrieves a specific document by ID
 * @param documentId Document ID
 * @returns Promise resolving to document details
 */
export const getDocumentById = async (documentId: string): Promise<Document> => {
  const span = tracer.startSpan('getDocumentById');
  
  try {
    const response = await axiosInstance.get<Document>(
      API_ENDPOINTS.DOCUMENT.DOWNLOAD.replace(':id', documentId)
    );

    span.setStatus({ code: SpanStatusCode.OK });
    return response.data;
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Failed to retrieve document'
    });
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Deletes a document with audit logging
 * @param documentId Document ID
 * @param softDelete Whether to perform soft delete
 * @returns Promise resolving to void
 */
export const deleteDocument = async (
  documentId: string,
  softDelete: boolean = true
): Promise<void> => {
  const span = tracer.startSpan('deleteDocument');
  
  try {
    const endpoint = softDelete
      ? API_ENDPOINTS.DOCUMENT.DELETE.replace(':id', documentId) + '/soft'
      : API_ENDPOINTS.DOCUMENT.DELETE.replace(':id', documentId);

    await axiosInstance.delete(endpoint);

    span.setStatus({ code: SpanStatusCode.OK });
  } catch (error) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: error instanceof Error ? error.message : 'Failed to delete document'
    });
    throw error;
  } finally {
    span.end();
  }
};

/**
 * Error handler for document API operations
 * @param error Error object
 * @throws Enhanced error with context
 */
const handleDocumentError = (error: any): never => {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    switch (status) {
      case HTTP_STATUS.BAD_REQUEST:
        throw new Error('Invalid document request: ' + error.response?.data?.message);
      case HTTP_STATUS.UNAUTHORIZED:
        throw new Error('Authentication required for document operation');
      case HTTP_STATUS.FORBIDDEN:
        throw new Error('Insufficient permissions for document operation');
      case HTTP_STATUS.NOT_FOUND:
        throw new Error('Document not found');
      default:
        throw new Error('Document operation failed: ' + error.message);
    }
  }
  throw error;
};

export type { Document, DocumentUploadRequest, DocumentType, DocumentStatus, DocumentListResponse };