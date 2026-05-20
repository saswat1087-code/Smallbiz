import React, { useMemo, useState } from "react";

// Simple inline components (no external dependencies needed)
const Card = ({ children, className }) => (
  <div className={`bg-white rounded-2xl shadow ${className || ''}`}>{children}</div>
);

const CardContent = ({ children, className }) => (
  <div className={`p-5 ${className || ''}`}>{children}</div>
);

const Button = ({ children, onClick, variant, className }) => (
  <button 
    onClick={onClick} 
    className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
      variant === 'default' 
        ? 'bg-blue-600 text-white hover:bg-blue-700' 
        : 'border border-gray-300 bg-white hover:bg-gray-50'
    } ${className || ''}`}
  >
    {children}
  </button>
);

const Input = ({ placeholder, value, onChange, type }) => (
  <input 
    type={type || 'text'} 
    placeholder={placeholder} 
    value={value} 
    onChange={onChange} 
    className="w-full border rounded-xl p-2 text-sm" 
  />
);

// Icons as simple emoji (since lucide-react isn't installed)
const Package = () => <span className="text-2xl">📦</span>;
const Truck = () => <span className="text-2xl">🚚</span>;
const Warehouse = () => <span className="text-2xl">🏭</span>;
const Users = () => <span className="text-2xl">👥</span>;
const Boxes = () => <span className="text-2xl">📋</span>;
const ClipboardList = () => <span className="text-2xl">📝</span>;

export default function SmallBusinessWMS() {
  const [role, setRole] = useState("Warehouse Manager");
  const [movements, setMovements] = useState([
    { id: "MV001", action: "GR Posted", ref: "PO1001" },
    { id: "MV002", action: "Stock Transfer", ref: "WH01→WH02" },
    { id: "MV003", action: "Pick Confirmed", ref: "DO2045" },
  ]);
  const [masters] = useState({ suppliers: 12, customers: 28, products: 145 });
  const [orders, setOrders] = useState([{ id: "DO1001", customer: "ABC Retail", status: "Open" }]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [search, setSearch] = useState("");
  const [tasks] = useState([
    { id: "WT001", type: "Putaway", priority: "High", status: "Open" },
    { id: "WT002", type: "Picking", priority: "Medium", status: "In Progress" },
  ]);
  const [yard] = useState([
    { truck: "TRK-101", dock: "D1", status: "Arrived" },
    { truck: "TRK-205", dock: "D2", status: "Loading" },
  ]);
  const [active, setActive] = useState("cockpit");
  const [bins, setBins] = useState([
    { id: "A-01-01", zone: "Inbound", type: "Rack", capacity: 100, status: "Occupied" },
    { id: "B-02-03", zone: "Bulk", type: "Floor", capacity: 200, status: "Empty" },
  ]);
  const [newBin, setNewBin] = useState({ id: "", zone: "", type: "Rack", capacity: "" });

  const stock = [
    { sku: "MAT001", product: "Bolts", qty: 320, bin: "A-01-01" },
    { sku: "MAT002", product: "Boxes", qty: 120, bin: "B-02-03" },
  ];

  const kpis = useMemo(() => [
    { label: "Stock On Hand", value: 440, icon: Package },
    { label: "Pending GR", value: 8, icon: ClipboardList },
    { label: "Open Putaway", value: 5, icon: Warehouse },
    { label: "Yard Loads", value: 3, icon: Truck },
    { label: "Resources", value: 11, icon: Users },
    { label: "Bins", value: bins.length, icon: Boxes },
  ], [bins]);

  const addBin = () => {
    if (!newBin.id || !newBin.zone || !newBin.capacity) return;
    setBins([...bins, { ...newBin, capacity: Number(newBin.capacity), status: "Empty" }]);
    setNewBin({ id: "", zone: "", type: "Rack", capacity: "" });
  };

  const addMovement = (action, ref) => {
    const newMovement = {
      id: `MV${String(movements.length + 1).padStart(3, '0')}`,
      action,
      ref
    };
    setMovements([newMovement, ...movements]);
  };

  const nav = [
    ["cockpit", "📊 Dashboard"],
    ["stock", "📦 Stock"],
    ["bins", "🗑️ Bins"],
    ["gr", "📥 Goods Receipt"],
    ["removal", "📤 Stock Removal"],
    ["yard", "🚛 Yard"],
    ["history", "📜 History"],
    ["crud", "📝 Orders"],
    ["master", "📋 Master Data"],
    ["barcode", "🔳 Barcode"],
    ["api", "🔌 API Status"],
  ];

  const renderContent = () => {
    switch(active) {
      case 'cockpit':
        return (
          <>
            <h2 className="text-2xl font-semibold mb-4">Warehouse Dashboard</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <Input placeholder="Search SKU / Task / Bin" value={search} onChange={(e)=>setSearch(e.target.value)} />
              <div className="p-3 bg-blue-50 rounded-xl text-sm">✅ Wave Picking: Enabled</div>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {kpis.map((k) => {
                const Icon = k.icon;
                return (
                  <Card key={k.label}>
                    <CardContent className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-slate-500">{k.label}</p>
                        <p className="text-2xl font-bold">{k.value}</p>
                      </div>
                      <Icon />
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        );
      
      case 'stock':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">📦 Stock Overview</h2>
              {stock.map((s) => (
                <div key={s.sku} className="p-3 border rounded-xl mb-2 flex justify-between">
                  <span><strong>{s.product}</strong> ({s.sku})</span>
                  <span>{s.qty} units | Bin {s.bin}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        );
      
      case 'bins':
        return (
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold mb-4">➕ Create New Bin</h2>
                <Input placeholder="Bin ID (e.g., C-03-01)" value={newBin.id} onChange={(e) => setNewBin({ ...newBin, id: e.target.value })} />
                <Input placeholder="Zone" value={newBin.zone} onChange={(e) => setNewBin({ ...newBin, zone: e.target.value })} className="mt-2" />
                <Input placeholder="Capacity" type="number" value={newBin.capacity} onChange={(e) => setNewBin({ ...newBin, capacity: e.target.value })} className="mt-2" />
                <Button onClick={addBin} className="mt-4 w-full">Create Bin</Button>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <h2 className="text-xl font-semibold mb-4">🗑️ Bin List</h2>
                {bins.map((b) => (
                  <div key={b.id} className="border rounded-xl p-3 mb-2">
                    <div className="font-bold">{b.id}</div>
                    <div className="text-sm text-gray-600">Zone: {b.zone} | Status: {b.status}</div>
                    <div className="text-sm text-gray-600">Capacity: {b.capacity} units</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );
      
      case 'history':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">📜 Movement History</h2>
              <button 
                onClick={() => addMovement('Test Movement', 'Manual')}
                className="mb-4 px-4 py-2 bg-green-600 text-white rounded-lg text-sm"
              >
                + Add Test Movement
              </button>
              {movements.map((m) => (
                <div key={m.id} className="border rounded-xl p-3 mb-2">
                  <span className="font-mono">{m.id}</span> | {m.action} | {m.ref}
                </div>
              ))}
            </CardContent>
          </Card>
        );
      
      case 'crud':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">📝 Delivery Orders</h2>
              <Button onClick={() => setOrders([...orders, { id: `DO${Date.now()}`, customer: 'New Customer', status: 'Open' }])}>
                + Create New Order
              </Button>
              <div className="mt-4 space-y-2">
                {orders.map((o) => (
                  <div key={o.id} className="border rounded-xl p-3 flex justify-between">
                    <span><strong>{o.id}</strong> | {o.customer}</span>
                    <span className="px-2 py-1 bg-green-100 rounded">{o.status}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      
      case 'master':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">📋 Master Data</h2>
              <div className="space-y-2">
                <p>📦 Suppliers: {masters.suppliers}</p>
                <p>👥 Customers: {masters.customers}</p>
                <p>🏷️ Products: {masters.products}</p>
              </div>
            </CardContent>
          </Card>
        );
      
      case 'barcode':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">🔳 Barcode Scanner Ready</h2>
              <Input placeholder="Scan or enter SKU/Bin ID" value={barcodeInput} onChange={(e) => setBarcodeInput(e.target.value)} />
              {barcodeInput && (
                <div className="mt-4 p-4 bg-gray-100 rounded-xl text-center">
                  <p className="font-mono text-lg">{barcodeInput}</p>
                  <p className="text-sm text-gray-600 mt-2">✓ Scanned successfully</p>
                </div>
              )}
            </CardContent>
          </Card>
        );
      
      case 'api':
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold mb-4">🔌 API Endpoints Ready</h2>
              <div className="space-y-2">
                <div className="border rounded-lg p-2 text-sm font-mono">GET /api/stock</div>
                <div className="border rounded-lg p-2 text-sm font-mono">POST /api/gr</div>
                <div className="border rounded-lg p-2 text-sm font-mono">POST /api/putaway</div>
                <div className="border rounded-lg p-2 text-sm font-mono">POST /api/delivery</div>
                <div className="border rounded-lg p-2 text-sm font-mono">GET /api/reports</div>
              </div>
              <p className="text-sm text-slate-500 mt-4">✅ Ready for backend integration</p>
            </CardContent>
          </Card>
        );
      
      default:
        return (
          <Card>
            <CardContent>
              <h2 className="text-xl font-semibold capitalize">{active} Module</h2>
              <p className="mt-4 text-gray-600">This module is ready for configuration.</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="flex flex-col md:flex-row gap-6 max-w-7xl mx-auto">
        {/* Sidebar */}
        <aside className="md:w-72 bg-white rounded-2xl shadow p-4">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-blue-600">SmallBiz WMS</h1>
            <p className="text-xs text-gray-500">Warehouse Management System</p>
          </div>
          
          <div className="mb-4">
            <label className="text-xs text-gray-500 block mb-1">User Role</label>
            <select 
              className="w-full border rounded-xl p-2 text-sm" 
              value={role} 
              onChange={(e)=>setRole(e.target.value)}
            >
              <option>Warehouse Manager</option>
              <option>Operator</option>
              <option>Supervisor</option>
              <option>Admin</option>
            </select>
          </div>
          
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {nav.map(([id, label]) => (
              <Button 
                key={id} 
                variant={active === id ? "default" : "outline"} 
                onClick={() => setActive(id)}
              >
                {label}
              </Button>
            ))}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 space-y-6">
          {renderContent()}
        </main>
      </div>
    </div>
  );
    }
