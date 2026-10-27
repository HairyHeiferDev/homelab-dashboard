import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';

export default function TerminalView() {
  const terminalRef = useRef(null);
  const termInstanceRef = useRef(null);

  useEffect(() => {
    // Initialize Xterm with built-in padding for clean left-alignment
    const term = new Terminal({
      cursorBlink: true,
      cursorStyle: 'block',
      padding: 12,
      theme: {
        background: '#020617', // slate-950
        foreground: '#22d3ee', // cyan-400
        cursor: '#22d3ee',
        selectionBackground: 'rgba(34, 211, 238, 0.3)',
      },
      fontFamily: 'monospace',
      fontSize: 13,
    });

    termInstanceRef.current = term;
    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    // Open terminal in DOM container
    term.open(terminalRef.current);
    
    // Fit and focus after a short DOM paint delay
    setTimeout(() => {
      fitAddon.fit();
      term.focus();
    }, 150);

    // Connect to FastAPI WebSocket PTY bridge
    const ws = new WebSocket('ws://localhost:8000/ws/terminal');

    ws.onopen = () => {
      console.log("WebSocket PTY Connected Successfully");
    };

    ws.onerror = (err) => {
      console.error("WebSocket PTY Error:", err);
      term.writeln("\r\n\x1b[31m[ERROR]: Failed to connect to WebSocket PTY server.\x1b[0m");
    };

    ws.onclose = () => {
      console.warn("WebSocket PTY Connection Closed");
      term.writeln("\r\n\x1b[33m[DISCONNECTED]: Terminal session terminated.\x1b[0m");
    };

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
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      ws.close();
      term.dispose();
    };
  }, []);

  const handleContainerClick = () => {
    if (termInstanceRef.current) {
      termInstanceRef.current.focus();
    }
  };

  return (
    <div 
      onClick={handleContainerClick}
      className="w-full h-[550px] bg-slate-950 border border-cyan-500/30 rounded-lg shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] overflow-hidden cursor-text flex items-start justify-start"
    >
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
}