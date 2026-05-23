import React, { useState, useEffect } from 'react';

const API_URL = 'https://script.google.com/macros/s/AKfycbwc8RkbjESSGsLm6rdMfZnKsWOLbk6H5Z2cq8uOe10EPxlecgxzvscV4Z-Cpu5TI-bk/exec';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
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
    // BIN VALIDATION LOGIC
    const binInput = newProduct.bin.trim().toUpperCase();
    if (binInput && !bins.some(b => b.bin_id.toString().toUpperCase() === binInput)) {
      return alert("Enter correct bin");
    }
    
    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_PRODUCT', ...newProduct }) });
    setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
    setSaving(false); loadData();
  };

  const addBin = async () => {
    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_BIN', ...newBin }) });
    setNewBin({ bin_id: '', zone: '' });
    setSaving(false); loadData();
  };

  const addOrder = async () => {
    setSaving(true);
    await fetch(API_URL, { method: 'POST', body: JSON.stringify({ action: 'ADD_ORDER', ...newOrder }) });
    setNewOrder({ order_id: '', customer: '' });
    setSaving(false); loadData();
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-4">
      <nav className="flex gap-2 mb-4">
        {['dashboard', 'stock', 'bins', 'orders'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={activeTab === t ? 'bg-blue-600 text-white p-2' : 'bg-gray-200 p-2'}>{t.toUpperCase()}</button>
        ))}
      </nav>

      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-4 gap-4">
          <div className="p-4 border">Units: {stock.length}</div>
          <div className="p-4 border">Bins: {bins.length}</div>
          <div className="p-4 border">Orders: {orders.length}</div>
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="flex flex-col gap-2">
          <input placeholder="SKU" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} className="border p-2"/>
          <input placeholder="Bin" value={newProduct.bin} onChange={(e) => setNewProduct({...newProduct, bin: e.target.value})} className="border p-2"/>
          <button onClick={addProduct} className="bg-green-600 text-white p-2">Add Stock</button>
        </div>
      )}

      {activeTab === 'bins' && (
        <div className="flex flex-col gap-2">
           <input placeholder="Bin ID" value={newBin.bin_id} onChange={(e) => setNewBin({...newBin, bin_id: e.target.value})} className="border p-2"/>
           <button onClick={addBin} className="bg-blue-600 text-white p-2">Add Bin</button>
        </div>
      )}

      {activeTab === 'orders' && (
        <div className="flex flex-col gap-2">
           <input placeholder="Order ID" value={newOrder.order_id} onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value})} className="border p-2"/>
           <button onClick={addOrder} className="bg-purple-600 text-white p-2">Create Order</button>
        </div>
      )}
    </div>
  );
}

export default App;
