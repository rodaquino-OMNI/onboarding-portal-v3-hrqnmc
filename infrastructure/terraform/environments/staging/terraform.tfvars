# Environment and Location Configuration
environment          = "staging"
location            = "brazilsouth"
secondary_location  = "brazilsoutheast"

# AKS Cluster Configuration
aks_config = {
  kubernetes_version = "1.27"
  system_node_pool = {
    name                 = "system"
    vm_size             = "Standard_D4s_v3"
    min_count           = 3
    max_count           = 5
    availability_zones  = ["1", "2", "3"]
    enable_auto_scaling = true
    enable_node_public_ip = false
    os_disk_size_gb    = 128
    max_pods           = 110
  }
  app_node_pool = {
    name                 = "app"
    vm_size             = "Standard_D8s_v3"
    min_count           = 3
    max_count           = 12
    availability_zones  = ["1", "2", "3"]
    enable_auto_scaling = true
    enable_node_public_ip = false
    os_disk_size_gb    = 256
    max_pods           = 110
  }
  network_plugin          = "azure"
  network_policy         = "calico"
  load_balancer_sku      = "standard"
  private_cluster_enabled = true
}

# PostgreSQL Configuration
postgresql_config = {
  sku_name                     = "GP_Gen5_4"
  storage_mb                   = 102400
  backup_retention_days        = 30
  geo_redundant_backup        = true
  auto_grow_enabled           = true
  high_availability = {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }
  ssl_enforcement_enabled         = true
  ssl_minimal_tls_version        = "TLS1_2"
  public_network_access_enabled  = false
  firewall_rules                = []
  connection_throttling         = true
  threat_detection_enabled      = true
}

# Redis Cache Configuration
redis_config = {
  sku_name                      = "Premium"
  family                        = "P"
  capacity                      = 1
  enable_non_ssl_port           = false
  minimum_tls_version           = "1.2"
  shard_count                   = 2
  zones                         = ["1", "2"]
  replicas_per_master          = 1
  public_network_access_enabled = false
  redis_version                = "6.0"
  enable_authentication        = true
}

# Storage Account Configuration
storage_config = {
  account_tier              = "Standard"
  account_replication_type  = "GRS"
  min_tls_version          = "TLS1_2"
  enable_https_traffic_only = true
  allow_blob_public_access = false
  network_rules = {
    default_action = "Deny"
    bypass         = ["AzureServices"]
  }
  containers = {
    documents = {
      access_type      = "private"
      encryption_scope = "documents-scope"
    }
    backups = {
      access_type      = "private"
      encryption_scope = "backups-scope"
    }
  }
}

# Monitoring Configuration
monitoring_config = {
  retention_in_days        = 30
  daily_quota_gb          = 100
  enable_container_insights = true
  enable_container_logs   = true
  diagnostic_settings = {
    enabled = true
    retention_policy = {
      enabled = true
      days    = 30
    }
  }
  metrics_retention = {
    enabled = true
    days    = 30
  }
}

# Network Configuration
network_config = {
  vnet_address_space = ["10.0.0.0/16"]
  subnet_prefixes = {
    aks     = "10.0.0.0/22"
    db      = "10.0.4.0/24"
    redis   = "10.0.5.0/24"
    storage = "10.0.6.0/24"
  }
  service_endpoints = [
    "Microsoft.Sql",
    "Microsoft.Storage",
    "Microsoft.KeyVault"
  ]
  network_security_rules = {
    allow_azure_lb = true
    allow_vnet     = true
    deny_internet  = true
  }
}

# Resource Tags
tags = {
  Environment         = "staging"
  Project            = "AUSTA Health Portal"
  ManagedBy          = "Terraform"
  DataClassification = "Confidential"
  BusinessUnit       = "Healthcare"
  CostCenter         = "IT-12345"
}