// TODO: Replace with actual Kong SDK when available
// The @kong/kong-config-ts package does not exist in npm registry
// Using local type definition instead
interface KongConfig {
  _format_version: string;
  _transform: boolean;
  services: Record<string, any>;
  plugins: Record<string, any>;
  routes: Record<string, any>;
}

// Environment variables
const NODE_ENV = process.env.NODE_ENV || 'development';
const API_VERSION = process.env.API_VERSION || 'v1';
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];

// Service configuration interface
interface ServiceOptions {
  host: string;
  port: number;
  path: string;
  retries: number;
  connect_timeout: number;
  write_timeout: number;
  read_timeout: number;
  circuit_breaker: {
    enabled: boolean;
    threshold: number;
    window_size: number;
  };
}

// Plugin configuration interface
interface PluginOptions {
  enabled: boolean;
  config: any;
}

/**
 * Generates service-specific Kong configuration with security and monitoring
 * @param serviceName - Name of the microservice
 * @param servicePort - Port number for the service
 * @param options - Service configuration options
 */
function getServiceConfig(serviceName: string, servicePort: number, options: ServiceOptions) {
  return {
    name: serviceName,
    host: options.host,
    port: servicePort,
    protocol: 'http',
    path: options.path,
    connect_timeout: options.connect_timeout,
    write_timeout: options.write_timeout,
    read_timeout: options.read_timeout,
    retries: options.retries,
    tags: [`env:${NODE_ENV}`, `service:${serviceName}`, `version:${API_VERSION}`],
    circuit_breaker: options.circuit_breaker
  };
}

/**
 * Generates environment-specific plugin configuration
 * @param pluginName - Name of the Kong plugin
 * @param options - Plugin configuration options
 */
function getPluginConfig(pluginName: string, options: PluginOptions): any {
  return {
    name: pluginName,
    enabled: options.enabled,
    config: {
      ...options.config,
      tags: [`env:${NODE_ENV}`, `plugin:${pluginName}`]
    }
  };
}

// Service configurations
const services = {
  auth: getServiceConfig('auth', 3001, {
    host: 'auth-service',
    port: 3001,
    path: '/api/v1/auth',
    retries: 5,
    connect_timeout: 60000,
    write_timeout: 60000,
    read_timeout: 60000,
    circuit_breaker: {
      enabled: true,
      threshold: 0.5,
      window_size: 60
    }
  }),
  enrollment: getServiceConfig('enrollment', 3002, {
    host: 'enrollment-service',
    port: 3002,
    path: '/api/v1/enrollments',
    retries: 3,
    connect_timeout: 60000,
    write_timeout: 60000,
    read_timeout: 60000,
    circuit_breaker: {
      enabled: true,
      threshold: 0.5,
      window_size: 60
    }
  }),
  health: getServiceConfig('health', 3003, {
    host: 'health-service',
    port: 3003,
    path: '/api/v1/health',
    retries: 3,
    connect_timeout: 120000,
    write_timeout: 120000,
    read_timeout: 120000,
    circuit_breaker: {
      enabled: true,
      threshold: 0.5,
      window_size: 120
    }
  }),
  document: getServiceConfig('document', 3004, {
    host: 'document-service',
    port: 3004,
    path: '/api/v1/documents',
    retries: 3,
    connect_timeout: 120000,
    write_timeout: 120000,
    read_timeout: 120000,
    circuit_breaker: {
      enabled: true,
      threshold: 0.5,
      window_size: 120
    }
  }),
  policy: getServiceConfig('policy', 3005, {
    host: 'policy-service',
    port: 3005,
    path: '/api/v1/policies',
    retries: 3,
    connect_timeout: 60000,
    write_timeout: 60000,
    read_timeout: 60000,
    circuit_breaker: {
      enabled: true,
      threshold: 0.5,
      window_size: 60
    }
  })
};

// Plugin configurations
const plugins = {
  cors: getPluginConfig('cors', {
    enabled: true,
    config: {
      origins: ALLOWED_ORIGINS,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      headers: [
        'Authorization',
        'Content-Type',
        'Accept',
        'Origin',
        'X-Requested-With',
        'X-Request-ID'
      ],
      exposed_headers: [
        'X-Auth-Token',
        'X-Request-ID',
        'X-Kong-Proxy-Latency',
        'X-Kong-Upstream-Latency'
      ],
      credentials: true,
      max_age: 3600,
      preflight_continue: false
    }
  }),
  rate_limiting: getPluginConfig('rate-limiting', {
    enabled: true,
    config: {
      minute: 1000,
      hour: 10000,
      policy: 'redis',
      fault_tolerant: true,
      hide_client_headers: false,
      redis_host: 'redis-cluster',
      redis_port: 6379,
      redis_timeout: 2000
    }
  }),
  jwt: getPluginConfig('jwt', {
    enabled: true,
    config: {
      uri_param_names: ['jwt'],
      cookie_names: [],
      key_claim_name: 'kid',
      secret_is_base64: false,
      claims_to_verify: ['exp', 'nbf', 'iss', 'sub'],
      maximum_expiration: 3600,
      run_on_preflight: true
    }
  }),
  request_transformer: getPluginConfig('request-transformer', {
    enabled: true,
    config: {
      add: {
        headers: [
          'X-Request-ID:$(uuid)',
          `X-Service-Version:${API_VERSION}`,
          `X-Environment:${NODE_ENV}`
        ]
      }
    }
  }),
  response_transformer: getPluginConfig('response-transformer', {
    enabled: true,
    config: {
      add: {
        headers: [
          'X-Kong-Proxy-Latency:${latency}',
          'X-Kong-Upstream-Latency:${upstream_latency}',
          'X-Content-Type-Options:nosniff',
          'X-Frame-Options:DENY',
          'Strict-Transport-Security:max-age=31536000; includeSubDomains'
        ]
      }
    }
  }),
  ip_restriction: getPluginConfig('ip-restriction', {
    enabled: true,
    config: {
      allow: process.env.ALLOWED_IPS?.split(',') || [],
      deny: process.env.DENIED_IPS?.split(',') || [],
      status: 403,
      message: 'Access forbidden by IP restriction'
    }
  }),
  bot_detection: getPluginConfig('bot-detection', {
    enabled: true,
    config: {
      allow: [],
      deny: ['curl', '*bot*', '*crawler*', '*spider*'],
      status: 403,
      message: 'Bot access forbidden'
    }
  }),
  prometheus: getPluginConfig('prometheus', {
    enabled: true,
    config: {
      per_consumer: true,
      status_code_metrics: true,
      latency_metrics: true,
      bandwidth_metrics: true,
      upstream_health_metrics: true
    }
  })
};

// Export plugins for use in middleware
export { plugins };

// Export comprehensive Kong configuration
export const kongConfig: KongConfig = {
  _format_version: '2.1',
  _transform: true,
  services,
  plugins,
  routes: {
    auth: {
      paths: ['/api/v1/auth'],
      strip_path: true,
      service: services.auth.name,
      plugins: ['cors', 'rate_limiting', 'jwt', 'request_transformer', 'response_transformer']
    },
    enrollment: {
      paths: ['/api/v1/enrollments'],
      strip_path: true,
      service: services.enrollment.name,
      plugins: ['cors', 'rate_limiting', 'jwt', 'request_transformer', 'response_transformer']
    },
    health: {
      paths: ['/api/v1/health'],
      strip_path: true,
      service: services.health.name,
      plugins: ['cors', 'rate_limiting', 'jwt', 'request_transformer', 'response_transformer']
    },
    document: {
      paths: ['/api/v1/documents'],
      strip_path: true,
      service: services.document.name,
      plugins: ['cors', 'rate_limiting', 'jwt', 'request_transformer', 'response_transformer']
    },
    policy: {
      paths: ['/api/v1/policies'],
      strip_path: true,
      service: services.policy.name,
      plugins: ['cors', 'rate_limiting', 'jwt', 'request_transformer', 'response_transformer']
    }
  }
};