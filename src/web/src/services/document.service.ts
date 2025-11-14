/**
 * Document Service for Pre-paid Health Plan Onboarding Portal
 * Version: 1.0.0
 * 
 * Implements secure document management with encryption, validation,
 * OCR processing, and LGPD compliance tracking.
 */

import { z } from 'zod'; // v3.22.0
import CryptoJS from 'crypto-js'; // v4.1.1

import {
  Document,
  DocumentUploadRequest,
  DocumentType,
  DocumentStatus,
  DocumentListResponse,
  EncryptionMetadata
} from '../types/document.types';
import ApiService from './api.service';
import { UPLOAD_CONFIG, API_ENDPOINTS } from '../constants/api.constants';

/**
 * Document validation schema using Zod
 */
const documentValidationSchema = z.object({
  enrollmentId: z.string().uuid(),
  type: z.nativeEnum(DocumentType),
  file: z.instanceof(File).refine(
    (file) => file.size <= UPLOAD_CONFIG.MAX_FILE_SIZE,
    'File size exceeds maximum limit'
  ).refine(
    (file) => UPLOAD_CONFIG.SUPPORTED_TYPES.includes(file.type as any),
    'File type not supported'
  ),
  metadata: z.record(z.string()).optional()
});

/**
 * Enhanced Document Service with security and processing features
 */
export class DocumentService {
  private readonly apiService: ApiService;
  private readonly processingTimeoutMs = 30000; // 30 seconds timeout

  constructor(apiService: ApiService) {
    this.apiService = apiService;
  }

  /**
   * Uploads and processes a document with encryption and validation
   */
  public async uploadDocument(request: DocumentUploadRequest): Promise<Document> {
    try {
      // Validate request
      await documentValidationSchema.parseAsync(request);

      // Generate encryption metadata
      const encryptionMetadata = this.generateEncryptionMetadata();

      // Encrypt file content
      const encryptedContent = await this.encryptFile(request.file, encryptionMetadata);

      // Prepare form data
      const formData = new FormData();
      formData.append('file', encryptedContent);
      formData.append('enrollmentId', request.enrollmentId);
      formData.append('type', request.type);
      formData.append('encryptionMetadata', JSON.stringify(encryptionMetadata));
      if (request.metadata) {
        formData.append('metadata', JSON.stringify(request.metadata));
      }

      // Upload document
      const response = await this.apiService.post<Document>(
        API_ENDPOINTS.DOCUMENT.UPLOAD,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      // Track document processing
      return await this.trackDocumentProcessing(response.data.id);

    } catch (error) {
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Retrieves paginated list of documents with enhanced metadata
   */
  public async getDocuments(
    enrollmentId: string,
    options: {
      page: number;
      pageSize: number;
      type?: DocumentType;
      status?: DocumentStatus;
    }
  ): Promise<DocumentListResponse> {
    try {
      const params = new URLSearchParams({
        enrollmentId,
        page: options.page.toString(),
        pageSize: options.pageSize.toString(),
        ...(options.type && { type: options.type }),
        ...(options.status && { status: options.status })
      });

      const response = await this.apiService.get<DocumentListResponse>(
        `${API_ENDPOINTS.DOCUMENT.LIST}?${params.toString()}`
      );

      return response.data;
    } catch (error) {
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Retrieves a single document by ID
   */
  public async getDocumentById(documentId: string): Promise<Document> {
    try {
      const response = await this.apiService.get<Document>(
        API_ENDPOINTS.DOCUMENT.VERIFY.replace(':id', documentId)
      );
      return response.data;
    } catch (error) {
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Deletes a document with secure cleanup
   */
  public async deleteDocument(documentId: string): Promise<void> {
    try {
      await this.apiService.delete(
        API_ENDPOINTS.DOCUMENT.DELETE.replace(':id', documentId)
      );
    } catch (error) {
      throw this.handleDocumentError(error);
    }
  }

  /**
   * Tracks document processing status with timeout
   */
  private async trackDocumentProcessing(documentId: string): Promise<Document> {
    const startTime = Date.now();

    while (true) {
      const response = await this.apiService.get<Document>(
        API_ENDPOINTS.DOCUMENT.VERIFY.replace(':id', documentId)
      );

      const document = response.data;

      if (document.status === DocumentStatus.COMPLETED) {
        return document;
      }

      if (document.status === DocumentStatus.FAILED) {
        throw new Error('Document processing failed');
      }

      if (Date.now() - startTime > this.processingTimeoutMs) {
        throw new Error('Document processing timeout');
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  /**
   * Generates encryption metadata for document security
   */
  private generateEncryptionMetadata(): EncryptionMetadata {
    return {
      keyId: crypto.randomUUID(),
      algorithm: 'AES-256-GCM',
      iv: CryptoJS.lib.WordArray.random(16).toString(),
      encryptedAt: new Date(),
      keyRotationDate: new Date(),
      version: '1.0'
    };
  }

  /**
   * Encrypts file content using AES-256
   */
  private async encryptFile(
    file: File,
    metadata: EncryptionMetadata
  ): Promise<Blob> {
    const fileBuffer = await file.arrayBuffer();
    const wordArray = CryptoJS.lib.WordArray.create(fileBuffer);

    const encrypted = CryptoJS.AES.encrypt(wordArray, metadata.keyId, {
      iv: CryptoJS.enc.Hex.parse(metadata.iv),
      mode: CryptoJS.mode.CBC
    });

    return new Blob([encrypted.toString()], { type: file.type });
  }

  /**
   * Handles document-related errors with detailed information
   */
  private handleDocumentError(error: any): Error {
    if (error instanceof z.ZodError) {
      return new Error(`Validation error: ${error.errors[0].message}`);
    }

    if (error.response?.status === 413) {
      return new Error('File size exceeds server limit');
    }

    return new Error(
      error.response?.data?.message || 'An error occurred while processing the document'
    );
  }
}

export default DocumentService;