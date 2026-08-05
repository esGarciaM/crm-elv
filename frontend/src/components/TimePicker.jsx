import { useState, useEffect, useRef } from 'react';

const SLOTS = [];
for (let h = 0; h < 24; h++) {
  for (const m of ['00', '30']) {
    SLOTS.push(`${String(h).padStart(2, '0')}:${m}`);
  }
}

export default function TimePicker({ value, onChange, placeholder = 'Seleccionar hora' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const format = (v) => {
    if (!v) return placeholder;
    const [h, m] = v.split(':');
    const hr = parseInt(h, 10);
    const period = hr >= 12 ? 'PM' : 'AM';
    const h12 = hr % 12 === 0 ? 12 : hr % 12;
    return `${h12}:${m} ${period}`;
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.85rem', background: 'var(--card)', color: value ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{format(value)}</span>
        <span style={{ opacity: 0.6, flexShrink: 0 }}>🕐</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 1000, top: 'calc(100% + 4px)', left: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: '.5rem', width: '200px', maxHeight: '240px', overflowY: 'auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '2px' }}>
            {SLOTS.map((s) => (
              <button key={s} type="button" onClick={() => { onChange(s); setOpen(false); }}
                style={{ border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '.72rem', padding: '.4rem 0',
                  background: s === value ? 'var(--primary)' : 'transparent',
                  color: s === value ? 'white' : 'var(--text)' }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.4rem' }}>
            {value && (
              <button type="button" className="btn-sm" onClick={() => { onChange(null); setOpen(false); }}>Limpiar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
