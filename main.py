import uvicorn
import psutil
import docker
import pty
import subprocess
import asyncio
import os
import traceback
from fastapi import FastAPI, Header, HTTPException, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv("passwords.env")
SECRET_TOKEN = os.getenv("SECRET_TOKEN")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD")


app = FastAPI(title="Homelab Dashboard")

# CORS middleware allowing frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "http://homelab.local:5173","http://homelab.local"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/login")
def login(credentials: dict):
    username = credentials.get("username")
    password = credentials.get("password")
    
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        return {"success": True, "token": SECRET_TOKEN}
    else:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

def verify_token(x_api_key: str = Header(None)):
    if x_api_key != SECRET_TOKEN:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key"
        )

@app.get("/api/metrics")
def get_system_metrics(x_api_key: str = Header(None)):
    verify_token(x_api_key)
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
def list_containers(x_api_key: str = Header(None)):
    verify_token(x_api_key)
    if not docker_client:
        return []
    try:
        containers = docker_client.containers.list(all=True)
        container_list = []
        
        # Common homelab port fallback map
        default_ports = {
            "jellyfin": "8096",
            "sonarr": "8989",
            "radarr": "7878",
            "prowlarr": "9696",
            "qbittorrent": "8080",
            "pihole": "80"
        }

        for c in containers:
            ports = c.attrs.get('NetworkSettings', {}).get('Ports', {})
            public_port = None
            if ports:
                for container_port, host_bindings in ports.items():
                    if host_bindings:
                        public_port = host_bindings[0].get('HostPort')
                        break
            
            # If no port found, check our fallback dictionary by container name
            if not public_port:
                for name_key, port_val in default_ports.items():
                    if name_key in c.name.lower():
                        public_port = port_val
                        break

            container_list.append({
                "id": c.short_id,
                "name": c.name,
                "image": c.image.tags[0] if c.image.tags else "custom-build",
                "status": c.status,
                "port": public_port,
                "created": c.attrs['Created']
            })
        return container_list
    except Exception as e:
        return {"error": str(e)}

@app.websocket("/ws/terminal")
async def terminal_websocket(websocket: WebSocket):
    token = websocket.query_params.get("token")
    if token != SECRET_TOKEN:
        await websocket.close(code=4003, reason="Unauthorized")
        print("Rejected unauthorized WebSocket terminal connection attempt.")
        return
    
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