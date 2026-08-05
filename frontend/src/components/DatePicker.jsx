import { useState, useEffect, useRef } from 'react';

const WEEKDAYS_SHORT = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];

export default function DatePicker({ value, onChange, placeholder = 'Seleccionar fecha' }) {
  const [open, setOpen] = useState(false);
  const today = new Date();
  const initial = value ? new Date(`${value}T00:00:00`) : today;
  const [viewYear, setViewYear] = useState(isNaN(initial) ? today.getFullYear() : initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(isNaN(initial) ? today.getMonth() : initial.getMonth());
  const ref = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const grid = [];
  for (let i = 0; i < firstDay; i++) grid.push(null);
  for (let d = 1; d <= daysInMonth; d++) grid.push(d);

  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });

  const displayValue = value ? new Date(`${value}T00:00:00`).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '';

  const select = (day) => {
    onChange(`${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
    setOpen(false);
  };

  const changeMonth = (delta) => {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setViewMonth(m);
    setViewYear(y);
  };

  return (
    <div style={{ position: 'relative', width: '100%' }} ref={ref}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '.6rem', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '.85rem', background: 'var(--card)', color: value ? 'var(--text)' : 'var(--text-muted)', cursor: 'pointer', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '.5rem' }}>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{displayValue || placeholder}</span>
        <span style={{ opacity: 0.6, flexShrink: 0 }}>📅</span>
      </button>

      {open && (
        <div style={{ position: 'absolute', zIndex: 1000, top: 'calc(100% + 4px)', left: 0, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,.18)', padding: '.75rem', width: '260px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '.5rem' }}>
            <button type="button" className="btn-sm" onClick={() => changeMonth(-1)}>←</button>
            <span style={{ fontWeight: 600, fontSize: '.8rem', textTransform: 'capitalize' }}>{monthName}</span>
            <button type="button" className="btn-sm" onClick={() => changeMonth(1)}>→</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', marginBottom: '2px' }}>
            {WEEKDAYS_SHORT.map((d, i) => (
              <div key={i} style={{ textAlign: 'center', fontSize: '.65rem', color: 'var(--text-light)', fontWeight: 600, padding: '2px 0' }}>{d}</div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {grid.map((day, i) => {
              if (!day) return <div key={i} />;
              const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isSelected = ds === value;
              const isToday = ds === todayStr;
              return (
                <button key={i} type="button" onClick={() => select(day)}
                  style={{ width: '100%', aspectRatio: '1', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '.75rem',
                    background: isSelected ? 'var(--primary)' : 'transparent',
                    color: isSelected ? 'white' : isToday ? 'var(--primary)' : 'var(--text)',
                    fontWeight: isSelected || isToday ? 700 : 400,
                    boxShadow: isToday && !isSelected ? 'inset 0 0 0 1px var(--primary)' : 'none' }}>
                  {day}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '.5rem' }}>
            {value && (
              <button type="button" className="btn-sm" onClick={() => { onChange(null); setOpen(false); }}>Limpiar</button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
