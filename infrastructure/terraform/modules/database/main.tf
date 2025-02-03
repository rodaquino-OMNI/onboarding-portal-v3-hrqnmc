# Azure Database for PostgreSQL Hyperscale (Citus) deployment
# Provider versions: azurerm ~> 3.75.0, random ~> 3.5.0

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

# Data sources
data "azurerm_resource_group" "rg" {
  name = var.resource_group_name
}

data "azurerm_client_config" "current" {}

# Local variables
locals {
  postgresql_server_name = "psql-${var.environment}-${var.location}"
  databases = {
    enrollment = {
      name      = "enrollment_db"
      charset   = "UTF8"
      collation = "en_US.utf8"
    }
    health = {
      name      = "health_db"
      charset   = "UTF8"
      collation = "en_US.utf8"
    }
    policy = {
      name      = "policy_db"
      charset   = "UTF8"
      collation = "en_US.utf8"
    }
  }
}

# Generate secure admin password
resource "random_password" "admin_password" {
  length           = 32
  special          = true
  min_special      = 2
  min_upper        = 2
  min_lower        = 2
  min_numeric      = 2
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# PostgreSQL Server
resource "azurerm_postgresql_server" "server" {
  name                = local.postgresql_server_name
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name

  administrator_login          = var.administrator_login
  administrator_login_password = random_password.admin_password.result

  sku_name   = var.postgresql_config.sku_name
  version    = "12"
  storage_mb = var.postgresql_config.storage_mb

  backup_retention_days        = var.postgresql_config.backup_retention_days
  geo_redundant_backup_enabled = var.postgresql_config.geo_redundant_backup
  auto_grow_enabled           = var.postgresql_config.auto_grow_enabled

  public_network_access_enabled    = var.postgresql_config.public_network_access_enabled
  ssl_enforcement_enabled         = var.postgresql_config.ssl_enforcement_enabled
  ssl_minimal_tls_version        = var.postgresql_config.ssl_minimal_tls_version

  threat_detection_policy {
    enabled              = true
    disabled_alerts      = []
    email_account_admins = true
    retention_days       = 30
  }

  identity {
    type = "SystemAssigned"
  }

  zone_redundant = true

  tags = var.tags
}

# PostgreSQL Databases
resource "azurerm_postgresql_database" "databases" {
  for_each = local.databases

  name                = each.value.name
  resource_group_name = data.azurerm_resource_group.rg.name
  server_name         = azurerm_postgresql_server.server.name
  charset             = each.value.charset
  collation          = each.value.collation
}

# Private DNS Zone
resource "azurerm_private_dns_zone" "postgresql" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = data.azurerm_resource_group.rg.name
  tags                = var.tags
}

# Private DNS Zone Virtual Network Link
resource "azurerm_private_dns_zone_virtual_network_link" "postgresql" {
  name                  = "postgresql-dns-link"
  resource_group_name   = data.azurerm_resource_group.rg.name
  private_dns_zone_name = azurerm_private_dns_zone.postgresql.name
  virtual_network_id    = var.virtual_network_id
  registration_enabled  = false
  tags                 = var.tags
}

# Private Endpoint
resource "azurerm_private_endpoint" "postgresql" {
  name                = "pe-${local.postgresql_server_name}"
  location            = data.azurerm_resource_group.rg.location
  resource_group_name = data.azurerm_resource_group.rg.name
  subnet_id           = var.subnet_id

  private_service_connection {
    name                           = "psc-${local.postgresql_server_name}"
    private_connection_resource_id = azurerm_postgresql_server.server.id
    is_manual_connection          = false
    subresource_names            = ["postgresqlServer"]
  }

  private_dns_zone_group {
    name                 = "postgresql-dns-zone-group"
    private_dns_zone_ids = [azurerm_private_dns_zone.postgresql.id]
  }

  tags = var.tags
}

# PostgreSQL Configuration
resource "azurerm_postgresql_configuration" "configurations" {
  for_each = {
    work_mem                 = "16384"
    maintenance_work_mem     = "2097151"
    max_connections         = "1000"
    shared_buffers         = "8GB"
    effective_cache_size   = "24GB"
    autovacuum            = "on"
    log_connections       = "on"
    log_disconnections    = "on"
    connection_throttling = "on"
  }

  name                = each.key
  resource_group_name = data.azurerm_resource_group.rg.name
  server_name         = azurerm_postgresql_server.server.name
  value               = each.value
}

# PostgreSQL Firewall Rules
resource "azurerm_postgresql_firewall_rule" "azure_services" {
  name                = "allow-azure-services"
  resource_group_name = data.azurerm_resource_group.rg.name
  server_name         = azurerm_postgresql_server.server.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}

# Store admin password in Key Vault
resource "azurerm_key_vault_secret" "postgresql_admin_password" {
  name         = "postgresql-admin-password"
  value        = random_password.admin_password.result
  key_vault_id = var.key_vault_id

  content_type = "text/plain"
  tags         = var.tags
}

# Diagnostic settings
resource "azurerm_monitor_diagnostic_setting" "postgresql" {
  name                       = "postgresql-diagnostics"
  target_resource_id        = azurerm_postgresql_server.server.id
  log_analytics_workspace_id = var.log_analytics_workspace_id

  log {
    category = "PostgreSQLLogs"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true

    retention_policy {
      enabled = true
      days    = 30
    }
  }
}