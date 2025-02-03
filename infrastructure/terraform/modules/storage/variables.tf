# Required Terraform version
terraform {
  required_version = ">= 1.5.0"
}

# Resource Group Name Variable
variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where storage resources will be created"

  validation {
    condition     = length(var.resource_group_name) > 0
    error_message = "Resource group name cannot be empty"
  }
}

# Location Variable
variable "location" {
  type        = string
  description = "Azure region where storage resources will be deployed"

  validation {
    condition     = contains(["brazilsouth", "brazilsoutheast"], var.location)
    error_message = "Location must be either brazilsouth or brazilsoutheast"
  }
}

# Environment Variable
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod) for resource naming and tagging"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Storage Account Configuration
variable "storage_config" {
  type = object({
    account_tier                      = string
    account_replication_type          = string
    account_kind                      = string
    min_tls_version                  = string
    enable_https_traffic_only        = bool
    infrastructure_encryption_enabled = bool
    containers = map(object({
      access_type        = string
      versioning_enabled = bool
    }))
  })
  description = "Storage account configuration settings"

  default = {
    account_tier                      = "Standard"
    account_replication_type          = "GRS"
    account_kind                      = "StorageV2"
    min_tls_version                  = "TLS1_2"
    enable_https_traffic_only        = true
    infrastructure_encryption_enabled = true
    containers = {
      documents = {
        access_type        = "private"
        versioning_enabled = true
      }
      backups = {
        access_type        = "private"
        versioning_enabled = true
      }
    }
  }
}

# Network Rules Configuration
variable "network_rules" {
  type = object({
    default_action             = string
    bypass                     = list(string)
    ip_rules                  = list(string)
    virtual_network_subnet_ids = list(string)
  })
  description = "Network access rules for the storage account"

  default = {
    default_action             = "Deny"
    bypass                     = ["AzureServices"]
    ip_rules                  = []
    virtual_network_subnet_ids = []
  }
}

# Key Vault Configuration for Storage Encryption
variable "key_vault_config" {
  type = object({
    key_name = string
    key_type = string
    key_size = number
    key_opts = list(string)
  })
  description = "Key Vault configuration for storage encryption"

  default = {
    key_name = "storage-key"
    key_type = "RSA"
    key_size = 2048
    key_opts = ["unwrapKey", "wrapKey"]
  }
}

# MinIO Configuration
variable "minio_config" {
  type = object({
    container_name      = string
    access_type        = string
    versioning_enabled = bool
    backup_enabled     = bool
    backup_frequency   = string
  })
  description = "MinIO configuration settings"

  default = {
    container_name      = "minio-documents"
    access_type        = "private"
    versioning_enabled = true
    backup_enabled     = true
    backup_frequency   = "daily"
  }
}

# Resource Tags
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to all storage resources"

  default = {
    Project    = "AUSTA Health Portal"
    Component  = "Document Storage"
    ManagedBy  = "Terraform"
  }
}