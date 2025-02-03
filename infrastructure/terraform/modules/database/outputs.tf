# Server resource identifier
output "server_id" {
  description = "The resource ID of the PostgreSQL server"
  value       = azurerm_postgresql_server.server.id
}

# Server FQDN for connections
output "server_fqdn" {
  description = "The fully qualified domain name of the PostgreSQL server"
  value       = azurerm_postgresql_server.server.fqdn
}

# Database resource IDs
output "database_ids" {
  description = "Map of database names to their resource IDs"
  value = {
    for db_key, db in azurerm_postgresql_database.databases : db.name => db.id
  }
}

# Secure connection strings with enhanced parameters
output "connection_strings" {
  description = "Map of database names to their secure connection strings with TLS and pooling configuration"
  sensitive   = true
  value = {
    for db_key, db in azurerm_postgresql_database.databases : db.name => format(
      "postgresql://%s@%s/%s?sslmode=require&sslversion=TLSv1_2&target_session_attrs=read-write&pool_min_conns=10&pool_max_conns=100&application_name=austa_health_portal&connect_timeout=10&idle_in_transaction_session_timeout=300",
      azurerm_postgresql_server.server.administrator_login,
      azurerm_postgresql_server.server.fqdn,
      db.name
    )
  }
}

# Replica connection strings for read-only operations
output "replica_connection_strings" {
  description = "Map of database names to their replica connection strings with failover configuration"
  sensitive   = true
  value = {
    for db_key, db in azurerm_postgresql_database.databases : db.name => format(
      "postgresql://%s@%s/%s?sslmode=require&sslversion=TLSv1_2&target_session_attrs=read-only&pool_min_conns=5&pool_max_conns=50&application_name=austa_health_portal_replica&connect_timeout=10",
      azurerm_postgresql_server.server.administrator_login,
      azurerm_postgresql_server.server.fqdn,
      db.name
    )
  }
}

# Server configuration parameters
output "server_configuration" {
  description = "PostgreSQL server configuration parameters"
  value = {
    version                        = azurerm_postgresql_server.server.version
    ssl_enforcement_enabled        = azurerm_postgresql_server.server.ssl_enforcement_enabled
    ssl_minimal_tls_version       = azurerm_postgresql_server.server.ssl_minimal_tls_version
    public_network_access_enabled = azurerm_postgresql_server.server.public_network_access_enabled
    backup_retention_days         = azurerm_postgresql_server.server.backup_retention_days
    geo_redundant_backup_enabled  = azurerm_postgresql_server.server.geo_redundant_backup_enabled
    auto_grow_enabled            = azurerm_postgresql_server.server.auto_grow_enabled
    zone_redundant               = azurerm_postgresql_server.server.zone_redundant
  }
}

# Connection parameters for application configuration
output "connection_parameters" {
  description = "Database connection parameters for application configuration"
  sensitive   = true
  value = {
    host                  = azurerm_postgresql_server.server.fqdn
    port                  = "5432"
    administrator_login   = azurerm_postgresql_server.server.administrator_login
    ssl_mode             = "require"
    ssl_version          = "TLSv1_2"
    min_connections      = "10"
    max_connections      = "100"
    connection_timeout   = "10"
    statement_timeout    = "300000"
    idle_in_transaction_timeout = "300000"
  }
}

# Private endpoint information
output "private_endpoint" {
  description = "Private endpoint configuration for the PostgreSQL server"
  value = {
    id            = azurerm_private_endpoint.postgresql.id
    private_dns_zone = azurerm_private_dns_zone.postgresql.name
    private_ip_addresses = azurerm_private_endpoint.postgresql.private_service_connection[0].private_ip_address
  }
}

# Health check endpoints
output "health_check_endpoints" {
  description = "Endpoints for database health monitoring"
  value = {
    primary = "${azurerm_postgresql_server.server.fqdn}:5432"
    dns_zone = azurerm_private_dns_zone.postgresql.name
  }
}