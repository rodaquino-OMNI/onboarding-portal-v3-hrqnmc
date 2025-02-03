# Required provider versions
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.0"
    }
  }
}

# Resource Group Configuration
variable "resource_group_name" {
  type        = string
  description = "Name of the Azure resource group where monitoring resources will be deployed"
  validation {
    condition     = length(var.resource_group_name) > 0
    error_message = "Resource group name cannot be empty"
  }
}

variable "location" {
  type        = string
  description = "Azure region where monitoring resources will be deployed"
  default     = "brazilsouth"
}

# Cluster Configuration
variable "cluster_name" {
  type        = string
  description = "Name of the AKS cluster where monitoring stack will be deployed"
  validation {
    condition     = length(var.cluster_name) > 0
    error_message = "Cluster name cannot be empty"
  }
}

variable "monitoring_namespace" {
  type        = string
  description = "Kubernetes namespace for monitoring resources"
  default     = "monitoring"
}

# Prometheus Configuration
variable "enable_alertmanager" {
  type        = bool
  description = "Flag to enable/disable Prometheus AlertManager"
  default     = true
}

variable "prometheus_retention_days" {
  type        = number
  description = "Number of days to retain Prometheus metrics"
  default     = 30
}

# Grafana Configuration
variable "grafana_admin_password" {
  type        = string
  description = "Admin password for Grafana dashboard"
  sensitive   = true
  validation {
    condition     = length(var.grafana_admin_password) >= 12
    error_message = "Grafana admin password must be at least 12 characters long"
  }
}

# Jaeger Configuration
variable "jaeger_sampling_rate" {
  type        = number
  description = "Sampling rate for Jaeger tracing (0.0 to 1.0)"
  default     = 0.1
  validation {
    condition     = var.jaeger_sampling_rate >= 0 && var.jaeger_sampling_rate <= 1
    error_message = "Jaeger sampling rate must be between 0 and 1"
  }
}

# Elasticsearch Configuration
variable "elasticsearch_storage_size" {
  type        = string
  description = "Storage size for Elasticsearch data"
  default     = "100Gi"
}

# Alert Thresholds Configuration
variable "alert_thresholds" {
  type        = object({
    cpu_threshold              = string
    memory_threshold          = string
    disk_threshold           = string
    error_rate_threshold     = string
    latency_threshold        = string
    auth_failure_threshold   = string
    suspicious_access_threshold = string
    encryption_failure_threshold = string
    waf_block_threshold      = string
    api_rate_limit_threshold = string
  })
  description = "Thresholds for various monitoring alerts"
  default = {
    cpu_threshold              = "80"
    memory_threshold          = "80"
    disk_threshold           = "85"
    error_rate_threshold     = "5"
    latency_threshold        = "500"
    auth_failure_threshold   = "5"
    suspicious_access_threshold = "3"
    encryption_failure_threshold = "1"
    waf_block_threshold      = "10"
    api_rate_limit_threshold = "1000"
  }
}

# Retention Configuration
variable "retention_config" {
  type = object({
    logs_retention_days         = string
    traces_retention_days       = string
    metrics_retention_days      = string
    security_logs_retention_days = string
    audit_logs_retention_days   = string
  })
  description = "Retention configuration for different monitoring components"
  default = {
    logs_retention_days         = "30"
    traces_retention_days       = "15"
    metrics_retention_days      = "30"
    security_logs_retention_days = "90"
    audit_logs_retention_days   = "365"
  }
}

# APM Configuration
variable "apm_config" {
  type = object({
    enabled               = bool
    sampling_rate         = string
    transaction_max_spans = string
    stack_trace_limit    = string
    central_config       = bool
  })
  description = "Configuration for APM integration"
  default = {
    enabled               = true
    sampling_rate         = "0.1"
    transaction_max_spans = "500"
    stack_trace_limit    = "50"
    central_config       = true
  }
}

# Resource Tags
variable "tags" {
  type        = map(string)
  description = "Tags to be applied to monitoring resources"
  default = {
    Component  = "Monitoring"
    ManagedBy = "Terraform"
  }
}