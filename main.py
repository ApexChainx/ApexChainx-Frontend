from fastapi import FastAPI
from app.routes import router as app_router

app = FastAPI()
app.include_router(app_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
