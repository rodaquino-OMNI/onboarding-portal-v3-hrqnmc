# Resource Groups
output "resource_groups" {
  description = "Resource group names and locations for primary and secondary regions"
  value = {
    primary   = azurerm_resource_group.primary.name
    secondary = azurerm_resource_group.secondary.name
    location = {
      primary   = azurerm_resource_group.primary.location
      secondary = azurerm_resource_group.secondary.location
    }
  }
}

# AKS Clusters
output "aks_clusters" {
  description = "AKS cluster details for primary and secondary regions"
  value = {
    primary = {
      id                  = module.aks_primary.cluster_id
      name                = module.aks_primary.cluster_name
      resource_group      = module.aks_primary.node_resource_group
      identity            = module.aks_primary.cluster_identity
      api_server_endpoint = module.aks_primary.cluster_fqdn
    }
    secondary = {
      id                  = module.aks_secondary.cluster_id
      name                = module.aks_secondary.cluster_name
      resource_group      = module.aks_secondary.node_resource_group
      identity            = module.aks_secondary.cluster_identity
      api_server_endpoint = module.aks_secondary.cluster_fqdn
    }
  }
}

# Kubernetes Configurations
output "kubernetes_config" {
  description = "Kubernetes configuration for cluster access (sensitive)"
  sensitive   = true
  value = {
    primary   = module.aks_primary.kube_config
    secondary = module.aks_secondary.kube_config
  }
}

# PostgreSQL Databases
output "databases" {
  description = "PostgreSQL database details for primary and secondary regions"
  value = {
    primary = {
      server_name = module.database_primary.server_fqdn
      databases   = module.database_primary.database_ids
      region      = azurerm_resource_group.primary.location
    }
    secondary = {
      server_name = module.database_secondary.server_fqdn
      databases   = module.database_secondary.database_ids
      region      = azurerm_resource_group.secondary.location
    }
  }
  sensitive = true
}

# Database Connection Strings
output "database_connection_strings" {
  description = "PostgreSQL connection strings for applications (sensitive)"
  sensitive   = true
  value = {
    primary = {
      main     = module.database_primary.connection_string
      replica  = module.database_primary.replica_connection_string
    }
    secondary = {
      main     = module.database_secondary.connection_string
      replica  = module.database_secondary.replica_connection_string
    }
  }
}

# Redis Cache
output "redis_caches" {
  description = "Redis cache configuration for session management"
  value = {
    primary = {
      host       = module.redis_primary.redis_host
      ssl_port   = module.redis_primary.redis_port
      private_ip = module.redis_primary.redis_private_endpoint_ip
    }
    secondary = {
      host       = module.redis_secondary.redis_host
      ssl_port   = module.redis_secondary.redis_port
      private_ip = module.redis_secondary.redis_private_endpoint_ip
    }
  }
  sensitive = true
}

# Network Information
output "network_info" {
  description = "Network configuration details"
  value = {
    primary_vnet = {
      id         = azurerm_virtual_network.primary.id
      name       = azurerm_virtual_network.primary.name
      address_space = azurerm_virtual_network.primary.address_space
    }
    secondary_vnet = {
      id         = azurerm_virtual_network.secondary.id
      name       = azurerm_virtual_network.secondary.name
      address_space = azurerm_virtual_network.secondary.address_space
    }
  }
}

# Front Door
output "front_door" {
  description = "Front Door endpoint information"
  value = {
    frontend_endpoint = azurerm_frontdoor.main.frontend_endpoints[0].host_name
    backend_pools = {
      primary   = azurerm_frontdoor.main.backend_pool[0].name
      secondary = azurerm_frontdoor.main.backend_pool[1].name
    }
    waf_policy_id = azurerm_frontdoor_firewall_policy.main.id
  }
}

# Monitoring
output "monitoring" {
  description = "Monitoring resource information"
  value = {
    log_analytics = {
      primary = {
        workspace_id = azurerm_log_analytics_workspace.primary.workspace_id
        resource_id = azurerm_log_analytics_workspace.primary.id
      }
      secondary = {
        workspace_id = azurerm_log_analytics_workspace.secondary.workspace_id
        resource_id = azurerm_log_analytics_workspace.secondary.id
      }
    }
    application_insights = {
      primary   = azurerm_application_insights.primary.instrumentation_key
      secondary = azurerm_application_insights.secondary.instrumentation_key
    }
  }
  sensitive = true
}

# Key Vault
output "key_vaults" {
  description = "Key Vault resource information"
  value = {
    primary = {
      name = azurerm_key_vault.primary.name
      uri  = azurerm_key_vault.primary.vault_uri
    }
    secondary = {
      name = azurerm_key_vault.secondary.name
      uri  = azurerm_key_vault.secondary.vault_uri
    }
  }
}

# Storage Accounts
output "storage_accounts" {
  description = "Storage account information for document management"
  value = {
    primary = {
      name = azurerm_storage_account.primary.name
      primary_blob_endpoint = azurerm_storage_account.primary.primary_blob_endpoint
    }
    secondary = {
      name = azurerm_storage_account.secondary.name
      primary_blob_endpoint = azurerm_storage_account.secondary.primary_blob_endpoint
    }
  }
}