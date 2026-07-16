'use client';

import { useState, useEffect } from 'react';
import { getMenuItems, createMenuItem, updateMenuItem, deleteMenuItem } from '@/lib/api';

export default function AdminMenuPage() {
  const [items, setItems] = useState<any[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [category, setCategory] = useState('Breakfast');
  const [isVeg, setIsVeg] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMenu();
  }, []);

  const loadMenu = async () => {
    try {
      const data = await getMenuItems();
      setItems(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load menu');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createMenuItem({
        name,
        description,
        price,
        category,
        is_veg: isVeg,
        is_available: isAvailable
      });
      setName('');
      setDescription('');
      setPrice(0);
      loadMenu();
    } catch (err: any) {
      setError(err.message || 'Failed to create item');
    }
  };

  const handleToggleAvailable = async (item: any) => {
    try {
      await updateMenuItem(item.id, { ...item, is_available: !item.is_available });
      loadMenu();
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    try {
      await deleteMenuItem(id);
      loadMenu();
    } catch (err: any) {
      setError(err.message || 'Failed to delete item');
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-display font-bold">Menu Management</h1>
        <div className="flex gap-4">
          <a href="/admin" className="text-foreground hover:underline">Manage Staff</a>
          <a href="/" className="text-foreground hover:underline">← Back to Dashboard</a>
        </div>
      </div>

      {error && <div className="bg-red-500/10 text-red-500 border border-red-500/20 p-4 rounded mb-8">{error}</div>}

      <div className="bg-background-alt p-6 rounded-xl shadow-sm mb-8">
        <h2 className="text-xl font-bold mb-4">Add New Menu Item</h2>
        <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4 md:grid-cols-4 items-end">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input required className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <input required className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" value={category} onChange={e => setCategory(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Price (₹)</label>
            <input required type="number" className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" value={price} onChange={e => setPrice(Number(e.target.value))} />
          </div>
          <div className="flex flex-col gap-2">
             <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isVeg} onChange={e => setIsVeg(e.target.checked)} />
                Is Veg
             </label>
             <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={isAvailable} onChange={e => setIsAvailable(e.target.checked)} />
                Is Available
             </label>
          </div>
          <div className="col-span-2 md:col-span-3">
             <label className="block text-sm font-medium mb-1">Description</label>
             <input className="w-full border border-surface bg-background text-foreground p-2 rounded focus:outline-none focus:ring-1 focus:ring-gold" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="col-span-2 md:col-span-1">
             <button type="submit" className="w-full bg-foreground text-background px-6 py-2 rounded font-medium hover:bg-foreground/90 h-[42px]">
               Create
             </button>
          </div>
        </form>
      </div>

      <div className="bg-background-alt rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface border-b border-surface">
              <th className="p-4 font-medium">Name</th>
              <th className="p-4 font-medium">Category</th>
              <th className="p-4 font-medium">Type</th>
              <th className="p-4 font-medium">Price</th>
              <th className="p-4 font-medium">Available</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-surface last:border-0 hover:bg-surface">
                <td className="p-4">
                  <div className="font-medium">{item.name}</div>
                  <div className="text-xs text-foreground-muted">{item.description}</div>
                </td>
                <td className="p-4"><span className="bg-surface px-2 py-1 rounded text-xs">{item.category}</span></td>
                <td className="p-4">{item.is_veg ? '🟩 Veg' : '🟥 Non-Veg'}</td>
                <td className="p-4">₹{item.price}</td>
                <td className="p-4">
                   <button 
                     onClick={() => handleToggleAvailable(item)}
                     className={`px-3 py-1 rounded-full text-xs font-medium ${item.is_available ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}
                   >
                     {item.is_available ? 'Yes' : 'No'}
                   </button>
                </td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => handleDelete(item.id)}
                    className="text-red-500 hover:text-red-700 text-sm font-medium ml-4"
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
