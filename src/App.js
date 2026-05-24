import React, { useState, useEffect } from 'react';

// Consolidated live deployment URL configured from your latest Google Apps Script environment pointer
const API_URL = 'https://script.google.com/macros/s/AKfycbyN-RwS_P6iDRaYwCHRjzqyJ0RSay67NNJvgsIxJK-NxykIKAY9YCwi2Ftv8z7zKSut/exec';

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
  const [showOrderBinSuggestions, setShowOrderBinSuggestions] = useState(false);

  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '', type: 'Inbound', sku: '', quantity: '', bin: '' });

  // === AI CHAT CORE STATES ===
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [chatLog, setChatLog] = useState([
    { role: 'assistant', text: 'Hello! I am your Gemini WMS Analyst. Ask me anything like "Provide stock inventory totals report", "Show active pipelines by type", or "Analyze bin storage locations".', hasChart: false }
  ]);

  // === CUSTOM NON-BLOCKING CONFIRMATION MODAL STATE ===
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network failure');
      const allData = await response.json();
      const dataArray = Array.isArray(allData) ? allData : [];

      // Split flat sheet rows dynamically using our smart column filters matching your single sheet database
      const stockData = dataArray
        .filter(row => row && row.sku && row.sku.toString().trim() !== '' && (!row.order_id || row.order_id.toString().trim() === ''))
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

  // === TRIGGER GEMINI ANALYTICS (With Robust Error Capture) ===
  const submitAiQuery = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;

    const userQuery = aiPrompt.trim();
    setChatLog(prev => [...prev, { role: 'user', text: userQuery }]);
    setAiPrompt('');
    setAiLoading(true);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'ANALYZE_SHEET',
          prompt: userQuery
        })
      });

      if (!res.ok) throw new Error("HTTP connection failed with status: " + res.status);
      const data = await res.json();

      // Handle backend structural errors explicitly without masking
      if (data.status === 'error') {
        setChatLog(prev => [...prev, {
          role: 'assistant',
          text: `❌ Gemini Backend Error: ${data.message || 'Error occurred while analyzing sheets.'}\n\nPlease verify that your Google Sheet contains valid database entries.`,
          hasChart: false
        }]);
      } else if (data.text) {
        setChatLog(prev => [...prev, {
          role: 'assistant',
          text: data.text,
          hasChart: !!data.hasChart,
          chartData: data.chartData || []
        }]);
      } else {
        setChatLog(prev => [...prev, {
          role: 'assistant',
          text: "⚠️ Gemini returned an empty text summary. Try asking in a different format, such as: 'Show stock quantities matching active SKUs.'",
          hasChart: false
        }]);
      }
    } catch (err) {
      console.error(err);
      setChatLog(prev => [...prev, { 
        role: 'assistant', 
        text: `❌ Connection failure. Make sure your Apps Script Web App is running with Me/Anyone authorization privileges and that you redeployed the script correctly.`, 
        hasChart: false 
      }]);
    } finally {
      setAiLoading(false);
    }
  };

  const addProduct = async () => {
    const sku = newProduct.sku.trim().toUpperCase();
    const description = newProduct.description.trim();
    const bin = newProduct.bin.trim().toUpperCase();
    const quantityToAdd = parseInt(newProduct.quantity, 10) || 0;

    if (!sku) { setMessage('❌ Please enter an SKU'); return; }
    const existingItem = stock.find((item) => item.sku && item.sku.toString().toUpperCase() === sku && item.bin && item.bin.toString().toUpperCase() === bin);
    if (!existingItem && !description) { setMessage('❌ Please enter a Description'); return; }
    if (!bin) { setMessage('❌ Please enter a Bin Location'); return; }

    const binExists = bins.some((b) => b.bin_id && b.bin_id.toString().toUpperCase() === bin);
    if (!binExists) { setMessage(`❌ Bin "${bin}" does not exist. Please add it in the Bins tab first.`); return; }

    let finalDescription = description;
    let finalQuantity = quantityToAdd;

    if (existingItem) {
      const existingQty = parseInt(existingItem.quantity, 10) || 0;
      finalQuantity = existingQty + quantityToAdd;
      finalDescription = existingItem.description || description;
      setMessage(`ℹ️ Quantity updated! New total: ${finalQuantity} (was ${existingQty})`);
    } else {
      const existingSKU = stock.find((item) => item.sku && item.sku.toString().toUpperCase() === sku);
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
        filePayload = { fileData: base64String, fileName: selectedFile.name, fileType: selectedFile.type };
      }

      const payload = {
        action: existingItem ? 'UPDATE_QUANTITY' : 'ADD_PRODUCT',
        ...(existingItem && { rowNumber: parseInt(existingItem.id, 10) }),
        sku: sku,
        description: finalDescription,
        quantity: finalQuantity,
        bin: bin,
        ...filePayload,
      };

      const res = await fetch(API_URL, { redirect: 'follow', method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();

      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);
      await loadData();
    } catch (err) {
      setMessage('❌ Failed to save product data');
    } finally {
      setSaving(false);
    }
  };

  const addBin = async () => {
    if (!newBin.bin_id.trim()) { setMessage('❌ Please supply a valid Bin ID'); return; }
    setSaving(true);
    try {
      const res = await fetch(API_URL, { redirect: 'follow', method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'ADD_BIN', bin_id: newBin.bin_id.trim().toUpperCase(), zone: newBin.zone.trim() || 'General', status: 'Available' })});
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
    const { order_id, customer, type, sku, quantity, bin } = newOrder;
    if (!order_id.trim() || !customer.trim() || !sku.trim() || !quantity || !bin.trim()) {
      setMessage('❌ Complete all input items (Order ID, Customer, SKU, Qty, Bin)');
      return;
    }
    if (type === 'Outbound') {
      const match = stock.find(i => i.sku === sku.toUpperCase() && i.bin === bin.toUpperCase());
      const availableQty = match ? (parseInt(match.quantity, 10) || 0) : 0;
      if (availableQty < parseInt(quantity, 10)) {
        setConfirmModal({
          isOpen: true,
          title: 'Fulfillment Warning',
          message: `Requested outbound fulfillment quantity (${quantity}) exceeds current storage levels inside Bin ${bin.toUpperCase()} (${availableQty}). Do you want to route the order anyway?`,
          onConfirm: () => {
            setConfirmModal(prev => ({ ...prev, isOpen: false }));
            executeOrderGeneration();
          }
        });
        return;
      }
    }
    executeOrderGeneration();
  };

  const executeOrderGeneration = async () => {
    const { order_id, customer, type, sku, quantity, bin } = newOrder;
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ADD_ORDER', order_id: order_id.trim().toUpperCase(), customer: customer.trim(), type: type, sku: sku.trim().toUpperCase(), quantity: parseInt(quantity, 10) || 0, bin: bin.trim().toUpperCase(), status: 'Open', created_at: new Date().toISOString() })
      });
      if (!res.ok) throw new Error();
      setNewOrder({ order_id: '', customer: '', type: 'Inbound', sku: '', quantity: '', bin: '' });
      setMessage('✅ Order generated successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to stage order');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (rowId, orderId, newStatus) => {
    if (!rowId) { setMessage('❌ Target ID missing'); return; }
    setSaving(true);
    try {
      const res = await fetch(API_URL, { redirect: 'follow', method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'UPDATE_STATUS', rowNumber: parseInt(rowId, 10), status: newStatus })});
      if (!res.ok) throw new Error();
      setMessage(`✅ Order ${orderId} changed to: ${newStatus}`);
      await loadData();
      setShowStatusMenu(null);
    } catch {
      setMessage('❌ Failed to change order status');
    } finally {
      setSaving(false);
    }
  };

  const requestItemRemoval = (rowId, label) => {
    setConfirmModal({
      isOpen: true,
      title: 'Confirm Deletion',
      message: `Are you sure you want to permanently delete record: "${label}"? This action is immediate and cannot be undone.`,
      onConfirm: () => {
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        executeItemRemoval(rowId);
      }
    });
  };

  const executeItemRemoval = async (rowId) => {
    if (!rowId) { setMessage('❌ Missing reference coordinate'); return; }
    setSaving(true);
    try {
      const res = await fetch(API_URL, { redirect: 'follow', method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'DELETE_ROW', rowNumber: parseInt(rowId, 10) })});
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

  const getMaxChartValue = (chartData) => {
    if (!chartData || chartData.length === 0) return 1;
    return Math.max(...chartData.map(d => Number(d.value) || 0), 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">📊</div>
          <div className="text-lg font-medium text-slate-600 animate-pulse">Loading WMS Data Matrix...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 animate-fadeIn">
      
      {/* BRAND HEADER BAR */}
      <header className="bg-slate-900 text-white shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">📦</span>
            <div>
              <h1 className="text-xl font-bold tracking-tight">SmallBiz WMS</h1>
              <p className="text-xs text-slate-400">Powered by Google Scripts & Gemini AI (Single-Sheet Version)</p>
            </div>
          </div>
          <div className="text-xs font-mono bg-slate-800 text-emerald-400 px-3 py-1.5 rounded border border-slate-700">System Online</div>
        </div>
      </header>

      {/* FLOATING SYSTEM NOTIFICATIONS */}
      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-sm font-medium ${message.includes('✅') || message.includes('ℹ️') ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-rose-400 border border-rose-500/30'}`}>
          {message}
        </div>
      )}

      {/* PREMIUM IN-APP MODAL */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl border border-slate-100 animate-slideUp">
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>⚠️</span> {confirmModal.title}
            </h3>
            <p className="text-sm text-slate-600 mt-2.5 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2.5 mt-6">
              <button 
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={confirmModal.onConfirm} 
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-all shadow-xs"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="container mx-auto p-4 max-w-6xl mt-4">
        
        {/* TABS SELECTOR */}
        <nav className="flex gap-1.5 mb-6 bg-slate-200/60 p-1.5 rounded-xl max-w-lg">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'stock', label: 'Stock', icon: '📦' },
            { id: 'bins', label: 'Bins', icon: '🗑️' },
            { id: 'orders', label: 'Orders', icon: '📝' },
            { id: 'reporting', label: 'AI Reports', icon: '🤖' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setShowStatusMenu(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-white text-blue-600 shadow-sm font-semibold' : 'text-slate-600 hover:bg-white/50'}`}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>

        {/* DASHBOARD PANEL */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 animate-fadeIn">
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

        {/* STOCK INVENTORY TAB */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Inventory Index</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="SKU ID" className="border border-slate-200 p-2 text-sm rounded-lg bg-white" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Description" className="border border-slate-200 p-2 text-sm rounded-lg bg-white" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                <input type="number" placeholder="Quantity" className="border border-slate-200 p-2 text-sm rounded-lg bg-white" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} />
                
                <div className="relative">
                  <input 
                    type="text" placeholder="Bin Location" className="border border-slate-200 p-2 text-sm rounded-lg bg-white w-full" value={newProduct.bin} 
                    onChange={(e) => { setNewProduct({ ...newProduct, bin: e.target.value.toUpperCase() }); setShowBinSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowBinSuggestions(false), 200)} onFocus={() => setShowBinSuggestions(true)}
                  />
                  {showBinSuggestions && bins.length > 0 && newProduct.bin && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {bins.filter(bin => bin.bin_id && bin.bin_id.toUpperCase().includes(newProduct.bin.toUpperCase())).slice(0, 5).map((bin, idx) => (
                        <div key={idx} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={() => { setNewProduct({ ...newProduct, bin: bin.bin_id }); setShowBinSuggestions(false); }}>
                          <span className="font-mono">{bin.bin_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addProduct} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 px-4 rounded-lg shadow-sm">{saving ? 'Uploading...' : '➕ Add Product'}</button>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-3 text-slate-600">Current Stock</h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {stock.map((item, index) => (
                <div key={index} className="py-3 flex justify-between items-center animate-fadeIn">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{item.description || 'Unnamed'} <span className="text-xs font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1">{item.sku}</span></p>
                    <p className="text-xs text-slate-500 mt-1">Quantity: {item.quantity || 0} | Bin: {item.bin || 'None'}</p>
                  </div>
                  <button onClick={() => requestItemRemoval(item.id, item.sku)} className="text-slate-300 hover:text-rose-600 p-2">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BINS TAB */}
        {activeTab === 'bins' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Bin Locations</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Bin</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Bin ID" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.bin_id} onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Zone Matrix" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.zone} onChange={(e) => setNewBin({ ...newBin, zone: e.target.value })} />
                <button onClick={addBin} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 px-4 rounded-lg shadow-sm">➕ Add Bin</button>
              </div>
            </div>
            <h3 className="font-semibold text-sm mb-3 text-slate-600">Current Bins</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {bins.map((bin, index) => (
                <div key={index} className="border border-slate-100 bg-slate-50/50 p-4 rounded-xl flex justify-between items-start animate-fadeIn">
                  <div>
                    <p className="font-bold font-mono text-slate-800 text-base">{bin.bin_id}</p>
                    <p className="text-xs text-slate-500 mt-1">Zone: {bin.zone || 'General'}</p>
                  </div>
                  <button onClick={() => requestItemRemoval(bin.id, bin.bin_id)} className="text-slate-300 hover:text-rose-600 p-1.5">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 animate-fadeIn">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Order Manifests</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <input type="text" placeholder="Order ID" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.order_id} onChange={(e) => setNewOrder({ ...newOrder, order_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Customer Name" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.customer} onChange={(e) => setNewOrder({ ...newOrder, customer: e.target.value })} />
                <select className="border border-slate-200 p-2 text-sm rounded-lg bg-white" value={newOrder.type} onChange={(e) => setNewOrder({ ...newOrder, type: e.target.value })}>
                  <option value="Inbound">📥 Inbound (Add Stock)</option>
                  <option value="Outbound">📤 Outbound (Remove Stock)</option>
                  <option value="Internal">🔄 Internal Transfer</option>
                </select>
                <input type="text" placeholder="Target SKU" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.sku} onChange={(e) => setNewOrder({ ...newOrder, sku: e.target.value.toUpperCase() })} />
                <input type="number" placeholder="Quantity" className="border border-slate-200 p-2 text-sm rounded-lg" value={newOrder.quantity} onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })} />
                
                <div className="relative">
                  <input 
                    type="text" placeholder="Bin Target Location" className="border border-slate-200 p-2 text-sm rounded-lg bg-white w-full" value={newOrder.bin} 
                    onChange={(e) => { setNewOrder({ ...newOrder, bin: e.target.value.toUpperCase() }); setShowOrderBinSuggestions(true); }}
                    onBlur={() => setTimeout(() => setShowOrderBinSuggestions(false), 200)} onFocus={() => setShowOrderBinSuggestions(true)}
                  />
                  {showOrderBinSuggestions && bins.length > 0 && newOrder.bin && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                      {bins.filter(bin => bin.bin_id && bin.bin_id.toUpperCase().includes(newOrder.bin.toUpperCase())).slice(0, 5).map((bin, idx) => (
                        <div key={idx} className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0" onMouseDown={() => { setNewOrder({ ...newOrder, bin: bin.bin_id }); setShowOrderBinSuggestions(false); }}>
                          <span className="font-mono">{bin.bin_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <button onClick={addOrder} disabled={saving} className="sm:col-span-2 md:col-span-3 bg-blue-600 hover:bg-blue-700 text-white text-sm py-2.5 px-4 rounded-lg">➕ Create Order</button>
              </div>
            </div>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {orders.map((order, index) => (
                <div key={index} className="border border-slate-100 p-4 rounded-xl flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white shadow-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold font-mono text-slate-800">{order.order_id}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${order.type === 'Inbound' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-rose-50 text-rose-700 border border-rose-200'}`}>{order.type || 'Inbound'}</span>
                    </div>
                    <div className="mt-1 flex gap-3 text-xs font-mono text-slate-600">
                      <span>SKU: {order.sku}</span> | <span>QTY: {order.quantity}</span> | <span>BIN: {order.bin}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <button onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${getStatusColor(order.status || 'Open')}`}>{order.status || 'Open'} ▼</button>
                      {showStatusMenu === order.order_id && (
                        <div className="absolute right-0 mt-2 w-40 bg-slate-900 text-slate-200 rounded-xl shadow-xl z-30 p-1 text-xs animate-fadeIn">
                          {['Open', 'In Transit', 'Closed'].map(st => (
                            <button key={st} onClick={() => updateOrderStatus(order.id, order.order_id, st)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 transition-all">{st}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    <button onClick={() => requestItemRemoval(order.id, order.order_id)} className="text-slate-300 hover:text-rose-600 p-2">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI REPORTING STUDIO TAB */}
        {activeTab === 'reporting' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fadeIn">
            
            {/* Options Quick Actions Panel */}
            <div className="md:col-span-1 bg-gradient-to-b from-slate-900 to-slate-800 text-white p-5 rounded-2xl shadow-sm h-fit animate-slideUp">
              <div className="text-xl mb-2">🤖</div>
              <h2 className="text-base font-bold tracking-tight text-white">Gemini Report Engine</h2>
              <p className="text-xs text-slate-400 mt-1 mb-4">Ask Gemini to audit your live single-sheet database records and compile interactive data charts.</p>
              
              <div className="space-y-2 text-xs font-medium text-slate-300">
                <p className="bg-slate-800/80 p-2.5 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-all" onClick={() => setAiPrompt("Provide inventory report breakdown matching quantity per SKU")}>📈 "Provide inventory report breakdown matching quantity per SKU"</p>
                <p className="bg-slate-800/80 p-2.5 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-all" onClick={() => setAiPrompt("Show a breakdown report chart of order types")}>📊 "Show a breakdown report chart of order types"</p>
                <p className="bg-slate-800/80 p-2.5 rounded border border-slate-700 cursor-pointer hover:bg-slate-700 transition-all" onClick={() => setAiPrompt("Audit our storage bin allocations distribution")}>🗑️ "Audit our storage bin allocations distribution"</p>
              </div>
            </div>

            {/* Main Interactive Chat Area */}
            <div className="md:col-span-2 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-[520px]">
              <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 font-semibold text-sm text-slate-700">Analytics Data Stream Interface</div>
              
              <div className="flex-1 p-4 overflow-y-auto space-y-4 bg-slate-50/40">
                {chatLog.map((chat, idx) => (
                  <div key={idx} className={`flex flex-col ${chat.role === 'user' ? 'items-end animate-slideUp' : 'items-start animate-fadeIn'}`}>
                    <div className={`max-w-[85%] rounded-2xl p-4 text-sm shadow-xs ${chat.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white border border-slate-200/60 text-slate-800 rounded-tl-none'}`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{chat.text}</p>
                      
                      {chat.hasChart && chat.chartData && chat.chartData.length > 0 && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 w-full text-slate-900 shadow-xs">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">AI Computed Data Visualization</h4>
                          <div className="space-y-2.5">
                            {chat.chartData.map((bar, bIdx) => {
                              const percentage = Math.min(100, Math.max(8, ((Number(bar.value) || 0) / getMaxChartValue(chat.chartData)) * 100));
                              return (
                                <div key={bIdx} className="space-y-1">
                                  <div className="flex justify-between text-xs font-medium text-slate-700">
                                    <span className="font-mono truncate max-w-[70%]">{bar.label}</span>
                                    <span className="font-bold">{bar.value}</span>
                                  </div>
                                  <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${percentage}%` }}></div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {aiLoading && (
                  <div className="flex items-center gap-2 text-xs text-slate-400 bg-white border border-slate-100 rounded-xl px-3 py-2 w-fit shadow-xs animate-pulse">
                    <span className="text-blue-500">⚡</span> Gemini is analyzing sheet context matrices...
                  </div>
                )}
              </div>

              <form onSubmit={submitAiQuery} className="border-t border-slate-100 p-3 bg-white flex gap-2">
                <input
                  type="text"
                  placeholder='Ask Gemini analyst... (e.g., "Analyze the sheet and show a chart")'
                  className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-blue-500 bg-slate-50/50"
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  disabled={aiLoading}
                />
                <button type="submit" disabled={aiLoading || !aiPrompt.trim()} className="bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 text-white disabled:text-slate-400 text-sm font-medium px-5 py-2.5 rounded-xl transition-all shadow-xs">
                  Query
                </button>
              </form>
            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
