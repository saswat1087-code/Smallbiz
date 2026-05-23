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
  const [showBinSuggestions, setShowBinSuggestions] = useState(false);
  const [showSkuSuggestions, setShowSkuSuggestions] = useState(false);

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
      setMessage('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  // Find existing product by SKU and Bin
  const findExistingProduct = (sku, bin) => {
    return stock.find(item => 
      item.sku && item.sku.toString().toUpperCase() === sku.toUpperCase() &&
      item.bin && item.bin.toString().toUpperCase() === bin.toUpperCase()
    );
  };

  // Auto-fetch description when SKU is entered
  const handleSkuChange = (skuValue) => {
    const upperSku = skuValue.toUpperCase();
    setNewProduct({ ...newProduct, sku: upperSku });
    
    const existingItem = stock.find(item => 
      item.sku && item.sku.toString().toUpperCase() === upperSku
    );
    
    if (existingItem && existingItem.description) {
      setNewProduct(prev => ({ 
        ...prev, 
        description: existingItem.description,
        sku: upperSku
      }));
      setMessage(`📋 Auto-filled: ${existingItem.description}`);
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const addProduct = async () => {
    // Validation
    if (!newProduct.sku.trim()) {
      setMessage('❌ Please enter SKU');
      return;
    }
    if (!newProduct.description.trim()) {
      setMessage('❌ Please enter Description');
      return;
    }
    if (!newProduct.bin.trim()) {
      setMessage('❌ Please enter Bin Location');
      return;
    }
    
    // Check if bin exists
    const binExists = bins.some(bin => 
      bin.bin_id && bin.bin_id.toString().toUpperCase() === newProduct.bin.trim().toUpperCase()
    );
    
    if (!binExists) {
      setMessage(`❌ Bin "${newProduct.bin.toUpperCase()}" not found. Add it in Bins tab first.`);
      return;
    }
    
    const existingProduct = findExistingProduct(newProduct.sku, newProduct.bin);
    const quantityToAdd = parseInt(newProduct.quantity, 10) || 0;
    
    setSaving(true);
    try {
      let filePayload = {};
      if (selectedFile) {
        const base64String = await convertFileToBase64(selectedFile);
        filePayload = {
          fileData: base64String,
          fileName: selectedFile.name,
          fileType: selectedFile.type
        };
      }

      let res;
      if (existingProduct && existingProduct.id) {
        // Update existing - add quantity
        const newQuantity = (parseInt(existingProduct.quantity, 10) || 0) + quantityToAdd;
        res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'UPDATE_PRODUCT',
            rowNumber: parseInt(existingProduct.id, 10),
            sku: newProduct.sku.trim().toUpperCase(),
            description: newProduct.description.trim(),
            quantity: newQuantity,
            bin: newProduct.bin.trim().toUpperCase(),
            ...filePayload
          })
        });
        
        if (res.ok) {
          setMessage(`✅ Stock updated! Added ${quantityToAdd} units. New total: ${newQuantity}`);
        }
      } else {
        // Create new product
        res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'ADD_PRODUCT',
            sku: newProduct.sku.trim().toUpperCase(),
            description: newProduct.description.trim(),
            quantity: quantityToAdd,
            bin: newProduct.bin.trim().toUpperCase(),
            ...filePayload
          })
        });
        
        if (res.ok) {
          setMessage(`✅ New product "${newProduct.sku}" added successfully!`);
        }
      }
      
      if (!res.ok) throw new Error('API call failed');
      
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);
      const fileInput = document.getElementById('product-file-attachment');
      if (fileInput) fileInput.value = '';
      await loadData();
      
    } catch (err) {
      console.error('Error:', err);
      setMessage('❌ Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const addBin = async () => {
    if (!newBin.bin_id.trim()) {
      setMessage('❌ Please enter Bin ID');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
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
      setMessage('✅ Bin added successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to add bin');
    } finally {
      setSaving(false);
    }
  };

  const addOrder = async () => {
    if (!newOrder.order_id.trim() || !newOrder.customer.trim()) {
      setMessage('❌ Please enter Order ID and Customer');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
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
      setMessage('✅ Order created successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (rowId, orderId, newStatus) => {
    if (!rowId) {
      setMessage('❌ Missing order reference');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'UPDATE_STATUS', 
          rowNumber: parseInt(rowId, 10), 
          status: newStatus 
        })
      });
      if (!res.ok) throw new Error();
      setMessage(`✅ Order ${orderId} status: ${newStatus}`);
      await loadData();
      setShowStatusMenu(null);
    } catch {
      setMessage('❌ Failed to update status');
    } finally {
      setSaving(false);
    }
  };

  const executeItemRemoval = async (rowId, label) => {
    if (!rowId) return;
    if (!window.confirm(`Delete ${label}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(API_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ 
          action: 'DELETE_ROW', 
          rowNumber: parseInt(rowId, 10) 
        })
      });
      if (!res.ok) throw new Error();
      setMessage(`✅ Deleted successfully`);
      await loadData();
    } catch {
      setMessage('❌ Delete failed');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'bg-amber-100 text-amber-900';
      case 'In Transit': return 'bg-sky-100 text-sky-900';
      case 'Closed': return 'bg-emerald-100 text-emerald-900';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const isExistingProduct = findExistingProduct(newProduct.sku, newProduct.bin);
  const buttonText = saving ? 'Processing...' : (isExistingProduct ? '➕ Update Stock (Add to existing)' : '➕ Add New Product');

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg font-medium text-slate-600">Loading WMS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📦</span>
              <div>
                <h1 className="text-xl font-bold">SmallBiz WMS</h1>
                <p className="text-xs text-slate-400">Powered by Google Sheets</p>
              </div>
            </div>
            <div className="text-xs font-mono bg-slate-800 text-emerald-400 px-3 py-1.5 rounded">
              System Online
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div className={`fixed top-4 right-4 z-50 p-3 rounded-xl shadow-lg text-sm font-medium ${
          message.includes('✅') || message.includes('📋') ? 'bg-slate-800 text-emerald-400' : 'bg-slate-800 text-rose-400'
        }`}>
          {message}
        </div>
      )}

      <main className="container mx-auto p-4 max-w-6xl mt-4">
        <nav className="flex gap-2 mb-6 bg-white p-1 rounded-xl shadow-sm max-w-md">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'stock', label: 'Stock', icon: '📦' },
            { id: 'bins', label: 'Bins', icon: '🗑️' },
            { id: 'orders', label: 'Orders', icon: '📝' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowStatusMenu(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-5">Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                <div className="text-2xl mb-1">📦</div>
                <h3 className="text-xs uppercase tracking-wider opacity-80">Total Stock</h3>
                <p className="text-2xl font-bold">{stock.reduce((s, i) => s + (parseInt(i?.quantity, 10) || 0), 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                <div className="text-2xl mb-1">🏷️</div>
                <h3 className="text-xs uppercase tracking-wider opacity-80">SKUs</h3>
                <p className="text-2xl font-bold">{stock.length}</p>
              </div>
              <div className="bg-gradient-to-br from-violet-500 to-violet-600 rounded-xl p-5 text-white">
                <div className="text-2xl mb-1">🗑️</div>
                <h3 className="text-xs uppercase tracking-wider opacity-80">Bins</h3>
                <p className="text-2xl font-bold">{bins.length}</p>
              </div>
              <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                <div className="text-2xl mb-1">📋</div>
                <h3 className="text-xs uppercase tracking-wider opacity-80">Orders</h3>
                <p className="text-2xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Stock Management</h2>
            
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="font-semibold text-sm mb-3">Add / Update Stock</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="SKU (e.g., MAT001)" 
                  className="border p-2 rounded-lg"
                  value={newProduct.sku} 
                  onChange={(e) => handleSkuChange(e.target.value)}
                />
                <input 
                  type="text" 
                  placeholder="Description" 
                  className="border p-2 rounded-lg"
                  value={newProduct.description} 
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} 
                />
                <input 
                  type="number" 
                  placeholder="Quantity" 
                  className="border p-2 rounded-lg"
                  value={newProduct.quantity} 
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} 
                />
                <input 
                  type="text" 
                  placeholder="Bin Location" 
                  className="border p-2 rounded-lg"
                  value={newProduct.bin} 
                  onChange={(e) => setNewProduct({ ...newProduct, bin: e.target.value.toUpperCase() })} 
                />
                <button onClick={addProduct} disabled={saving} className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg transition-all">
                  {buttonText}
                </button>
              </div>
              {isExistingProduct && newProduct.sku && newProduct.bin && (
                <div className="mt-3 text-xs text-blue-600 bg-blue-50 p-2 rounded">
                  ℹ️ SKU "{newProduct.sku}" already exists in bin "{newProduct.bin}". Stock will be added to existing entry.
                </div>
              )}
            </div>
            
            <h3 className="font-semibold text-sm mb-3">Current Stock</h3>
            <div className="divide-y max-h-96 overflow-y-auto">
              {stock.map((item, idx) => (
                <div key={idx} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-sm">{item.description} <span className="text-xs text-slate-400">({item.sku})</span></p>
                    <p className="text-xs text-slate-500">Qty: {item.quantity} | Bin: {item.bin}</p>
                  </div>
                  <button onClick={() => executeItemRemoval(item.id, item.sku)} className="text-slate-300 hover:text-red-500">🗑️</button>
                </div>
              ))}
              {stock.length === 0 && <p className="text-slate-400 text-center py-6">No stock records</p>}
            </div>
          </div>
        )}

        {activeTab === 'bins' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Bin Management</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="font-semibold text-sm mb-3">Add New Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Bin ID" className="border p-2 rounded-lg" value={newBin.bin_id} onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Zone" className="border p-2 rounded-lg" value={newBin.zone} onChange={(e) => setNewBin({ ...newBin, zone: e.target.value })} />
                <button onClick={addBin} disabled={saving} className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg">➕ Add Bin</button>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-3">Current Bins</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {bins.map((bin, idx) => (
                <div key={idx} className="border p-3 rounded-lg flex justify-between">
                  <div>
                    <p className="font-mono font-bold">{bin.bin_id}</p>
                    <p className="text-xs text-slate-500">Zone: {bin.zone || 'General'}</p>
                  </div>
                  <button onClick={() => executeItemRemoval(bin.id, bin.bin_id)} className="text-slate-300 hover:text-red-500">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4">Order Management</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl">
              <h3 className="font-semibold text-sm mb-3">Create Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Order ID" className="border p-2 rounded-lg" value={newOrder.order_id} onChange={(e) => setNewOrder({ ...newOrder, order_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Customer" className="border p-2 rounded-lg" value={newOrder.customer} onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })} />
                <button onClick={addOrder} disabled={saving} className="md:col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg">➕ Create Order</button>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-3">All Orders</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((order, idx) => (
                <div key={idx} className="border p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{order.order_id}</p>
                    <p className="text-xs text-slate-500">{order.customer}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status || 'Open')}`}
                    >
                      {order.status || 'Open'} ▼
                    </button>
                    {showStatusMenu === order.order_id && (
                      <div className="absolute right-0 mt-8 bg-white shadow-lg border rounded-lg z-10">
                        {['Open', 'In Transit', 'Closed'].map(s => (
                          <button key={s} onClick={() => updateOrderStatus(order.id, order.order_id, s)} className="block w-full text-left px-3 py-1 text-sm hover:bg-slate-100">{s}</button>
                        ))}
                      </div>
                    )}
                    <button onClick={() => executeItemRemoval(order.id, order.order_id)} className="text-slate-300 hover:text-red-500">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
