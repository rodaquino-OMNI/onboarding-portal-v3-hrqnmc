# Storage Account Outputs
output "storage_account_id" {
  description = "The unique identifier of the Azure Storage Account used for resource referencing and access control"
  value       = azurerm_storage_account.storage_account.id
}

output "storage_account_name" {
  description = "The name of the Azure Storage Account used for service integration and resource identification"
  value       = azurerm_storage_account.storage_account.name
}

output "primary_access_key" {
  description = "Primary access key for the storage account, used for secure authentication and encrypted document access"
  value       = azurerm_storage_account.storage_account.primary_access_key
  sensitive   = true
}

output "primary_blob_endpoint" {
  description = "Primary blob service endpoint URL for the storage account, used for document service integration"
  value       = azurerm_storage_account.storage_account.primary_blob_endpoint
}

output "minio_container_name" {
  description = "Name of the MinIO document storage container for S3-compatible object storage integration"
  value       = azurerm_storage_container.minio_container.name
}