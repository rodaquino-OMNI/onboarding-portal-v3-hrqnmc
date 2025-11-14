/**
 * Document type definitions for the health plan enrollment system
 * Implements secure document management with LGPD compliance
 * @version 1.0.0
 */

/**
 * Enumeration of supported document types in the system
 * Categorized according to LGPD compliance requirements
 */
export enum DocumentType {
    ID_DOCUMENT = 'ID_DOCUMENT',
    CPF = 'CPF',
    PROOF_OF_ADDRESS = 'PROOF_OF_ADDRESS',
    MEDICAL_RECORD = 'MEDICAL_RECORD',
    LAB_RESULT = 'LAB_RESULT'
}

/**
 * Document processing pipeline status enumeration
 * Tracks document state through multi-stage processing
 */
export enum DocumentStatus {
    PENDING = 'PENDING',
    VALIDATING = 'VALIDATING',
    SCANNING = 'SCANNING',
    OCR_PROCESSING = 'OCR_PROCESSING',
    CLASSIFYING = 'CLASSIFYING',
    ENCRYPTING = 'ENCRYPTING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

/**
 * Enhanced interface for AES-256 document encryption metadata
 * Supports key rotation and versioning for security compliance
 */
export interface EncryptionMetadata {
    /** Unique identifier for the encryption key */
    keyId: string;
    
    /** Encryption algorithm identifier (e.g., 'AES-256-GCM') */
    algorithm: string;
    
    /** Initialization vector for encryption */
    iv: string;
    
    /** Timestamp of initial encryption */
    encryptedAt: Date;
    
    /** Date of last key rotation */
    keyRotationDate: Date;
    
    /** Encryption implementation version */
    version: string;
}

/**
 * Comprehensive document interface with LGPD compliance
 * and security features for health plan enrollment
 */
export interface Document {
    /** Unique document identifier */
    id: string;
    
    /** Associated enrollment identifier */
    enrollmentId: string;
    
    /** Document classification type */
    type: DocumentType;
    
    /** Original filename */
    filename: string;
    
    /** MIME type of the document */
    contentType: string;
    
    /** File size in bytes */
    size: number;
    
    /** Current processing status */
    status: DocumentStatus;
    
    /** Secure storage location path */
    storagePath: string;
    
    /** SHA-256 hash of document content */
    contentHash: string;
    
    /** Encryption metadata */
    encryptionInfo: EncryptionMetadata;
    
    /** Additional processing metadata */
    processingMetadata: Record<string, any>;
    
    /** Document validation results */
    validationResults: Record<string, boolean>;
    
    /** Document creation timestamp */
    createdAt: Date;
    
    /** Last modification timestamp */
    updatedAt: Date;
    
    /** Document retention period in days */
    retentionPeriod: number;

    /** Document content (for viewing) */
    content?: string;

    /** Access token for secure document viewing */
    accessToken?: string;
}

/**
 * Interface for document upload requests
 * Supports metadata inclusion during upload
 */
export interface DocumentUploadRequest {
    /** Associated enrollment identifier */
    enrollmentId: string;
    
    /** Document classification type */
    type: DocumentType;
    
    /** File object for upload */
    file: File;
    
    /** Optional metadata key-value pairs */
    metadata: Record<string, string>;
}

/**
 * Interface for paginated document list responses
 * Supports cursor-based pagination
 */
export interface DocumentListResponse {
    /** Array of document objects */
    items: Document[];
    
    /** Total number of documents */
    total: number;
    
    /** Current page number */
    page: number;
    
    /** Number of items per page */
    pageSize: number;
    
    /** Indicates if more pages exist */
    hasMore: boolean;
}