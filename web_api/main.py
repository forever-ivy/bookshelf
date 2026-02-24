from fastapi import FastAPI

from web_api.voice_assistant import router as voice_router


app = FastAPI(title="Smart Bookshelf Voice API")
app.include_router(voice_router, prefix="/api")


@app.get("/health")
async def health():
    return {"ok": True}
