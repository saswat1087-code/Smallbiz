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

  const addProduct = async () => {
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
      setMessage(`❌ Bin "${newProduct.bin.toUpperCase()}" does not exist. Please add it to Bins tab first.`);
      return;
    }
    
    setSaving(true);
    try {
      const payload = {
        action: 'ADD_PRODUCT',
        sku: newProduct.sku.trim().toUpperCase(),
        description: newProduct.description.trim(),
        quantity: parseInt(newProduct.quantity, 10) || 0,
        bin: newProduct.bin.trim().toUpperCase()
      };

      const res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error();
      
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);
      
      const fileInput = document.getElementById('product-file-attachment');
      if (fileInput) fileInput.value = '';

      setMessage('✅ Product added successfully!');
      await loadData();
    } catch (err) {
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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

  const deleteItem = async (rowId, label) => {
    if (!rowId) return;
    if (!window.confirm(`Delete ${label}?`)) return;
    setSaving(true);
    try {
      const res = await fetch(API_URL, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      case 'Open': return 'bg-yellow-100 text-yellow-800';
      case 'In Transit': return 'bg-blue-100 text-blue-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-xl">Loading WMS...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">SmallBiz WMS</h1>
        <p className="text-center text-sm mt-1">Powered by Google Sheets</p>
      </header>

      {message && (
        <div className={`fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg ${
          message.includes('✅') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message}
        </div>
      )}

      <div className="container mx-auto p-4 max-w-6xl">
        {/* Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-2 rounded-lg font-semibold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📊 Dashboard
          </button>
          <button onClick={() => setActiveTab('stock')} className={`px-6 py-2 rounded-lg font-semibold ${activeTab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📦 Stock
          </button>
          <button onClick={() => setActiveTab('bins')} className={`px-6 py-2 rounded-lg font-semibold ${activeTab === 'bins' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            🗑️ Bins
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-2 rounded-lg font-semibold ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📝 Orders
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                <div className="text-3xl mb-2">📦</div>
                <h3 className="text-sm opacity-90">Total Stock</h3>
                <p className="text-3xl font-bold">{stock.reduce((sum, item) => sum + (parseInt(item?.quantity) || 0), 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg p-6 text-white">
                <div className="text-3xl mb-2">🏷️</div>
                <h3 className="text-sm opacity-90">Products</h3>
                <p className="text-3xl font-bold">{stock.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg p-6 text-white">
                <div className="text-3xl mb-2">🗑️</div>
                <h3 className="text-sm opacity-90">Bins</h3>
                <p className="text-3xl font-bold">{bins.length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg p-6 text-white">
                <div className="text-3xl mb-2">📋</div>
                <h3 className="text-sm opacity-90">Orders</h3>
                <p className="text-3xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Stock Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="SKU" 
                  className="border p-2 rounded" 
                  value={newProduct.sku} 
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Description" 
                  className="border p-2 rounded" 
                  value={newProduct.description} 
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} 
                />
                <input 
                  type="number" 
                  placeholder="Quantity" 
                  className="border p-2 rounded" 
                  value={newProduct.quantity} 
                  onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} 
                />
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Bin Location" 
                    className="border p-2 rounded w-full" 
                    value={newProduct.bin} 
                    onChange={(e) => {
                      setNewProduct({...newProduct, bin: e.target.value.toUpperCase()});
                      setShowBinSuggestions(true);
                    }}
                    onBlur={() => setTimeout(() => setShowBinSuggestions(false), 200)}
                    onFocus={() => setShowBinSuggestions(true)}
                  />
                  {showBinSuggestions && bins.length > 0 && newProduct.bin && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-32 overflow-y-auto">
                      {bins
                        .filter(bin => bin.bin_id && bin.bin_id.toUpperCase().includes(newProduct.bin.toUpperCase()))
                        .slice(0, 5)
                        .map((bin, idx) => (
                          <div 
                            key={idx}
                            className="px-3 py-2 text-sm hover:bg-blue-50 cursor-pointer border-b"
                            onMouseDown={() => {
                              setNewProduct({...newProduct, bin: bin.bin_id});
                              setShowBinSuggestions(false);
                            }}
                          >
                            {bin.bin_id} ({bin.zone || 'General'})
                          </div>
                        ))}
                    </div>
                  )}
                </div>
                <button 
                  onClick={addProduct} 
                  disabled={saving}
                  className="md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {saving ? 'Adding...' : '➕ Add Product'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Current Stock</h3>
            {stock.map((item, idx) => (
              <div key={idx} className="border-b py-3 flex justify-between items-center">
                <div>
                  <p className="font-semibold">{item.description} ({item.sku})</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity} | Bin: {item.bin}</p>
                </div>
                <button onClick={() => deleteItem(item.id, item.sku)} className="text-red-500">🗑️</button>
              </div>
            ))}
            {stock.length === 0 && <p className="text-gray-500 text-center py-8">No products yet</p>}
          </div>
        )}

        {/* Bins Tab */}
        {activeTab === 'bins' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Bin Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Add New Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Bin ID" 
                  className="border p-2 rounded" 
                  value={newBin.bin_id} 
                  onChange={(e) => setNewBin({...newBin, bin_id: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Zone" 
                  className="border p-2 rounded" 
                  value={newBin.zone} 
                  onChange={(e) => setNewBin({...newBin, zone: e.target.value})} 
                />
                <button 
                  onClick={addBin} 
                  disabled={saving}
                  className="md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {saving ? 'Adding...' : '➕ Add Bin'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3">Current Bins</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {bins.map((bin, idx) => (
                <div key={idx} className="border rounded-lg p-3 flex justify-between items-center">
                  <div>
                    <p className="font-semibold">{bin.bin_id}</p>
                    <p className="text-sm text-gray-600">Zone: {bin.zone || 'General'}</p>
                  </div>
                  <button onClick={() => deleteItem(bin.id, bin.bin_id)} className="text-red-500">🗑️</button>
                </div>
              ))}
            </div>
            {bins.length === 0 && <p className="text-gray-500 text-center py-8">No bins yet</p>}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Order Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Order ID" 
                  className="border p-2 rounded" 
                  value={newOrder.order_id} 
                  onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Customer" 
                  className="border p-2 rounded" 
                  value={newOrder.customer} 
                  onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})} 
                />
                <button 
                  onClick={addOrder} 
                  disabled={saving}
                  className="md:col-span-2 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
                >
                  {saving ? 'Creating...' : '➕ Create Order'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3">All Orders</h3>
            {orders.map((order, idx) => (
              <div key={idx} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{order.order_id}</p>
                    <p className="text-sm text-gray-600">Customer: {order.customer}</p>
                    {order.created_at && (
                      <p className="text-xs text-gray-400">Created: {new Date(order.created_at).toLocaleDateString()}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <div className="relative">
                      <button
                        onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)}
                        className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}
                      >
                        {order.status || 'Open'} ▼
                      </button>
                      {showStatusMenu === order.order_id && (
                        <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border z-10">
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'Open')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Open</button>
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'In Transit')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">In Transit</button>
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'Closed')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">Closed</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteItem(order.id, order.order_id)} className="text-red-500">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
