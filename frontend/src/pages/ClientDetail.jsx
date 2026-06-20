import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';

export default function ClientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    api.get(`/clients/${id}`).then((r) => {
      setClient(r.data);
      setForm(r.data);
    });
  }, [id]);

  if (!client) return <div className="loading">Cargando...</div>;

  const handleSave = async () => {
    await api.put(`/clients/${id}`, form);
    setEditing(false);
    setClient({ ...client, ...form });
  };

  const handleDelete = async () => {
    if (confirm('¿Eliminar este cliente?')) {
      await api.delete(`/clients/${id}`);
      navigate('/clients');
    }
  };

  const Field = ({ label, field, type = 'text' }) => (
    <div className="field">
      <label>{label}</label>
      {editing ? (
        type === 'textarea' ? (
          <textarea value={form[field] || ''} onChange={(e) => setForm({...form, [field]: e.target.value})} />
        ) : (
          <input type={type} value={form[field] || ''} onChange={(e) => setForm({...form, [field]: e.target.value})} />
        )
      ) : (
        <span>{client[field] || '-'}</span>
      )}
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <h1>{client.company_name || 'Cliente'}</h1>
        <div>
          <button className="btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancelar' : 'Editar'}</button>
          {editing && <button className="btn primary" onClick={handleSave}>Guardar</button>}
          <button className="btn danger" onClick={handleDelete}>Eliminar</button>
        </div>
      </div>

      <div className="client-detail-grid">
        <div className="card">
          <h2>Información General</h2>
          <Field label="Empresa" field="company_name" />
          <Field label="Persona Contacto" field="contact_person" />
          <Field label="Teléfono" field="phone" />
          <Field label="Tipo Patrocinio" field="sponsorship_type" />
          <Field label="Paquete" field="package" />
        </div>
        <div className="card">
          <h2>Estado</h2>
          <Field label="Estado Visita" field="visit_status" />
          <Field label="Estado Pago" field="payment_status" />
          <Field label="Redes Sociales" field="social_media_fulfilled" />
          <Field label="Boletos Entregados" field="tickets_delivered" />
          <Field label="Logo Solicitado" field="logo_requested" />
        </div>
        <div className="card">
          <h2>Alumnos</h2>
          <Field label="Alumno que consiguió" field="student_obtained" />
          <Field label="Alumno que se comunicó" field="student_contacted" />
        </div>
        <div className="card full-width">
          <h2>Detalles</h2>
          <Field label="Detalle en Especie" field="in_kind_detail" type="textarea" />
          <Field label="Detalle Pago" field="payment_detail" type="textarea" />
          <Field label="Notas" field="notes" type="textarea" />
        </div>
      </div>

      <div className="card">
        <h2>Tareas Relacionadas</h2>
        <table>
          <thead><tr><th>Título</th><th>Estado</th><th>Prioridad</th><th>Asignado</th><th>Fecha</th></tr></thead>
          <tbody>
            {client.tasks?.length === 0 && <tr><td colSpan="5">Sin tareas</td></tr>}
            {client.tasks?.map((t) => (
              <tr key={t.id}>
                <td>{t.title}</td>
                <td><span className={`status-badge ${t.status}`}>{t.status}</span></td>
                <td><span className={`priority-badge ${t.priority}`}>{t.priority}</span></td>
                <td>{t.assigned_name || '-'}</td>
                <td>{t.due_date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
