import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});

  const load = () => {
    api.get(`/clients?page=${page}&search=${search}`).then((r) => {
      setClients(r.data.clients);
      setTotalPages(r.data.totalPages);
    });
  };

  useEffect(() => { load(); }, [page, search]);

  const handleSave = async () => {
    await api.post('/clients', form);
    setShowForm(false);
    setForm({});
    load();
  };

  return (
    <div>
      <div className="page-header">
        <h1>Clientes</h1>
        <button className="btn" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Cancelar' : '+ Nuevo Cliente'}
        </button>
      </div>

      <input className="search-input" placeholder="Buscar por empresa, contacto o alumno..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Nuevo Cliente</h2>
            <div className="form-grid">
              <input placeholder="Empresa" value={form.company_name || ''} onChange={(e) => setForm({...form, company_name: e.target.value})} />
              <input placeholder="Persona contacto" value={form.contact_person || ''} onChange={(e) => setForm({...form, contact_person: e.target.value})} />
              <input placeholder="Teléfono" value={form.phone || ''} onChange={(e) => setForm({...form, phone: e.target.value})} />
              <select value={form.sponsorship_type || ''} onChange={(e) => setForm({...form, sponsorship_type: e.target.value})}>
                <option value="">Tipo patrocinio</option>
                <option>Monetario</option>
                <option>Especie</option>
                <option>Especie/Monetario</option>
                <option>Pendiente</option>
              </select>
              <input placeholder="Paquete" value={form.package || ''} onChange={(e) => setForm({...form, package: e.target.value})} />
              <select value={form.visit_status || ''} onChange={(e) => setForm({...form, visit_status: e.target.value})}>
                <option value="">Estado visita</option>
                <option>Visitado</option>
                <option>En linea</option>
                <option>Visita pendiente</option>
                <option>Visita agendada</option>
                <option>No quiso</option>
              </select>
              <select value={form.payment_status || ''} onChange={(e) => setForm({...form, payment_status: e.target.value})}>
                <option value="">Estado pago</option>
                <option>Pagado</option>
                <option>Pendiente</option>
                <option>Abonado</option>
                <option>Cancelado</option>
              </select>
              <input placeholder="Alumno que consiguió" value={form.student_obtained || ''} onChange={(e) => setForm({...form, student_obtained: e.target.value})} />
              <input placeholder="Alumno que se comunicó" value={form.student_contacted || ''} onChange={(e) => setForm({...form, student_contacted: e.target.value})} />
              <textarea className="full-width" placeholder="Detalle en especie" value={form.in_kind_detail || ''} onChange={(e) => setForm({...form, in_kind_detail: e.target.value})} />
              <input placeholder="Detalle pago" value={form.payment_detail || ''} onChange={(e) => setForm({...form, payment_detail: e.target.value})} />
            </div>
            <button className="btn" onClick={handleSave}>Guardar</button>
          </div>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Empresa</th><th>Contacto</th><th>Tipo</th><th>Paquete</th><th>Estado Visita</th><th>Pago</th><th>Alumno</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((c) => (
            <tr key={c.id}>
              <td><Link to={`/clients/${c.id}`}>{c.company_name || 'Sin nombre'}</Link></td>
              <td>{c.contact_person || '-'}</td>
              <td>{c.sponsorship_type || '-'}</td>
              <td>{c.package || '-'}</td>
              <td>{c.visit_status || '-'}</td>
              <td>{c.payment_status || '-'}</td>
              <td>{c.student_obtained || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="pagination">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</button>
        <span>Página {page} de {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Siguiente</button>
      </div>
    </div>
  );
}
