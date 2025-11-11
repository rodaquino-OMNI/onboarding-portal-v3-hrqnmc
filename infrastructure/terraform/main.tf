# Configure Terraform and required providers
terraform {
  required_version = ">= 1.5.0"
  
  backend "azurerm" {
    resource_group_name  = "terraform-state-rg"
    storage_account_name = "austahealthtfstate"
    container_name      = "tfstate"
    key                 = "prod.terraform.tfstate"
    use_oidc           = true
    use_azuread_auth   = true
  }

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.27.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5.0"
    }
  }
}

# Configure Azure provider
provider "azurerm" {
  features {
    key_vault {
      purge_soft_delete_on_destroy = false
      recover_soft_deleted_key_vaults = true
    }
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
  }
}

# Local variables
locals {
  resource_prefix = "${var.environment}-austa-health"
  common_tags = {
    Environment          = var.environment
    Project             = "AUSTA Health Portal"
    ManagedBy           = "Terraform"
    DataClassification  = "Confidential"
    BusinessUnit        = "Healthcare"
    CostCenter          = "HC001"
    ComplianceFramework = "LGPD"
  }
}

# Primary Resource Group
resource "azurerm_resource_group" "primary" {
  name     = "${local.resource_prefix}-rg"
  location = var.location
  tags     = local.common_tags
}

# Secondary Resource Group for DR
resource "azurerm_resource_group" "secondary" {
  name     = "${local.resource_prefix}-dr-rg"
  location = var.secondary_location
  tags     = local.common_tags
}

# Network Security Group
resource "azurerm_network_security_group" "main" {
  name                = "${local.resource_prefix}-nsg"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  tags               = local.common_tags

  security_rule {
    name                       = "DenyAllInbound"
    priority                   = 4096
    direction                  = "Inbound"
    access                     = "Deny"
    protocol                   = "*"
    source_port_range         = "*"
    destination_port_range    = "*"
    source_address_prefix     = "*"
    destination_address_prefix = "*"
  }
}

# Virtual Network
resource "azurerm_virtual_network" "main" {
  name                = "${local.resource_prefix}-vnet"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  address_space       = var.network_config.vnet_address_space
  tags               = local.common_tags

  subnet {
    name           = "aks-subnet"
    address_prefix = var.network_config.subnet_prefixes["aks"]
  }

  subnet {
    name           = "db-subnet"
    address_prefix = var.network_config.subnet_prefixes["db"]
  }

  subnet {
    name           = "redis-subnet"
    address_prefix = var.network_config.subnet_prefixes["redis"]
  }
}

# Key Vault
resource "azurerm_key_vault" "main" {
  name                        = "${local.resource_prefix}-kv"
  location                    = azurerm_resource_group.primary.location
  resource_group_name         = azurerm_resource_group.primary.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = var.key_vault_config.sku_name
  enabled_for_disk_encryption = var.key_vault_config.enabled_for_disk_encryption
  soft_delete_retention_days  = var.key_vault_config.soft_delete_retention_days
  purge_protection_enabled    = var.key_vault_config.purge_protection_enabled
  tags                       = local.common_tags

  network_acls {
    bypass                    = var.key_vault_config.network_acls.bypass
    default_action           = var.key_vault_config.network_acls.default_action
    virtual_network_subnet_ids = [azurerm_virtual_network.main.subnet.*.id[0]]
  }
}

# AKS Cluster
module "aks" {
  source              = "./modules/aks"
  resource_group_name = azurerm_resource_group.primary.name
  location            = azurerm_resource_group.primary.location
  cluster_name        = "${local.resource_prefix}-aks"
  kubernetes_version  = var.aks_config.kubernetes_version
  system_node_pool    = var.aks_config.system_node_pool
  app_node_pool       = var.aks_config.app_node_pool
  network_plugin      = var.aks_config.network_plugin
  network_policy      = var.aks_config.network_policy
  service_cidr        = var.aks_config.service_cidr
  dns_service_ip      = var.aks_config.dns_service_ip
  docker_bridge_cidr  = var.aks_config.docker_bridge_cidr
  vnet_subnet_id      = azurerm_virtual_network.main.subnet.*.id[0]
  tags                = local.common_tags
}

# PostgreSQL Database
module "database" {
  source              = "./modules/database"
  resource_group_name = azurerm_resource_group.primary.name
  location            = azurerm_resource_group.primary.location
  server_name         = "${local.resource_prefix}-psql"
  sku_name            = var.postgresql_config.sku_name
  storage_mb          = var.postgresql_config.storage_mb
  backup_retention_days = var.postgresql_config.backup_retention_days
  geo_redundant_backup = var.postgresql_config.geo_redundant_backup
  auto_grow_enabled    = var.postgresql_config.auto_grow_enabled
  high_availability    = var.postgresql_config.high_availability
  subnet_id           = azurerm_virtual_network.main.subnet.*.id[1]
  tags                = local.common_tags
}

# Redis Cache
resource "azurerm_redis_cache" "main" {
  name                = "${local.resource_prefix}-redis"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  capacity            = var.redis_config.capacity
  family              = var.redis_config.family
  sku_name            = var.redis_config.sku_name
  enable_non_ssl_port = var.redis_config.enable_non_ssl_port
  minimum_tls_version = var.redis_config.minimum_tls_version
  subnet_id           = azurerm_virtual_network.main.subnet.*.id[2]
  
  redis_configuration {
    maxmemory_policy = var.redis_config.maxmemory_policy
    maxfragmentationmemory_reserved = var.redis_config.maxfragmentationmemory_reserved
  }

  tags = local.common_tags
}

# Application Insights
resource "azurerm_application_insights" "main" {
  name                = "${local.resource_prefix}-appinsights"
  location            = azurerm_resource_group.primary.location
  resource_group_name = azurerm_resource_group.primary.name
  application_type    = "web"
  retention_in_days   = var.monitoring_config.retention_in_days
  daily_data_cap_in_gb = var.monitoring_config.daily_quota_gb
  tags                = local.common_tags
}

# Outputs
output "resource_group_name" {
  value = azurerm_resource_group.primary.name
}

output "aks_cluster_id" {
  value = module.aks.cluster_id
}

output "postgresql_server_fqdn" {
  value = module.database.postgresql_server.fqdn
}