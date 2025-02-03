# Environment name for deployment with strict validation
variable "environment" {
  type        = string
  description = "Environment name for deployment (dev, staging, prod) with strict validation"

  validation {
    condition     = can(regex("^(dev|staging|prod)$", var.environment))
    error_message = "Environment must be dev, staging, or prod to ensure standardization"
  }
}

# Azure region for Redis cache deployment
variable "location" {
  type        = string
  description = "Azure region for Redis cache deployment, restricted to Brazil regions for data sovereignty"

  validation {
    condition     = can(regex("^(brazilsouth|brazilsoutheast)$", var.location))
    error_message = "Location must be brazilsouth or brazilsoutheast for compliance requirements"
  }
}

# Resource group name for Redis deployment
variable "resource_group_name" {
  type        = string
  description = "Name of the resource group for Redis cache deployment, must follow naming convention rg-{env}-redis-{region}"
}

# Redis cache capacity configuration
variable "capacity" {
  type        = number
  description = "Redis cache capacity (node size) with validation for supported sizes"
  default     = 2

  validation {
    condition     = contains([0, 1, 2, 3, 4, 5], var.capacity)
    error_message = "Capacity must be between 0 and 5 for supported Azure Cache for Redis sizes"
  }
}

# Redis cache family selection
variable "family" {
  type        = string
  description = "Redis cache family (P for Premium required for production)"
  default     = "P"

  validation {
    condition     = contains(["C", "P"], var.family)
    error_message = "Family must be C (Standard/Basic) or P (Premium) for proper feature support"
  }
}

# Redis cache SKU configuration
variable "sku_name" {
  type        = string
  description = "Redis cache SKU with Premium required for production environments"
  default     = "Premium"

  validation {
    condition     = contains(["Basic", "Standard", "Premium"], var.sku_name)
    error_message = "SKU must be Basic, Standard, or Premium with Premium required for production"
  }
}

# Subnet configuration for private endpoint
variable "subnet_id" {
  type        = string
  description = "Subnet ID for private endpoint deployment, mandatory for security compliance"
}

# AKS subnet IP range start for firewall rules
variable "aks_subnet_start_ip" {
  type        = string
  description = "Start IP of AKS subnet range for firewall rules, must be within VNet CIDR"
}

# AKS subnet IP range end for firewall rules
variable "aks_subnet_end_ip" {
  type        = string
  description = "End IP of AKS subnet range for firewall rules, must be within VNet CIDR"
}

# Non-SSL port configuration
variable "enable_non_ssl_port" {
  type        = bool
  description = "Enable non-SSL port (disabled by default for security)"
  default     = false
}

# TLS version configuration
variable "minimum_tls_version" {
  type        = string
  description = "Minimum TLS version for Redis connections"
  default     = "1.2"

  validation {
    condition     = contains(["1.0", "1.1", "1.2"], var.minimum_tls_version)
    error_message = "TLS version must be 1.0, 1.1, or 1.2 with 1.2 recommended"
  }
}

# Redis version configuration
variable "redis_version" {
  type        = string
  description = "Redis version to be deployed"
  default     = "7.0"

  validation {
    condition     = contains(["6.0", "7.0"], var.redis_version)
    error_message = "Redis version must be 6.0 or 7.0 for supported versions"
  }
}