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
  const [debugInfo, setDebugInfo] = useState('');

  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data from:', API_URL);
      
      const response = await fetch(API_URL);
      console.log('Response status:', response.status);
      
      const allData = await response.json();
      console.log('Data received:', allData);
      
      const dataArray = Array.isArray(allData) ? allData : [];
      
      const stockData = dataArray.filter(row => row && row.sku && !row.order_id);
      const binsData = dataArray.filter(row => row && row.bin_id);
      const ordersData = dataArray.filter(row => row && row.order_id);
      
      setStock(stockData);
      setBins(binsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Load error:', error);
      setMessage('❌ Failed to load data: ' + error.message);
      setDebugInfo('Error: ' + JSON.stringify(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const addProduct = async () => {
    if (!newProduct.sku || !newProduct.description || !newProduct.bin) {
      setMessage('❌ Please fill SKU, Description, and Bin');
      return;
    }
    
    setSaving(true);
    const payload = {
      action: 'ADD_PRODUCT',
      sku: newProduct.sku.toUpperCase(),
      description: newProduct.description,
      quantity: parseInt(newProduct.quantity) || 0,
      bin: newProduct.bin.toUpperCase()
    };
    
    console.log('Sending payload:', payload);
    
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      console.log('Response status:', response.status);
      const result = await response.json();
      console.log('Response data:', result);
      
      if (response.ok && result.success !== false) {
        setMessage('✅ Product added successfully!');
        setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
        await loadData();
      } else {
        setMessage('❌ ' + (result.error || 'Failed to add product'));
        setDebugInfo(JSON.stringify(result));
      }
    } catch (error) {
      console.error('Add product error:', error);
      setMessage('❌ Error: ' + error.message);
      setDebugInfo(error.message);
    } finally {
      setSaving(false);
    }
  };

  const addBin = async () => {
    if (!newBin.bin_id) {
      setMessage('❌ Please enter Bin ID');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_BIN',
          bin_id: newBin.bin_id.toUpperCase(),
          zone: newBin.zone || 'General',
          status: 'Available'
        })
      });
      
      if (response.ok) {
        setMessage('✅ Bin added successfully!');
        setNewBin({ bin_id: '', zone: '' });
        await loadData();
      } else {
        const error = await response.text();
        setMessage('❌ Failed to add bin: ' + error);
      }
    } catch (error) {
      setMessage('❌ Error adding bin');
    } finally {
      setSaving(false);
    }
  };

  const addOrder = async () => {
    if (!newOrder.order_id || !newOrder.customer) {
      setMessage('❌ Please enter Order ID and Customer');
      return;
    }
    
    setSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_ORDER',
          order_id: newOrder.order_id.toUpperCase(),
          customer: newOrder.customer,
          status: 'Open',
          created_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setMessage('✅ Order created successfully!');
        setNewOrder({ order_id: '', customer: '' });
        await loadData();
      } else {
        setMessage('❌ Failed to create order');
      }
    } catch (error) {
      setMessage('❌ Error creating order');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id, type) => {
    if (!window.confirm(`Delete this ${type}?`)) return;
    
    setSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_ROW',
          rowNumber: parseInt(id, 10)
        })
      });
      
      if (response.ok) {
        setMessage(`✅ ${type} deleted successfully!`);
        await loadData();
      } else {
        setMessage('❌ Failed to delete');
      }
    } catch (error) {
      setMessage('❌ Error deleting');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (id, orderId, newStatus) => {
    setSaving(true);
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          rowNumber: parseInt(id, 10),
          status: newStatus
        })
      });
      
      if (response.ok) {
        setMessage(`✅ Order ${orderId} status: ${newStatus}`);
        await loadData();
        setShowStatusMenu(null);
      } else {
        setMessage('❌ Failed to update status');
      }
    } catch (error) {
      setMessage('❌ Error updating status');
    } finally {
      setSaving(false);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
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
        <div className={`fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg max-w-md ${
          message.includes('✅') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message}
        </div>
      )}

      {/* Debug info - remove after fixing */}
      {debugInfo && (
        <div className="fixed bottom-4 left-4 z-50 p-2 bg-gray-800 text-white text-xs rounded max-w-md">
          Debug: {debugInfo}
          <button className="ml-2 text-gray-400" onClick={() => setDebugInfo('')}>×</button>
        </div>
      )}

      <div className="container mx-auto p-4 max-w-6xl">
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

        {activeTab === 'stock' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Stock Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Add New Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="SKU (e.g., MAT001)" 
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
                <input 
                  type="text" 
                  placeholder="Bin Location" 
                  className="border p-2 rounded" 
                  value={newProduct.bin} 
                  onChange={(e) => setNewProduct({...newProduct, bin: e.target.value.toUpperCase()})} 
                />
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
                  <p className="text-sm text-gray-600">Quantity: {item.quantity} | Bin: {item.bin}</p>
                </div>
                <button onClick={() => deleteItem(item.id, 'product')} className="text-red-500">🗑️</button>
              </div>
            ))}
            {stock.length === 0 && <p className="text-gray-500 text-center py-8">No products yet. Add your first product!</p>}
          </div>
        )}

        {activeTab === 'bins' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Bin Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3">Add New Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Bin ID (e.g., A-01)" 
                  className="border p-2 rounded" 
                  value={newBin.bin_id} 
                  onChange={(e) => setNewBin({...newBin, bin_id: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Zone (e.g., Inbound, Bulk)" 
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
                    <p className="text-sm text-gray-600">Zone: {bin.zone}</p>
                    <p className="text-xs text-gray-400">Status: {bin.status}</p>
                  </div>
                  <button onClick={() => deleteItem(bin.id, 'bin')} className="text-red-500">🗑️</button>
                </div>
              ))}
            </div>
            {bins.length === 0 && <p className="text-gray-500 text-center py-8">No bins yet. Add your first bin!</p>}
          </div>
        )}

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
                  placeholder="Customer Name" 
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
                    <p className="text-xs text-gray-400">Status: {order.status || 'Open'}</p>
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
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'Open')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">📋 Open</button>
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'In Transit')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">🚚 In Transit</button>
                          <button onClick={() => updateOrderStatus(order.id, order.order_id, 'Closed')} className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100">✅ Closed</button>
                        </div>
                      )}
                    </div>
                    <button onClick={() => deleteItem(order.id, 'order')} className="text-red-500">🗑️</button>
                  </div>
                </div>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500 text-center py-8">No orders yet. Create your first order!</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
