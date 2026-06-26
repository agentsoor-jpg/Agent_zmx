import React, { useState } from 'react';

export default function App() {
  const [testResult, setTestResult] = useState<any>(null);
  const [goalInput, setGoalInput] = useState<string>('full autonomous system architecture design and execution');
  
  const runTest = async () => {
    setTestResult({ status: 'Running tests...' });
    try {
      const res = await fetch('/api/v1/meta/test', { method: 'POST' });
      const data = await res.json();
      setTestResult(data);
    } catch(err) {
      setTestResult({ error: String(err) });
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center p-6 font-mono">
      <div className="max-w-4xl w-full space-y-6">
        <div className="border border-neutral-800 bg-neutral-900 rounded-lg p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-emerald-400">GLOBAL ORCHESTRATOR</h1>
            <span className="bg-emerald-500/20 text-emerald-400 px-3 py-1 rounded-full text-xs font-bold border border-emerald-500/50">v1.0.0-PROD</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-neutral-950 p-4 rounded border border-neutral-800">
              <h2 className="text-emerald-500 font-bold mb-4 border-b border-neutral-800 pb-2">SYSTEM STATUS</h2>
              <ul className="space-y-3 text-sm">
                <li className="flex justify-between">
                  <span>Execution Engine:</span>
                  <span className="text-emerald-400 font-bold">CORE BUILT</span>
                </li>
                <li className="flex justify-between">
                  <span>Observation Layer:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </li>
                <li className="flex justify-between">
                  <span>Self Improvement:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE</span>
                </li>
                <li className="flex justify-between">
                  <span>Agents Module:</span>
                  <span className="text-emerald-400 font-bold">READY</span>
                </li>
                <li className="flex justify-between border-t border-neutral-800 pt-3 text-blue-400 font-bold">
                  <span>Evolution Cycle:</span>
                  <span>ACTIVE</span>
                </li>
                <li className="flex justify-between border-t border-neutral-800 pt-3 text-purple-400 font-bold">
                  <span>Hybrid Super AI:</span>
                  <span>ACTIVE</span>
                </li>
                <li className="flex justify-between border-t border-neutral-800 pt-3 text-amber-400 font-bold">
                  <span>Autonomous OS:</span>
                  <span>ACTIVE</span>
                </li>
                <li className="flex justify-between border-t border-neutral-800 pt-3 text-rose-400 font-bold">
                  <span>Production Platform:</span>
                  <span>GLOBAL SYSTEM READY</span>
                </li>
              </ul>
            </div>

            <div className="bg-neutral-950 p-4 rounded border border-neutral-800 flex flex-col justify-between">
              <div>
                <h2 className="text-emerald-500 font-bold mb-4 border-b border-neutral-800 pb-2">EXECUTION CONSOLE</h2>
                
                <div className="mb-4">
                  <label className="block text-xs text-neutral-500 mb-1">Global Goal</label>
                  <input 
                    type="text" 
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className="w-full bg-neutral-900 border border-neutral-700 rounded p-2 text-sm text-neutral-300 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                <div className="space-y-3 text-xs text-neutral-300 mb-6">
                  <div>
                    <code className="text-rose-300 block">POST /api/v1/meta/autonomous-os</code>
                    <span className="text-neutral-500">Autonomous Engineering OS</span>
                  </div>
                  <div>
                    <code className="text-purple-300 block">POST /api/v1/meta/hybrid</code>
                    <span className="text-neutral-500">Hybrid Super Intelligence</span>
                  </div>
                  <div>
                    <code className="text-blue-300 block">POST /api/v1/meta/evolve</code>
                    <span className="text-neutral-500">Runs Evolution Cycle</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col gap-2">
                <button 
                  onClick={async () => {
                    setTestResult({ status: 'Running Autonomous OS globally...' });
                    try {
                      const res = await fetch('/api/v1/meta/autonomous-os', { 
                        method: 'POST', 
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ goal: goalInput }) 
                      });
                      const data = await res.json();
                      setTestResult(data);
                    } catch(err) {
                      setTestResult({ error: String(err) });
                    }
                  }}
                  className="bg-rose-900/30 text-rose-400 border border-rose-800 hover:bg-rose-800/40 p-3 rounded w-full transition-colors font-bold text-sm"
                >
                  RUN GLOBAL OS
                </button>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={async () => {
                      setTestResult({ status: 'Running Hybrid AI...' });
                      try {
                        const res = await fetch('/api/v1/meta/hybrid', { 
                          method: 'POST', 
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ goal: goalInput, steps: [] }) 
                        });
                        const data = await res.json();
                        setTestResult(data);
                      } catch(err) {
                        setTestResult({ error: String(err) });
                      }
                    }}
                    className="bg-purple-900/30 text-purple-400 border border-purple-800 hover:bg-purple-800/40 p-2 rounded transition-colors font-bold text-xs"
                  >
                    HYBRID AI
                  </button>
                  <button 
                    onClick={async () => {
                      setTestResult({ status: 'Fetching health metrics...' });
                      try {
                        const res = await fetch('/api/v1/health');
                        const data = await res.json();
                        setTestResult(data);
                      } catch(err) {
                        setTestResult({ error: String(err) });
                      }
                    }}
                    className="bg-emerald-900/30 text-emerald-400 border border-emerald-800 hover:bg-emerald-800/40 p-2 rounded transition-colors font-bold text-xs"
                  >
                    SYSTEM HEALTH
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {testResult && (
            <div className="mt-6 bg-black p-4 rounded border border-neutral-800 overflow-auto max-h-96 text-xs text-neutral-400 font-mono shadow-inner">
              <div className="flex justify-between items-center mb-2 border-b border-neutral-800 pb-2">
                <h3 className="text-emerald-500 font-bold">EXECUTION LOGS</h3>
                <button onClick={() => setTestResult(null)} className="text-neutral-500 hover:text-white">CLEAR</button>
              </div>
              <pre className="whitespace-pre-wrap">{JSON.stringify(testResult, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
