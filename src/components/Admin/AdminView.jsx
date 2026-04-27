import React, { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../services/firebase';
import { createUserAdmin } from '../../services/authService';
import { ROLES } from '../../utils/constants';
import {
  Users, UserPlus, UserCheck, UserX, Loader, AlertCircle, CheckCircle, Shield,
} from 'lucide-react';

const ROLE_LABELS = {
  [ROLES.ADMIN]:  'Administrador',
  [ROLES.AGENT]:  'Agente',
  [ROLES.TENANT]: 'Arrendatario',
  [ROLES.OWNER]:  'Propietario',
};

const ROLE_COLORS = {
  [ROLES.ADMIN]:  'bg-purple-100 text-purple-700',
  [ROLES.AGENT]:  'bg-blue-100 text-blue-700',
  [ROLES.TENANT]: 'bg-emerald-100 text-emerald-700',
  [ROLES.OWNER]:  'bg-slate-100 text-slate-600',
};

const EMPTY_FORM = { name: '', email: '', password: '', role: ROLES.AGENT, phone: '' };

export default function AdminView() {
  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [creating, setCreating]     = useState(false);
  const [formError, setFormError]   = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, 'users'));
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleActive = async (userId, currentActive) => {
    await updateDoc(doc(db, 'users', userId), {
      isActive:  !currentActive,
      updatedAt: serverTimestamp(),
    });
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, isActive: !currentActive } : u))
    );
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');
    if (!form.name.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError('Nombre, correo y contraseña son obligatorios');
      return;
    }
    if (form.password.length < 6) {
      setFormError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setCreating(true);
    try {
      await createUserAdmin(
        form.email.trim(),
        form.password,
        form.name.trim(),
        form.role,
        { phone: form.phone.trim() }
      );
      setFormSuccess(`Usuario "${form.name}" creado exitosamente`);
      setForm(EMPTY_FORM);
      await fetchUsers();
      setTimeout(() => { setShowForm(false); setFormSuccess(''); }, 2500);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Shield className="w-7 h-7 text-purple-600" />
          Administración de Usuarios
        </h2>
        <button
          onClick={() => { setShowForm((v) => !v); setFormError(''); setFormSuccess(''); }}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white
                     px-4 py-2 rounded-lg text-sm font-medium transition shadow"
        >
          <UserPlus className="w-4 h-4" /> Nuevo Usuario
        </button>
      </div>

      {/* Formulario de creación */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 mb-6">
          <h3 className="font-semibold text-slate-800 mb-4">Crear Nuevo Usuario</h3>

          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /> {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-emerald-700 text-sm">
              <CheckCircle className="w-4 h-4 flex-shrink-0" /> {formSuccess}
            </div>
          )}

          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nombre completo *</label>
              <input
                type="text"
                value={form.name}
                onChange={set('name')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico *</label>
              <input
                type="email"
                value={form.email}
                onChange={set('email')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Contraseña * <span className="text-slate-400 font-normal">(mín. 6 chars)</span>
              </label>
              <input
                type="password"
                value={form.password}
                onChange={set('password')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
              <input
                type="text"
                value={form.phone}
                onChange={set('phone')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1">Rol *</label>
              <select
                value={form.role}
                onChange={set('role')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm
                           focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              >
                <option value={ROLES.AGENT}>Agente Inmobiliario</option>
                <option value={ROLES.OWNER}>Propietario</option>
                <option value={ROLES.TENANT}>Arrendatario</option>
                <option value={ROLES.ADMIN}>Administrador</option>
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800
                           border border-slate-300 rounded-lg transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="px-4 py-2 text-sm bg-purple-600 hover:bg-purple-700
                           disabled:bg-purple-400 text-white rounded-lg flex items-center gap-2 transition"
              >
                {creating
                  ? <><Loader className="w-4 h-4 animate-spin" /> Creando...</>
                  : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-500" />
            Usuarios del Sistema
          </h3>
          <span className="text-xs text-slate-400">{users.length} usuarios</span>
        </div>

        {loading ? (
          <div className="p-10 text-center">
            <Loader className="w-7 h-7 animate-spin text-purple-600 mx-auto" />
          </div>
        ) : users.length === 0 ? (
          <p className="p-8 text-center text-slate-400 text-sm">No hay usuarios registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="text-slate-500 uppercase text-xs border-b bg-slate-50">
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Correo</th>
                  <th className="p-4">Teléfono</th>
                  <th className="p-4">Rol</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4">Acción</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => {
                  const active = user.isActive !== false;
                  return (
                    <tr key={user.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-medium text-sm text-slate-800">{user.name}</td>
                      <td className="p-4 text-sm text-slate-600">{user.email}</td>
                      <td className="p-4 text-sm text-slate-500">{user.phone || '—'}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-100 text-gray-600'}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold
                          ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={() => toggleActive(user.id, active)}
                          className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition
                            ${active
                              ? 'text-red-600 hover:bg-red-50 border-red-200'
                              : 'text-emerald-600 hover:bg-emerald-50 border-emerald-200'}`}
                        >
                          {active
                            ? <><UserX className="w-3 h-3" /> Desactivar</>
                            : <><UserCheck className="w-3 h-3" /> Activar</>}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
