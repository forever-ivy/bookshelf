from __future__ import annotations

from fastapi import APIRouter

from app.achievements.router import router as achievements_router
from app.admin.router import router as admin_router
from app.analytics.router import router as analytics_router
from app.auth.router import router as auth_router
from app.booklists.router import router as booklists_router
from app.catalog.router import router as catalog_router
from app.conversation.router import router as conversation_router
from app.favorites.router import router as favorites_router
from app.inventory.router import router as inventory_router
from app.notifications.router import router as notifications_router
from app.orders.router import router as orders_router
from app.readers.router import router as readers_router
from app.recommendation.router import router as recommendation_router
from app.robot_sim.router import router as robot_sim_router
from app.system.router import router as system_router
from app.tutor.router import router as tutor_router
from app.voice.router import router as voice_router

api_router = APIRouter()
api_router.include_router(system_router)
api_router.include_router(auth_router)
api_router.include_router(readers_router)
api_router.include_router(catalog_router)
api_router.include_router(favorites_router)
api_router.include_router(booklists_router)
api_router.include_router(notifications_router)
api_router.include_router(achievements_router)
api_router.include_router(inventory_router)
api_router.include_router(orders_router)
api_router.include_router(robot_sim_router)
api_router.include_router(recommendation_router)
api_router.include_router(conversation_router)
api_router.include_router(tutor_router)
api_router.include_router(voice_router)
api_router.include_router(analytics_router)
api_router.include_router(admin_router)
