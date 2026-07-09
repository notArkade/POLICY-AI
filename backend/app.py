import os

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.chatbot import router as chatbot_router
from routes.upload import router as policies_router


load_dotenv()

app = FastAPI(title="HR Policy Assistant API")

default_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://policy-ai-sandy.vercel.app",
    "https://policy-418xpb30a-notarkades-projects.vercel.app",
    "https://policy-ai-notarkades-projects.vercel.app"
]
extra_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=[*default_origins, *extra_origins],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(policies_router)
app.include_router(chatbot_router)


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
