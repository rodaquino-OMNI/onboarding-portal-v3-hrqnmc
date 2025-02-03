terraform {
  required_version = ">= 1.5.0"
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 3.75.0"
    }
  }
}

provider "azurerm" {
  features {
    resource_group {
      prevent_deletion_if_contains_resources = true
    }
    key_vault {
      purge_soft_delete_on_destroy = false
    }
  }
}

locals {
  # Network configuration
  network_config = {
    network_plugin     = var.network_profile.network_plugin
    network_policy    = var.network_profile.network_policy
    service_cidr      = var.network_profile.service_cidr
    dns_service_ip    = var.network_profile.dns_service_ip
    docker_bridge_cidr = var.network_profile.docker_bridge_cidr
    pod_cidr          = "10.244.0.0/16"
  }

  # Monitoring configuration
  monitoring_config = {
    metrics_retention_in_days = var.monitoring_config.retention_in_days
    enable_container_insights = var.monitoring_config.enable_container_insights
    enable_container_logs    = var.monitoring_config.enable_container_logs
    daily_quota_gb          = var.monitoring_config.daily_quota_gb
  }

  default_node_labels = {
    "nodepool-type"    = "system"
    "environment"      = var.tags["Environment"]
    "project"          = var.tags["Project"]
    "kubernetes.azure.com/managed" = "true"
  }
}

resource "azurerm_kubernetes_cluster" "aks_cluster" {
  name                = var.cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix         = "${var.cluster_name}-dns"
  kubernetes_version = var.kubernetes_version
  node_resource_group = "${var.resource_group_name}-node-rg"

  default_node_pool {
    name                = var.system_node_pool.name
    vm_size            = var.system_node_pool.vm_size
    enable_auto_scaling = var.system_node_pool.enable_auto_scaling
    min_count          = var.system_node_pool.min_count
    max_count          = var.system_node_pool.max_count
    availability_zones = var.system_node_pool.availability_zones
    os_disk_size_gb    = var.system_node_pool.os_disk_size_gb
    node_labels        = local.default_node_labels
    only_critical_addons_enabled = true
    vnet_subnet_id     = null # Will be set by network module
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin     = local.network_config.network_plugin
    network_policy    = local.network_config.network_policy
    service_cidr      = local.network_config.service_cidr
    dns_service_ip    = local.network_config.dns_service_ip
    docker_bridge_cidr = local.network_config.docker_bridge_cidr
    pod_cidr          = local.network_config.pod_cidr
    load_balancer_sku = "standard"
  }

  azure_policy_enabled = true
  
  azure_active_directory_role_based_access_control {
    managed                = true
    azure_rbac_enabled    = true
    tenant_id             = data.azurerm_client_config.current.tenant_id
  }

  oms_agent {
    log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
  }

  maintenance_window {
    allowed {
      day    = var.maintenance_window.allowed_maintenance_window.day
      hours  = var.maintenance_window.allowed_maintenance_window.hours
    }
    notification {
      enabled = var.maintenance_window.notifications.enabled
    }
  }

  auto_scaler_profile {
    balance_similar_node_groups = true
    expander                   = "random"
    max_graceful_termination_sec = 600
    max_node_provisioning_time   = "15m"
    max_unready_nodes           = 3
    max_unready_percentage      = 45
    new_pod_scale_up_delay      = "10s"
    scale_down_delay_after_add  = "10m"
    scale_down_delay_after_delete = "10s"
    scale_down_delay_after_failure = "3m"
    scan_interval               = "10s"
    utilization_threshold       = "0.5"
  }

  addon_profile {
    aci_connector_linux {
      enabled = false
    }
    azure_policy {
      enabled = true
    }
    http_application_routing {
      enabled = false
    }
    kube_dashboard {
      enabled = false
    }
    oms_agent {
      enabled                    = true
      log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id
    }
  }

  tags = merge(var.tags, {
    "kubernetes.io/cluster/${var.cluster_name}" = "owned"
  })

  lifecycle {
    prevent_destroy = true
    ignore_changes = [
      kubernetes_version,
      default_node_pool[0].node_count
    ]
  }
}

resource "azurerm_kubernetes_cluster_node_pool" "app_pool" {
  name                  = var.app_node_pool.name
  kubernetes_cluster_id = azurerm_kubernetes_cluster.aks_cluster.id
  vm_size              = var.app_node_pool.vm_size
  enable_auto_scaling   = var.app_node_pool.enable_auto_scaling
  min_count            = var.app_node_pool.min_count
  max_count            = var.app_node_pool.max_count
  availability_zones   = var.app_node_pool.availability_zones
  os_disk_size_gb      = var.app_node_pool.os_disk_size_gb
  
  node_labels = {
    "nodepool-type"    = "application"
    "environment"      = var.tags["Environment"]
    "project"          = var.tags["Project"]
  }

  node_taints = [
    "CriticalAddonsOnly=true:NoSchedule"
  ]

  tags = var.tags
}

resource "azurerm_log_analytics_workspace" "aks" {
  name                = "${var.cluster_name}-logs"
  location            = var.location
  resource_group_name = var.resource_group_name
  sku                 = "PerGB2018"
  retention_in_days   = local.monitoring_config.metrics_retention_in_days

  daily_quota_gb = local.monitoring_config.daily_quota_gb

  tags = var.tags
}

resource "azurerm_monitor_diagnostic_setting" "aks" {
  name                       = "${var.cluster_name}-diagnostics"
  target_resource_id        = azurerm_kubernetes_cluster.aks_cluster.id
  log_analytics_workspace_id = azurerm_log_analytics_workspace.aks.id

  log {
    category = "kube-apiserver"
    enabled  = true
    retention_policy {
      enabled = true
      days    = local.monitoring_config.metrics_retention_in_days
    }
  }

  log {
    category = "kube-audit"
    enabled  = true
    retention_policy {
      enabled = true
      days    = local.monitoring_config.metrics_retention_in_days
    }
  }

  metric {
    category = "AllMetrics"
    enabled  = true
    retention_policy {
      enabled = true
      days    = local.monitoring_config.metrics_retention_in_days
    }
  }
}

data "azurerm_client_config" "current" {}