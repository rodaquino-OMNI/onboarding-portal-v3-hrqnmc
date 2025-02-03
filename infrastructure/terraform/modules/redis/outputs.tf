# Resource ID output for the Redis cache instance
output "redis_id" {
  description = "Resource ID of the Azure Cache for Redis instance for resource management and referencing"
  value       = azurerm_redis_cache.redis_cache.id
  sensitive   = false
}

# Hostname output for Redis cache instance
output "redis_hostname" {
  description = "Hostname of the Redis cache instance for connection establishment and DNS resolution"
  value       = azurerm_redis_cache.redis_cache.hostname
  sensitive   = false
}

# SSL port output for secure connections
output "redis_ssl_port" {
  description = "SSL port for secure Redis connections with TLS encryption"
  value       = azurerm_redis_cache.redis_cache.ssl_port
  sensitive   = false
}

# Full connection string with security settings
output "redis_connection_string" {
  description = "Full Redis connection string with authentication, SSL enforcement, and connection retry settings"
  value       = format("%s:%s,password=%s,ssl=True,abortConnect=False", 
                      azurerm_redis_cache.redis_cache.hostname,
                      azurerm_redis_cache.redis_cache.ssl_port,
                      azurerm_redis_cache.redis_cache.primary_access_key)
  sensitive   = true
}

# Primary access key for authentication
output "redis_primary_access_key" {
  description = "Primary access key for Redis authentication, must be kept secure and used only in authenticated contexts"
  value       = azurerm_redis_cache.redis_cache.primary_access_key
  sensitive   = true
}

# Private endpoint IP address
output "private_endpoint_ip" {
  description = "Private IP address of the Redis private endpoint for secure internal network access"
  value       = azurerm_private_endpoint.redis_private_endpoint.private_service_connection[0].private_ip_address
  sensitive   = false
}