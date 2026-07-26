import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import api from '../api/index.js';

const KANBAN_PALETTES = {
  light: [
    { bg: 'rgba(0, 180, 216, 0.08)', border: '#00b4d8', glow: 'rgba(0,180,216,0.25)', text: '#0077b6', headerBg: 'linear-gradient(135deg, rgba(0,180,216,0.12), rgba(0,180,216,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#0077b6', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(168, 50, 214, 0.08)', border: '#a832d6', glow: 'rgba(168,50,214,0.25)', text: '#7b2cbf', headerBg: 'linear-gradient(135deg, rgba(168,50,214,0.12), rgba(168,50,214,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#7b2cbf', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(16, 185, 129, 0.08)', border: '#10b981', glow: 'rgba(16,185,129,0.25)', text: '#047857', headerBg: 'linear-gradient(135deg, rgba(16,185,129,0.12), rgba(16,185,129,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#047857', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(245, 158, 11, 0.08)', border: '#f59e0b', glow: 'rgba(245,158,11,0.25)', text: '#b45309', headerBg: 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#b45309', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(139, 92, 246, 0.08)', border: '#8b5cf6', glow: 'rgba(139,92,246,0.25)', text: '#6d28d9', headerBg: 'linear-gradient(135deg, rgba(139,92,246,0.12), rgba(139,92,246,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#6d28d9', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(236, 72, 153, 0.08)', border: '#ec4899', glow: 'rgba(236,72,153,0.25)', text: '#be185d', headerBg: 'linear-gradient(135deg, rgba(236,72,153,0.12), rgba(236,72,153,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#be185d', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(6, 182, 212, 0.08)', border: '#06b6d4', glow: 'rgba(6,182,212,0.25)', text: '#0e7490', headerBg: 'linear-gradient(135deg, rgba(6,182,212,0.12), rgba(6,182,212,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#0e7490', emptyBg: 'rgba(0,0,0,0.03)' },
    { bg: 'rgba(239, 68, 68, 0.08)', border: '#ef4444', glow: 'rgba(239,68,68,0.25)', text: '#b91c1c', headerBg: 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.03))', cardBg: '#ffffff', cardText: '#1e293b', cardSub: '#64748b', cardAccent: '#b91c1c', emptyBg: 'rgba(0,0,0,0.03)' },
  ],
  dark: [
    { bg: 'rgba(0, 255, 255, 0.12)', border: '#00ffff', glow: 'rgba(0,255,255,0.2)', text: '#00e5ff', headerBg: 'linear-gradient(135deg, rgba(0,255,255,0.18), rgba(0,255,255,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#00e5ff', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(255, 0, 255, 0.12)', border: '#ff00ff', glow: 'rgba(255,0,255,0.2)', text: '#e040e0', headerBg: 'linear-gradient(135deg, rgba(255,0,255,0.18), rgba(255,0,255,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#e040e0', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(0, 255, 128, 0.12)', border: '#00ff80', glow: 'rgba(0,255,128,0.2)', text: '#00e070', headerBg: 'linear-gradient(135deg, rgba(0,255,128,0.18), rgba(0,255,128,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#00e070', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(255, 170, 0, 0.12)', border: '#ffaa00', glow: 'rgba(255,170,0,0.2)', text: '#e09800', headerBg: 'linear-gradient(135deg, rgba(255,170,0,0.18), rgba(255,170,0,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#e09800', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(170, 0, 255, 0.12)', border: '#aa00ff', glow: 'rgba(170,0,255,0.2)', text: '#c040ff', headerBg: 'linear-gradient(135deg, rgba(170,0,255,0.18), rgba(170,0,255,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#c040ff', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(255, 0, 128, 0.12)', border: '#ff0080', glow: 'rgba(255,0,128,0.2)', text: '#ff40a0', headerBg: 'linear-gradient(135deg, rgba(255,0,128,0.18), rgba(255,0,128,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#ff40a0', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(0, 200, 255, 0.12)', border: '#00c8ff', glow: 'rgba(0,200,255,0.2)', text: '#30d0ff', headerBg: 'linear-gradient(135deg, rgba(0,200,255,0.18), rgba(0,200,255,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#30d0ff', emptyBg: 'rgba(255,255,255,0.03)' },
    { bg: 'rgba(255, 100, 100, 0.12)', border: '#ff6464', glow: 'rgba(255,100,100,0.2)', text: '#ff7070', headerBg: 'linear-gradient(135deg, rgba(255,100,100,0.18), rgba(255,100,100,0.05))', cardBg: '#161b22', cardText: '#e6edf3', cardSub: '#8b949e', cardAccent: '#ff7070', emptyBg: 'rgba(255,255,255,0.03)' },
  ],
  neon: [
    { bg: 'rgba(0, 255, 255, 0.15)', border: '#00ffff', glow: '#00ffff', text: '#00ffff', headerBg: 'linear-gradient(135deg, rgba(0,255,255,0.22), rgba(0,255,255,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#00ffff', emptyBg: 'rgba(0,255,255,0.04)' },
    { bg: 'rgba(255, 0, 255, 0.15)', border: '#ff00ff', glow: '#ff00ff', text: '#ff00ff', headerBg: 'linear-gradient(135deg, rgba(255,0,255,0.22), rgba(255,0,255,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#ff00ff', emptyBg: 'rgba(255,0,255,0.04)' },
    { bg: 'rgba(0, 255, 128, 0.15)', border: '#00ff80', glow: '#00ff80', text: '#00ff80', headerBg: 'linear-gradient(135deg, rgba(0,255,128,0.22), rgba(0,255,128,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#00ff80', emptyBg: 'rgba(0,255,128,0.04)' },
    { bg: 'rgba(255, 170, 0, 0.15)', border: '#ffaa00', glow: '#ffaa00', text: '#ffaa00', headerBg: 'linear-gradient(135deg, rgba(255,170,0,0.22), rgba(255,170,0,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#ffaa00', emptyBg: 'rgba(255,170,0,0.04)' },
    { bg: 'rgba(170, 0, 255, 0.15)', border: '#aa00ff', glow: '#aa00ff', text: '#aa00ff', headerBg: 'linear-gradient(135deg, rgba(170,0,255,0.22), rgba(170,0,255,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#aa00ff', emptyBg: 'rgba(170,0,255,0.04)' },
    { bg: 'rgba(255, 0, 128, 0.15)', border: '#ff0080', glow: '#ff0080', text: '#ff0080', headerBg: 'linear-gradient(135deg, rgba(255,0,128,0.22), rgba(255,0,128,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#ff0080', emptyBg: 'rgba(255,0,128,0.04)' },
    { bg: 'rgba(0, 200, 255, 0.15)', border: '#00c8ff', glow: '#00c8ff', text: '#00c8ff', headerBg: 'linear-gradient(135deg, rgba(0,200,255,0.22), rgba(0,200,255,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#00c8ff', emptyBg: 'rgba(0,200,255,0.04)' },
    { bg: 'rgba(255, 100, 100, 0.15)', border: '#ff6464', glow: '#ff6464', text: '#ff6464', headerBg: 'linear-gradient(135deg, rgba(255,100,100,0.22), rgba(255,100,100,0.06))', cardBg: '#15151f', cardText: '#ffffff', cardSub: '#8888aa', cardAccent: '#ff6464', emptyBg: 'rgba(255,100,100,0.04)' },
  ],
};

const KANBAN_CONTAINER_BG = {
  light: '#f0f2f5',
  dark: '#0d1117',
  neon: 'rgba(12, 12, 22, 0.95)',
};

const KANBAN_COLUMN_BG = {
  light: '#ffffff',
  dark: '#161b22',
  neon: 'rgba(15, 15, 30, 0.95)',
};

export default function Kanban() {
  const { theme } = useTheme();
  const [kanbanData, setKanbanData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadKanban();
  }, []);

  const loadKanban = async () => {
    try {
      setLoading(true);
      const res = await api.get('/patrocinios/kanban');
      setKanbanData(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Cargando...</div>;

  const colors = KANBAN_PALETTES[theme] || KANBAN_PALETTES.light;
  const isDark = theme === 'dark' || theme === 'neon';

  return (
    <div>
      <div className="page-header">
        <h1>Kanban</h1>
      </div>

      <div
        className="kanban-container"
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          minHeight: '500px',
          background: KANBAN_CONTAINER_BG[theme] || KANBAN_CONTAINER_BG.light,
          borderRadius: '12px',
          padding: '1rem',
          boxShadow: theme === 'neon'
            ? '0 4px 24px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.03)'
            : '0 2px 12px rgba(0,0,0,0.08)',
          border: theme === 'light' ? '1px solid var(--border)' : 'none'
        }}
      >
        {kanbanData.map((col, colIndex) => {
          const color = colors[colIndex % colors.length];
          return (
            <div
              key={col.id}
              className="kanban-column"
              style={{
                minWidth: '300px',
                width: '300px',
                background: KANBAN_COLUMN_BG[theme] || KANBAN_COLUMN_BG.light,
                borderRadius: '12px',
                display: 'flex',
                flexDirection: 'column',
                borderTop: `1px solid ${color.border}${theme === 'light' ? '30' : '22'}`,
                borderRight: `1px solid ${color.border}${theme === 'light' ? '30' : '22'}`,
                borderBottom: `1px solid ${color.border}${theme === 'light' ? '30' : '22'}`,
                borderLeft: `3px solid ${color.border}`,
                boxShadow: isDark
                  ? `0 0 20px ${color.glow}18, 0 4px 24px rgba(0,0,0,0.5)`
                  : `0 1px 6px rgba(0,0,0,0.06)`,
                overflow: 'hidden'
              }}
            >
              <div style={{
                padding: '0.85rem 1rem',
                background: color.headerBg,
                borderBottom: `2px solid ${color.border}33`,
                position: 'relative',
                overflow: 'hidden'
              }}>
                {isDark && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.06) 2px, rgba(0,0,0,0.06) 4px)',
                    pointerEvents: 'none'
                  }} />
                )}
                <h3 style={{
                  margin: 0,
                  fontSize: '0.9rem',
                  fontWeight: '700',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  color: color.text,
                  textShadow: isDark ? `0 0 12px ${color.glow}77, 0 0 4px ${color.glow}44` : 'none',
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  position: 'relative',
                  zIndex: 1
                }}>
                  {col.name}
                  <span style={{
                    background: isDark ? `${color.border}18` : `${color.border}15`,
                    border: `1px solid ${color.border}${isDark ? '44' : '30'}`,
                    color: color.text,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: '700',
                    textShadow: isDark ? `0 0 6px ${color.glow}55` : 'none',
                    boxShadow: isDark ? `0 0 10px ${color.glow}22, inset 0 0 8px ${color.glow}0a` : 'none',
                    minWidth: '24px',
                    textAlign: 'center'
                  }}>
                    {col.patrocinios.length}
                  </span>
                </h3>
              </div>

              <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0.6rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.6rem',
                background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)'
              }}>
                {col.patrocinios.length === 0 && (
                  <div style={{
                    textAlign: 'center',
                    padding: '2.5rem 1rem',
                    color: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.2)',
                    fontSize: '0.8rem',
                    fontStyle: 'italic',
                    letterSpacing: '0.02em'
                  }}>
                    Sin patrocinios
                  </div>
                )}
                {col.patrocinios.map(p => {
                  const isHovered = hoveredCardId === p.id;
                  return (
                    <div
                      key={p.id}
                      onMouseEnter={() => setHoveredCardId(p.id)}
                      onMouseLeave={() => setHoveredCardId(null)}
                      className="kanban-card"
                      style={{
                        cursor: 'pointer',
                        padding: '0.85rem 1rem',
                        background: isHovered
                          ? (isDark
                              ? `linear-gradient(135deg, ${color.cardBg}ee, ${color.cardBg}dd)`
                              : `linear-gradient(135deg, ${color.cardBg}, ${color.bg.replace('0.08', '0.04')})`)
                          : color.cardBg,
                        borderRadius: '10px',
                        borderTop: `1px solid ${color.border}${isHovered ? '44' : '15'}`,
                        borderRight: `1px solid ${color.border}${isHovered ? '44' : '15'}`,
                        borderBottom: `1px solid ${color.border}${isHovered ? '44' : '15'}`,
                        borderLeft: `3px solid ${color.border}`,
                        boxShadow: isHovered
                          ? (isDark
                              ? `0 0 24px ${color.glow}30, 0 6px 16px rgba(0,0,0,0.5), inset 0 0 30px ${color.glow}08`
                              : `0 4px 16px ${color.glow}, 0 1px 4px rgba(0,0,0,0.08)`)
                          : (isDark
                              ? '0 2px 8px rgba(0,0,0,0.35)'
                              : '0 1px 4px rgba(0,0,0,0.06)'),
                        transform: isHovered ? 'translateY(-2px) scale(1.01)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                      onClick={() => navigate(`/kanban/${p.id}/seguimiento`)}
                    >
                      <div style={{
                        fontWeight: '600',
                        marginBottom: '0.4rem',
                        color: color.cardText,
                        fontSize: '0.9rem',
                        textShadow: isHovered && isDark ? `0 0 8px ${color.glow}33` : 'none'
                      }}>{p.company_name}</div>
                      <div style={{ fontSize: '0.8rem', lineHeight: '1.5' }}>
                        <div style={{ color: color.cardSub }}>{p.contact_person}</div>
                        <div style={{
                          marginTop: '0.3rem',
                          color: color.cardAccent,
                          opacity: 0.75,
                          fontSize: '0.72rem',
                          fontWeight: '600',
                          textTransform: 'uppercase',
                          letterSpacing: '0.03em'
                        }}>{p.package || 'Sin paquete'}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
