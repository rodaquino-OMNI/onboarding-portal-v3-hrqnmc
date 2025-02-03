# Variable definitions for Azure Database for PostgreSQL Hyperscale (Citus) module

variable "server_name" {
  type        = string
  description = "Name of the PostgreSQL server"
  validation {
    condition     = length(var.server_name) >= 3 && length(var.server_name) <= 63
    error_message = "Server name must be between 3 and 63 characters"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where the database will be created"
}

variable "location" {
  type        = string
  description = "Azure region where the database will be deployed"
  default     = "brazilsouth"
}

variable "administrator_login" {
  type        = string
  description = "PostgreSQL administrator username"
  validation {
    condition     = can(regex("^[a-zA-Z][a-zA-Z0-9_]{1,62}$", var.administrator_login))
    error_message = "Administrator login must start with a letter, contain only alphanumeric characters or underscores, and be 2-63 characters long"
  }
}

variable "sku_name" {
  type        = string
  description = "SKU name for the PostgreSQL server"
  default     = "GP_Citus_8_16GB"
  validation {
    condition     = can(regex("^GP_Citus_[0-9]+_[0-9]+GB$", var.sku_name))
    error_message = "SKU name must be a valid Hyperscale (Citus) SKU"
  }
}

variable "storage_mb" {
  type        = number
  description = "Storage size in MB for the PostgreSQL server"
  default     = 256000
  validation {
    condition     = var.storage_mb >= 256000 && var.storage_mb <= 4194304
    error_message = "Storage must be between 256GB and 4TB"
  }
}

variable "backup_retention_days" {
  type        = number
  description = "Backup retention period in days"
  default     = 30
  validation {
    condition     = var.backup_retention_days >= 7 && var.backup_retention_days <= 35
    error_message = "Backup retention days must be between 7 and 35"
  }
}

variable "geo_redundant_backup_enabled" {
  type        = bool
  description = "Enable geo-redundant backups"
  default     = true
}

variable "high_availability" {
  type = object({
    mode                      = string
    standby_availability_zone = string
    failover_mode            = string
    grace_minutes            = number
  })
  description = "High availability configuration for PostgreSQL server"
  default = {
    mode                      = "ZoneRedundant"
    standby_availability_zone = "2"
    failover_mode            = "Automatic"
    grace_minutes            = 60
  }
}

variable "databases" {
  type = map(object({
    charset          = string
    collation        = string
    extensions       = list(string)
    performance_tier = string
  }))
  description = "Map of databases to be created with their configurations"
  default = {
    auth = {
      charset          = "UTF8"
      collation        = "en_US.UTF8"
      extensions       = ["pgcrypto", "uuid-ossp"]
      performance_tier = "high"
    }
    enrollment = {
      charset          = "UTF8"
      collation        = "en_US.UTF8"
      extensions       = ["pgcrypto", "uuid-ossp", "pg_trgm"]
      performance_tier = "high"
    }
    health = {
      charset          = "UTF8"
      collation        = "en_US.UTF8"
      extensions       = ["pgcrypto", "uuid-ossp", "pg_trgm"]
      performance_tier = "high"
    }
    policy = {
      charset          = "UTF8"
      collation        = "en_US.UTF8"
      extensions       = ["pgcrypto", "uuid-ossp"]
      performance_tier = "high"
    }
  }
}

variable "allowed_ip_ranges" {
  type = list(object({
    start_ip_address = string
    end_ip_address   = string
    name            = string
  }))
  description = "List of IP ranges allowed to access the database"
  default     = []
  validation {
    condition     = length(var.allowed_ip_ranges) > 0
    error_message = "At least one IP range must be specified"
  }
}

variable "ssl_enforcement_enabled" {
  type        = bool
  description = "Enforce SSL connection"
  default     = true
}

variable "ssl_minimal_tls_version" {
  type        = string
  description = "Minimum TLS version"
  default     = "TLS1_2"
  validation {
    condition     = var.ssl_minimal_tls_version == "TLS1_2"
    error_message = "Only TLS 1.2 is allowed for LGPD compliance"
  }
}

variable "performance_configuration" {
  type = object({
    connection_pooling     = bool
    max_connections       = number
    connection_throttling = bool
    query_timeout_ms     = number
  })
  description = "Performance-related configurations"
  default = {
    connection_pooling     = true
    max_connections       = 100
    connection_throttling = true
    query_timeout_ms     = 30000
  }
}