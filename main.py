import uvicorn
import psutil
import docker
import pty
import subprocess
import asyncio
import os
import traceback
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi import WebSocket, WebSocketDisconnect

app = FastAPI(title="Homelab Dashboard")

# allows fast api to talk to port 5173 
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
            "total": round(memory.total / (1024**3), 1),
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
        containers = docker_client.containers.list(all=True)
        return [
            {
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else "custom-build",
                "status": c.status,
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

@app.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    await websocket.accept()
    print("WebSocket connection accepted from frontend.")
    
    try:
        master_fd, slave_fd = pty.openpty()
    except Exception as e:
        print(f"Failed to open PTY: {e}")
        await websocket.close()
        return
    
    try:
        proc = subprocess.Popen(
            ["/bin/bash"],
            stdin=slave_fd,
            stdout=slave_fd,
            stderr=slave_fd,
            preexec_fn=os.setsid
        )
        print("Bash subprocess spawned successfully.")
    except Exception as e:
        print(f"Failed to spawn bash subprocess: {e}")
        traceback.print_exc()
        os.close(master_fd)
        os.close(slave_fd)
        await websocket.close()
        return

    os.close(slave_fd)
    loop = asyncio.get_running_loop()

    async def read_from_pty():
        try:
            while True:
                data = await loop.run_in_executor(None, os.read, master_fd, 1024)
                if not data:
                    break
                await websocket.send_text(data.decode('utf-8', errors='ignore'))
        except Exception as e:
            print(f"Error reading from PTY: {e}")

    read_task = asyncio.create_task(read_from_pty())

    try:
        while True:
            data = await websocket.receive_text()
            await loop.run_in_executor(None, os.write, master_fd, data.encode('utf-8'))
    except WebSocketDisconnect:
        print("WebSocket disconnected by client.")
    except Exception as e:
        print(f"WebSocket receive error: {e}")
    finally:
        read_task.cancel()
        try:
            proc.terminate()
            proc.wait(timeout=1)
        except Exception:
            pass
        try:
            os.close(master_fd)
        except Exception:
            pass