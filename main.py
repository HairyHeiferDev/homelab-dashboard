import uvicorn


from fastapi import FastAPI

app = FastAPI(title="Homelab Dashboard")


@app.get("/")
async def root():
    return{"message: Hello World"}

