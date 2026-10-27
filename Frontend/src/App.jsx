import React, { useState, useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

// --- Embedded Terminal View Component ---
function TerminalView({ token }) {
  const terminalRef = useRef(null);
  const termInstanceRef = useRef(null);

  useEffect(() => {
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: "block",
      padding: 12,
      theme: {
        background: "#020617",
        foreground: "#22d3ee",
        cursor: "#22d3ee",
        selectionBackground: "rgba(34, 211, 238, 0.3)",
      },
      fontFamily: "monospace",
      fontSize: 13,
    });

    termInstanceRef.current = term;
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);

    setTimeout(() => {
      fitAddon.fit();
      term.focus();
    }, 150);

    const ws = new WebSocket(`ws://localhost:8000/ws/terminal?token=${token}`);

    ws.onmessage = (event) => {
      term.write(event.data);
    };

    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    });

    const handleResize = () => {
      fitAddon.fit();
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      ws.close();
      term.dispose();
    };
  }, [token]);

  return (
    <div
      onClick={() => termInstanceRef.current?.focus()}
      className="w-full h-[550px] bg-slate-950 border border-cyan-500/30 rounded-lg shadow-neon-cyan overflow-hidden cursor-text flex items-start justify-start"
    >
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}

// --- Main App Component ---
export default function App() {
  const [token, setToken] = useState(
    () => localStorage.getItem("homelab_token") || "",
  );
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => !!localStorage.getItem("homelab_token"),
  );

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [metrics, setMetrics] = useState({
    cpu: 0,
    ram: { used: 0, total: 16, percent: 0 },
    disk: { percent: 0 },
  });
  const [containers, setContainers] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = "info") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Handle Login with Username & Password
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    try {
      const res = await fetch("http://localhost:8000/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: usernameInput,
          password: passwordInput,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        localStorage.setItem("homelab_token", data.token);
        setToken(data.token);
        setIsAuthenticated(true);
        addToast("Authentication successful. Welcome, Josh.", "success");
      } else {
        setLoginError("ACCESS DENIED: Invalid username or password.");
      }
    } catch (err) {
      setLoginError("Connection failed. Ensure FastAPI backend is running.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("homelab_token");
    setToken("");
    setIsAuthenticated(false);
    setUsernameInput("");
    setPasswordInput("");
    addToast("Session terminated.", "info");
  };

  const fetchContainers = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/docker/containers", {
        headers: { "x-api-key": token },
      });
      const data = await res.json();
      if (Array.isArray(data)) setContainers(data);
    } catch (err) {
      console.error("Failed to fetch containers:", err);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === "containers") {
      fetchContainers();
      const interval = setInterval(fetchContainers, 4000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeTab]);

  const handleContainerAction = async (id, action) => {
    setLoadingAction(id);
    addToast(`Executing [${action.toUpperCase()}] on container...`, "info");
    try {
      const res = await fetch(
        `http://localhost:8000/api/docker/containers/${id}/${action}`,
        {
          method: "POST",
          headers: { "x-api-key": token },
        },
      );
      const data = await res.json();
      if (data.success) {
        addToast(
          `Success: Container '${data.container}' ${action}ed!`,
          "success",
        );
      } else {
        addToast(`Error: ${data.error}`, "error");
      }
      await fetchContainers();
    } catch (err) {
      addToast(`Network error while trying to ${action} container.`, "error");
    } finally {
      setLoadingAction(null);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchMetrics = async () => {
      try {
        const response = await fetch("http://localhost:8000/api/metrics", {
          headers: { "x-api-key": token },
        });
        if (response.status === 401) {
          handleLogout();
          return;
        }
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to fetch homelab metrics:", error);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token]);

  // --- Render Login Screen ---
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-cyan-400 font-mono flex items-center justify-center p-6 selection:bg-cyan-500 selection:text-slate-950 relative overflow-hidden">
        <div className="absolute w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-md bg-slate-900/60 border border-cyan-500/40 p-8 rounded-xl backdrop-blur-md shadow-neon-cyan relative z-10">
          <div className="flex items-center space-x-3 mb-6">
            <div className="w-3.5 h-3.5 bg-cyan-400 rounded-full animate-neon-pulse shadow-[0_0_12px_#22d3ee]"></div>
            <h1 className="text-lg font-bold tracking-widest text-white uppercase">
              HOMELAB GATEWAY
            </h1>
          </div>

          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Enter administrator credentials.
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="Enter username..."
                className="w-full bg-slate-950 border border-cyan-500/30 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest text-slate-400 mb-2">
                Password
              </label>
              <input
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                placeholder="Enter password..."
                className="w-full bg-slate-950 border border-cyan-500/30 rounded px-4 py-3 text-xs text-white focus:outline-none focus:border-cyan-400 transition-all shadow-inner"
                required
              />
            </div>

            {loginError && (
              <div className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/30 p-2.5 rounded tracking-wide">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full bg-cyan-500/10 border border-cyan-500/50 text-cyan-300 py-3 rounded text-xs font-bold tracking-widest hover:bg-cyan-500/20 transition-all shadow-neon-cyan disabled:opacity-50"
            >
              {isLoggingIn ? "ESTABLISHING UPLINK..." : "AUTHENTICATE UPLINK"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // --- Render Main Dashboard ---
  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 font-mono flex selection:bg-cyan-500 selection:text-slate-950 relative">
      <aside className="w-64 border-r border-cyan-500/20 bg-slate-900/40 p-6 flex flex-col justify-between backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-neon-pulse shadow-[0_0_12px_#22d3ee]"></div>
            <span className="text-base font-bold tracking-widest text-white">
              HOMELAB
            </span>
          </div>

          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === "dashboard"
                  ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-neon-cyan"
                  : "hover:bg-slate-800/60 text-slate-400 border border-transparent"
              }`}
            >
              &gt; SYSTEM METRICS
            </button>
            <button
              onClick={() => setActiveTab("containers")}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === "containers"
                  ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-neon-cyan"
                  : "hover:bg-slate-800/60 text-slate-400 border border-transparent"
              }`}
            >
              &gt; SERVER SERVICES STATUS
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === "terminal"
                  ? "bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-neon-cyan"
                  : "hover:bg-slate-800/60 text-slate-400 border border-transparent"
              }`}
            >
              &gt; TERMINAL
            </button>
          </nav>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleLogout}
            className="w-full text-left px-4 py-2.5 rounded text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 transition-all tracking-wider"
          >
            &gt; TERMINATE SESSION
          </button>

          <div className="text-xs text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-between">
            <span>STATUS:</span>
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              SECURE
            </span>
          </div>
        </div>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900/40 to-slate-950">
        <header className="flex justify-between items-center mb-8 border-b border-cyan-500/20 pb-4">
          <h1 className="text-lg font-bold tracking-widest text-white uppercase m-0">
            {activeTab === "dashboard" && "NEXUS"}
            {activeTab === "containers" && "SERVICES"}
            {activeTab === "terminal" && "TERMINAL"}
          </h1>
          <div className="text-xs bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded text-cyan-300 tracking-wider shadow-neon-cyan">
            Linux OS
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-900/50 border border-cyan-500/40 p-6 rounded-lg backdrop-blur shadow-neon-cyan relative overflow-hidden group transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2 animate-neon-pulse">
                CPU USAGE
              </h3>
              <div className="text-3xl font-bold text-white">
                {metrics.cpu}%
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full shadow-[0_0_8px_#22d3ee] transition-all duration-500"
                  style={{ width: `${metrics.cpu}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-emerald-500/40 p-6 rounded-lg backdrop-blur shadow-neon-emerald relative overflow-hidden group transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2">
                RAM ALLOCATION
              </h3>
              <div className="text-3xl font-bold text-white">
                {metrics.ram.used} / {metrics.ram.total} GB
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-400 h-full shadow-[0_0_8px_#34d399] transition-all duration-500"
                  style={{ width: `${metrics.ram.percent}%` }}
                ></div>
              </div>
            </div>

            <div className="bg-slate-900/50 border border-amber-500/40 p-6 rounded-lg backdrop-blur shadow-neon-amber relative overflow-hidden group transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2">
                STORAGE / ROOT
              </h3>
              <div className="text-3xl font-bold text-white">
                {metrics.disk.percent}% USED
              </div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full shadow-[0_0_8px_#fbbf24] transition-all duration-500"
                  style={{ width: `${metrics.disk.percent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "containers" && (
          <div className="bg-slate-900/50 border border-cyan-500/40 rounded-lg p-6 backdrop-blur shadow-neon-cyan">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs text-slate-400 uppercase tracking-widest">
                Active Container Fleet
              </h3>
              <button
                onClick={fetchContainers}
                className="text-xs bg-cyan-950/60 border border-cyan-500/40 px-3 py-1.5 rounded text-cyan-300 hover:bg-cyan-500/20 transition-all shadow-neon-cyan"
              >
                REFRESH FLEET
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-cyan-500/20 text-slate-400 tracking-wider">
                    <th className="pb-3 font-semibold">STATUS</th>
                    <th className="pb-3 font-semibold">CONTAINER NAME</th>
                    <th className="pb-3 font-semibold">IMAGE</th>
                    <th className="pb-3 font-semibold text-right">COMMANDS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {containers.length === 0 ? (
                    <tr>
                      <td
                        colSpan="4"
                        className="py-6 text-center text-slate-500"
                      >
                        Scanning Docker socket or zero containers found...
                      </td>
                    </tr>
                  ) : (
                    containers.map((c) => {
                      const getServiceUrl = (container) => {
                        const name = container.name.toLowerCase();
                        
                        if (name.includes('bunker') || name.includes('webbunker')) {
                          return 'http://192.168.2.12:8081/';
                        }
                        if (name.includes('qbit')) {
                          return 'http://localhost:8080/';
                        }
                        if (name.includes('prowlarr') || name.includes('prowellr')) {
                          return 'http://localhost:9696/';
                        }
                        if (name.includes('pihole') || name.includes('pi-hole')) {
                          return 'http://homelab.local/admin/';
                        }
                        if (name.includes('jellyfin')) {
                          return 'http://homelab.local:8096/';
                        }
                        if (name.includes('sonarr')) {
                          return 'http://homelab.local:8989/';
                        }
                        if (name.includes('radarr')) {
                          return 'http://homelab.local:7878/';
                        }
                        
                        if (container.port) {
                          return `http://homelab.local:${container.port}/`;
                        }
                        
                        return null;
                      };

                      const serviceUrl = getServiceUrl(c);

                      return (
                        <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                          <td className="py-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                                c.status === "running"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-neon-emerald"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  c.status === "running"
                                    ? "bg-emerald-400 animate-ping"
                                    : "bg-rose-400"
                                }`}
                              ></span>
                              {c.status}
                            </span>
                          </td>
                          <td className="py-4">
                            {serviceUrl && c.status === "running" ? (
                              <a
                                href={serviceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-cyan-300 font-bold tracking-wide hover:text-white hover:underline flex items-center gap-1.5 group w-fit"
                              >
                                {c.name}
                                <span className="text-[10px] opacity-60 group-hover:opacity-100">
                                  ↗
                                </span>
                              </a>
                            ) : (
                              <span className="text-white font-bold tracking-wide">
                                {c.name}
                              </span>
                            )}
                          </td>
                          <td className="py-4 text-slate-400 font-mono">
                            {c.image}
                          </td>
                          <td className="py-4 text-right space-x-2">
                            {c.status === "running" ? (
                              <>
                                <button
                                  disabled={loadingAction === c.id}
                                  onClick={() =>
                                    handleContainerAction(c.id, "restart")
                                  }
                                  className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded hover:bg-amber-500/20 transition-all disabled:opacity-50"
                                >
                                  RESTART
                                </button>
                                <button
                                  disabled={loadingAction === c.id}
                                  onClick={() =>
                                    handleContainerAction(c.id, "stop")
                                  }
                                  className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded hover:bg-rose-500/20 transition-all disabled:opacity-50"
                                >
                                  STOP
                                </button>
                              </>
                            ) : (
                              <button
                                disabled={loadingAction === c.id}
                                onClick={() =>
                                  handleContainerAction(c.id, "start")
                                }
                                className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                              >
                                START
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "terminal" && <TerminalView token={token} />}
      </main>

      <div className="fixed bottom-6 right-6 z-50 space-y-3 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto px-4 py-3 rounded-lg backdrop-blur-md text-xs tracking-wider flex items-center space-x-3 transition-all shadow-lg border ${
              toast.type === "success"
                ? "bg-slate-900/90 border-emerald-500/40 text-emerald-300 shadow-neon-emerald"
                : toast.type === "error"
                  ? "bg-slate-900/90 border-rose-500/40 text-rose-300 shadow-[0_0_15px_rgba(244,63,94,0.3)]"
                  : "bg-slate-900/90 border-cyan-500/40 text-cyan-300 shadow-neon-cyan"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                toast.type === "success"
                  ? "bg-emerald-400 animate-ping"
                  : toast.type === "error"
                    ? "bg-rose-400 animate-ping"
                    : "bg-cyan-400 animate-pulse"
              }`}
            ></span>
            <span>{toast.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}