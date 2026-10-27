import uvicorn
import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Homelab Dashboard")


app.


@app.get("/")
async def root():
    return{"message: Hello World"}

