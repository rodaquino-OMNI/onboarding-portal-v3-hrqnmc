terraform {
  required_version = ">= 1.5.0"
}

variable "cluster_name" {
  type        = string
  description = "Name of the AKS cluster"

  validation {
    condition     = length(var.cluster_name) >= 3 && length(var.cluster_name) <= 63
    error_message = "Cluster name must be between 3 and 63 characters"
  }
}

variable "resource_group_name" {
  type        = string
  description = "Name of the resource group where AKS cluster will be created"
}

variable "location" {
  type        = string
  description = "Azure region where AKS cluster will be deployed"
  default     = "brazilsouth"

  validation {
    condition     = can(regex("^brazil(south|southeast)$", var.location))
    error_message = "Location must be either brazilsouth or brazilsoutheast for LGPD compliance"
  }
}

variable "kubernetes_version" {
  type        = string
  description = "Version of Kubernetes to use for the cluster"
  default     = "1.27"

  validation {
    condition     = can(regex("^1\\.(2[7-9]|3[0-9])$", var.kubernetes_version))
    error_message = "Kubernetes version must be 1.27 or higher"
  }
}

variable "system_node_pool" {
  type = object({
    name                = string
    vm_size            = string
    min_count          = number
    max_count          = number
    enable_auto_scaling = bool
    availability_zones = list(string)
    os_disk_size_gb    = number
  })
  description = "Configuration for the system node pool"
  default = {
    name                = "system"
    vm_size            = "Standard_D4s_v3"
    min_count          = 3
    max_count          = 5
    enable_auto_scaling = true
    availability_zones  = ["1", "2", "3"]
    os_disk_size_gb    = 128
  }

  validation {
    condition     = var.system_node_pool.min_count >= 3
    error_message = "System node pool must have at least 3 nodes for high availability"
  }
}

variable "app_node_pool" {
  type = object({
    name                = string
    vm_size            = string
    min_count          = number
    max_count          = number
    enable_auto_scaling = bool
    availability_zones = list(string)
    os_disk_size_gb    = number
  })
  description = "Configuration for the application node pool"
  default = {
    name                = "app"
    vm_size            = "Standard_D8s_v3"
    min_count          = 3
    max_count          = 12
    enable_auto_scaling = true
    availability_zones  = ["1", "2", "3"]
    os_disk_size_gb    = 256
  }

  validation {
    condition     = var.app_node_pool.min_count >= 3
    error_message = "Application node pool must have at least 3 nodes for high availability"
  }
}

variable "network_profile" {
  type = object({
    network_plugin      = string
    network_policy     = string
    service_cidr       = string
    dns_service_ip     = string
    docker_bridge_cidr = string
  })
  description = "Network configuration for the AKS cluster"
  default = {
    network_plugin      = "azure"
    network_policy     = "calico"
    service_cidr       = "10.0.0.0/16"
    dns_service_ip     = "10.0.0.10"
    docker_bridge_cidr = "172.17.0.1/16"
  }

  validation {
    condition     = var.network_profile.network_policy == "calico"
    error_message = "Network policy must be set to calico for enhanced network security"
  }
}

variable "monitoring_config" {
  type = object({
    enable_container_insights = bool
    enable_container_logs    = bool
    retention_in_days       = number
    daily_quota_gb         = number
  })
  description = "Monitoring configuration for the AKS cluster"
  default = {
    enable_container_insights = true
    enable_container_logs    = true
    retention_in_days       = 30
    daily_quota_gb         = 100
  }

  validation {
    condition     = var.monitoring_config.retention_in_days >= 30
    error_message = "Log retention must be at least 30 days for compliance requirements"
  }
}

variable "maintenance_window" {
  type = object({
    allowed_maintenance_window = object({
      day    = string
      hours = list(number)
    })
    notifications = object({
      enabled = bool
    })
  })
  description = "Maintenance window configuration for the AKS cluster"
  default = {
    allowed_maintenance_window = {
      day    = "Sunday"
      hours = [2, 3, 4]
    }
    notifications = {
      enabled = true
    }
  }

  validation {
    condition     = contains(["Saturday", "Sunday"], var.maintenance_window.allowed_maintenance_window.day)
    error_message = "Maintenance window must be scheduled for weekends only"
  }
}

variable "tags" {
  type        = map(string)
  description = "Tags to be applied to the AKS cluster"
  default = {
    Project     = "AUSTA Health Portal"
    ManagedBy   = "Terraform"
    Environment = null
  }

  validation {
    condition     = var.tags["Environment"] != null
    error_message = "Environment tag must be specified"
  }
}