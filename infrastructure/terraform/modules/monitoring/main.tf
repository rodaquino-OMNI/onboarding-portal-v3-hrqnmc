# Configure required providers
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm" # version ~> 3.0
    }
    kubernetes = {
      source  = "hashicorp/kubernetes" # version ~> 2.0
    }
    helm = {
      source  = "hashicorp/helm" # version ~> 2.0
    }
  }
}

# Create dedicated monitoring namespace with security labels
resource "kubernetes_namespace" "monitoring" {
  metadata {
    name = var.monitoring_namespace
    labels = {
      name           = "monitoring"
      environment    = "production"
      compliance    = "lgpd"
      security-tier = "critical"
      managed-by    = "terraform"
    }
  }
}

# Deploy Prometheus Stack with enhanced security features
resource "helm_release" "prometheus" {
  name       = "prometheus"
  repository = "https://prometheus-community.github.io/helm-charts"
  chart      = "kube-prometheus-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name
  
  values = [
    yamlencode({
      prometheus = {
        retention = "${var.prometheus_retention_days}d"
        securityContext = {
          runAsNonRoot = true
          runAsUser    = 65534
          fsGroup      = 65534
        }
        serviceMonitor = {
          enabled = true
        }
        prometheusSpec = {
          ruleSelectorNilUsesHelmValues = false
          serviceMonitorSelectorNilUsesHelmValues = false
          podMonitorSelectorNilUsesHelmValues = false
          storageSpec = {
            volumeClaimTemplate = {
              spec = {
                accessModes = ["ReadWriteOnce"]
                resources = {
                  requests = {
                    storage = "50Gi"
                  }
                }
              }
            }
          }
        }
      }
      alertmanager = {
        enabled = true
        config = {
          global = {
            resolve_timeout = "5m"
          }
          route = {
            group_by = ["job", "severity"]
            group_wait = "30s"
            group_interval = "5m"
            repeat_interval = "12h"
            receiver = "default"
          }
        }
        securityContext = {
          runAsNonRoot = true
          runAsUser    = 65534
        }
      }
      grafana = {
        enabled = true
        serviceMonitor = {
          enabled = true
        }
        securityContext = {
          runAsNonRoot = true
          runAsUser    = 65534
        }
      }
      kubeStateMetrics = {
        enabled = true
      }
      networkPolicy = {
        enabled = true
      }
      prometheusOperator = {
        tlsProxy = {
          enabled = true
        }
        admissionWebhooks = {
          enabled = true
          failurePolicy = "Fail"
        }
      }
    })
  ]

  depends_on = [kubernetes_namespace.monitoring]
}

# Deploy Grafana with security monitoring dashboards
resource "helm_release" "grafana" {
  name       = "grafana"
  repository = "https://grafana.github.io/helm-charts"
  chart      = "grafana"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      adminPassword = var.grafana_admin_password
      persistence = {
        enabled = true
        size    = var.grafana_storage_size
      }
      securityContext = {
        runAsNonRoot = true
        runAsUser    = 65534
        fsGroup      = 65534
      }
      rbac = {
        create     = true
        namespaced = true
      }
      serviceMonitor = {
        enabled = true
      }
      dashboardProviders = {
        "dashboardproviders.yaml" = {
          apiVersion = 1
          providers = [{
            name = "default"
            orgId = 1
            folder = ""
            type = "file"
            disableDeletion = true
            editable = false
            options = {
              path = "/var/lib/grafana/dashboards/default"
            }
          }]
        }
      }
      dashboards = {
        default = {
          "security-overview" = {
            json = file("${path.module}/../../../monitoring/grafana/dashboards/security-overview.json")
          }
          "compliance-monitoring" = {
            json = file("${path.module}/../../../monitoring/grafana/dashboards/compliance-monitoring.json")
          }
        }
      }
    })
  ]

  depends_on = [helm_release.prometheus]
}

# Deploy Jaeger with enhanced security features
resource "helm_release" "jaeger" {
  name       = "jaeger"
  repository = "https://jaegertracing.github.io/helm-charts"
  chart      = "jaeger"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      sampling = {
        rate = var.jaeger_sampling_rate
      }
      storage = {
        type = "elasticsearch"
        options = {
          es = {
            server-urls = "http://${var.elasticsearch_host}:9200"
            username   = var.elasticsearch_user
            password   = var.elasticsearch_password
          }
        }
      }
      securityContext = {
        runAsNonRoot = true
        runAsUser    = 65534
      }
      rbac = {
        create = true
      }
      agent = {
        strategy = "DaemonSet"
      }
      collector = {
        serviceMonitor = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.prometheus]
}

# Deploy ELK Stack with security features
resource "helm_release" "elastic" {
  name       = "elastic"
  repository = "https://helm.elastic.co"
  chart      = "elastic-stack"
  namespace  = kubernetes_namespace.monitoring.metadata[0].name

  values = [
    yamlencode({
      elasticsearch = {
        volumeClaimTemplate = {
          resources = {
            requests = {
              storage = var.elasticsearch_storage_size
            }
          }
        }
        security = {
          enabled = true
          tls = {
            enabled = true
          }
          authc = {
            enabled = true
          }
          audit = {
            enabled = true
            logfile = {
              enabled = true
            }
          }
        }
      }
      kibana = {
        enabled = true
        security = {
          enabled = true
        }
        serviceMonitor = {
          enabled = true
        }
      }
      logstash = {
        enabled = true
        security = {
          enabled = true
        }
        serviceMonitor = {
          enabled = true
        }
      }
      filebeat = {
        enabled = true
        security = {
          enabled = true
        }
        serviceMonitor = {
          enabled = true
        }
      }
    })
  ]

  depends_on = [helm_release.prometheus]
}

# Output monitoring endpoints
output "prometheus_url" {
  value = "https://prometheus.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}

output "grafana_url" {
  value = "https://grafana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}

output "jaeger_url" {
  value = "https://jaeger-query.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}

output "kibana_url" {
  value = "https://kibana.${kubernetes_namespace.monitoring.metadata[0].name}.svc.cluster.local"
}