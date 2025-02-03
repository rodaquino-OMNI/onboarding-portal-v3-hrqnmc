# Azure Cache for Redis Terraform Module
# Provider versions
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.0"
    }
  }
}

# Local variables for resource naming and tagging
locals {
  redis_name = format("redis-%s-%s", var.environment, random_string.suffix.result)
  tags = {
    Environment = var.environment
    Service     = "redis-cache"
    ManagedBy   = "terraform"
  }
}

# Random string for unique naming
resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

# Azure Cache for Redis instance
resource "azurerm_redis_cache" "redis_cache" {
  name                          = local.redis_name
  location                      = var.location
  resource_group_name           = var.resource_group_name
  capacity                      = var.capacity
  family                        = var.family
  sku_name                      = var.sku_name
  enable_non_ssl_port          = var.enable_non_ssl_port
  minimum_tls_version          = var.minimum_tls_version
  public_network_access_enabled = false
  redis_version                = var.redis_version
  zones                        = ["1", "2", "3"]

  redis_configuration {
    maxmemory_reserved              = 2
    maxmemory_delta                 = 2
    maxmemory_policy               = "allkeys-lru"
    notify_keyspace_events         = "KEA"
    aof_backup_enabled             = true
    aof_storage_connection_string_0 = var.storage_connection_string
    enable_authentication          = true
    rdb_backup_enabled             = true
    rdb_backup_frequency           = 60
    rdb_backup_max_snapshot_count  = 1
  }

  patch_schedule {
    day_of_week    = "Sunday"
    start_hour_utc = 2
  }

  tags = local.tags

  lifecycle {
    prevent_destroy = true
  }
}

# Private endpoint for secure access
resource "azurerm_private_endpoint" "redis_private_endpoint" {
  name                = format("%s-pe", local.redis_name)
  location            = var.location
  resource_group_name = var.resource_group_name
  subnet_id           = var.subnet_id

  private_dns_zone_group {
    name                 = "redis-private-dns"
    private_dns_zone_ids = [var.private_dns_zone_id]
  }

  private_service_connection {
    name                           = format("%s-psc", local.redis_name)
    private_connection_resource_id = azurerm_redis_cache.redis_cache.id
    is_manual_connection          = false
    subresource_names            = ["redisCache"]
  }

  tags = local.tags
}

# Diagnostic settings for monitoring
resource "azurerm_monitor_diagnostic_setting" "redis_diagnostics" {
  name                       = format("%s-diag", local.redis_name)
  target_resource_id        = azurerm_redis_cache.redis_cache.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}

# Network rules for Redis cache
resource "azurerm_redis_firewall_rule" "aks_access" {
  name                = "aks-subnet-access"
  redis_cache_name    = azurerm_redis_cache.redis_cache.name
  resource_group_name = var.resource_group_name
  start_ip           = var.aks_subnet_start_ip
  end_ip             = var.aks_subnet_end_ip
}

# Outputs
output "redis_host" {
  value       = azurerm_redis_cache.redis_cache.hostname
  description = "The hostname of the Redis cache instance"
  sensitive   = true
}

output "redis_port" {
  value       = azurerm_redis_cache.redis_cache.ssl_port
  description = "The SSL port of the Redis cache instance"
}

output "redis_primary_key" {
  value       = azurerm_redis_cache.redis_cache.primary_access_key
  description = "The primary access key for the Redis cache instance"
  sensitive   = true
}

output "redis_private_endpoint_ip" {
  value       = azurerm_private_endpoint.redis_private_endpoint.private_service_connection[0].private_ip_address
  description = "The private IP address of the Redis cache private endpoint"
  sensitive   = true
}