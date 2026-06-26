import { useState, useEffect } from 'react';
import api from '../api';

export default function Settings() {
  const [tab, setTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [docTypes, setDocTypes] = useState([]);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [showEmpModal, setShowEmpModal] = useState(false);
  const [showDocTypeModal, setShowDocTypeModal] = useState(false);
  const [deptForm, setDeptForm] = useState({ name: '', description: '' });
  const [empForm, setEmpForm] = useState({ first_name: '', last_name: '', email: '', phone: '', department_id: '' });
  const [docTypeForm, setDocTypeForm] = useState({ name: '' });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  const loadDepts = () => api.get('/departments').then(r => setDepartments(r.data));
  const loadEmps = () => api.get('/employees').then(r => setEmployees(r.data));
  const loadDocTypes = () => api.get('/document-types').then(r => setDocTypes(r.data));

  useEffect(() => { loadDepts(); loadEmps(); loadDocTypes(); }, []);

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

  return (
    <div>
      <div className="page-header">
        <h1>Configuración</h1>
      </div>

      <div className="filter-bar">
        <button className={`filter-btn ${tab === 'departments' ? 'active' : ''}`} onClick={() => setTab('departments')}>Departamentos</button>
        <button className={`filter-btn ${tab === 'employees' ? 'active' : ''}`} onClick={() => setTab('employees')}>Empleados</button>
        <button className={`filter-btn ${tab === 'docTypes' ? 'active' : ''}`} onClick={() => setTab('docTypes')}>Tipos de Documento</button>
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
