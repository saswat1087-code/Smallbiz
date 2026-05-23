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
  const [selectedFile, setSelectedFile] = useState(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
      const allData = await res.json();
      const arr = Array.isArray(allData) ? allData : [];
      setStock(arr.filter(r => r.sku && !r.order_id).map(r => ({...r, id: r.__row_number__})));
      setBins(arr.filter(r => r.bin_id).map(r => ({...r, id: r.__row_number__})));
      setOrders(arr.filter(r => r.order_id).map(r => ({...r, id: r.__row_number__})));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const addProduct = async () => {
    if (!newProduct.sku || !newProduct.description) return alert("Fill SKU/Desc");
    
    // VALIDATION: Check if bin exists
    const binInput = newProduct.bin.trim().toUpperCase();
    if (binInput !== '' && binInput !== 'UNASSIGNED' && !bins.some(b => b.bin_id.toString().toUpperCase() === binInput)) {
      return alert("Enter correct bin");
    }

    setSaving(true);
    let filePayload = {};
    if (selectedFile) {
      const reader = new FileReader();
      const b64 = await new Promise(r => { reader.onload = () => r(reader.result); reader.readAsDataURL(selectedFile); });
      filePayload = { fileData: b64, fileName: selectedFile.name, fileType: selectedFile.type };
    }
    
    await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'ADD_PRODUCT', ...newProduct, ...filePayload })
    });
    setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
    setSaving(false);
    loadData();
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
          {[ {t:'UNITS', v: stock.reduce((s,i)=>s+(parseInt(i.quantity)||0),0)}, {t:'SKUS', v: stock.length}, {t:'BINS', v: bins.length}, {t:'ORDERS', v: orders.length} ].map((item, i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow border">
              <div className="text-xs text-slate-500">{item.t}</div>
              <div className="text-3xl font-bold">{item.v}</div>
            </div>
          ))}
        </div>
      )}

      {activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold mb-4">Inventory Management</h2>
          <div className="grid grid-cols-1 gap-2 mb-4">
            <input placeholder="SKU" className="border p-2" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} />
            <input placeholder="Description" className="border p-2" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
            <input placeholder="Quantity" className="border p-2" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} />
            <input placeholder="Bin" className="border p-2" value={newProduct.bin} onChange={(e) => setNewProduct({...newProduct, bin: e.target.value})} />
            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
            <button onClick={addProduct} className="bg-blue-600 text-white p-2">{saving ? '...' : 'Add Product'}</button>
          </div>
          {stock.map((item, i) => <div key={i} className="py-2 border-b">{item.sku} | Bin: {item.bin}</div>)}
        </div>
      )}
      
      {/* Add Bins and Orders content here following the same pattern */}
    </div>
  );
}

export default App;
