import React, { useState, useEffect } from 'react';

// Updated deployment API URL string connection pointer
const API_URL = 'https://script.google.com/macros/s/AKfycbxrbJckTbX8uzUCrvNiUXTXMDD6ZVKhvvzXA7oUOCorxT1W-H3PuWfJpnfOE0bsSBjT/exec';

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
    const sku = newProduct.sku.trim().toUpperCase();
    const description = newProduct.description.trim();
    const bin = newProduct.bin.trim().toUpperCase();
    const quantityToAdd = parseInt(newProduct.quantity, 10) || 0;

    if (!sku) {
      setMessage('❌ Please enter an SKU');
      return;
    }
    
    // === SKU + BIN DUPLICATE CHECK ===
    const existingItem = stock.find(
      (item) =>
        item.sku &&
        item.sku.toString().toUpperCase() === sku &&
        item.bin &&
        item.bin.toString().toUpperCase() === bin
    );

    // If it doesn't exist, description becomes mandatory
    if (!existingItem && !description) {
      setMessage('❌ Please enter a Description');
      return;
    }
    
    if (!bin) {
      setMessage('❌ Please enter a Bin Location');
      return;
    }

    // === BIN VALIDATION ===
    const binExists = bins.some(
      (b) => b.bin_id && b.bin_id.toString().toUpperCase() === bin
    );
    if (!binExists) {
      setMessage(`❌ Bin "${bin}" does not exist. Please add it in the Bins tab first.`);
      return;
    }

    let finalDescription = description;
    let finalQuantity = quantityToAdd;

    if (existingItem) {
      // Same SKU + Same Bin → Accumulate quantity, skip description checks entirely
      const existingQty = parseInt(existingItem.quantity, 10) || 0;
      finalQuantity = existingQty + quantityToAdd;
      finalDescription = existingItem.description || description;

      setMessage(`ℹ️ Quantity updated! New total: ${finalQuantity} (was ${existingQty})`);
    } else {
      // New placement: Auto-fill description if the SKU exists elsewhere in the facility
      const existingSKU = stock.find(
        (item) => item.sku && item.sku.toString().toUpperCase() === sku
      );
      if (existingSKU) {
        const existingDesc = existingSKU.description?.trim();
        if (existingDesc && existingDesc.toLowerCase() !== description.toLowerCase()) {
          finalDescription = existingDesc;
          setMessage(`ℹ️ Description auto-corrected to match SKU profile: "${existingDesc}"`);
        }
      }
    }

    setSaving(true);
    try {
      let filePayload = {};

      if (selectedFile) {
        const base64String = await convertFileToBase64(selectedFile);
        filePayload = {
          fileData: base64String,
          fileName: selectedFile.name,
          fileType: selectedFile.type,
        };
      }

      // === OPTION A DYNAMIC PAYLOAD ===
      const payload = {
        action: existingItem ? 'UPDATE_QUANTITY' : 'ADD_PRODUCT',
        ...(existingItem && { rowNumber: parseInt(existingItem.id, 10) }),
        sku: sku,
        description: finalDescription,
        quantity: finalQuantity,
        bin: bin,
        ...filePayload,
      };

      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);

      const fileInput = document.getElementById('product-file-attachment');
      if (fileInput) fileInput.value = '';

      if (!message.includes('updated') && !message.includes('auto-corrected')) {
        setMessage('✅ Product added successfully!');
      }

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
    if (!rowId) {
      setMessage('❌ Target ID missing');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          rowNumber: parseInt(rowId, 10),
          status: newStatus
        })
      });
      if (!res.ok) throw new Error();
      setMessage(`✅ Order ${orderId} status changed to: ${newStatus}`);
      await loadData();
      setShowStatusMenu(null);
    } catch {
      setMessage('❌ Failed to change order status');
    } finally {
      setSaving(false);
    }
  };

  const executeItemRemoval = async (rowId, label) => {
    if (!rowId) {
      setMessage('❌ Missing reference coordinate');
      return;
    }
    if (!window.confirm(`Permanently delete record: ${label}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'DELETE_ROW',
          rowNumber: parseInt(rowId, 10)
        })
      });
      if (!res.ok) throw new Error();
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

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg font-medium text-slate-600">Loading WMS Data Matrix...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SmallBiz WMS</h1>
              <p className="text-xs text-slate-400">Powered by Google Scripts Deployment</p>
            </div>
          </div>
          <div className="text-xs font-mono bg-slate-800 text-emerald-400 px-3 py-1.5 rounded border border-slate-700">
            System Online
          </div>
        </div>
      </header>

      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-sm font-medium ${
          message.includes('✅') || message.includes('ℹ️') 
            ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30' 
            : 'bg-slate-900 text-rose-400 border border-rose-500/30'
        }`}>
          {message}
        </div>
      )}

      <main className="container mx-auto p-4 max-w-6xl mt-4">
        <nav className="flex gap-1.5 mb-6 bg-slate-200/60 p-1.5 rounded-xl max-w-md">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'stock', label: 'Stock', icon: '📦' },
            { id: 'bins', label: 'Bins', icon: '🗑️' },
            { id: 'orders', label: 'Orders', icon: '📝' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowStatusMenu(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'
              }`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* DASHBOARD */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-5 text-slate-800">Operational Aggregates</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { title: 'Units in Stock', count: stock.reduce((s, i) => s + (parseInt(i?.quantity, 10) || 0), 0), color: 'from-blue-500 to-indigo-600', icon: '📦' },
                { title: 'Unique SKUs', count: stock.length, color: 'from-emerald-500 to-teal-600', icon: '🏷️' },
                { title: 'Allocated Locations', count: bins.length, color: 'from-violet-500 to-purple-600', icon: '🗑️' },
                { title: 'Active Pipelines', count: orders.length, color: 'from-amber-500 to-orange-600', icon: '📋' }
              ].map((card, idx) => (
                <div key={idx} className={`bg-gradient-to-br ${card.color} rounded-xl p-5 text-white shadow-sm`}>
                  <div className="text-2xl mb-1 opacity-90">{card.icon}</div>
                  <h3 className="text-xs font-medium uppercase tracking-wider text-white/80">{card.title}</h3>
                  <p className="text-2xl font-black mt-1">{card.count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STOCK TAB */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Inventory Index</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="SKU ID" 
                  className="border border-slate-200 p-2 text-sm rounded-lg bg-white" 
                  value={newProduct.sku} 
                  onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })} 
                />
                <input 
                  type="text" 
                  placeholder="Description" 
                  className="border border-slate-200 p-2 text-sm rounded-lg bg-white" 
                  value={newProduct.description} 
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} 
                />
                <input 
                  type="number" 
                  placeholder="Quantity" 
                  className="border border-slate-200 p-2 text-sm rounded-lg bg-white" 
                  value={newProduct.quantity} 
                  onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} 
                />
                
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Bin Location (must exist in Bins tab)" 
                    className="border border-slate-200 p-2 text-sm rounded-lg bg-white w-full" 
                    value={newProduct.bin} 
                    onChange={(e) => {
                      setNewProduct({ ...newProduct, bin: e.target.value.toUpperCase() });
                      setShowBinSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowBinSuggestions(false), 200)}
                    onFocus={() => setShowBinSuggestions(true)}
                  />
                  {showBinSuggestions && bins.length > 0 && newProduct.bin && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {bins
                        .filter(bin => bin.bin_id && bin.bin_id.toUpperCase().includes(newProduct.bin.toUpperCase()))
                        .slice(0, 5)
                        .map((bin, idx) => (
                          <div 
                            key={idx}
                            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0"
                            onMouseDown={() => {
                              setNewProduct({ ...newProduct, bin: bin.bin_id });
                              setShowBinSuggestions(false);
                            }}
                          >
                            <span className="font-mono">{bin.bin_id}</span>
                            <span className="text-xs text-slate-400 ml-2">({bin.zone || 'General'})</span>
                          </div>
                        ))}
                      {bins.filter(b => b.bin_id && b.bin_id.toUpperCase().includes(newProduct.bin.toUpperCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-amber-600 bg-amber-50">
                          ⚠️ Bin "{newProduct.bin}" not found. Please add it in Bins tab first.
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="sm:col-span-2 bg-white p-3 rounded-lg border border-dashed border-slate-300">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Product Attachment (Image, PDF, Document)</label>
                  <input id="product-file-attachment" type="file" className="text-xs text-slate-600 block w-full file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" onChange={(e) => setSelectedFile(e.target.files[0])} />
                </div>

                <button onClick={addProduct} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all">
                  {saving ? 'Uploading Payload String...' : '➕ Add Product with Attachment'}
                </button>
              </div>
            </div>
            
            <h3 className="font-semibold text-sm mb-3 text-slate-600">Current Stock</h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {stock.map((item, index) => (
                <div key={index} className="py-3 flex justify-between items-center group">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">
                      {item.description || 'Unnamed'}{' '}
                      <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1">{item.sku}</span>
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Quantity: <span className="text-slate-800 font-medium">{item.quantity || 0}</span> | 
                      Bin: <span className={`font-medium ${bins.some(b => b.bin_id === item.bin) ? 'text-emerald-600' : 'text-rose-500'}`}>{item.bin || 'None'}</span>
                      {!bins.some(b => b.bin_id === item.bin) && item.bin && (
                        <span className="ml-2 text-rose-500 text-[10px]">⚠️ Bin not found</span>
                      )}
                    </p>
                    {item.attachment_url && (
                      <a href={item.attachment_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-1 bg-blue-50 px-2 py-0.5 rounded font-medium">
                        🔗 {item.attachment_name || 'View Attached Document'}
                      </a>
                    )}
                  </div>
                  <button onClick={() => executeItemRemoval(item.id, item.sku)} className="text-slate-300 hover:text-rose-600 p-2 transition-all">🗑️</button>
                </div>
              ))}
              {stock.length === 0 && <p className="text-slate-400 text-sm text-center py-6">No stock records found.</p>}
            </div>
          </div>
        )}

        {/* BINS TAB */}
        {activeTab === 'bins' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Bin Locations</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Bin</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Bin ID" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.bin_id} onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Zone Matrix" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.zone} onChange={(e) => setNewBin({ ...newBin, zone: e.target.value })} />
                <button onClick={addBin} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all">{saving ? 'Deploying...' : '➕ Add Bin'}</button>
              </div>
            </div>

            <h3 className="font-semibold text-sm mb-3 text-slate-600">Current Bins</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto pr-1">
              {bins.map((bin, index) => (
                <div key={index} className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex justify-between items-start">
                  <div>
                    <p className="font-bold font-mono text-slate-800 text-base">{bin.bin_id}</p>
                    <p className="text-xs text-slate-500 mt-1">Zone: <span className="font-medium text-slate-700">{bin.zone || 'General'}</span></p>
                    <p className="text-xs text-slate-500">Status: <span className="font-medium text-emerald-600">{bin.status || 'Available'}</span></p>
                  </div>
                  <button onClick={() => executeItemRemoval(bin.id, bin.bin_id)} className="text-slate-300 hover:text-rose-600 p-1.5 transition-all">🗑️</button>
                </div>
              ))}
              {bins.length === 0 && <p className="col-span-full text-slate-400 text-sm text-center py-6">No bins provisioned.</p>}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Order Manifests</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Create New Order</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Order ID" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.order_id} onChange={(e) => setNewOrder({ ...newOrder, order_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Customer Name" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.customer} onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })} />
                <button onClick={addOrder} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all">{saving ? 'Creating...' : '➕ Create Order'}</button>
              </div>
            </div>

            <h3 className="font-semibold text-sm mb-3 text-slate-600">All Orders</h3>
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {orders.map((order, index) => (
                <div key={index} className="border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold font-mono text-slate-800">{order.order_id}</p>
                      {order.created_at && (
                        <span className="text-[10px] text-slate-400 font-normal bg-slate-100 px-1.5 py-0.5 rounded">
                          {new Date(order.created_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1">Customer: <span className="font-medium text-slate-700">{order.customer}</span></p>
                  </div>
                  
                  <div className="flex items-center gap-2 justify-end">
                    <div className="relative">
                      <button 
                        onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)} 
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${getStatusColor(order.status || 'Open')}`}
                      >
                        <span>{order.status || 'Open'}</span>
                        <span className="text-[10px] opacity-60">▼</span>
                      </button>
                      
                      {showStatusMenu === order.order_id && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-900 text-slate-200 rounded-xl shadow-xl border border-slate-800 z-30 overflow-hidden">
                          <div className="p-1 text-xs">
                            {[
                              { label: '📋 Open', value: 'Open' },
                              { label: '🚚 In Transit', value: 'In Transit' },
                              { label: '✅ Closed', value: 'Closed' }
                            ].map(opt => (
                              <button 
                                key={opt.value}
                                onClick={() => updateOrderStatus(order.id, order.order_id, opt.value)} 
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <button onClick={() => executeItemRemoval(order.id, order.order_id)} className="text-slate-300 hover:text-rose-600 p-2 transition-all">🗑️</button>
                  </div>
                </div>
              ))}
              {orders.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No orders found.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
