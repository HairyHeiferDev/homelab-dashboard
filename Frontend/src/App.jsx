import React, { useState, useEffect } from 'react';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [metrics, setMetrics] = useState({
    cpu: 0,
    ram: { used: 0, total: 16, percent: 0 },
    disk: { percent: 0 }
  });
  const [containers, setContainers] = useState([]);
  const [loadingAction, setLoadingAction] = useState(null);

  const fetchContainers = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/docker/containers');
      const data = await res.json();
      if (Array.isArray(data)) setContainers(data);
    } catch (err) {
      console.error("Failed to fetch containers:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'containers') {
      fetchContainers();
      const interval = setInterval(fetchContainers, 4000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleContainerAction = async (id, action) => {
    setLoadingAction(id);
    try {
      await fetch(`http://localhost:8000/api/docker/containers/${id}/${action}`, {
        method: 'POST',
      });
      await fetchContainers();
    } catch (err) {
      console.error(`Failed to ${action} container:`, err);
    } finally {
      setLoadingAction(null);
    }
  };

  // Fetch live metrics every 2 seconds
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/metrics');
        const data = await response.json();
        setMetrics(data);
      } catch (error) {
        console.error("Failed to fetch homelab metrics:", error);
      }
    };

    fetchMetrics(); // Initial fetch
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-cyan-400 font-mono flex selection:bg-cyan-500 selection:text-slate-950">
      {/* Sidebar Navigation */}
      <aside className="w-64 border-r border-cyan-500/20 bg-slate-900/40 p-6 flex flex-col justify-between backdrop-blur-md">
        <div>
          <div className="flex items-center space-x-3 mb-10">
            <div className="w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_12px_#22d3ee]"></div>
            <span className="text-base font-bold tracking-widest text-white">HOMELAB</span>
          </div>
          
          <nav className="space-y-2">
            <button 
              onClick={() => setActiveTab('dashboard')}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === 'dashboard' 
                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                  : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
              }`}
            >
              &gt; SYSTEM METRICS
            </button>
            <button 
              onClick={() => setActiveTab('containers')}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === 'containers' 
                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                  : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
              }`}
            >
              &gt; SERVER SERVICES STATUS
            </button>
            <button 
              onClick={() => setActiveTab('terminal')}
              className={`w-full text-left px-4 py-3 rounded text-sm transition-all duration-200 tracking-wider ${
                activeTab === 'terminal' 
                  ? 'bg-cyan-500/10 border border-cyan-500/40 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.15)]' 
                  : 'hover:bg-slate-800/60 text-slate-400 border border-transparent'
              }`}
            >
              &gt; TERMINAL
            </button>
          </nav>
        </div>

        <div className="text-xs text-slate-500 border-t border-slate-800/80 pt-4 flex items-center justify-between">
          <span>STATUS:</span>
          <span className="text-emerald-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            CONNECTED
          </span>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto bg-gradient-to-br from-slate-950 via-slate-900/40 to-slate-950">
        <header className="flex justify-between items-center mb-8 border-b border-cyan-500/20 pb-4">
          <h1 className="text-lg font-bold tracking-widest text-white uppercase m-0">
            {activeTab === 'dashboard' && 'System Resource Telemetry'}
            {activeTab === 'containers' && 'Container Fleet Management'}
            {activeTab === 'terminal' && 'Interactive PTY Shell'}
          </h1>
          <div className="text-xs bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded text-cyan-300 tracking-wider shadow-[0_0_10px_rgba(34,211,238,0.05)]">
            HOST: LINUX_MINT
          </div>
        </header>

        {/* Dynamic Panel Content */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* CPU Card */}
            <div className="bg-slate-900/50 border border-cyan-500/20 p-6 rounded-lg backdrop-blur shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2">CPU USAGE</h3>
              <div className="text-3xl font-bold text-white">{metrics.cpu}%</div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div 
                  className="bg-cyan-400 h-full shadow-[0_0_8px_#22d3ee] transition-all duration-500"
                  style={{ width: `${metrics.cpu}%` }}
                ></div>
              </div>
            </div>

            {/* RAM Card */}
            <div className="bg-slate-900/50 border border-cyan-500/20 p-6 rounded-lg backdrop-blur shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-emerald-400 shadow-[0_0_8px_#34d399]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2">RAM ALLOCATION</h3>
              <div className="text-3xl font-bold text-white">{metrics.ram.used} / {metrics.ram.total} GB</div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-400 h-full shadow-[0_0_8px_#34d399] transition-all duration-500"
                  style={{ width: `${metrics.ram.percent}%` }}
                ></div>
              </div>
            </div>

            {/* Storage Card */}
            <div className="bg-slate-900/50 border border-cyan-500/20 p-6 rounded-lg backdrop-blur shadow-lg relative overflow-hidden group hover:border-cyan-500/40 transition-all">
              <div className="absolute top-0 left-0 w-1 h-full bg-amber-400 shadow-[0_0_8px_#fbbf24]"></div>
              <h3 className="text-xs text-slate-400 uppercase tracking-widest mb-2">STORAGE / ROOT</h3>
              <div className="text-3xl font-bold text-white">{metrics.disk.percent}% USED</div>
              <div className="w-full bg-slate-800/80 h-1.5 mt-5 rounded-full overflow-hidden">
                <div 
                  className="bg-amber-400 h-full shadow-[0_0_8px_#fbbf24] transition-all duration-500"
                  style={{ width: `${metrics.disk.percent}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'containers' && (
          <div className="bg-slate-900/50 border border-cyan-500/20 rounded-lg p-6 backdrop-blur shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xs text-slate-400 uppercase tracking-widest">Active Container Fleet</h3>
              <button 
                onClick={fetchContainers}
                className="text-xs bg-cyan-950/60 border border-cyan-500/40 px-3 py-1.5 rounded text-cyan-300 hover:bg-cyan-500/20 transition-all"
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
                      <td colSpan="4" className="py-6 text-center text-slate-500">Scanning Docker socket or zero containers found...</td>
                    </tr>
                  ) : (
                    containers.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            c.status === 'running' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${c.status === 'running' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`}></span>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-4 text-white font-bold tracking-wide">{c.name}</td>
                        <td className="py-4 text-slate-400 font-mono">{c.image}</td>
                        <td className="py-4 text-right space-x-2">
                          {c.status === 'running' ? (
                            <>
                              <button 
                                disabled={loadingAction === c.id}
                                onClick={() => handleContainerAction(c.id, 'restart')}
                                className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded hover:bg-amber-500/20 transition-all disabled:opacity-50"
                              >
                                RESTART
                              </button>
                              <button 
                                disabled={loadingAction === c.id}
                                onClick={() => handleContainerAction(c.id, 'stop')}
                                className="px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded hover:bg-rose-500/20 transition-all disabled:opacity-50"
                              >
                                STOP
                              </button>
                            </>
                          ) : (
                            <button 
                              disabled={loadingAction === c.id}
                              onClick={() => handleContainerAction(c.id, 'start')}
                              className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded hover:bg-emerald-500/20 transition-all disabled:opacity-50"
                            >
                              START
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'terminal' && (
          <div className="bg-slate-950 border border-cyan-500/30 rounded-lg p-5 h-[550px] font-mono text-xs text-emerald-400 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
            <div className="text-slate-500 mb-2"># Xterm.js secure WebSocket PTY bridge initialized.</div>
            <div className="text-slate-400">Type commands directly to host Linux Mint environment.</div>
            <div className="mt-4 flex items-center gap-2">
              <span className="text-cyan-400">root@homelab-mint:~#</span>
              <span className="w-2 h-4 bg-emerald-400 animate-pulse"></span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}