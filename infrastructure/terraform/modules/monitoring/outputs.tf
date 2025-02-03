# Monitoring Service URLs
output "prometheus_url" {
  description = "URL for accessing Prometheus server with metrics collection endpoint"
  value       = "https://prometheus.${var.monitoring_namespace}.svc.cluster.local"
}

output "grafana_url" {
  description = "URL for accessing Grafana dashboards for visualization and analytics"
  value       = "https://grafana.${var.monitoring_namespace}.svc.cluster.local"
}

output "jaeger_url" {
  description = "URL for accessing Jaeger UI for distributed tracing visualization"
  value       = "https://jaeger-query.${var.monitoring_namespace}.svc.cluster.local"
}

output "kibana_url" {
  description = "URL for accessing Kibana dashboard for log analysis and visualization"
  value       = "https://kibana.${var.monitoring_namespace}.svc.cluster.local"
}

output "alert_manager_url" {
  description = "URL for accessing Prometheus AlertManager for alert management and routing"
  value       = "https://alertmanager.${var.monitoring_namespace}.svc.cluster.local"
}

output "monitoring_namespace" {
  description = "Kubernetes namespace where monitoring stack is deployed"
  value       = var.monitoring_namespace
}

# Comprehensive Monitoring Status
output "monitoring_status" {
  description = "Comprehensive status of all monitoring components including health and deployment state"
  value = {
    prometheus_status = helm_release.prometheus.status
    grafana_status   = helm_release.grafana.status
    jaeger_status    = helm_release.jaeger.status
    elk_status       = helm_release.elastic.status
    health_checks = {
      prometheus = helm_release.prometheus.status
      grafana    = helm_release.grafana.status
      jaeger     = helm_release.jaeger.status
      elk_stack  = helm_release.elastic.status
    }
  }
}

# Alert Thresholds Configuration
output "alert_thresholds" {
  description = "Configured monitoring alert thresholds for various metrics and security monitoring"
  value = {
    resource_usage = {
      cpu_threshold    = var.alert_thresholds.cpu_threshold
      memory_threshold = var.alert_thresholds.memory_threshold
      disk_threshold   = var.alert_thresholds.disk_threshold
    }
    performance = {
      error_rate_threshold = var.alert_thresholds.error_rate_threshold
      latency_threshold    = var.alert_thresholds.latency_threshold
    }
    security = {
      auth_failure_threshold      = var.alert_thresholds.auth_failure_threshold
      suspicious_access_threshold = var.alert_thresholds.suspicious_access_threshold
      encryption_failure_threshold = var.alert_thresholds.encryption_failure_threshold
      waf_block_threshold         = var.alert_thresholds.waf_block_threshold
    }
    api = {
      rate_limit_threshold = var.alert_thresholds.api_rate_limit_threshold
    }
  }
}

# Retention Configuration
output "retention_config" {
  description = "Retention configuration for monitoring components including metrics, traces, and logs"
  value = {
    logs = {
      general_logs_retention    = var.retention_config.logs_retention_days
      security_logs_retention   = var.retention_config.security_logs_retention_days
      audit_logs_retention     = var.retention_config.audit_logs_retention_days
    }
    metrics_retention = var.retention_config.metrics_retention_days
    traces_retention  = var.retention_config.traces_retention_days
  }
}

# APM Configuration
output "apm_config" {
  description = "Application Performance Monitoring configuration details"
  value = {
    enabled               = var.apm_config.enabled
    sampling_rate         = var.apm_config.sampling_rate
    transaction_max_spans = var.apm_config.transaction_max_spans
    stack_trace_limit     = var.apm_config.stack_trace_limit
    central_config        = var.apm_config.central_config
  }
}

# Tags
output "monitoring_tags" {
  description = "Tags applied to monitoring resources"
  value       = var.tags
}

# Resource Group Information
output "resource_group_info" {
  description = "Resource group details where monitoring resources are deployed"
  value = {
    name     = var.resource_group_name
    location = var.location
  }
}