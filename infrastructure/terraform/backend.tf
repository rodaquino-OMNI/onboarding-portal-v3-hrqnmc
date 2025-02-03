# Backend configuration for Terraform state management in Azure Storage
# Version: Azure Storage Account with Azure AD authentication and blob versioning
terraform {
  backend "azurerm" {
    # Resource group containing the storage account
    resource_group_name = "tfstate-rg"
    
    # Storage account name for Terraform state
    storage_account_name = "austatfstate"
    
    # Container name for state files
    container_name = "tfstate"
    
    # State file path using environment-based organization
    # Format: project/environment/filename
    key = "austa-health/${var.environment}/terraform.tfstate"
    
    # Enable Azure AD authentication for enhanced security
    use_azuread_auth = true
    
    # Azure subscription and tenant configuration
    subscription_id = "${var.subscription_id}"
    tenant_id = "${var.tenant_id}"
    
    # Use Microsoft Graph API for Azure AD operations
    use_microsoft_graph = true
    
    # Enable blob versioning for state file history
    blob_properties {
      versioning_enabled = true
    }
  }
}