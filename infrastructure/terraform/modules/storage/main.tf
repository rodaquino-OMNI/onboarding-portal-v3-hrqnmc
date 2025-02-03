# Azure Provider version ~> 3.75.0
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75.0"
    }
  }
}

# Local variables for storage configuration
locals {
  storage_config = {
    account_tier         = "Standard"
    replication_type    = "GRS"
    account_kind        = "StorageV2"
    min_tls_version     = "TLS1_2"
    allowed_headers     = ["x-ms-blob-type", "x-ms-date", "x-ms-version"]
    allowed_methods     = ["GET", "HEAD", "PUT", "DELETE"]
    max_age_in_seconds  = 3600
    exposed_headers     = ["x-ms-meta-*"]
    backup_retention_days = 30
  }
}

# Data source for current Azure client configuration
data "azurerm_client_config" "current" {}

# User-assigned managed identity for storage account
resource "azurerm_user_assigned_identity" "storage_identity" {
  name                = "${local.storage_config.name}-identity"
  resource_group_name = local.storage_config.resource_group_name
  location            = local.storage_config.location
  tags                = local.storage_config.tags
}

# Storage Account with enhanced security features
resource "azurerm_storage_account" "storage_account" {
  name                          = local.storage_config.name
  resource_group_name          = local.storage_config.resource_group_name
  location                     = local.storage_config.location
  account_tier                = local.storage_config.account_tier
  account_replication_type    = local.storage_config.replication_type
  account_kind               = local.storage_config.account_kind
  enable_https_traffic_only  = true
  min_tls_version           = local.storage_config.min_tls_version
  infrastructure_encryption_enabled = true

  blob_properties {
    versioning_enabled    = true
    change_feed_enabled   = true
    
    container_delete_retention_policy {
      days = local.storage_config.backup_retention_days
    }

    cors_rule {
      allowed_headers    = local.storage_config.allowed_headers
      allowed_methods    = local.storage_config.allowed_methods
      allowed_origins    = ["https://*.austa.health"]
      exposed_headers    = local.storage_config.exposed_headers
      max_age_in_seconds = local.storage_config.max_age_in_seconds
    }
  }

  network_rules {
    default_action             = "Deny"
    ip_rules                  = []
    virtual_network_subnet_ids = [local.storage_config.subnet_id]
    bypass                    = ["AzureServices"]
  }

  customer_managed_key {
    key_vault_key_id          = "${local.storage_config.key_vault_id}/keys/${local.storage_config.key_name}"
    user_assigned_identity_id = azurerm_user_assigned_identity.storage_identity.id
  }

  tags = local.storage_config.tags
}

# Secure container for MinIO document storage
resource "azurerm_storage_container" "minio_container" {
  name                  = "minio-documents"
  storage_account_name  = azurerm_storage_account.storage_account.name
  container_access_type = "private"
  
  metadata = {
    environment = local.storage_config.environment
    purpose     = "document-storage"
    encryption  = "aes256"
  }
}

# Key Vault access policy for storage encryption
resource "azurerm_key_vault_access_policy" "key_vault_access_policy" {
  key_vault_id = local.storage_config.key_vault_id
  tenant_id    = data.azurerm_client_config.current.tenant_id
  object_id    = azurerm_user_assigned_identity.storage_identity.principal_id

  key_permissions = [
    "Get",
    "UnwrapKey",
    "WrapKey"
  ]
}

# Output values for integration with other modules
output "storage_account_id" {
  value = azurerm_storage_account.storage_account.id
}

output "storage_account_name" {
  value = azurerm_storage_account.storage_account.name
}

output "storage_account_primary_access_key" {
  value     = azurerm_storage_account.storage_account.primary_access_key
  sensitive = true
}

output "storage_account_primary_blob_endpoint" {
  value = azurerm_storage_account.storage_account.primary_blob_endpoint
}

output "minio_container_name" {
  value = azurerm_storage_container.minio_container.name
}