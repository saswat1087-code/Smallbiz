import React, { useState, useEffect } from 'react';

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
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });
  const [newOrder, setNewOrder] = useState({ order_id: '', customer: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      const data = await response.json();
      
      if (Array.isArray(data)) {
        setStock(data.filter(item => item.sku && !item.order_id));
        setBins(data.filter(item => item.bin_id));
        setOrders(data.filter(item => item.order_id));
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const addProduct = async () => {
    if (!newProduct.sku || !newProduct.description || !newProduct.bin) {
      setMessage('Please fill all fields');
      return;
    }
    
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_PRODUCT',
          sku: newProduct.sku.toUpperCase(),
          description: newProduct.description,
          quantity: Number(newProduct.quantity) || 0,
          bin: newProduct.bin.toUpperCase()
        })
      });
      setMessage('Product added!');
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      await loadData();
    } catch (error) {
      setMessage('Error adding product');
    } finally {
      setSaving(false);
    }
  };

  const addBin = async () => {
    if (!newBin.bin_id) {
      setMessage('Enter Bin ID');
      return;
    }
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'ADD_BIN',
          bin_id: newBin.bin_id.toUpperCase(),
          zone: newBin.zone || 'General',
          status: 'Available'
        })
      });
      setMessage('Bin added!');
      setNewBin({ bin_id: '', zone: '' });
      await loadData();
    } catch (error) {
      setMessage('Error adding bin');
    } finally {
      setSaving(false);
    }
  };

  const addOrder = async () => {
    if (!newOrder.order_id || !newOrder.customer) {
      setMessage('Enter Order ID and Customer');
      return;
    }
    setSaving(true);
    try {
      await fetch(API_URL, {
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
      setMessage('Order created!');
      setNewOrder({ order_id: '', customer: '' });
      await loadData();
    } catch (error) {
      setMessage('Error creating order');
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (id, orderId, status) => {
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'UPDATE_STATUS',
          rowNumber: Number(id),
          status: status
        })
      });
      setMessage(`Order ${orderId} updated to ${status}`);
      await loadData();
      setShowStatusMenu(null);
    } catch (error) {
      setMessage('Error updating status');
    } finally {
      setSaving(false);
    }
  };

  const deleteItem = async (id, name) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    setSaving(true);
    try {
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DELETE_ROW',
          rowNumber: Number(id)
        })
      });
      setMessage('Deleted successfully');
      await loadData();
    } catch (error) {
      setMessage('Error deleting');
    } finally {
      setSaving(false);
    }
  };

  const statusColor = (status) => {
    if (status === 'Open') return 'bg-yellow-200 text-yellow-800';
    if (status === 'In Transit') return 'bg-blue-200 text-blue-800';
    if (status === 'Closed') return 'bg-green-200 text-green-800';
    return 'bg-gray-200';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center text-xl">Loading WMS...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4 text-center">
        <h1 className="text-2xl font-bold">SmallBiz WMS</h1>
      </header>

      {message && (
        <div className={`fixed top-4 right-4 p-3 rounded shadow-lg z-50 ${
          message.includes('!') ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
        }`}>
          {message}
        </div>
      )}

      <div className="container mx-auto p-4">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded ${activeTab === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab('stock')} className={`px-4 py-2 rounded ${activeTab === 'stock' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            Stock
          </button>
          <button onClick={() => setActiveTab('bins')} className={`px-4 py-2 rounded ${activeTab === 'bins' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            Bins
          </button>
          <button onClick={() => setActiveTab('orders')} className={`px-4 py-2 rounded ${activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            Orders
          </button>
        </div>

        {activeTab === 'dashboard' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-4">Dashboard</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-blue-500 text-white p-4 rounded">
                <div className="text-2xl">📦</div>
                <div>Total Stock</div>
                <div className="text-2xl font-bold">{stock.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</div>
              </div>
              <div className="bg-green-500 text-white p-4 rounded">
                <div className="text-2xl">🏷️</div>
                <div>Products</div>
                <div className="text-2xl font-bold">{stock.length}</div>
              </div>
              <div className="bg-purple-500 text-white p-4 rounded">
                <div className="text-2xl">🗑️</div>
                <div>Bins</div>
                <div className="text-2xl font-bold">{bins.length}</div>
              </div>
              <div className="bg-orange-500 text-white p-4 rounded">
                <div className="text-2xl">📋</div>
                <div>Orders</div>
                <div className="text-2xl font-bold">{orders.length}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stock' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-4">Stock Management</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2">Add Product</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="text" placeholder="SKU" className="border p-2 rounded" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Description" className="border p-2 rounded" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} />
                <input type="number" placeholder="Quantity" className="border p-2 rounded" value={newProduct.quantity} onChange={e => setNewProduct({...newProduct, quantity: e.target.value})} />
                <input type="text" placeholder="Bin" className="border p-2 rounded" value={newProduct.bin} onChange={e => setNewProduct({...newProduct, bin: e.target.value.toUpperCase()})} />
                <button onClick={addProduct} disabled={saving} className="md:col-span-2 bg-blue-600 text-white py-2 rounded">Add Product</button>
              </div>
            </div>
            <h3 className="font-bold mb-2">Current Stock</h3>
            {stock.map((item, i) => (
              <div key={i} className="border-b py-2 flex justify-between">
                <div>
                  <span className="font-bold">{item.description}</span> ({item.sku})<br />
                  <span className="text-sm text-gray-600">Qty: {item.quantity} | Bin: {item.bin}</span>
                </div>
                <button onClick={() => deleteItem(item.id, item.sku)} className="text-red-500">Delete</button>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'bins' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-4">Bin Management</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2">Add Bin</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="text" placeholder="Bin ID" className="border p-2 rounded" value={newBin.bin_id} onChange={e => setNewBin({...newBin, bin_id: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Zone" className="border p-2 rounded" value={newBin.zone} onChange={e => setNewBin({...newBin, zone: e.target.value})} />
                <button onClick={addBin} disabled={saving} className="md:col-span-2 bg-blue-600 text-white py-2 rounded">Add Bin</button>
              </div>
            </div>
            <h3 className="font-bold mb-2">Current Bins</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {bins.map((bin, i) => (
                <div key={i} className="border p-3 rounded flex justify-between">
                  <div>
                    <div className="font-bold">{bin.bin_id}</div>
                    <div className="text-sm text-gray-600">{bin.zone || 'General'}</div>
                  </div>
                  <button onClick={() => deleteItem(bin.id, bin.bin_id)} className="text-red-500">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="bg-white rounded shadow p-6">
            <h2 className="text-xl font-bold mb-4">Order Management</h2>
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="font-bold mb-2">Create Order</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <input type="text" placeholder="Order ID" className="border p-2 rounded" value={newOrder.order_id} onChange={e => setNewOrder({...newOrder, order_id: e.target.value.toUpperCase()})} />
                <input type="text" placeholder="Customer" className="border p-2 rounded" value={newOrder.customer} onChange={e => setNewOrder({...newOrder, customer: e.target.value})} />
                <button onClick={addOrder} disabled={saving} className="md:col-span-2 bg-blue-600 text-white py-2 rounded">Create Order</button>
              </div>
            </div>
            <h3 className="font-bold mb-2">All Orders</h3>
            {orders.map((order, i) => (
              <div key={i} className="border rounded p-3 mb-2">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold">{order.order_id}</div>
                    <div className="text-sm">Customer: {order.customer}</div>
                    <div className="text-xs text-gray-400">{order.created_at ? new Date(order.created_at).toLocaleDateString() : ''}</div>
                  </div>
                  <div className="relative">
                    <button
                      onClick={() => setShowStatusMenu(showStatusMenu === order.order_id ? null : order.order_id)}
                      className={`px-3 py-1 rounded text-sm ${statusColor(order.status)}`}
                    >
                      {order.status || 'Open'} ▼
                    </button>
                    {showStatusMenu === order.order_id && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
                        <button onClick={() => updateStatus(order.id, order.order_id, 'Open')} className="block w-full text-left px-3 py-1 hover:bg-gray-100">Open</button>
                        <button onClick={() => updateStatus(order.id, order.order_id, 'In Transit')} className="block w-full text-left px-3 py-1 hover:bg-gray-100">In Transit</button>
                        <button onClick={() => updateStatus(order.id, order.order_id, 'Closed')} className="block w-full text-left px-3 py-1 hover:bg-gray-100">Closed</button>
                      </div>
                    )}
                    <button onClick={() => deleteItem(order.id, order.order_id)} className="ml-2 text-red-500">Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
