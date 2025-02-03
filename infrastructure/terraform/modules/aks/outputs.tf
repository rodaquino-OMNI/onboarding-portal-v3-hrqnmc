# Output definitions for Azure Kubernetes Service (AKS) module
# Version: 1.0.0
# Purpose: Expose essential cluster information and credentials with security controls

output "cluster_id" {
  description = "The unique identifier of the AKS cluster for infrastructure integration and resource tracking"
  value       = azurerm_kubernetes_cluster.aks_cluster.id
  sensitive   = false
}

output "cluster_name" {
  description = "The name identifier of the AKS cluster used for resource management and monitoring"
  value       = azurerm_kubernetes_cluster.aks_cluster.name
  sensitive   = false
}

output "cluster_fqdn" {
  description = "The fully qualified domain name for secure cluster access and API endpoint resolution"
  value       = azurerm_kubernetes_cluster.aks_cluster.fqdn
  sensitive   = false
}

output "kube_config" {
  description = "Secure Kubernetes configuration for cluster authentication and access management, containing sensitive credentials"
  value       = azurerm_kubernetes_cluster.aks_cluster.kube_config_raw
  sensitive   = true
}

output "kube_config_host" {
  description = "The Kubernetes cluster API server endpoint for service communication and health monitoring"
  value       = azurerm_kubernetes_cluster.aks_cluster.kube_config[0].host
  sensitive   = false
}

output "cluster_identity" {
  description = "The system-assigned managed identity principal ID for secure Azure service integration"
  value       = azurerm_kubernetes_cluster.aks_cluster.identity[0].principal_id
  sensitive   = false
}

output "node_resource_group" {
  description = "The auto-generated resource group name containing AKS cluster node resources and supporting infrastructure"
  value       = azurerm_kubernetes_cluster.aks_cluster.node_resource_group
  sensitive   = false
}