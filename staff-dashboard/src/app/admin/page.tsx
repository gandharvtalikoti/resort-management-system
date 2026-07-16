'use client';

import { useState, useEffect } from 'react';
import { getStaff, createStaff, deleteStaff } from '@/lib/api';

export default function AdminPage() {
  const [staff, setStaff] = useState<any[]>([]);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staffworkers');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const data = await getStaff();
      setStaff(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load staff');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createStaff(username, password, role);
      setUsername('');
      setPassword('');
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to create staff');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this staff member?')) return;
    try {
      await deleteStaff(id);
      loadStaff();
    } catch (err: any) {
      setError(err.message || 'Failed to delete staff');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Staff Management</h1>
        <div className="flex gap-4">
          <a href="/admin/consents" className="text-foreground hover:underline">Guest Consents</a>
          <a href="/admin/menu" className="text-foreground hover:underline">Manage Menu</a>
          <a href="/" className="text-foreground hover:underline">← Back to Dashboard</a>
        </div>
      </div>

      {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded mb-8">{error}</div>}

      <div className="bg-background-alt p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Add New Staff</h2>
        <form onSubmit={handleCreate} className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Username</label>
            <input 
              required
              className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              required
              type="password"
              className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-1">Role</label>
            <select 
              className="w-full border p-2 rounded bg-background-alt"
              value={role}
              onChange={e => setRole(e.target.value)}
            >
              <option value="staffworkers">Staff Worker</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button type="submit" className="bg-foreground text-background px-6 py-2 rounded font-medium hover:bg-foreground/90 h-[42px]">
            Create
          </button>
        </form>
      </div>

      <div className="bg-background-alt rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-surface">
              <th className="p-4 font-medium">Username</th>
              <th className="p-4 font-medium">Role</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(user => (
              <tr key={user.id} className="border-b border-surface last:border-0 hover:bg-surface">
                <td className="p-4">{user.username}</td>
                <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${user.role === 'ADMIN' ? 'bg-gold text-foreground' : 'bg-surface-hover text-foreground'}`}>{user.role}</span></td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDelete(user.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
