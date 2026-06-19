from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routers import matching, auth
from .init_db import init_database
import logging
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Color Matching API",
    description="Textile color matching using smartphone camera data",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(matching.router)
app.include_router(auth.router)

@app.get("/health")
def health():
    return {"status": "ok", "version": "1.0.0"}

@app.on_event("startup")
async def startup():
    logger.info("Color Matching API starting up...")
    init_database()

# serve web app — must be last
