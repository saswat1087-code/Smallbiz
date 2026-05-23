import React, { useState, useEffect } from 'react';

// Your Google Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwc8RkbjESSGsLm6rdMfZnKsWOLbk6H5Z2cq8uOe10EPxlecgxzvscV4Z-Cpu5TI-bk/exec';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(null);

  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network failure');
      const allData = await response.json();
      const dataArray = Array.isArray(allData) ? allData : [];

      const stockData = dataArray
        .filter(row => row && row.sku && row.sku.toString().trim() !== '' && !row.order_id)
        .map(row => ({ ...row, id: row.__row_number__ }));
        
      const binsData = dataArray
        .filter(row => row && row.bin_id && row.bin_id.toString().trim() !== '')
        .map(row => ({ ...row, id: row.__row_number__ }));
        
      const ordersData = dataArray
        .filter(row => row && row.order_id && row.order_id.toString().trim() !== '')
        .map(row => ({ ...row, id: row.__row_number__ }));

      setStock(stockData);
      setBins(binsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('❌ Failed to synchronize data index');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const addProduct = async () => {
    if (!newProduct.sku.trim() || !newProduct.description.trim()) {
      setMessage('❌ Please specify SKU and Description');
      return;
    }

    // Bin Validation Logic
    const enteredBin = newProduct.bin.trim().toUpperCase();
    const isBinValid = enteredBin === '' || enteredBin === 'UNASSIGNED' || bins.some(b => b.bin_id === enteredBin);

    if (!isBinValid) {
      setMessage(`❌ Error: Bin "${enteredBin}" does not exist. Please create the bin first.`);
      return;
    }

    setSaving(true);
    try {
      let filePayload = {};
      if (selectedFile) {
        const base64String = await convertFileToBase64(selectedFile);
        filePayload = { fileData: base64String, fileName: selectedFile.name, fileType: selectedFile.type };
      }

      const payload = {
        action: 'ADD_PRODUCT',
        sku: newProduct.sku.trim().toUpperCase(),
        description: newProduct.description.trim(),
        quantity: parseInt(newProduct.quantity, 10) || 0,
        bin: enteredBin || 'UNASSIGNED',
        ...filePayload
      };

      const res = await fetch(API_URL, {
        redirect: 'follow', 
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error();
      
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);
      const fileInput = document.getElementById('product-file-attachment');
      if (fileInput) fileInput.value = '';

      setMessage('✅ Product and Attachment added successfully!');
      await loadData();
    } catch (err) {
      setMessage('❌ Failed to save product data');
    } finally {
      setSaving(false);
    }
  };

  const addBin = async () => {
    if (!newBin.bin_id.trim()) {
      setMessage('❌ Please supply a valid Bin ID');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ADD_BIN',
          bin_id: newBin.bin_id.trim().toUpperCase(),
          zone: newBin.zone.trim() || 'General',
          status: 'Available'
        })
      });
      if (!res.ok) throw new Error();
      setNewBin({ bin_id: '', zone: '' });
      setMessage('✅ Bin mapped successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to provision new bin');
    } finally {
      setSaving(false);
    }
  };

  const addOrder = async () => {
    if (!newOrder.order_id.trim() || !newOrder.customer.trim()) {
      setMessage('❌ Please input Order ID and Customer Name');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ADD_ORDER',
          order_id: newOrder.order_id.trim().toUpperCase(),
          customer: newOrder.customer.trim(),
          status: 'Open',
          created_at: new Date().toISOString()
        })
      });
      if (!res.ok) throw new Error();
      setNewOrder({ order_id: '', customer: '' });
      setMessage('✅ Order generated successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to stage order');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (rowId, orderId, newStatus) => {
    if (!rowId) return;
    setSaving(true);
    try {
      await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'UPDATE_STATUS', rowNumber: parseInt(rowId, 10), status: newStatus })
      });
      setMessage(`✅ Order ${orderId} updated to: ${newStatus}`);
      await loadData();
      setShowStatusMenu(null);
    } catch {
      setMessage('❌ Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const executeItemRemoval = async (rowId, label) => {
    if (!rowId || !window.confirm(`Permanently delete record: ${label}?`)) return;
    setSaving(true);
    try {
      await fetch(API_URL, { 
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'DELETE_ROW', rowNumber: parseInt(rowId, 10) })
      });
      setMessage(`✅ Record removed successfully.`);
      await loadData();
    } catch {
      setMessage('❌ Delete request failed');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-amber-100 text-amber-900 border border-amber-300';
      case 'In Transit': return 'bg-sky-100 text-sky-900 border border-sky-300';
      case 'Closed': return 'bg-emerald-100 text-emerald-900 border border-emerald-300';
      default: return 'bg-slate-100 text-slate-800 border border-slate-300';
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-lg font-medium text-slate-600">Loading WMS Data Matrix...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white shadow-md p-5">
        <h1 className="text-xl font-bold">SmallBiz WMS</h1>
      </header>

      {message && <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-sm font-medium ${message.includes('✅') ? 'bg-slate-900 text-emerald-400' : 'bg-slate-900 text-rose-400'}`}>{message}</div>}

      <main className="container mx-auto p-4 max-w-6xl">
        <nav className="flex gap-1.5 mb-6 bg-slate-200/60 p-1.5 rounded-xl max-w-md">
          {['dashboard', 'stock', 'bins', 'orders'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2.5 rounded-lg text-sm font-medium ${activeTab === tab ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600'}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>

        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Inventory Index</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <input type="text" placeholder="SKU ID" className="border p-2 rounded-lg" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} />
              <input type="text" placeholder="Description" className="border p-2 rounded-lg" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
              <input type="number" placeholder="Quantity" className="border p-2 rounded-lg" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} />
              <input type="text" placeholder="Bin Location" className="border p-2 rounded-lg" value={newProduct.bin} onChange={(e) => setNewProduct({...newProduct, bin: e.target.value.toUpperCase()})} />
              <input id="product-file-attachment" type="file" className="sm:col-span-2 text-sm p-2" onChange={(e) => setSelectedFile(e.target.files[0])} />
              <button onClick={addProduct} disabled={saving} className="sm:col-span-2 bg-blue-600 text-white py-2.5 rounded-lg">{saving ? 'Processing...' : '➕ Add Product'}</button>
            </div>
            {stock.map((item, index) => (
              <div key={index} className="py-2 flex justify-between border-b">
                <span>{item.description} ({item.sku}) - {item.quantity} units | Bin: {item.bin}</span>
                <button onClick={() => executeItemRemoval(item.id, item.sku)} className="text-rose-600">🗑️</button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
