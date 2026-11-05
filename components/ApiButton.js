'use client';
// One-click action button (hold a slot, cancel a booking, delete, logout…)
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApiButton({ action, method = 'POST', body, children, variant = '', confirm: confirmText }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function go() {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch(action, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setMsg(data.error || 'Failed');
    if (data.redirect) return router.push(data.redirect);
    router.refresh();
  }

  return (
    <span className="btnwrap">
      <button className={`btn ${variant}`} onClick={go} disabled={busy}>{busy ? '…' : children}</button>
      {msg && <span className="msg err small">{msg}</span>}
    </span>
  );
}
