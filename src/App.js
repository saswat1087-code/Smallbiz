import React, { useState, useEffect } from 'react';

// Your Sheet.best API URL
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

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const allData = await response.json();
      
      const stockData = allData.filter(row => row.sku && row.sku !== '' && !row.order_id);
      const binsData = allData.filter(row => row.bin_id && row.bin_id !== '');
      const ordersData = allData.filter(row => row.order_id && row.order_id !== '');
      
      setStock(stockData);
      setBins(binsData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('❌ Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const addProduct = async () => {
    if (!newProduct.sku || !newProduct.description) {
      setMessage('❌ Please fill in SKU and Description');
      return;
    }
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku: newProduct.sku,
          description: newProduct.description,
          quantity: parseInt(newProduct.quantity) || 0,
          bin: newProduct.bin || 'Unassigned'
        })
      });
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setMessage('✅ Product added successfully!');
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to add product');
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
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bin_id: newBin.bin_id,
          zone: newBin.zone || 'General',
          status: 'Available'
        })
      });
      setNewBin({ bin_id: '', zone: '' });
      setMessage('✅ Bin added successfully!');
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to add bin');
    } finally {
      setSaving(false);
    }
  };

  const addOrder = async () => {
    if (!newOrder.order_id || !newOrder.customer) {
      setMessage('❌ Please fill in Order ID and Customer');
      return;
    }
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_id: newOrder.order_id,
          customer: newOrder.customer,
          status: 'Open',
          created_at: new Date().toISOString()
        })
      });
      setNewOrder({ order_id: '', customer: '' });
      setMessage('✅ Order created successfully!');
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    setSaving(true);
    try {
      const orderToUpdate = orders.find(order => order.order_id === orderId);
      if (!orderToUpdate || !orderToUpdate.id) {
        setMessage('❌ Cannot update order');
        setSaving(false);
        return;
      }
      await fetch(`${API_URL}/${orderToUpdate.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      setMessage(`✅ Order ${orderId} status updated to ${newStatus}`);
      await loadData();
      setShowStatusMenu(null);
    } catch (error) {
      setMessage('❌ Failed to update order');
    } finally {
      setSaving(false);
    }
  };

  const deleteOrder = async (orderId, rowId) => {
    if (!rowId) {
      setMessage('❌ Please delete from Google Sheet manually');
      return;
    }
    if (!window.confirm(`Delete order ${orderId}?`)) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/${rowId}`, { method: 'DELETE' });
      setMessage(`✅ Order ${orderId} deleted successfully!`);
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to delete order');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (productId, sku) => {
    if (!window.confirm(`Delete product ${sku}?`)) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/${productId}`, { method: 'DELETE' });
      setMessage(`✅ Product deleted successfully!`);
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  const deleteBin = async (binId, bin_id) => {
    if (!window.confirm(`Delete bin ${bin_id}?`)) return;
    setSaving(true);
    try {
      await fetch(`${API_URL}/${binId}`, { method: 'DELETE' });
      setMessage(`✅ Bin deleted successfully!`);
      await loadData();
    } catch (error) {
      setMessage('❌ Failed to delete bin');
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
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">SmallBiz WMS</h1>
        <p className="text-center text-sm mt-1">Powered by Google Sheets 📊</p>
      </div>
      
      {message && (
        <div className={`fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg ${
          message.includes('✅') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message}
        </div>
      )}
      
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button onClick={() => setActiveTab('dashboard')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📊 Dashboard
          </button>
          <button onClick={() => setActiveTab('stock')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📦 Stock
          </button>
          <button onClick={() => setActiveTab('bins')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'bins' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            🗑️ Bins
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-6 py-3 rounded-lg font-semibold ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            📝 Orders
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                <div className="text-4xl mb-2">📦</div>
                <h3 className="text-sm opacity-90">Total Stock Units</h3>
                <p className="text-3xl font-bold">{stock.reduce((sum, item) => sum + (parseInt(item?.quantity) || 0), 0)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow p-6 text-white">
                <div className="text-4xl mb-2">🏷️</div>
                <h3 className="text-sm opacity-90">Total Products</h3>
                <p className="text-3xl font-bold">{stock.length}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow p-6 text-white">
                <div className="text-4xl mb-2">🗑️</div>
                <h3 className="text-sm opacity-90">Total Bins</h3>
                <p className="text-3xl font-bold">{bins.length}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                <div className="text-4xl mb-2">📋</div>
                <h3 className="text-sm opacity-90">Total Orders</h3>
                <p className="text-3xl font-bold">{orders.length}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">📦 Stock Management</h2>
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Add New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="SKU" className="border p-2 rounded-lg" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Description" className="border p-2 rounded-lg" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
                <input type="number" placeholder="Quantity" className="border p-2 rounded-lg" value={newProduct.quantity} onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} />
                <input type="text" placeholder="Bin Location" className="border p-2 rounded-lg" value={newProduct.bin} onChange={(e) => setNewProduct({...newProduct, bin: e.target.value.toUpperCase()})} />
                <button onClick={addProduct} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg md:col-span-2">{saving ? 'Adding...' : '➕ Add Product'}</button>
              </div>
            </div>
            <h3 className="font-semibold mb-3 text-lg">Current Stock</h3>
            {stock.map((item, index) => (
              <div key={index} className="border rounded-lg p-3 mb-2 flex justify-between items-center">
                <div><p className="font-semibold">{item.description} ({item.sku})</p><p className="text-sm text-gray-600">Quantity: {item.quantity} | Bin: {item.bin}</p></div>
                <button onClick={() => deleteProduct(item.id, item.sku)} className="text-red-500 hover:text-red-700">🗑️</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bins' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">🗑️ Bin Management</h2>
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Add New Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Bin ID" className="border p-2 rounded-lg" value={newBin.bin_id} onChange={(e) => setNewBin({...newBin, bin_id: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Zone" className="border p-2 rounded-lg" value={newBin.zone} onChange={(e) => setNewBin({...newBin, zone: e.target.value})} />
                <button onClick={addBin} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg md:col-span-2">{saving ? 'Adding...' : '➕ Add Bin'}</button>
              </div>
            </div>
            <h3 className="font-semibold mb-3 text-lg">Current Bins</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bins.map((bin, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div><p className="font-semibold text-lg">{bin.bin_id}</p><p className="text-sm text-gray-600">Zone: {bin.zone}</p><p className="text-sm text-gray-600">Status: {bin.status}</p></div>
                    <button onClick={() => deleteBin(bin.id, bin.bin_id)} className="text-red-500 hover:text-red-700">🗑️</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">📝 Order Management</h2>
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Order ID" className="border p-2 rounded-lg" value={newOrder.order_id} onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Customer Name" className="border p-2 rounded-lg" value={newOrder.customer} onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})} />
                <button onClick={addOrder} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg md:col-span-2">{saving ? 'Creating...' : '➕ Create Order'}</button>
              </div>
            </div>
            <h3 className="font-semibold mb-3 text-lg">All Orders</h3>
            {orders.map((order, index) => (
              <div key={index} className="border rounded-lg p-4 mb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-lg">{order.order_id}</p>
                    <p className="text-sm text-gray-600">Customer: {order.customer}</p>
                    {order.created_at && <p className="text-xs text-gray-400">Created: {new Date(order.created_at).toLocaleDateString()}</p>}
                    {!order.id && <p className="text-xs text-red-500 mt-1">⚠️ Delete & recreate to enable updates</p>}
                  </div>
                  <div className="flex gap-2">
                    {order.id && (
                      <div className="relative">
                        <button onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)} className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(order.status)}`}>
                          {order.status || 'Open'} ▼
                        </button>
                        {showStatusMenu === order.order_id && (
                          <div className="absolute right-0 mt-2 w-36 bg-white rounded-lg shadow-lg border z-10">
                            <div className="py-1">
                              <button onClick={() => updateOrderStatus(order.order_id, 'Open')} className="block w-full text-left px-4 py-2 text-sm text-yellow-700 hover:bg-yellow-50">📋 Open</button>
                              <button onClick={() => updateOrderStatus(order.order_id, 'In Transit')} className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50">🚚 In Transit</button>
                              <button onClick={() => updateOrderStatus(order.order_id, 'Closed')} className="block w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50">✅ Closed</button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    <button onClick={() => deleteOrder(order.order_id, order.id)} className="text-red-500 hover:text-red-700">🗑️</button>
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
