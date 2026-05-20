import React, { useState, useEffect } from 'react';

// Your SINGLE Sheet.best API URL - this works for all tabs!
const API_URL = 'https://api.sheetbest.com/sheets/a674d991-727a-44fb-865b-774f4efb8a32';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

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
      
      // Fetch ALL data from the single sheet
      const response = await fetch(`${API_URL}?limit=1000`);
      const allData = await response.json();
      
      console.log('All data from sheet:', allData); // See what's coming back
      
      // Filter data based on a 'type' column you'll add to your sheet
      const stockData = allData.filter(row => row.type === 'stock');
      const binsData = allData.filter(row => row.type === 'bin');
      const ordersData = allData.filter(row => row.type === 'order');
      
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'stock', // Add type to identify this row
          sku: newProduct.sku,
          description: newProduct.description,
          quantity: parseInt(newProduct.quantity) || 0,
          bin: newProduct.bin || 'Unassigned'
        })
      });
      
      if (response.ok) {
        setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
        setMessage('✅ Product added successfully!');
        await loadData();
      } else {
        setMessage('❌ Failed to add product');
      }
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'bin', // Add type to identify this row
          bin_id: newBin.bin_id,
          zone: newBin.zone || 'General',
          status: 'Available'
        })
      });
      
      if (response.ok) {
        setNewBin({ bin_id: '', zone: '' });
        setMessage('✅ Bin added successfully!');
        await loadData();
      } else {
        setMessage('❌ Failed to add bin');
      }
    } catch (error) {
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
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'order', // Add type to identify this row
          order_id: newOrder.order_id,
          customer: newOrder.customer,
          status: 'Open',
          created_at: new Date().toISOString()
        })
      });
      
      if (response.ok) {
        setNewOrder({ order_id: '', customer: '' });
        setMessage('✅ Order created successfully!');
        await loadData();
      } else {
        setMessage('❌ Failed to create order');
      }
    } catch (error) {
      setMessage('❌ Failed to create order');
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
          <div>
            <h2 className="text-2xl font-bold mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <div key={index} className="border rounded-lg p-3 mb-2">
                <p className="font-semibold">{item.description} ({item.sku})</p>
                <p>Quantity: {item.quantity} | Bin: {item.bin}</p>
              </div>
            ))}
            {stock.length === 0 && <p className="text-gray-500">No items yet</p>}
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
            {bins.map((bin, index) => (
              <div key={index} className="border rounded-lg p-3 mb-2">
                <p className="font-semibold">{bin.bin_id}</p>
                <p>Zone: {bin.zone} | Status: {bin.status}</p>
              </div>
            ))}
            {bins.length === 0 && <p className="text-gray-500">No bins yet</p>}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-6">📝 Order Management</h2>
            
            <div className="mb-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="font-semibold mb-3 text-lg">Create New Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input type="text" placeholder="Order ID" className="border p-2 rounded-lg" value={newOrder.order_id} onChange={(e) => setNewOrder({...newOrder, order_id: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Customer" className="border p-2 rounded-lg" value={newOrder.customer} onChange={(e) => setNewOrder({...newOrder, customer: e.target.value})} />
                <button onClick={addOrder} disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded-lg md:col-span-2">{saving ? 'Creating...' : '➕ Create Order'}</button>
              </div>
            </div>

            <h3 className="font-semibold mb-3 text-lg">Current Orders</h3>
            {orders.map((order, index) => (
              <div key={index} className="border rounded-lg p-3 mb-2">
                <p className="font-semibold">{order.order_id}</p>
                <p>Customer: {order.customer} | Status: {order.status}</p>
              </div>
            ))}
            {orders.length === 0 && <p className="text-gray-500">No orders yet</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
