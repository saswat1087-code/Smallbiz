import React, { useState, useEffect } from 'react';

// REPLACE THIS with your Sheet.best API URL
const API_URL = 'https://api.sheetbest.com/sheets/a674d991-727a-44fb-865b-774f4efb8a32';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  
  // Form states
  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  // Load data when app starts
  useEffect(() => {
    loadData();
  }, []);

  // Clear message after 3 seconds
  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Fetch from each sheet using sheet name as query parameter
      const [stockRes, binsRes, ordersRes] = await Promise.all([
        fetch(`${API_URL}/Stock`),
        fetch(`${API_URL}/Bins`),
        fetch(`${API_URL}/Orders`)
      ]);
      
      const stockData = await stockRes.json();
      const binsData = await binsRes.json();
      const ordersData = await ordersRes.json();
      
      setStock(stockData || []);
      setBins(binsData || []);
      setOrders(ordersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage('❌ Failed to load data. Check your API URL');
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
      await fetch(`${API_URL}/Stock`, {
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
      console.error('Error adding product:', error);
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
      await fetch(`${API_URL}/Bins`, {
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
      console.error('Error adding bin:', error);
      setMessage('❌ Failed to add bin');
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
      await fetch(`${API_URL}/Orders`, {
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
      console.error('Error adding order:', error);
      setMessage('❌ Failed to create order');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (sku) => {
    if (!window.confirm(`Delete product ${sku}?`)) return;
    
    setSaving(true);
    try {
      await fetch(`${API_URL}/Stock/sku/${sku}`, {
        method: 'DELETE'
      });
      
      setMessage('✅ Product deleted successfully!');
      await loadData();
    } catch (error) {
      console.error('Error deleting product:', error);
      setMessage('❌ Failed to delete product');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl mb-2">📊</div>
          <div className="text-xl">Loading WMS from Google Sheets...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 shadow-lg">
        <h1 className="text-2xl font-bold text-center">SmallBiz WMS</h1>
        <p className="text-center text-sm mt-1">Powered by Google Sheets 📊</p>
      </div>
      
      {/* Message Alert */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 p-3 rounded-lg shadow-lg ${
          message.includes('✅') ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {message}
        </div>
      )}
      
      <div className="container mx-auto p-4 max-w-6xl">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button 
            onClick={() => setActiveTab('dashboard')} 
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'dashboard' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📊 Dashboard
          </button>
          <button 
            onClick={() => setActiveTab('stock')} 
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'stock' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📦 Stock
          </button>
          <button 
            onClick={() => setActiveTab('bins')} 
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'bins' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            🗑️ Bins
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`px-6 py-3 rounded-lg font-semibold transition-all ${
              activeTab === 'orders' 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            📝 Orders
          </button>
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div>
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow p-6 text-white">
                <div className="text-4xl mb-2">📦</div>
                <h3 className="text-sm opacity-90">Total Stock Units</h3>
                <p className="text-3xl font-bold">{stock.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}</p>
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
            </div>
            
            <div className="mt-8 bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-bold mb-4">Recent Stock Items</h3>
              {stock.slice(0, 5).map((item, index) => (
                <div key={index} className="border-b py-2">
                  <p className="font-semibold">{item.description}</p>
                  <p className="text-sm text-gray-600">SKU: {item.sku} | Qty: {item.quantity} | Bin: {item.bin}</p>
                </div>
              ))}
              {stock.length === 0 && <p className="text-gray-500">No items yet. Add your first product!</p>}
            </div>
          </div>
        )}

        {/* Stock Tab */}
        {activeTab === 'stock' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">📦 Stock Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Add New Item</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="SKU (e.g., MAT003)" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newProduct.sku} 
                  onChange={(e) => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Description" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newProduct.description} 
                  onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} 
                />
                <input 
                  type="number" 
                  placeholder="Quantity" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newProduct.quantity} 
                  onChange={(e) => setNewProduct({...newProduct, quantity: e.target.value})} 
                />
                <input 
                  type="text" 
                  placeholder="Bin Location" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newProduct.bin} 
                  onChange={(e) => setNewProduct({...newProduct, bin: e.target.value.toUpperCase()})} 
                />
                <button 
                  onClick={addProduct} 
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors md:col-span-2 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : '➕ Add Product'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3 text-lg">Current Stock</h3>
            {stock.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No items yet. Add your first item above!</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {stock.map((item, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-semibold text-lg">{item.description}</p>
                        <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                        <div className="flex gap-4 mt-2">
                          <p className="text-sm">📦 Quantity: <span className="font-semibold">{item.quantity}</span></p>
                          <p className="text-sm">📍 Bin: {item.bin}</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => deleteProduct(item.sku)}
                        disabled={saving}
                        className="text-red-500 hover:text-red-700 text-sm px-3 py-1 rounded hover:bg-red-50"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Bins Tab */}
        {activeTab === 'bins' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">🗑️ Bin Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Add New Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Bin ID (e.g., C-03-01)" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newBin.bin_id} 
                  onChange={(e) => setNewBin({...newBin, bin_id: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Zone (e.g., Bulk, Inbound, Dispatch)" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newBin.zone} 
                  onChange={(e) => setNewBin({...newBin, zone: e.target.value})} 
                />
                <button 
                  onClick={addBin} 
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors md:col-span-2 disabled:opacity-50"
                >
                  {saving ? 'Adding...' : '➕ Add Bin'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3 text-lg">Current Bins</h3>
            {bins.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No bins yet. Add your first bin above!</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {bins.map((bin, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <p className="font-semibold text-lg">{bin.bin_id}</p>
                    <p className="text-sm text-gray-600 mt-1">📍 Zone: {bin.zone}</p>
                    <p className="text-sm text-gray-600">📊 Status: <span className={`inline-block px-2 py-0.5 rounded text-xs ${bin.status === 'Available' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{bin.status}</span></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Orders Tab */}
        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">📝 Order Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input 
                  type="text" 
                  placeholder="Order ID (e.g., DO1002)" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newOrder.order_id} 
                  onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value.toUpperCase()})} 
                />
                <input 
                  type="text" 
                  placeholder="Customer Name" 
                  className="border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" 
                  value={newOrder.customer} 
                  onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})} 
                />
                <button 
                  onClick={addOrder} 
                  disabled={saving}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors md:col-span-2 disabled:opacity-50"
                >
                  {saving ? 'Creating...' : '➕ Create Order'}
                </button>
              </div>
            </div>

            <h3 className="font-semibold mb-3 text-lg">Current Orders</h3>
            {orders.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No orders yet. Create your first order above!</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {orders.map((order, index) => (
                  <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{order.order_id}</p>
                        <p className="text-sm text-gray-600">👤 Customer: {order.customer}</p>
                        <p className="text-sm text-gray-600">📊 Status: <span className="inline-block px-2 py-0.5 rounded text-xs bg-green-100 text-green-800">{order.status}</span></p>
                      </div>
                      <div className="text-2xl">📋</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
