# Development environment-specific Terraform variable definitions
# Version: 3.75.0

# Environment and location settings
environment = "dev"
location    = "brazilsouth"

# AKS cluster configuration for development
aks_config = {
  kubernetes_version = "1.27"
  system_node_pool = {
    name                 = "system"
    vm_size             = "Standard_D2s_v3"
    min_count           = 1
    max_count           = 3
    availability_zones  = ["1"]
    enable_auto_scaling = true
    enable_node_public_ip = false
    os_disk_size_gb     = 50
  }
  app_node_pool = {
    name                 = "app"
    vm_size             = "Standard_D4s_v3"
    min_count           = 1
    max_count           = 5
    availability_zones  = ["1"]
    enable_auto_scaling = true
    enable_node_public_ip = false
    os_disk_size_gb     = 100
  }
}

# PostgreSQL configuration for development
postgresql_config = {
  sku_name                     = "GP_Gen5_2"
  storage_mb                   = 51200
  backup_retention_days        = 7
  geo_redundant_backup        = false
  auto_grow_enabled           = true
  high_availability = {
    mode = "Disabled"
  }
  ssl_enforcement_enabled         = true
  ssl_minimal_tls_version        = "TLS1_2"
  public_network_access_enabled  = true
  firewall_rules = {
    allow_azure_services = true
    allow_developer_ips  = true
  }
}

# Redis cache configuration for development
redis_config = {
  sku_name                    = "Standard"
  family                      = "C"
  capacity                    = 1
  enable_non_ssl_port         = false
  minimum_tls_version        = "1.2"
  shard_count                = 1
  public_network_access_enabled = true
  redis_version              = "6.0"
  enable_authentication      = true
}

# Storage configuration for development
storage_config = {
  account_tier              = "Standard"
  account_replication_type = "LRS"
  min_tls_version         = "TLS1_2"
  enable_https_traffic_only = true
  allow_blob_public_access = false
  containers = {
    documents = {
      access_type      = "private"
      enable_versioning = true
    }
    backups = {
      access_type      = "private"
      enable_versioning = false
    }
  }
  network_rules = {
    default_action = "Deny"
    ip_rules       = []
    virtual_network_subnet_ids = []
  }
}

# Monitoring configuration for development
monitoring_config = {
  retention_in_days        = 7
  daily_quota_gb          = 10
  enable_container_insights = true
  enable_container_logs   = true
  diagnostic_settings = {
    enabled              = true
    logs_retention_days  = 7
    metrics_retention_days = 7
  }
  alerts = {
    enable_cost_alerts         = true
    cost_threshold_percentage = 80
    enable_performance_alerts = true
  }
}

# Network configuration for development
network_config = {
  vnet_address_space = ["10.0.0.0/16"]
  subnet_prefixes = {
    aks   = "10.0.0.0/22"
    db    = "10.0.4.0/24"
    redis = "10.0.5.0/24"
  }
  network_security_rules = {
    allow_developer_access = true
    allow_azure_services  = true
  }
  ddos_protection_enabled = false
}

# Resource tags for development environment
tags = {
  Environment         = "dev"
  Project            = "AUSTA Health Portal"
  ManagedBy          = "Terraform"
  CostCenter         = "Development"
  DataClassification = "Confidential"
  AutoShutdown       = "Enabled"
}