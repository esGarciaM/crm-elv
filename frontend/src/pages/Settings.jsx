import { useState, useEffect } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Quill from 'quill';
import ImageResize from '@mgreminger/quill-image-resize-module';
import api from '../api';

Quill.register('modules/imageResize', ImageResize);

const QUILL_MODULES = {
  imageResize: {},
  toolbar: [
    [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
    [{ 'font': [] }],
    [{ 'size': ['small', false, 'large', 'huge'] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['blockquote', 'code-block'],
    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
    [{ 'indent': '-1' }, { 'indent': '+1' }],
    ['link', 'image'],
    ['clean']
  ]
};

const QUILL_FORMATS = [
  'header', 'font', 'size',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background', 'align',
  'blockquote', 'code-block',
  'list', 'indent',
  'link', 'image'
];

const TABS = [
  { key: 'departments', label: 'Departamentos' },
  { key: 'employees', label: 'Empleados' },
  { key: 'docTypes', label: 'Tipos de Documento' },
  { key: 'sponsorStatuses', label: 'Estatus de Patrocinio' },
  { key: 'packages', label: 'Paquetes' },
  { key: 'checklist', label: 'Checklist' },
  { key: 'profiles', label: 'Perfiles' },
  { key: 'backups', label: 'Backups' },
];

const MODULE_LABELS = {
  dashboard: 'Dashboard', clients: 'Clientes', tasks: 'Tareas',
  patrocinios: 'Patrocinios', kanban: 'Kanban', disenos: 'Diseños', redes: 'Redes',
  logistica: 'Logística', audiovisual: 'Audiovisual', finance: 'Finanzas',
  communications: 'Comunicaciones', users: 'Usuarios', settings: 'Configuración',
};

export default function Settings() {
  const [tab, setTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [packages, setPackages] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [showPkgModal, setShowPkgModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', email: '', phone: '', department_id: '' });
  const [docTypeForm, setDocTypeForm] = useState({ name: '', is_client: false, template_body: '' });
  const [watermarkFile, setWatermarkFile] = useState(null);
  const [watermarkPreview, setWatermarkPreview] = useState(null);
  const [pkgForm, setPkgForm] = useState({ name: '', amount: '', type: '', sort_order: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Backup state
  const [backups, setBackups] = useState([]);
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState('');
  const [currentDb, setCurrentDb] = useState(null);

  // Checklist state (per-package component selector)
  const [checklistItems, setChecklistItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPkg, setChecklistPkg] = useState(null);

  // Checklist Catalog state (CRUD for the items themselves)
  const [clCatalog, setClCatalog] = useState([]);
  const [showClModal, setShowClModal] = useState(false);
  const [clForm, setClForm] = useState({ key: '', label: '', sort_order: '', department_id: '', visible_to_client: true });

  // Sponsor Statuses state
  const [sponsorStatuses, setSponsorStatuses] = useState([]);
  const [showSponsorStatusModal, setShowSponsorStatusModal] = useState(false);
  const [sponsorStatusForm, setSponsorStatusForm] = useState({ name: '', sort_order: '', profile_ids: [] });

  // Profiles state
  const [profiles, setProfiles] = useState([]);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: '', description: '' });
  const [profileModules, setProfileModules] = useState({});

  const loadDepts = () => api.get('/departments').then(r => setDepartments(r.data));
  const loadEmps = () => api.get('/employees').then(r => setEmployees(r.data));
  const loadDocTypes = () => api.get('/document-types').then(r => setDocTypes(r.data));
  const loadPackages = () => api.get('/packages?all=true').then(r => setPackages(r.data));
  const loadBackups = async () => {
    try {
      const r = await api.get('/backups');
      setBackups(r.data.backups);
      setCurrentDb(r.data.currentDb);
    } catch (e) {
      console.error('Error loading backups', e);
    }
  };

  const loadSponsorStatuses = () => api.get('/sponsor-statuses').then(r => setSponsorStatuses(r.data));
  const loadProfiles = () => api.get('/profiles').then(r => setProfiles(r.data));

  useEffect(() => { loadDepts(); loadEmps(); loadDocTypes(); loadPackages(); loadSponsorStatuses(); loadProfiles(); }, []);
  useEffect(() => { if (tab === 'backups') loadBackups(); }, [tab]);
  useEffect(() => { if (tab === 'profiles') loadProfiles(); }, [tab]);

  const loadClCatalog = () => api.get('/packages/checklist-items').then(r => setClCatalog(r.data));

  useEffect(() => { if (tab === 'checklist') loadClCatalog(); }, [tab]);

  const saveDept = async () => {
    if (!deptForm.name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await api.put(`/departments/${editingId}`, deptForm);
      } else {
        await api.post('/departments', deptForm);
      }
      setShowDeptModal(false);
      setDeptForm({ name: '', description: '' });
      setEditingId(null);
      loadDepts();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const editDept = (d) => {
    setDeptForm({ name: d.name, description: d.description || '' });
    setEditingId(d.id);
    setShowDeptModal(true);
  };

  const deleteDept = async (id) => {
    if (!confirm('¿Eliminar departamento?')) return;
    await api.delete(`/departments/${id}`);
    loadDepts();
  };

  const saveEmp = async () => {
    if (!empForm.first_name.trim() || !empForm.last_name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await api.put(`/employees/${editingId}`, empForm);
      } else {
        await api.post('/employees', empForm);
      }
      setShowEmpModal(false);
      setEmpForm({ first_name: '', last_name: '', email: '', phone: '', department_id: '' });
      setEditingId(null);
      loadEmps();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const editEmp = (e) => {
    setEmpForm({ first_name: e.first_name, last_name: e.last_name, email: e.email || '', phone: e.phone || '', department_id: e.department_id || '' });
    setEditingId(e.id);
    setShowEmpModal(true);
  };

  const deleteEmp = async (id) => {
    if (!confirm('¿Eliminar empleado?')) return;
    await api.delete(`/employees/${id}`);
    loadEmps();
  };

  const savePkg = async () => {
    if (!pkgForm.name.trim()) return;
    setError('');
    try {
      if (editingId) {
        await api.put(`/packages/${editingId}`, pkgForm);
      } else {
        await api.post('/packages', pkgForm);
      }
      setShowPkgModal(false);
      setPkgForm({ name: '', amount: '', type: '', sort_order: '' });
      setEditingId(null);
      loadPackages();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const editPkg = (p) => {
    setPkgForm({ name: p.name, amount: p.amount || '', type: p.type || '', sort_order: p.sort_order || '' });
    setEditingId(p.id);
    setShowPkgModal(true);
  };

  const deletePkg = async (id) => {
    if (!confirm('¿Desactivar este paquete?')) return;
    await api.delete(`/packages/${id}`);
    loadPackages();
  };

  const togglePkgActive = async (p) => {
    await api.put(`/packages/${p.id}`, { active: p.active ? 0 : 1 });
    loadPackages();
  };

  const openChecklist = async (pkg) => {
    setChecklistPkg(pkg);
    setError('');
    try {
      const [itemsRes, checkedRes] = await Promise.all([
        api.get('/packages/checklist-items'),
        api.get(`/packages/${pkg.id}/checklist`)
      ]);
      setChecklistItems(itemsRes.data);
      setCheckedItems(checkedRes.data.map(i => i.id));
      setShowChecklistModal(true);
    } catch (e) {
      setError('Error al cargar checklist');
    }
  };

  const toggleCheckItem = (itemId) => {
    setCheckedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const saveChecklist = async () => {
    if (!checklistPkg) return;
    setError('');
    try {
      await api.put(`/packages/${checklistPkg.id}/checklist`, { item_ids: checkedItems });
      setShowChecklistModal(false);
      setChecklistPkg(null);
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar checklist');
    }
  };

  // ── Checklist Catalog CRUD ──
  const openClNew = () => {
    setClForm({ key: '', label: '', sort_order: '', department_id: '', visible_to_client: true });
    setEditingId(null);
    setError('');
    setShowClModal(true);
  };

  const editCl = (item) => {
    setClForm({ key: item.key, label: item.label, sort_order: item.sort_order ?? '', department_id: item.department_id ?? '', visible_to_client: !!item.visible_to_client });
    setEditingId(item.id);
    setError('');
    setShowClModal(true);
  };

  const saveCl = async () => {
    if (!clForm.key.trim() || !clForm.label.trim()) {
      setError('key y label son requeridos');
      return;
    }
    setError('');
    try {
      if (editingId) {
        await api.put(`/packages/checklist-items/${editingId}`, clForm);
      } else {
        await api.post('/packages/checklist-items', clForm);
      }
      setShowClModal(false);
      setEditingId(null);
      setClForm({ key: '', label: '', sort_order: '', department_id: '', visible_to_client: true });
      loadClCatalog();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al guardar elemento');
    }
  };

  const deleteCl = async (id) => {
    if (!confirm('¿Eliminar este elemento del checklist?')) return;
    try {
      await api.delete(`/packages/checklist-items/${id}`);
      loadClCatalog();
    } catch (e) {
      setError(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const createBackup = async () => {
    setBackupLoading(true);
    setBackupMessage('');
    try {
      const r = await api.post('/backups/create');
      setBackupMessage(r.data.message);
      loadBackups();
    } catch (e) {
      setBackupMessage(e.response?.data?.error || 'Error al crear backup');
    } finally {
      setBackupLoading(false);
    }
  };

  const restoreBackup = async (filename) => {
    if (!confirm(`¿Restaurar backup ${filename}?\n\nSe creará un backup de seguridad antes de restaurar.`)) return;
    setBackupLoading(true);
    setBackupMessage('');
    try {
      const r = await api.post(`/backups/${filename}/restore`);
      setBackupMessage(r.data.message);
      loadBackups();
    } catch (e) {
      setBackupMessage(e.response?.data?.error || 'Error al restaurar');
    } finally {
      setBackupLoading(false);
    }
  };

  const deleteBackup = async (filename) => {
    if (!confirm(`¿Eliminar backup ${filename}?`)) return;
    try {
      await api.delete(`/backups/${filename}`);
      loadBackups();
    } catch (e) {
      setBackupMessage(e.response?.data?.error || 'Error al eliminar');
    }
  };

  const downloadBackup = (filename) => {
    const token = localStorage.getItem('crm_token');
    const link = document.createElement('a');
    link.href = `/api/backups/${filename}/download?token=${token}`;
    link.download = filename;
    link.click();
  };

  // ── Profiles CRUD ──
  const openProfileNew = () => {
    setProfileForm({ name: '', description: '' });
    setProfileModules({});
    setEditingId(null);
    setError('');
    setShowProfileModal(true);
  };

  const editProfile = (p) => {
    setProfileForm({ name: p.name, description: p.description || '' });
    const modMap = {};
    (p.modules || []).forEach(m => { modMap[m.module_key] = { read: true, write: !!m.can_write }; });
    setProfileModules(modMap);
    setEditingId(p.id);
    setError('');
    setShowProfileModal(true);
  };

  const toggleProfileModule = (key) => {
    setProfileModules(prev => {
      const next = { ...prev };
      if (next[key]) {
        delete next[key];
      } else {
        next[key] = { read: true, write: false };
      }
      return next;
    });
  };

  const toggleProfileWrite = (key) => {
    setProfileModules(prev => ({
      ...prev,
      [key]: { ...prev[key], write: !prev[key].write }
    }));
  };

  const saveProfile = async () => {
    if (!profileForm.name.trim()) { setError('Nombre requerido'); return; }
    setError('');
    const modules = Object.entries(profileModules).map(([module_key, v]) => ({
      module_key, can_write: v.write
    }));
    try {
      if (editingId) {
        await api.put(`/profiles/${editingId}`, { ...profileForm, modules });
      } else {
        await api.post('/profiles', { ...profileForm, modules });
      }
      setShowProfileModal(false);
      setProfileForm({ name: '', description: '' });
      setProfileModules({});
      setEditingId(null);
      loadProfiles();
    } catch (e) { setError(e.response?.data?.error || 'Error'); }
  };

  const deleteProfile = async (id) => {
    if (!confirm('¿Eliminar este perfil? Los usuarios asignados perderán el perfil.')) return;
    await api.delete(`/profiles/${id}`);
    loadProfiles();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Configuración</h1>
      </div>

      <div className="finance-tabs">
        {TABS.map(t => (
          <button key={t.key} className={`finance-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'departments' && (
        <div className="card">
          <div className="docs-header">
            <h2>Departamentos</h2>
            <button className="btn" onClick={() => { setDeptForm({ name: '', description: '' }); setEditingId(null); setShowDeptModal(true); }}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr></thead>
            <tbody>
              {departments.map(d => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.description || '—'}</td>
                  <td>
                    <button className="btn small" onClick={() => editDept(d)}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={() => deleteDept(d.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {departments.length === 0 && <tr><td colSpan="3" className="empty-state">Sin departamentos</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'employees' && (
        <div className="card">
          <div className="docs-header">
            <h2>Empleados</h2>
            <button className="btn" onClick={() => { setEmpForm({ first_name: '', last_name: '', email: '', phone: '', department_id: '' }); setEditingId(null); setShowEmpModal(true); }}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Apellido</th><th>Email</th><th>Teléfono</th><th>Departamento</th><th>Activo</th><th>Acciones</th></tr></thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id}>
                  <td>{e.first_name}</td>
                  <td>{e.last_name}</td>
                  <td>{e.email || '—'}</td>
                  <td>{e.phone || '—'}</td>
                  <td>{e.department_name || '—'}</td>
                  <td>{e.active ? 'Sí' : 'No'}</td>
                  <td>
                    <button className="btn small" onClick={() => editEmp(e)}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={() => deleteEmp(e.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && <tr><td colSpan="7" className="empty-state">Sin empleados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'packages' && (
        <div className="card">
          <div className="docs-header">
            <h2>Paquetes de Patrocinio</h2>
            <button className="btn" onClick={() => { setPkgForm({ name: '', amount: '', type: '', sort_order: '' }); setEditingId(null); setShowPkgModal(true); }}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Monto</th><th>Tipo</th><th>Orden</th><th>Activo</th><th>Acciones</th></tr></thead>
            <tbody>
              {packages.map(p => (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td>{p.amount ? `$${p.amount.toLocaleString('es-MX')}` : '—'}</td>
                  <td>{p.type || '—'}</td>
                  <td>{p.sort_order}</td>
                  <td>
                    <span className={`status-badge ${p.active ? 'success' : 'neutral'}`}
                      style={{ cursor: 'pointer' }} onClick={() => togglePkgActive(p)}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td>
                    <button className="btn small" onClick={() => editPkg(p)}>Editar</button>
                    <button className="btn small" style={{ marginLeft: '.35rem' }} onClick={() => openChecklist(p)}>Componentes</button>
                    <button className="btn small danger" style={{ marginLeft: '.35rem' }} onClick={() => deletePkg(p.id)}>Desactivar</button>
                  </td>
                </tr>
              ))}
              {packages.length === 0 && <tr><td colSpan="6" className="empty-state">Sin paquetes</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'checklist' && (
        <div className="card">
          <div className="docs-header">
            <h2>Elementos del Checklist</h2>
            <button className="btn" onClick={openClNew}>+ Nuevo</button>
          </div>
          {error && <div className="error-msg" style={{ marginBottom: '.75rem' }}>{error}</div>}
          <table>
            <thead><tr><th>Clave (key)</th><th>Etiqueta (label)</th><th>Departamento</th><th>Cliente</th><th>Orden</th><th>Acciones</th></tr></thead>
            <tbody>
              {clCatalog.map(item => (
                <tr key={item.id}>
                  <td><code>{item.key}</code></td>
                  <td>{item.label}</td>
                  <td>{item.department_name || '—'}</td>
                  <td>{item.visible_to_client ? 'Sí' : '—'}</td>
                  <td>{item.sort_order}</td>
                  <td>
                    <button className="btn small" onClick={() => editCl(item)}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={() => deleteCl(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {clCatalog.length === 0 && <tr><td colSpan="6" className="empty-state">Sin elementos de checklist</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'sponsorStatuses' && (
        <div className="card">
          <div className="docs-header">
            <h2>Estatus de Patrocinio</h2>
            <button className="btn" onClick={() => { setSponsorStatusForm({ name: '', sort_order: '', profile_ids: [] }); setEditingId(null); setShowSponsorStatusModal(true); }}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Orden</th><th>Perfiles</th><th>Acciones</th></tr></thead>
            <tbody>
              {sponsorStatuses.map(s => (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{s.sort_order}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                      {(s.profile_ids || []).map(pid => {
                        const p = profiles.find(pr => pr.id === pid);
                        return p ? (
                          <span key={pid} className="status-badge info" style={{ fontSize: '.72rem', cursor: 'default' }}>
                            {p.name}
                          </span>
                        ) : null;
                      })}
                      {(!s.profile_ids || s.profile_ids.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Todos los perfiles</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn small" onClick={() => { setSponsorStatusForm({ name: s.name, sort_order: s.sort_order || '', profile_ids: s.profile_ids || [] }); setEditingId(s.id); setShowSponsorStatusModal(true); }}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={async () => { if (confirm('¿Eliminar este estatus?')) { await api.delete(`/sponsor-statuses/${s.id}`); loadSponsorStatuses(); } }}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {sponsorStatuses.length === 0 && <tr><td colSpan="4" className="empty-state">Sin estatus configurados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'backups' && (
        <div className="card">
          <div className="docs-header">
            <h2>Respaldo de Base de Datos</h2>
            <button className="btn primary" onClick={createBackup} disabled={backupLoading}>
              {backupLoading ? 'Procesando...' : '+ Crear Backup'}
            </button>
          </div>

          {backupMessage && (
            <div style={{
              padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem',
              background: backupMessage.includes('Error') ? 'var(--badge-danger-bg, #fef2f2)' : 'var(--badge-success-bg, #f0fdf4)',
              color: backupMessage.includes('Error') ? 'var(--danger)' : 'var(--success)',
              fontSize: '0.85rem', fontWeight: 500
            }}>
              {backupMessage}
            </div>
          )}

          {currentDb && (
            <div style={{
              display: 'flex', gap: '1.5rem', padding: '0.75rem 1rem', borderRadius: '8px',
              background: 'var(--bg-secondary)', border: '1px solid var(--border)', marginBottom: '1.25rem',
              fontSize: '0.82rem', color: 'var(--text-light)'
            }}>
              <span><strong>DB actual:</strong> {currentDb.sizeHuman}</span>
              <span><strong>Ultima modificacion:</strong> {new Date(currentDb.modified).toLocaleString('es-MX')}</span>
              <span><strong>Backups disponibles:</strong> {backups.length}</span>
            </div>
          )}

          <table>
            <thead>
              <tr>
                <th>Archivo</th>
                <th>Fecha</th>
                <th>Tamano</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {backups.map(b => (
                <tr key={b.filename}>
                  <td>
                    <code style={{ fontSize: '0.8rem' }}>{b.filename}</code>
                  </td>
                  <td>{new Date(b.date).toLocaleString('es-MX')}</td>
                  <td>{b.sizeHuman}</td>
                  <td>
                    <button className="btn small" onClick={() => restoreBackup(b.filename)} disabled={backupLoading}
                      title="Restaurar este backup">
                      Restaurar
                    </button>
                    <button className="btn small" style={{ marginLeft: '.35rem' }} onClick={() => downloadBackup(b.filename)}
                      title="Descargar backup">
                      Descargar
                    </button>
                    <button className="btn small danger" style={{ marginLeft: '.35rem' }} onClick={() => deleteBackup(b.filename)}
                      title="Eliminar backup">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {backups.length === 0 && (
                <tr><td colSpan="4" className="empty-state">Sin backups disponibles</td></tr>
              )}
            </tbody>
          </table>

          <div style={{ marginTop: '1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Los backups se realizan automaticamente cada 8 horas. Se conservan los ultimos 30 respaldos.
            La restauracion crea un backup de seguridad automatico antes de sobreescribir.
          </div>
        </div>
      )}

      {tab === 'profiles' && (
        <div className="card">
          <div className="docs-header">
            <h2>Perfiles de Usuario</h2>
            <button className="btn" onClick={openProfileNew}>+ Nuevo Perfil</button>
          </div>
          <p style={{ color: 'var(--text-light)', fontSize: '.85rem', marginBottom: '1rem' }}>
            Define perfiles con acceso a módulos específicos. Los usuarios asignados a un perfil solo verán los módulos seleccionados al iniciar sesión.
          </p>
          <table>
            <thead><tr><th>Nombre</th><th>Descripción</th><th>Módulos</th><th>Acciones</th></tr></thead>
            <tbody>
              {profiles.map(p => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.name}</td>
                  <td>{p.description || '—'}</td>
                  <td>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.3rem' }}>
                      {(p.modules || []).map(m => (
                        <span key={m.module_key} className={`status-badge ${m.can_write ? 'success' : 'info'}`}
                          style={{ fontSize: '.72rem', cursor: 'default' }}
                          title={m.can_write ? 'Lectura + Escritura' : 'Solo lectura'}>
                          {MODULE_LABELS[m.module_key] || m.module_key}{m.can_write ? ' ✎' : ''}
                        </span>
                      ))}
                      {(!p.modules || p.modules.length === 0) && <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>Sin módulos</span>}
                    </div>
                  </td>
                  <td>
                    <button className="btn small" onClick={() => editProfile(p)}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={() => deleteProfile(p.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {profiles.length === 0 && <tr><td colSpan="4" className="empty-state">Sin perfiles configurados</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showProfileModal && (
        <div className="modal-overlay" onClick={() => setShowProfileModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '550px' }}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Perfil</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre del perfil" value={profileForm.name} onChange={e => setProfileForm({ ...profileForm, name: e.target.value })} required />
              <input className="full-width" placeholder="Descripción (opcional)" value={profileForm.description} onChange={e => setProfileForm({ ...profileForm, description: e.target.value })} />
            </div>
            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: '.5rem' }}>Módulos con acceso</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '.4rem' }}>
                {Object.entries(MODULE_LABELS).map(([key, label]) => {
                  const active = !!profileModules[key];
                  const canWrite = active && profileModules[key].write;
                  return (
                    <div key={key} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '.45rem .65rem', borderRadius: 'var(--radius)',
                      background: active ? 'var(--success-subtle)' : 'var(--bg-secondary)',
                      border: `1px solid ${active ? 'var(--success)' : 'var(--border)'}`,
                      transition: 'all .15s ease'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', fontSize: '.83rem' }}>
                        <input type="checkbox" checked={active} onChange={() => toggleProfileModule(key)} style={{ cursor: 'pointer' }} />
                        {label}
                      </label>
                      {active && (
                        <label style={{ display: 'flex', alignItems: 'center', gap: '.3rem', cursor: 'pointer', fontSize: '.72rem', color: canWrite ? 'var(--success)' : 'var(--text-muted)' }}
                          title={canWrite ? 'Escritura habilitada' : 'Solo lectura'}>
                          <input type="checkbox" checked={canWrite} onChange={() => toggleProfileWrite(key)} style={{ cursor: 'pointer', width: '14px', height: '14px' }} />
                          Editar
                        </label>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '.5rem', marginTop: '1.25rem' }}>
              <button className="btn primary" onClick={saveProfile}>{editingId ? 'Actualizar' : 'Crear'}</button>
              <button className="btn" onClick={() => setShowProfileModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showPkgModal && (
        <div className="modal-overlay" onClick={() => setShowPkgModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Paquete</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre del paquete (ej: Origen ($$1000))" value={pkgForm.name} onChange={e => setPkgForm({ ...pkgForm, name: e.target.value })} required />
              <input placeholder="Monto" type="number" value={pkgForm.amount} onChange={e => setPkgForm({ ...pkgForm, amount: e.target.value })} />
              <select value={pkgForm.type} onChange={e => setPkgForm({ ...pkgForm, type: e.target.value })}>
                <option value="">— Tipo —</option>
                <option value="monetario">Monetario</option>
                <option value="especie">Especie</option>
                <option value="mixto">Mixto</option>
              </select>
              <input placeholder="Orden" type="number" value={pkgForm.sort_order} onChange={e => setPkgForm({ ...pkgForm, sort_order: e.target.value })} />
            </div>
            <button className="btn primary" onClick={savePkg}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {showChecklistModal && checklistPkg && (
        <div className="modal-overlay" onClick={() => setShowChecklistModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>Componentes: {checklistPkg.name}</h2>
            <p style={{ color: 'var(--text-light)', fontSize: '.85rem', marginBottom: '1rem' }}>
              Selecciona los elementos de seguimiento que aplican para este paquete
            </p>
            {error && <div className="error-msg">{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginBottom: '1rem' }}>
              {checklistItems.map(item => (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.75rem',
                  padding: '.5rem .75rem', borderRadius: 'var(--radius)',
                  background: checkedItems.includes(item.id) ? 'var(--success-subtle)' : 'var(--bg-secondary)',
                  border: `1px solid ${checkedItems.includes(item.id) ? 'var(--success)' : 'var(--border)'}`,
                  cursor: 'pointer', transition: 'all .15s ease'
                }}>
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(item.id)}
                    onChange={() => toggleCheckItem(item.id)}
                    style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                  />
                  <span style={{ fontWeight: checkedItems.includes(item.id) ? 600 : 400 }}>
                    {item.label}
                  </span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: '.5rem' }}>
              <button className="btn primary" onClick={saveChecklist}>Guardar</button>
              <button className="btn" onClick={() => setShowChecklistModal(false)}>Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {showClModal && (
        <div className="modal-overlay" onClick={() => setShowClModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Elemento del Checklist</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Clave (key)" value={clForm.key} onChange={e => setClForm({ ...clForm, key: e.target.value })} required />
              <input className="full-width" placeholder="Etiqueta (label)" value={clForm.label} onChange={e => setClForm({ ...clForm, label: e.target.value })} required />
              <input className="full-width" placeholder="Orden" type="number" value={clForm.sort_order} onChange={e => setClForm({ ...clForm, sort_order: e.target.value })} />
              <select className="full-width" value={clForm.department_id} onChange={e => setClForm({ ...clForm, department_id: e.target.value })}>
                <option value="">— Departamento visible —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
              <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer', marginTop: '.25rem' }}>
                <input type="checkbox" checked={clForm.visible_to_client} onChange={e => setClForm({ ...clForm, visible_to_client: e.target.checked })} />
                Visible para el cliente
              </label>
            </div>
            <button className="btn primary" onClick={saveCl}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {showSponsorStatusModal && (
        <div className="modal-overlay" onClick={() => setShowSponsorStatusModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Estatus de Patrocinio</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre del estatus" value={sponsorStatusForm.name} onChange={e => setSponsorStatusForm({ ...sponsorStatusForm, name: e.target.value })} required />
              <input className="full-width" placeholder="Orden (para mostrar en el tablero)" type="number" value={sponsorStatusForm.sort_order} onChange={e => setSponsorStatusForm({ ...sponsorStatusForm, sort_order: e.target.value })} />
            </div>

            <div style={{ marginTop: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '.85rem', marginBottom: '.5rem' }}>Perfiles con acceso</div>
              <p style={{ color: 'var(--text-light)', fontSize: '.78rem', marginBottom: '.5rem' }}>
                Solo estos perfiles podrán ver este estatus en el tablero Kanban. Si no seleccionas ninguno, todos los perfiles podrán verlo.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem' }}>
                {profiles.map(p => {
                  const active = sponsorStatusForm.profile_ids.includes(p.id);
                  return (
                    <label key={p.id} style={{
                      display: 'flex', alignItems: 'center', gap: '.75rem',
                      padding: '.5rem .75rem', borderRadius: 'var(--radius)',
                      background: active ? 'var(--success-subtle)' : 'var(--bg-secondary)',
                      border: `1px solid ${active ? 'var(--success)' : 'var(--border)'}`,
                      cursor: 'pointer', transition: 'all .15s ease'
                    }}>
                      <input
                        type="checkbox"
                        checked={active}
                        onChange={() => {
                          const next = active
                            ? sponsorStatusForm.profile_ids.filter(id => id !== p.id)
                            : [...sponsorStatusForm.profile_ids, p.id];
                          setSponsorStatusForm({ ...sponsorStatusForm, profile_ids: next });
                        }}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ fontWeight: active ? 600 : 400, fontSize: '.85rem' }}>
                        {p.name}
                      </span>
                    </label>
                  );
                })}
                {profiles.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '.8rem' }}>No hay perfiles configurados. Crea un perfil primero.</span>}
              </div>
            </div>

            <button className="btn primary" style={{ marginTop: '1.25rem' }} onClick={async () => {
              if (!sponsorStatusForm.name.trim()) return;
              setError('');
              try {
                if (editingId) { await api.put(`/sponsor-statuses/${editingId}`, sponsorStatusForm); }
                else { await api.post('/sponsor-statuses', sponsorStatusForm); }
                setShowSponsorStatusModal(false); setSponsorStatusForm({ name: '', sort_order: '', profile_ids: [] }); setEditingId(null); loadSponsorStatuses();
              } catch (e) { setError(e.response?.data?.error || 'Error'); }
            }}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {showDeptModal && (
        <div className="modal-overlay" onClick={() => setShowDeptModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Departamento</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre" value={deptForm.name} onChange={e => setDeptForm({ ...deptForm, name: e.target.value })} required />
              <textarea className="full-width" placeholder="Descripción" value={deptForm.description} onChange={e => setDeptForm({ ...deptForm, description: e.target.value })} />
            </div>
            <button className="btn primary" onClick={saveDept}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {tab === 'docTypes' && (
        <div className="card">
          <div className="docs-header">
            <h2>Tipos de Documento</h2>
            <button className="btn" onClick={() => {
  setDocTypeForm({ name: '', is_client: false, template_body: '' });
  setEditingId(null);
  setWatermarkFile(null);
  setWatermarkPreview(null);
  setShowDocTypeModal(true);
}}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Cliente</th><th>Acciones</th></tr></thead>
            <tbody>
              {docTypes.map(d => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>{d.is_client ? 'Sí' : '—'}</td>
                  <td>
                    <button className="btn small" onClick={() => {
                      setDocTypeForm({ name: d.name, is_client: !!d.is_client, template_body: d.template_body || '' });
                      setEditingId(d.id);
                      setWatermarkFile(null);
                      setWatermarkPreview(d.watermark_url || null);
                      setShowDocTypeModal(true);
                    }}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={async () => { if (confirm('¿Eliminar tipo de documento?')) { await api.delete(`/document-types/${d.id}`); loadDocTypes(); }}}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {docTypes.length === 0 && <tr><td colSpan="3" className="empty-state">Sin tipos de documento</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showDocTypeModal && (
        <div className="modal-overlay" onClick={() => setShowDocTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 800 }}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Tipo de Documento</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre" value={docTypeForm.name} onChange={e => setDocTypeForm({ ...docTypeForm, name: e.target.value })} required />
              <label style={{ display: 'flex', alignItems: 'center', gap: '.5rem', cursor: 'pointer' }}>
                <input type="checkbox" checked={docTypeForm.is_client} onChange={e => setDocTypeForm({ ...docTypeForm, is_client: e.target.checked })} />
                Es documento de cliente
              </label>
            </div>

            {docTypeForm.is_client && (
              <div style={{ marginTop: '1rem' }}>
                <label style={{ display: 'block', fontWeight: 600, marginBottom: '.35rem' }}>Plantilla del documento</label>
                <div className="quill-editor-wrapper">
                  <ReactQuill
                    theme="snow"
                    value={docTypeForm.template_body || ''}
                    onChange={(value) => setDocTypeForm({ ...docTypeForm, template_body: value })}
                    modules={QUILL_MODULES}
                    formats={QUILL_FORMATS}
                    placeholder="Escribe el contenido de la plantilla..."
                  />
                </div>
                <div style={{ marginTop: '.5rem', padding: '.65rem .85rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.4rem' }}>
                    Variables disponibles (clic para copiar)
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.35rem' }}>
                    {[
                      { v: 'Nombre', d: 'Empresa' }, { v: 'Contacto', d: 'Contacto' }, { v: 'Telefono', d: 'Teléfono' },
                      { v: 'Tipo', d: 'Tipo' }, { v: 'Paquete', d: 'Paquete' }, { v: 'Estatus', d: 'Estatus' },
                      { v: 'EstadoVisita', d: 'Visita' }, { v: 'EstadoPago', d: 'Pago' }, { v: 'Fecha', d: 'Fecha actual' },
                      { v: 'DetalleEspecie', d: 'Detalle especie' }, { v: 'DetallePago', d: 'Detalle pago' },
                      { v: 'RedesSociales', d: 'Redes' }, { v: 'Boletos', d: 'Boletos' }, { v: 'Logo', d: 'Logo' },
                      { v: 'Folio', d: 'Folio' }, { v: 'Notas', d: 'Notas' }
                    ].map(({ v, d }) => (
                      <button key={v} type="button" onClick={() => {
                        navigator.clipboard.writeText(`{{${v}}}`);
                      }} style={{ padding: '.2rem .5rem', fontSize: '.72rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', fontFamily: 'monospace', color: 'var(--primary)' }} title={`Copiar {{${v}}} — ${d}`}>
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginTop: '1rem', padding: '.65rem .85rem', background: 'var(--bg-secondary)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: '.75rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: '.4rem' }}>
                    Marca de agua
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '.75rem', flexWrap: 'wrap' }}>
                    {watermarkPreview && (
                      <div style={{ position: 'relative', width: 80, height: 80, borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                        <img src={watermarkPreview} alt="Marca de agua" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <label style={{ cursor: 'pointer', padding: '.35rem .65rem', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--card)', fontSize: '.8rem' }}>
                      {watermarkPreview ? 'Cambiar imagen' : 'Subir imagen'}
                      <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" style={{ display: 'none' }} onChange={e => {
                        const file = e.target.files[0];
                        if (file) {
                          setWatermarkFile(file);
                          setWatermarkPreview(URL.createObjectURL(file));
                        }
                      }} />
                    </label>
                    {watermarkPreview && (
                      <button type="button" className="btn small danger" onClick={async () => {
                        if (editingId) {
                          try {
                            await api.delete(`/document-types/${editingId}/watermark`);
                            setWatermarkFile(null);
                            setWatermarkPreview(null);
                            loadDocTypes();
                          } catch (e) { alert(e.response?.data?.error || 'Error'); }
                        } else {
                          setWatermarkFile(null);
                          setWatermarkPreview(null);
                        }
                      }}>Eliminar</button>
                    )}
                  </div>
                </div>
              </div>
            )}

            <button className="btn primary" style={{ marginTop: '1rem' }} onClick={async () => {
              if (!docTypeForm.name.trim()) return;
              setError('');
              try {
                let docId = editingId;
                if (editingId) {
                  await api.put(`/document-types/${editingId}`, docTypeForm);
                } else {
                  const res = await api.post('/document-types', docTypeForm);
                  docId = res.data.id;
                }
                if (watermarkFile) {
                  const fd = new FormData();
                  fd.append('watermark', watermarkFile);
                  await api.put(`/document-types/${docId}/watermark`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                }
                setShowDocTypeModal(false);
                setDocTypeForm({ name: '', is_client: false, template_body: '' });
                setWatermarkFile(null);
                setWatermarkPreview(null);
                setEditingId(null);
                loadDocTypes();
              } catch (e) { setError(e.response?.data?.error || 'Error'); }
            }}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}

      {showEmpModal && (
        <div className="modal-overlay" onClick={() => setShowEmpModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Empleado</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input placeholder="Nombre" value={empForm.first_name} onChange={e => setEmpForm({ ...empForm, first_name: e.target.value })} required />
              <input placeholder="Apellido" value={empForm.last_name} onChange={e => setEmpForm({ ...empForm, last_name: e.target.value })} required />
              <input placeholder="Email" type="email" value={empForm.email} onChange={e => setEmpForm({ ...empForm, email: e.target.value })} />
              <input placeholder="Teléfono" value={empForm.phone} onChange={e => setEmpForm({ ...empForm, phone: e.target.value })} />
              <select className="full-width" value={empForm.department_id} onChange={e => setEmpForm({ ...empForm, department_id: e.target.value })}>
                <option value="">— Sin departamento —</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <button className="btn primary" onClick={saveEmp}>{editingId ? 'Actualizar' : 'Crear'}</button>
          </div>
        </div>
      )}
    </div>
  );
}
