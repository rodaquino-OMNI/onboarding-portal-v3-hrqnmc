terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.17"
    }
  }
}

# Environment variable with validation
variable "environment" {
  type        = string
  description = "Deployment environment (dev, staging, prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod"
  }
}

# Region configuration
variable "location" {
  type        = string
  description = "Primary Azure region for resource deployment"
  default     = "brazilsouth"
}

variable "secondary_location" {
  type        = string
  description = "Secondary Azure region for disaster recovery"
  default     = "brazilsoutheast"
}

# AKS configuration
variable "aks_config" {
  type = object({
    kubernetes_version = string
    system_node_pool = object({
      name               = string
      vm_size           = string
      min_count         = number
      max_count         = number
      availability_zones = list(string)
    })
    app_node_pool = object({
      name               = string
      vm_size           = string
      min_count         = number
      max_count         = number
      availability_zones = list(string)
    })
    network_plugin      = string
    network_policy      = string
    service_cidr        = string
    dns_service_ip      = string
    docker_bridge_cidr  = string
  })
  description = "AKS cluster configuration with node pools and scaling parameters"
  default = {
    kubernetes_version = "1.27"
    system_node_pool = {
      name               = "system"
      vm_size           = "Standard_D4s_v3"
      min_count         = 3
      max_count         = 5
      availability_zones = ["1", "2", "3"]
    }
    app_node_pool = {
      name               = "app"
      vm_size           = "Standard_D8s_v3"
      min_count         = 3
      max_count         = 12
      availability_zones = ["1", "2", "3"]
    }
    network_plugin      = "azure"
    network_policy      = "calico"
    service_cidr        = "172.16.0.0/16"
    dns_service_ip      = "172.16.0.10"
    docker_bridge_cidr  = "172.17.0.1/16"
  }
}

# PostgreSQL configuration
variable "postgresql_config" {
  type = object({
    sku_name                      = string
    storage_mb                    = number
    backup_retention_days         = number
    geo_redundant_backup         = bool
    auto_grow_enabled            = bool
    high_availability = object({
      mode                      = string
      standby_availability_zone = string
    })
    ssl_enforcement_enabled          = bool
    ssl_minimal_tls_version         = string
    public_network_access_enabled   = bool
  })
  description = "PostgreSQL database configuration with high availability settings"
  default = {
    sku_name                      = "GP_Gen5_4"
    storage_mb                    = 102400
    backup_retention_days         = 30
    geo_redundant_backup         = true
    auto_grow_enabled            = true
    high_availability = {
      mode                      = "ZoneRedundant"
      standby_availability_zone = "2"
    }
    ssl_enforcement_enabled          = true
    ssl_minimal_tls_version         = "TLS1_2"
    public_network_access_enabled   = false
  }
}

# Redis configuration
variable "redis_config" {
  type = object({
    sku_name                        = string
    family                         = string
    capacity                       = number
    enable_non_ssl_port            = bool
    minimum_tls_version            = string
    shard_count                    = number
    replicas_per_master            = number
    zone_redundancy_enabled        = bool
    maxmemory_policy               = string
    maxfragmentationmemory_reserved = number
  })
  description = "Redis cache configuration for session management"
  default = {
    sku_name                        = "Premium"
    family                         = "P"
    capacity                       = 1
    enable_non_ssl_port            = false
    minimum_tls_version            = "1.2"
    shard_count                    = 2
    replicas_per_master            = 1
    zone_redundancy_enabled        = true
    maxmemory_policy               = "volatile-lru"
    maxfragmentationmemory_reserved = 50
  }
}

# Key Vault configuration
variable "key_vault_config" {
  type = object({
    sku_name                    = string
    enabled_for_disk_encryption = bool
    soft_delete_retention_days  = number
    purge_protection_enabled    = bool
    network_acls = object({
      bypass          = string
      default_action  = string
    })
  })
  description = "Key Vault configuration for secrets and certificates"
  default = {
    sku_name                    = "premium"
    enabled_for_disk_encryption = true
    soft_delete_retention_days  = 90
    purge_protection_enabled    = true
    network_acls = {
      bypass          = "AzureServices"
      default_action  = "Deny"
    }
  }
}

# Front Door configuration
variable "front_door_config" {
  type = object({
    sku_name     = string
    waf_policy = object({
      enabled      = bool
      mode         = string
      custom_rules = list(any)
    })
    routing_rules = object({
      accepted_protocols   = list(string)
      patterns_to_match   = list(string)
      forwarding_protocol = string
    })
  })
  description = "Front Door configuration for global load balancing"
  default = {
    sku_name     = "Premium_AzureFrontDoor"
    waf_policy = {
      enabled      = true
      mode         = "Prevention"
      custom_rules = []
    }
    routing_rules = {
      accepted_protocols   = ["Http", "Https"]
      patterns_to_match   = ["/*"]
      forwarding_protocol = "HttpsOnly"
    }
  }
}

# Storage configuration
variable "storage_config" {
  type = object({
    account_tier                    = string
    account_replication_type        = string
    min_tls_version                = string
    enable_https_traffic_only      = bool
    allow_nested_items_to_be_public = bool
    network_rules = object({
      default_action = string
      bypass         = list(string)
    })
    containers = map(object({
      access_type      = string
      encryption_scope = string
    }))
  })
  description = "Storage account configuration for documents and backups"
  default = {
    account_tier                    = "Standard"
    account_replication_type        = "GRS"
    min_tls_version                = "TLS1_2"
    enable_https_traffic_only      = true
    allow_nested_items_to_be_public = false
    network_rules = {
      default_action = "Deny"
      bypass         = ["AzureServices"]
    }
    containers = {
      documents = {
        access_type      = "private"
        encryption_scope = "documents"
      }
      backups = {
        access_type      = "private"
        encryption_scope = "backups"
      }
    }
  }
}

# Monitoring configuration
variable "monitoring_config" {
  type = object({
    retention_in_days         = number
    daily_quota_gb           = number
    enable_container_insights = bool
    enable_container_logs    = bool
    metrics_retention_in_days = number
    action_group = object({
      email_receivers = list(any)
      sms_receivers   = list(any)
    })
    alerts = object({
      cpu_threshold    = number
      memory_threshold = number
      disk_threshold   = number
    })
  })
  description = "Monitoring and logging configuration"
  default = {
    retention_in_days         = 30
    daily_quota_gb           = 100
    enable_container_insights = true
    enable_container_logs    = true
    metrics_retention_in_days = 90
    action_group = {
      email_receivers = []
      sms_receivers   = []
    }
    alerts = {
      cpu_threshold    = 80
      memory_threshold = 80
      disk_threshold   = 85
    }
  }
}

# Network configuration
variable "network_config" {
  type = object({
    vnet_address_space    = list(string)
    subnet_prefixes       = map(string)
    ddos_protection_enabled = bool
    network_security_rules = object({
      allow_azure_lb       = bool
      allow_gateway_manager = bool
      deny_all_inbound     = bool
    })
  })
  description = "Network configuration for all services"
  default = {
    vnet_address_space    = ["10.0.0.0/16"]
    subnet_prefixes = {
      aks      = "10.0.0.0/22"
      db       = "10.0.4.0/24"
      redis    = "10.0.5.0/24"
      keyvault = "10.0.6.0/24"
      storage  = "10.0.7.0/24"
    }
    ddos_protection_enabled = true
    network_security_rules = {
      allow_azure_lb        = true
      allow_gateway_manager = true
      deny_all_inbound     = true
    }
  }
}

# Common tags
variable "tags" {
  type        = map(string)
  description = "Common tags to be applied to all resources"
  default = {
    Project            = "AUSTA Health Portal"
    Environment        = "var.environment"
    ManagedBy         = "Terraform"
    BusinessUnit      = "Healthcare"
    DataClassification = "Confidential"
    Compliance        = "LGPD"
  }
}