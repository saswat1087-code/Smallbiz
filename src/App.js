import React, { useState, useEffect } from 'react';

const API_URL = 'https://script.google.com/macros/s/AKfycbwc8RkbjESSGsLm6rdMfZnKsWOLbk6H5Z2cq8uOe10EPxlecgxzvscV4Z-Cpu5TI-bk/exec';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false); // Now used in buttons
  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const allData = await res.json();
      const arr = Array.isArray(allData) ? allData : [];
      setStock(arr.filter(r => r.sku && !r.order_id));
      setBins(arr.filter(r => r.bin_id));
      setOrders(arr.filter(r => r.order_id));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addProduct = async () => {
    const binInput = newProduct.bin.trim().toUpperCase();
    if (!newProduct.sku || !newProduct.description) return alert("Fill SKU/Desc");
    if (binInput && !bins.some(b => b.bin_id.toString().toUpperCase() === binInput)) return alert("Enter correct bin");

    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_PRODUCT', ...newProduct }) });
    setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
    setSaving(false); loadData();
  };

  const addBin = async () => {
    if (!newBin.bin_id) return alert("Enter Bin ID");
    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_BIN', ...newBin, status: 'Available' }) });
    setNewBin({ bin_id: '', zone: '' });
    setSaving(false); loadData();
  };

  const addOrder = async () => {
    if (!newOrder.order_id) return alert("Enter Order ID");
    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_ORDER', ...newOrder, status: 'Open' }) });
    setNewOrder({ order_id: '', customer: '' });
    setSaving(false); loadData();
  };

  if (loading) return <div className="p-10 text-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <header className="bg-slate-900 text-white p-5 rounded-lg mb-6 shadow-lg">
        <h1 className="text-xl font-bold">SmallBiz WMS</h1>
      </header>
      <nav className="flex gap-2 mb-6">
        {['dashboard', 'stock', 'bins', 'orders'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded capitalize ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            {tab}
          </button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-blue-500 text-white p-6 rounded-xl">Units: {stock.reduce((s,i)=>s+(parseInt(i.quantity)||0),0)}</div>
          <div className="bg-green-500 text-white p-6 rounded-xl">SKUs: {stock.length}</div>
          <div className="bg-purple-500 text-white p-6 rounded-xl">Bins: {bins.length}</div>
          <div className="bg-orange-500 text-white p-6 rounded-xl">Orders: {orders.length}</div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <input placeholder="SKU" className="border p-2 w-full mb-2" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} />
          <input placeholder="Description" className="border p-2 w-full mb-2" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
          <input placeholder="Quantity" className="border p-2 w-full mb-2" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} />
          <input placeholder="Bin" className="border p-2 w-full mb-2" value={newProduct.bin} onChange={(e) => setNewProduct({...newProduct, bin: e.target.value})} />
          <button onClick={addProduct} disabled={saving} className="bg-blue-600 text-white p-2 w-full">{saving ? 'Saving...' : 'Add Product'}</button>
        </div>
      )}
      
      {activeTab === 'bins' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <input placeholder="Bin ID" className="border p-2 w-full mb-2" value={newBin.bin_id} onChange={(e) => setNewBin({...newBin, bin_id: e.target.value})} />
          <button onClick={addBin} disabled={saving} className="bg-blue-600 text-white p-2 w-full">{saving ? '...' : 'Add Bin'}</button>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <input placeholder="Order ID" className="border p-2 w-full mb-2" value={newOrder.order_id} onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value})} />
          <button onClick={addOrder} disabled={saving} className="bg-blue-600 text-white p-2 w-full">{saving ? '...' : 'Create Order'}</button>
        </div>
      )}
    </div>
  );
}

export default App;
