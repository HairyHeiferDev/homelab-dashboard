import uvicorn
import psutil
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Homelab Dashboard")

# allows fast api to talk to port i think 5173 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/metrics")
def get_system_metrics():
    cpu_usage = psutil.cpu_percent(interval=None)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    return {
        "cpu": cpu_usage,
        "ram": {
            "used": round(memory.used / (1024**3), 1),
            "total":round(memory.total / (1024**3),  1),
            "percent": memory.percent
        },
        
        "disk": {
            "percent": disk.percent
        }
    }
    

    