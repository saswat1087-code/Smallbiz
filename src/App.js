import React, { useState, useEffect } from 'react';

// Your verified Google Script Web App URL
const API_URL = 'https://script.google.com/macros/s/AKfycbwc8RkbjESSGsLm6rdMfZnKsWOLbk6H5Z2cq8uOe10EPxlecgxzvscV4Z-Cpu5TI-bk/exec';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [bins, setBins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const [newProduct, setNewProduct] = useState({ sku: '', description: '', quantity: '', bin: '' });
  const [selectedFile, setSelectedFile] = useState(null);
  const [newBin, setNewBin] = useState({ bin_id: '', zone: '' });

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(API_URL);
      if (!response.ok) throw new Error('Network failure');
      const allData = await response.json();
      const dataArray = Array.isArray(allData) ? allData : [];

      setStock(dataArray.filter(row => row && row.sku && row.sku.toString().trim() !== '' && !row.order_id).map(row => ({ ...row, id: row.__row_number__ })));
      setBins(dataArray.filter(row => row && row.bin_id && row.bin_id.toString().trim() !== '').map(row => ({ ...row, id: row.__row_number__ })));
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

  const convertFileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  const addProduct = async () => {
    if (!newProduct.sku.trim() || !newProduct.description.trim()) {
      setMessage('❌ Please specify SKU and Description');
      return;
    }

    const enteredBin = newProduct.bin.trim().toUpperCase();
    const isBinValid = enteredBin === '' || enteredBin === 'UNASSIGNED' || bins.some(b => b.bin_id === enteredBin);
    if (!isBinValid) {
      setMessage(`❌ Error: Bin "${enteredBin}" does not exist.`);
      return;
    }

    setSaving(true);
    try {
      let filePayload = {};
      if (selectedFile) {
        const base64String = await convertFileToBase64(selectedFile);
        filePayload = { fileData: base64String, fileName: selectedFile.name, fileType: selectedFile.type };
      }

      await fetch(API_URL, {
        redirect: 'follow', 
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'ADD_PRODUCT', sku: newProduct.sku.trim().toUpperCase(), description: newProduct.description.trim(), quantity: parseInt(newProduct.quantity, 10) || 0, bin: enteredBin || 'UNASSIGNED', ...filePayload })
      });
      
      setNewProduct({ sku: '', description: '', quantity: '', bin: '' });
      setSelectedFile(null);
      setMessage('✅ Product added successfully!');
      await loadData();
    } catch {
      setMessage('❌ Failed to save product');
    } finally {
      setSaving(false);
    }
  };

  const executeItemRemoval = async (rowId, label) => {
    if (!rowId || !window.confirm(`Permanently delete record: ${label}?`)) return;
    setSaving(true);
    try {
      await fetch(API_URL, { 
        redirect: 'follow',
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'DELETE_ROW', rowNumber: parseInt(rowId, 10) })
      });
      setMessage(`✅ Record removed.`);
      await loadData();
    } catch {
      setMessage('❌ Delete failed');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10 text-center">Loading WMS...</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <nav className="flex gap-2 mb-6">
        {['dashboard', 'stock', 'bins'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded ${activeTab === tab ? 'bg-blue-600 text-white' : 'bg-white'}`}>
            {tab.toUpperCase()}
          </button>
        ))}
      </nav>

      {activeTab === 'stock' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="font-bold mb-4">Inventory</h2>
          <div className="grid grid-cols-1 gap-2 mb-4">
            <input placeholder="SKU" className="border p-2" value={newProduct.sku} onChange={(e) => setNewProduct({...newProduct, sku: e.target.value})} />
            <input placeholder="Description" className="border p-2" value={newProduct.description} onChange={(e) => setNewProduct({...newProduct, description: e.target.value})} />
            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} />
            <button onClick={addProduct} className="bg-blue-600 text-white p-2">{saving ? '...' : 'Add'}</button>
          </div>
          {stock.map((item, index) => (
            <div key={index} className="flex justify-between border-b py-2">
              {item.sku}
              <button onClick={() => executeItemRemoval(item.id, item.sku)} className="text-red-500">Delete</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
