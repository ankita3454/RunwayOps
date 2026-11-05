'use client';
// Generic form that sends JSON to one of our API routes and shows the
// database's answer (success, or the exact CHECK/trigger error).
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ApiForm({ action, method = 'POST', fields, submit = 'Save', extra = {}, inline = false }) {
  const router = useRouter();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const data = { ...extra, ...Object.fromEntries(new FormData(e.currentTarget)) };
    try {
      const res = await fetch(action, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      if (!res.ok) setMsg({ type: 'err', text: body.error });
      else {
        setMsg({ type: 'ok', text: body.message || 'Done' });
        if (body.redirect) return router.push(body.redirect);
        e.target.reset?.();
        router.refresh();
      }
    } catch {
      setMsg({ type: 'err', text: 'Network error' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className={inline ? 'form inline' : 'form'}>
      {fields.map((f) => (
        <label key={f.name}>
          <span>{f.label}</span>
          {f.options ? (
            <select name={f.name} required={f.required !== false} defaultValue={f.defaultValue ?? ''}>
              {f.placeholder !== false && <option value="" disabled>{f.placeholder || 'Select…'}</option>}
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              name={f.name}
              type={f.type || 'text'}
              required={f.required !== false}
              defaultValue={f.defaultValue}
              placeholder={f.placeholder}
              step={f.step}
              min={f.min}
            />
          )}
        </label>
      ))}
      <button disabled={busy}>{busy ? '…' : submit}</button>
      {msg && <p className={`msg ${msg.type}`}>{msg.text}</p>}
    </form>
  );
}
