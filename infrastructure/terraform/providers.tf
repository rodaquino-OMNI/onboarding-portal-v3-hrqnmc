# Configure Terraform settings and required providers
terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.7.1"
    }
  }
}

# Configure the Azure Provider with enhanced security and HA features
provider "azurerm" {
  features {
    # Key Vault configuration with soft delete protection
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }

    # Resource group protection
    resource_group {
      prevent_deletion_if_contains_resources = true
    }

    # Virtual machine disk cleanup
    virtual_machine {
      delete_os_disk_on_deletion = true
    }

    # Log Analytics workspace configuration
    log_analytics_workspace {
      permanently_delete_on_destroy = true
    }

    # API Management protection
    api_management {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_api_managements = true
    }

    # Application Insights configuration
    application_insights {
      disable_generated_rule = false
    }

    # Cognitive Services protection
    cognitive_account {
      purge_soft_delete_on_destroy = false
    }

    # Container Registry protection
    container_registry {
      purge_soft_delete_on_destroy = false
    }

    # AKS cluster protection
    kubernetes_cluster {
      permanently_delete_on_destroy = false
    }
  }

  # Enable Azure AD authentication for storage
  storage_use_azuread = true

  # Use Managed Service Identity for authentication
  use_msi = true

  # Ensure all required resource providers are registered
  skip_provider_registration = false
}

# Configure the Random provider with environment-based keepers
provider "random" {
  keepers = {
    environment = var.environment
  }
}