import uvicorn
import psutil
import docker
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
    
try:
    docker_client = docker.from_env()
except Exception:
    docker_client = None

@app.get("/api/docker/containers")
def list_containers():
    if not docker_client:
        return []
    try:
        # Fetch all containers (running and stopped)
        containers = docker_client.containers.list(all=True)
        return [
            {
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else "custom-build",
                "status": c.status, # 'running', 'exited', etc.
                "created": c.attrs['Created']
            }
            for c in containers
        ]
    except Exception as e:
        return {"error": str(e)}

@app.post("/api/docker/containers/{container_id}/{action}")
def control_container(container_id: str, action: str):
    if not docker_client:
        return {"error": "Docker socket unavailable"}
    try:
        container = docker_client.containers.get(container_id)
        if action == "start":
            container.start()
        elif action == "stop":
            container.stop()
        elif action == "restart":
            container.restart()
        else:
            return {"error": "Invalid action"}
        return {"success": True, "container": container.name, "action": action}
    except Exception as e:
        return {"error": str(e)}
