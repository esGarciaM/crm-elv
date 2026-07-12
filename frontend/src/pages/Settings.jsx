import { useState, useEffect } from 'react';
import api from '../api';

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
  const [docTypeForm, setDocTypeForm] = useState({ name: '' });
  const [pkgForm, setPkgForm] = useState({ name: '', amount: '', type: '', sort_order: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  // Checklist state (per-package component selector)
  const [checklistItems, setChecklistItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
  const [showChecklistModal, setShowChecklistModal] = useState(false);
  const [checklistPkg, setChecklistPkg] = useState(null);

  // Checklist Catalog state (CRUD for the items themselves)
  const [clCatalog, setClCatalog] = useState([]);
  const [showClModal, setShowClModal] = useState(false);
  const [clForm, setClForm] = useState({ key: '', label: '', sort_order: '' });

  const loadDepts = () => api.get('/departments').then(r => setDepartments(r.data));
  const loadEmps = () => api.get('/employees').then(r => setEmployees(r.data));
  const loadDocTypes = () => api.get('/document-types').then(r => setDocTypes(r.data));
  const loadPackages = () => api.get('/packages?all=true').then(r => setPackages(r.data));

  useEffect(() => { loadDepts(); loadEmps(); loadDocTypes(); loadPackages(); }, []);

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
    setClForm({ key: '', label: '', sort_order: '' });
    setEditingId(null);
    setError('');
    setShowClModal(true);
  };

  const editCl = (item) => {
    setClForm({ key: item.key, label: item.label, sort_order: item.sort_order ?? '' });
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
      setClForm({ key: '', label: '', sort_order: '' });
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

  return (
    <div>
      <div className="page-header">
        <h1>Configuración</h1>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>Departamentos</button>
        <button className={`filter-btn ${tab === 'employees' ? 'active' : ''}`} onClick={() => setTab('employees')}>Empleados</button>
        <button className={`filter-btn ${tab === 'docTypes' ? 'active' : ''}`} onClick={() => setTab('docTypes')}>Tipos de Documento</button>
        <button className={`filter-btn ${tab === 'packages' ? 'active' : ''}`} onClick={() => setTab('packages')}>Paquetes</button>
        <button className={`filter-btn ${tab === 'checklist' ? 'active' : ''}`} onClick={() => setTab('checklist')}>Checklist</button>
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
            <thead><tr><th>Clave (key)</th><th>Etiqueta (label)</th><th>Orden</th><th>Acciones</th></tr></thead>
            <tbody>
              {clCatalog.map(item => (
                <tr key={item.id}>
                  <td><code>{item.key}</code></td>
                  <td>{item.label}</td>
                  <td>{item.sort_order}</td>
                  <td>
                    <button className="btn small" onClick={() => editCl(item)}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={() => deleteCl(item.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {clCatalog.length === 0 && <tr><td colSpan="4" className="empty-state">Sin elementos de checklist</td></tr>}
            </tbody>
          </table>
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
            <p style={{ color: '#64748b', fontSize: '.85rem', marginBottom: '1rem' }}>
              Selecciona los elementos de seguimiento que aplican para este paquete
            </p>
            {error && <div className="error-msg">{error}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '.35rem', marginBottom: '1rem' }}>
              {checklistItems.map(item => (
                <label key={item.id} style={{
                  display: 'flex', alignItems: 'center', gap: '.75rem',
                  padding: '.5rem .75rem', borderRadius: 'var(--radius)',
                  background: checkedItems.includes(item.id) ? '#f0fdf4' : '#f8fafc',
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
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Elemento del Checklist</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Clave (key)" value={clForm.key} onChange={e => setClForm({ ...clForm, key: e.target.value })} required />
              <input className="full-width" placeholder="Etiqueta (label)" value={clForm.label} onChange={e => setClForm({ ...clForm, label: e.target.value })} required />
              <input className="full-width" placeholder="Orden" type="number" value={clForm.sort_order} onChange={e => setClForm({ ...clForm, sort_order: e.target.value })} />
            </div>
            <button className="btn primary" onClick={saveCl}>{editingId ? 'Actualizar' : 'Crear'}</button>
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
            <button className="btn" onClick={() => { setDocTypeForm({ name: '' }); setEditingId(null); setShowDocTypeModal(true); }}>+ Nuevo</button>
          </div>
          <table>
            <thead><tr><th>Nombre</th><th>Acciones</th></tr></thead>
            <tbody>
              {docTypes.map(d => (
                <tr key={d.id}>
                  <td>{d.name}</td>
                  <td>
                    <button className="btn small" onClick={() => { setDocTypeForm({ name: d.name }); setEditingId(d.id); setShowDocTypeModal(true); }}>Editar</button>
                    <button className="btn small danger" style={{ marginLeft: '.5rem' }} onClick={async () => { if (confirm('¿Eliminar tipo de documento?')) { await api.delete(`/document-types/${d.id}`); loadDocTypes(); }}}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {docTypes.length === 0 && <tr><td colSpan="2" className="empty-state">Sin tipos de documento</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {showDocTypeModal && (
        <div className="modal-overlay" onClick={() => setShowDocTypeModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>{editingId ? 'Editar' : 'Nuevo'} Tipo de Documento</h2>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-grid">
              <input className="full-width" placeholder="Nombre" value={docTypeForm.name} onChange={e => setDocTypeForm({ ...docTypeForm, name: e.target.value })} required />
            </div>
            <button className="btn primary" onClick={async () => {
              if (!docTypeForm.name.trim()) return;
              setError('');
              try {
                if (editingId) { await api.put(`/document-types/${editingId}`, docTypeForm); }
                else { await api.post('/document-types', docTypeForm); }
                setShowDocTypeModal(false); setDocTypeForm({ name: '' }); setEditingId(null); loadDocTypes();
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
