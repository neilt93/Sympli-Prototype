'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Log = {
  id: string;
  created_at: string;
  symptom_name?: string;
  symptom_type?: string;
  severity_scale?: number;
  functional_impact?: string;
};

export default function PastLogsPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getAuthToken(): Promise<string | undefined> {
    try {
      // Supabase session if available
      const mod = await import('../lib/supabase');
      // @ts-ignore
      const { supabase } = mod;
      try { const { data: { session } } = await (supabase as any).auth.getSession(); if (session?.access_token) return session.access_token; } catch {}
    } catch {}
    if (typeof window !== 'undefined') {
      const t = localStorage.getItem('authToken');
      if (t) return t;
    }
    return undefined;
  }

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getAuthToken();
      const res = await fetch('/api/symptoms/logs?limit=50', { headers: { Authorization: `Bearer ${token || ''}` } });
      const data = await res.json();
      setLogs(data.logs || []);
    } catch (e: any) {
      setError('Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  const deleteAll = async () => {
    if (!confirm('Delete all logs? This cannot be undone.')) return;
    try {
      const token = await getAuthToken();
      const ids = logs.map(l => l.id);
      await Promise.all(ids.map(id => fetch(`/api/symptoms/logs/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token || ''}` } })));
      await fetchLogs();
    } catch {}
  };

  const editOne = async (log: Log) => {
    const name = prompt('Edit symptom name (UK English)', String(log.symptom_name || log.symptom_type || ''));
    if (name === null) return;
    try {
      const token = await getAuthToken();
      await fetch(`/api/symptoms/logs/${log.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token || ''}` }, body: JSON.stringify({ symptom_name: name }) });
      await fetchLogs();
    } catch {}
  };

  useEffect(() => { fetchLogs(); }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Past logs</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="px-3 py-2 border rounded">Refresh</button>
          <button onClick={deleteAll} className="px-3 py-2 border rounded text-red-600">Delete all</button>
        </div>
      </div>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}
      {!loading && !error && (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="border rounded p-3 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{log.symptom_name || log.symptom_type}</div>
                <div className="text-sm text-gray-600">{new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              <div className="text-sm text-gray-600">{typeof log.severity_scale === 'number' ? `Sev ${log.severity_scale}/10` : 'Sev —'}</div>
              <button onClick={() => editOne(log)} className="ml-2 px-3 py-1 border rounded">Edit</button>
              <button onClick={async () => { if (!confirm('Delete this log?')) return; const token = await getAuthToken(); await fetch(`/api/symptoms/logs/${log.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token || ''}` } }); await fetchLogs(); }} className="ml-2 px-3 py-1 border rounded text-red-600">Delete</button>
            </div>
          ))}
          {logs.length === 0 && <div className="text-sm text-gray-600">No logs yet.</div>}
        </div>
      )}
    </div>
  );
}


