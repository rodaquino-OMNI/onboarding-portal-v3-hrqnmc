import logging
from typing import Dict
import uvicorn
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from prometheus_fastapi_instrumentator import Instrumentator
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from fastapi_limiter import FastAPILimiter
from fastapi_limiter.depends import RateLimiter
import redis.asyncio as redis
import aiohttp

from config.settings import Settings
from api.health_assessment import router as health_assessment_router

# Initialize FastAPI application with enhanced metadata
app = FastAPI(
    title="Health Assessment Service",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json"
)

# Initialize settings
settings = Settings()

# Configure logging
logging.basicConfig(
    level=settings.log_level,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('health_service.log')
    ]
)
logger = logging.getLogger("health_service")

async def configure_middleware(app: FastAPI) -> None:
    """Configures enhanced middleware stack for the FastAPI application."""
    # CORS middleware with strict configuration
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.security.allowed_origins,
        allow_credentials=settings.security.cors_settings["allow_credentials"],
        allow_methods=settings.security.cors_settings["allow_methods"],
        allow_headers=settings.security.cors_settings["allow_headers"],
        max_age=settings.security.cors_settings["max_age"]
    )

    # Compression middleware
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Rate limiting middleware
    redis_instance = await redis.from_url("redis://localhost", encoding="utf-8", decode_responses=True)
    await FastAPILimiter.init(redis_instance)
    
    # Add rate limiting to all routes
    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next):
        limiter = RateLimiter(times=100, seconds=60)  # 100 requests per minute
        await limiter(request)
        response = await call_next(request)
        return response

async def configure_monitoring(app: FastAPI) -> None:
    """Sets up comprehensive monitoring and observability stack."""
    # Prometheus metrics
    instrumentator = Instrumentator(
        should_group_status_codes=False,
        should_ignore_untemplated=True,
        should_respect_env_var=True,
        should_instrument_requests_inprogress=True,
        excluded_handlers=[".*admin.*", "/metrics"],
        env_var_name="ENABLE_METRICS",
        inprogress_name="http_requests_inprogress",
        inprogress_labels=True
    )
    
    instrumentator.add(
        metrics_router=True,
        should_include_handler=True,
        should_include_method=True,
        should_include_status=True
    ).instrument(app).expose(app, include_in_schema=False, tags=["monitoring"])

    # OpenTelemetry instrumentation
    FastAPIInstrumentor.instrument_app(
        app,
        service_name="health-service",
        tracer_provider=None,  # Use default tracer provider
        meter_provider=None,  # Use default meter provider
    )

@app.on_event("startup")
async def startup_event() -> None:
    """Enhanced async function for application startup."""
    try:
        logger.info("Starting Health Assessment Service...")

        # Configure middleware
        await configure_middleware(app)

        # Configure monitoring
        await configure_monitoring(app)

        # Initialize health check session
        app.state.http_session = aiohttp.ClientSession()

        # Register routes
        app.include_router(
            health_assessment_router,
            prefix="/api/v1",
            tags=["Health Assessment"]
        )

        # Add health check endpoint
        @app.get("/health", tags=["monitoring"])
        async def health_check():
            return {
                "status": "healthy",
                "version": settings.version,
                "environment": settings.environment
            }

        logger.info("Health Assessment Service started successfully")

    except Exception as e:
        logger.error(f"Error during startup: {str(e)}")
        raise

@app.on_event("shutdown")
async def shutdown_event() -> None:
    """Enhanced async function for graceful shutdown."""
    try:
        logger.info("Shutting down Health Assessment Service...")

        # Close HTTP session
        if hasattr(app.state, "http_session"):
            await app.state.http_session.close()

        # Close Redis connection
        await FastAPILimiter.close()

        logger.info("Health Assessment Service shutdown complete")

    except Exception as e:
        logger.error(f"Error during shutdown: {str(e)}")
        raise

def main() -> None:
    """Enhanced main entry point with comprehensive error handling."""
    try:
        uvicorn.run(
            "main:app",
            host="0.0.0.0",
            port=settings.api_port,
            reload=settings.environment == "development",
            workers=4,
            log_level=settings.log_level.lower(),
            access_log=True,
            proxy_headers=True,
            forwarded_allow_ips="*",
            timeout_keep_alive=30
        )
    except Exception as e:
        logger.critical(f"Failed to start server: {str(e)}")
        raise

if __name__ == "__main__":
    main()