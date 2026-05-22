import React, { useState, useEffect } from 'react';

const API_URL = 'https://api.sheetbest.com/sheets/a674d991-727a-44fb-865b-774f4efb8a32';

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
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  // 1. Core data loading function
  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network failure');
      const allData = await response.json();

      // Explicitly map Sheet.best's '__row_number__' to a clean 'id' property
      const stockData = allData
        .filter(row => row.sku && row.sku.trim() !== '' && !row.order_id)
        .map(row => ({ ...row, id: row.__row_number__ }));
        
      const binsData = allData
        .filter(row => row.bin_id && row.bin_id.trim() !== '')
        .map(row => ({ ...row, id: row.__row_number__ }));
        
      const ordersData = allData
        .filter(row => row.order_id && row.order_id.trim() !== '')
        .map(row => ({ ...row, id: row.__row_number__ }));

      setStock(stockData);
      setBins(binsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage('❌ Failed to synchronize data');
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch data once on mount safely
  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Clear system messages automatically 
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const addProduct = async () => {
    if (!newProduct.sku.trim() || !newProduct.description.trim()) {
      setMessage('❌ Please specify SKU and Description');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newProduct.sku.trim().toUpperCase(),
          description: newProduct.description.trim(),
          quantity: parseInt(newProduct.quantity, 10) || 0,
          bin: newProduct.bin.trim().toUpperCase() || 'UNASSIGNED'
        })
      });
      if (!res.ok) throw new Error();
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setMessage('✅ Product added successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to add product');
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const targetIndex = parseInt(rowId, 10) - 2; 
      const res = await fetch(`${API_URL}/${targetIndex}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
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
      const targetIndex = parseInt(rowId, 10) - 2;
      const res = await fetch(`${API_URL}/${targetIndex}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      setMessage(`✅ Record removed successfully.`);
      await loadData();
    } catch {
      setMessage('❌ Delete request failed on host endpoint');
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
          <div className="text-lg font-medium text-slate-600">Loading WMS Data...</div>
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
              <p className="text-xs text-slate-400">Powered by Google Sheets</p>
            </div>
          </div>
          <div className="text-xs font-mono bg-slate-800 text-emerald-400 px-3 py-1.5 rounded border border-slate-700">
            System Online
          </div>
        </div>
      </header>

      {message && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl text-sm font-medium ${
          message.includes('✅') ? 'bg-slate-900 text-emerald-400 border border-emerald-500/30' : 'bg-slate-900 text-rose-400 border border-rose-500/30'
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

        {activeTab === 'stock' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Inventory Index</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Product</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="SKU ID" className="border border-slate-200 p-2 text-sm rounded-lg" value={newProduct.sku} onChange={(e) => setNewProduct({ ...newProduct, sku: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Description Field" className="border border-slate-200 p-2 text-sm rounded-lg" value={newProduct.description} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })} />
                <input type="number" placeholder="Quantity Count" className="border border-slate-200 p-2 text-sm rounded-lg" value={newProduct.quantity} onChange={(e) => setNewProduct({ ...newProduct, quantity: e.target.value })} />
                <input type="text" placeholder="Bin Assignment Layout" className="border border-slate-200 p-2 text-sm rounded-lg" value={newProduct.bin} onChange={(e) => setNewProduct({ ...newProduct, bin: e.target.value.toUpperCase() })} />
                <button onClick={addProduct} disabled={saving} className="sm:col-span-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium text-sm py-2.5 px-4 rounded-lg shadow-sm transition-all">{saving ? 'Processing...' : '➕ Add Product'}</button>
              </div>
            </div>
            
            <h3 className="font-semibold text-sm mb-3 text-slate-600">Current Stock</h3>
            <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto pr-1">
              {stock.map((item, index) => (
                <div key={index} className="py-3 flex justify-between items-center group">
                  <div>
                    <p className="font-semibold text-sm text-slate-800">{item.description || 'Unnamed'} <span className="text-xs font-mono font-normal text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded ml-1">{item.sku}</span></p>
                    <p className="text-xs text-slate-500 mt-1">Quantity: <span className="text-slate-800 font-medium">{item.quantity || 0}</span> | Bin: <span className="text-slate-800 font-medium">{item.bin || 'None'}</span></p>
                  </div>
                  <button onClick={() => executeItemRemoval(item.id, item.sku)} className="text-slate-300 hover:text-rose-600 p-2 transition-all">🗑️</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'bins' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6">
            <h2 className="text-lg font-bold mb-4 text-slate-800">Bin Locations</h2>
            <div className="mb-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <h3 className="font-semibold text-sm mb-3 text-slate-700">Add New Bin</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input type="text" placeholder="Bin ID String" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.bin_id} onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value.toUpperCase() })} />
                <input type="text" placeholder="Zone Mapping" className="border border-slate-200 p-2 text-sm rounded-lg" value={newBin.zone} onChange={(e) => setNewBin({ ...newBin, zone: e.target.value })} />
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
            </div>
          </div>
        )}

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
              {orders.length === 0 && <p className="text-slate-400 text-sm text-center py-8">No order manifests created yet.</p>}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
