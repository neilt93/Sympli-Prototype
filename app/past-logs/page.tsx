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
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const [confirmOneId, setConfirmOneId] = useState<string | null>(null);

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
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="px-3 py-2 border rounded">Back</button>
          <h1 className="text-2xl font-bold">Past logs</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLogs} className="px-3 py-2 border rounded">Refresh</button>
          <button onClick={() => setConfirmAllOpen(true)} className="px-3 py-2 border rounded text-red-600">Delete all</button>
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
              <div className="text-sm text-gray-600">{typeof log.severity_scale === 'number' ? `Sev ${log.severity_scale}/10` : 'Sev N/A'}</div>
              <button onClick={() => editOne(log)} className="ml-2 px-3 py-1 border rounded">Edit</button>
              <button onClick={() => setConfirmOneId(log.id)} className="ml-2 px-3 py-1 border rounded text-red-600">Delete</button>
            </div>
          ))}
          {logs.length === 0 && <div className="text-sm text-gray-600">No logs yet.</div>}
        </div>
      )}
      {/* Confirm delete all */}
      {confirmAllOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete all logs?</h3>
            <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmAllOpen(false)} className="px-3 py-2 border rounded">Cancel</button>
              <button onClick={async () => { await deleteAll(); setConfirmAllOpen(false); }} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm delete one */}
      {confirmOneId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">Delete this log?</h3>
            <p className="text-sm text-gray-600 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmOneId(null)} className="px-3 py-2 border rounded">Cancel</button>
              <button onClick={async () => { const token = await getAuthToken(); await fetch(`/api/symptoms/logs/${confirmOneId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token || ''}` } }); setConfirmOneId(null); await fetchLogs(); }} className="px-3 py-2 bg-red-600 text-white rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


