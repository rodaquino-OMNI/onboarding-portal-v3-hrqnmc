# Environment and Location
environment          = "prod"
location            = "brazilsouth"
secondary_location  = "brazilsoutheast"

# AKS Configuration
aks_config = {
  kubernetes_version = "1.27"
  system_node_pool = {
    name                = "system"
    vm_size            = "Standard_D8s_v3"
    min_count          = 3
    max_count          = 5
    availability_zones = ["1", "2", "3"]
    enable_auto_scaling = true
    max_pods           = 110
    os_disk_size_gb    = 128
  }
  app_node_pool = {
    name                = "app"
    vm_size            = "Standard_D16s_v3"
    min_count          = 3
    max_count          = 12
    availability_zones = ["1", "2", "3"]
    enable_auto_scaling = true
    max_pods           = 110
    os_disk_size_gb    = 256
  }
}

# PostgreSQL Configuration
postgresql_config = {
  sku_name                     = "GP_Gen5_8"
  storage_mb                   = 512000
  backup_retention_days        = 35
  geo_redundant_backup        = true
  auto_grow_enabled           = true
  high_availability = {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
  }
  ssl_enforcement_enabled         = true
  ssl_minimal_tls_version        = "TLS1_2"
  public_network_access_enabled  = false
}

# Redis Configuration
redis_config = {
  sku_name                         = "Premium"
  family                          = "P"
  capacity                        = 2
  enable_non_ssl_port             = false
  minimum_tls_version             = "1.2"
  shard_count                     = 4
  zone_redundant                  = true
  maxmemory_policy                = "allkeys-lru"
  maxfragmentationmemory_reserved = 50
  maxmemory_delta                 = 50
}

# Storage Configuration
storage_config = {
  account_tier                    = "Standard"
  account_replication_type        = "RAGRS"
  min_tls_version                = "TLS1_2"
  enable_https_traffic_only      = true
  allow_nested_items_to_be_public = false
  network_rules = {
    default_action = "Deny"
    bypass         = ["AzureServices"]
    ip_rules       = []
    virtual_network_subnet_ids = []
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
  retention_in_days        = 90
  daily_quota_gb          = 200
  enable_container_insights = true
  enable_container_logs   = true
  diagnostic_settings = {
    enabled = true
    retention_policy = {
      enabled = true
      days    = 90
    }
  }
  metric_alerts = {
    cpu_threshold    = 80
    memory_threshold = 80
    disk_threshold   = 85
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
  network_security_rules = {
    inbound_deny_all = {
      priority  = 4096
      direction = "Inbound"
      access    = "Deny"
    }
  }
  ddos_protection_plan = {
    enable = true
  }
}

# Resource Tags
tags = {
  Environment         = "prod"
  Project            = "AUSTA Health Portal"
  ManagedBy          = "Terraform"
  BusinessUnit       = "Healthcare"
  DataClassification = "Confidential"
  Compliance         = "LGPD"
  CostCenter         = "PROD-HEALTH-001"
  DR                 = "Required"
  BackupFrequency    = "Daily"
  SecurityContact    = "security@austa.health"
}