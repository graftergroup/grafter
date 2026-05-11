import os

from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.config import get_settings
from backend.db import create_all_tables
from backend.routes_auth import router as auth_router
from backend.routes_customers import router as customers_router
from backend.routes_services import router as services_router
from backend.routes_bookings import router as bookings_router
from backend.routes_jobs import router as jobs_router
from backend.routes_invoices import router as invoices_router
from backend.routes_payments import router as payments_router
from backend.routes_vehicles import router as vehicles_router
from backend.routes_analytics import router as analytics_router
from backend.routes_staff import router as staff_router
from backend.routes_superadmin import router as superadmin_router
from backend.routes_locations import router as locations_router
from backend.routes_modules import (
    superadmin_router as modules_superadmin_router,
    franchise_router as modules_franchise_router,
    franchise_member_router as modules_member_router,
)


def create_app(static_dir: str) -> FastAPI:
    settings = get_settings()

    # Create database tables
    create_all_tables()
    
    # Initialize superadmin if env vars set
    from backend.db import init_superadmin
    init_superadmin()

    api = APIRouter()

    @api.get("/health")
    def health():
        return {"ok": True, "version": settings.APP_VERSION}

    app = FastAPI(title=settings.APP_NAME, version=settings.APP_VERSION)

    # Add CORS middleware
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include routers
    app.include_router(api, prefix="/api")
    app.include_router(auth_router, prefix="/api")
    app.include_router(customers_router, prefix="/api")
    app.include_router(services_router, prefix="/api")
    app.include_router(bookings_router, prefix="/api")
    app.include_router(jobs_router, prefix="/api")
    app.include_router(invoices_router, prefix="/api")
    app.include_router(payments_router, prefix="/api")
    app.include_router(vehicles_router, prefix="/api")
    app.include_router(analytics_router, prefix="/api")
    app.include_router(staff_router, prefix="/api")
    app.include_router(superadmin_router, prefix="/api")
    app.include_router(locations_router, prefix="/api")
    app.include_router(modules_superadmin_router, prefix="/api")
    app.include_router(modules_franchise_router, prefix="/api")
    app.include_router(modules_member_router, prefix="/api")

    if os.path.isdir(static_dir):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{path:path}")
        async def spa_fallback(request: Request, path: str):
            file_path = os.path.join(static_dir, path)
            if path and os.path.isfile(file_path):
                return FileResponse(file_path)
            return FileResponse(
                os.path.join(static_dir, "index.html"),
                headers={
                    "Cache-Control": "no-cache, no-store, must-revalidate",
                    "Pragma": "no-cache",
                    "Expires": "0",
                },
            )

    return app

