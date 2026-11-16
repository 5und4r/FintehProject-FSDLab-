import React, { useState, useEffect, useCallback } from 'react';

const API_BASE_URL = 'http://localhost:3001/transactions';

export default function App() {
  // MongoDB Documents State
  const [transactions, setTransactions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [serverConnected, setServerConnected] = useState(false);

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState('crud');

  // Search & Verdict Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('ALL');

  // Edit / Update State (Tracks MongoDB _id)
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Controlled Form Fields State
  const [formData, setFormData] = useState({
    sender: '',
    beneficiary: '',
    amount: '',
    rail: 'NPCI_UPI_2.0',
    device: 'Trusted Everyday Smartphone',
    verdict: 'CLEARED'
  });

  // In-App Toast & Delete Confirmation Modal State
  const [toastMessage, setToastMessage] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  const triggerToast = (title, text, type = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4200);
  };

  const resetForm = () => {
    setFormData({
      sender: '',
      beneficiary: '',
      amount: '',
      rail: 'NPCI_UPI_2.0',
      device: 'Trusted Everyday Smartphone',
      verdict: 'CLEARED'
    });
  };

  // --------------------------------------------------------------------------
  // READ & SEARCH -> GET /transactions & GET /transactions/search/:query
  // --------------------------------------------------------------------------
  const fetchTransactions = useCallback(async (query = '') => {
    try {
      setIsLoading(true);
      const trimmed = query.trim();
      const endpoint = trimmed
        ? `${API_BASE_URL}/search/${encodeURIComponent(trimmed)}`
        : API_BASE_URL;

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setTransactions(Array.isArray(data) ? data : []);
      setServerConnected(true);
    } catch (err) {
      console.error('API Fetch Error:', err);
      setServerConnected(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch initial MongoDB records and run debounced backend search on query change
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchTransactions(searchQuery);
    }, 220);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery, fetchTransactions]);

  // Populate form when editing an existing MongoDB document
  useEffect(() => {
    if (editingTransaction) {
      setFormData({
        sender: editingTransaction.sender,
        beneficiary: editingTransaction.beneficiary,
        amount: editingTransaction.amount.toString(),
        rail: editingTransaction.rail,
        device: editingTransaction.device,
        verdict: editingTransaction.verdict
      });
    } else {
      resetForm();
    }
  }, [editingTransaction]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --------------------------------------------------------------------------
  // CREATE (POST /transactions) & UPDATE (PUT /transactions/:id)
  // --------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.sender.trim() || !formData.beneficiary.trim() || !formData.amount) {
      triggerToast('Validation Error', 'Please complete all required fields.', 'error');
      return;
    }

    const numericAmount = parseFloat(formData.amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      triggerToast('Invalid Quantum', 'Transfer amount must be a positive number.', 'error');
      return;
    }

    const payload = {
      sender: formData.sender.trim(),
      beneficiary: formData.beneficiary.trim(),
      amount: numericAmount,
      rail: formData.rail,
      device: formData.device,
      verdict: formData.verdict
    };

    try {
      if (editingTransaction) {
        // UPDATE OPERATION -> PUT /transactions/:id
        const response = await fetch(`${API_BASE_URL}/${editingTransaction._id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Update failed');

        triggerToast('MongoDB Updated', result.message);
        setEditingTransaction(null);
      } else {
        // CREATE OPERATION -> POST /transactions
        const response = await fetch(API_BASE_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'Create failed');

        triggerToast('Saved to MongoDB', result.message);
        resetForm();
      }

      fetchTransactions(searchQuery);
    } catch (err) {
      triggerToast(
        'Server Connection Error',
        'Ensure MongoDB is running and Express server is active on Port 3001.',
        'error'
      );
    }
  };

  // --------------------------------------------------------------------------
  // DELETE -> DELETE /transactions/:id
  // --------------------------------------------------------------------------
  const confirmDelete = async () => {
    if (!deleteCandidate) return;

    try {
      const response = await fetch(`${API_BASE_URL}/${deleteCandidate._id}`, {
        method: 'DELETE'
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Delete failed');

      triggerToast('Deleted from MongoDB', result.message, 'warning');
      if (editingTransaction?._id === deleteCandidate._id) {
        setEditingTransaction(null);
      }
      setDeleteCandidate(null);
      fetchTransactions(searchQuery);
    } catch (err) {
      triggerToast('Delete Failed', err.message, 'error');
      setDeleteCandidate(null);
    }
  };

  // Client-side Verdict Filter applied to MongoDB results
  const displayedRecords = transactions.filter((tx) => {
    return filterVerdict === 'ALL' || tx.verdict === filterVerdict;
  });

  // Operational Telemetry Metrics
  const totalVolume = transactions.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  const blockedCount = transactions.filter(
    (t) => t.verdict === 'BLOCKED' || t.verdict === 'HALTED'
  ).length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0e100f] text-[#fffce1] font-sans">
      
      {/* In-App Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#161917] border-2 border-[#0ae448] p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              toastMessage.type === 'error'
                ? 'bg-[#ff3b5c]/20 text-[#ff3b5c]'
                : 'bg-[#0ae448]/20 text-[#0ae448]'
            }`}
          >
            <i
              className={`fa-solid ${
                toastMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'
              }`}
            ></i>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0ae448]">
              {toastMessage.title}
            </h4>
            <p className="text-xs text-gray-300 mt-0.5">{toastMessage.text}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      )}

      {/* In-App Delete Confirmation Modal */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161917] border border-[#ff3b5c]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#ff3b5c]/10 text-[#ff3b5c] border border-[#ff3b5c]/30 flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-lg font-bold font-['Outfit'] text-[#fffce1]">Confirm Document Deletion</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Are you sure you want to permanently remove transaction document{' '}
              <strong className="text-[#fffce1] font-mono">{deleteCandidate.txId}</strong> from the
              MongoDB collection?
            </p>
            <div className="mt-6 flex items-center justify-end gap-3 font-mono text-xs font-bold">
              <button
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2.5 rounded-xl bg-[#0e100f] text-gray-300 hover:text-white border border-[#2a302c] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2.5 rounded-xl bg-[#ff3b5c] text-black font-bold uppercase hover:bg-rose-400 transition-all shadow-lg shadow-[#ff3b5c]/20"
              >
                Yes, Delete Document
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Navigation */}
      <header className="sticky top-0 z-40 bg-[#0e100f]/90 backdrop-blur-xl border-b border-[#222724]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#161917] border border-[#0ae448]/50 flex items-center justify-center text-[#0ae448] shadow-[0_0_20px_rgba(10,228,72,0.2)]">
              <i className="fa-solid fa-eye text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xl font-black font-['Outfit'] tracking-tight text-[#fffce1]">
                  Legal <span className="text-[#0ae448]">Eye</span>
                </span>
                <span
                  className={`text-[9px] font-mono font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider flex items-center gap-1.5 ${
                    serverConnected
                      ? 'bg-[#0ae448]/15 text-[#0ae448] border-[#0ae448]/40'
                      : 'bg-[#ff3b5c]/15 text-[#ff3b5c] border-[#ff3b5c]/40'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      serverConnected ? 'bg-[#0ae448] animate-ping' : 'bg-[#ff3b5c]'
                    }`}
                  ></span>
                  {serverConnected ? 'MongoDB API Connected · :3001' : 'API Offline · Start Port 3001'}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">
                Full-Stack Pre-Settlement Recourse &amp; Document Store
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setActiveTab('crud')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 ${
                activeTab === 'crud'
                  ? 'bg-[#0ae448] text-black shadow-lg shadow-[#0ae448]/20'
                  : 'bg-[#161917] text-gray-400 hover:text-white border border-[#2a302c]'
              }`}
            >
              <i className="fa-solid fa-database"></i>
              <span>MongoDB Ledger ({transactions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 ${
                activeTab === 'spec'
                  ? 'bg-[#0ae448] text-black shadow-lg shadow-[#0ae448]/20'
                  : 'bg-[#161917] text-gray-400 hover:text-white border border-[#2a302c]'
              }`}
            >
              <i className="fa-solid fa-server"></i>
              <span>System Architecture</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {!serverConnected && !isLoading && (
          <div className="mb-8 p-4 rounded-2xl bg-[#ff3b5c]/10 border border-[#ff3b5c]/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-3 text-rose-300">
              <i className="fa-solid fa-plug-circle-xmark text-lg text-[#ff3b5c]"></i>
              <div>
                <strong className="text-[#fffce1] block">Express Backend Unreachable (http://localhost:3001)</strong>
                <span>Ensure MongoDB is running and execute <code className="text-[#0ae448]">node server.js</code> inside your server directory.</span>
              </div>
            </div>
            <button
              onClick={() => fetchTransactions(searchQuery)}
              className="px-4 py-2 rounded-xl bg-[#ff3b5c] text-black font-bold uppercase hover:bg-rose-400 transition-all shrink-0"
            >
              Retry Connection
            </button>
          </div>
        )}

        {activeTab === 'crud' ? (
          <div className="space-y-10">
            
            {/* Operational Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                  MONGODB DOCUMENTS
                </div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#fffce1] mt-1">
                  {transactions.length}
                </div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-leaf text-[#0ae448]"></i> legalEyeDB.transactions
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                  INTERCEPTED THREATS
                </div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#ff3b5c] mt-1">
                  {blockedCount}
                </div>
                <div className="text-xs text-rose-400/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-ban"></i> Halted &amp; Blocked
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                  CLEARED PAYMENTS
                </div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#0ae448] mt-1">
                  {transactions.length - blockedCount}
                </div>
                <div className="text-xs text-[#0ae448]/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-check-double"></i> Verified safe
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">
                  AUDITED VOLUME
                </div>
                <div className="text-xl sm:text-2xl font-black font-['Outfit'] text-[#9d95ff] mt-1 truncate">
                  ₹{totalVolume.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#9d95ff]/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-money-bill-wave"></i> BSON aggregated
                </div>
              </div>
            </div>

            {/* CREATE & UPDATE FORM */}
            <div className="p-7 sm:p-9 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#222724] gap-2 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0ae448]/10 text-[#0ae448] border border-[#0ae448]/30 text-[10px] font-mono font-bold uppercase mb-2">
                    <i className="fa-solid fa-cloud-arrow-up"></i> Express REST API Dispatch
                  </div>
                  <h2 className="text-lg font-bold font-['Outfit'] text-[#fffce1] flex items-center gap-2">
                    <i
                      className={`fa-solid ${
                        editingTransaction
                          ? 'fa-pen-to-square text-[#9d95ff]'
                          : 'fa-circle-plus text-[#0ae448]'
                      }`}
                    ></i>
                    {editingTransaction
                      ? `Update MongoDB Document: ${editingTransaction.txId}`
                      : 'Insert New Transaction Audit Document'}
                  </h2>
                </div>
                {editingTransaction && (
                  <button
                    onClick={() => setEditingTransaction(null)}
                    className="px-3.5 py-1.5 rounded-xl bg-[#0e100f] text-gray-400 hover:text-white border border-[#2a302c] text-xs font-mono transition-all self-start"
                  >
                    <i className="fa-solid fa-xmark mr-1"></i> Cancel Edit Mode
                  </button>
                )}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  
                  {/* Sender VPA */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Sender Account / VPA *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none text-xs">
                        <i className="fa-solid fa-user"></i>
                      </span>
                      <input
                        type="text"
                        name="sender"
                        value={formData.sender}
                        onChange={handleInputChange}
                        placeholder="e.g. rahul.sharma@okaxis"
                        required
                        className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#fffce1] font-mono focus:outline-none focus:border-[#0ae448] transition-all"
                      />
                    </div>
                  </div>

                  {/* Beneficiary Handle */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Beneficiary Handle *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none text-xs">
                        <i className="fa-solid fa-building-columns"></i>
                      </span>
                      <input
                        type="text"
                        name="beneficiary"
                        value={formData.beneficiary}
                        onChange={handleInputChange}
                        placeholder="e.g. merchant.ops@hdfc"
                        required
                        className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#fffce1] font-mono focus:outline-none focus:border-[#0ae448] transition-all"
                      />
                    </div>
                  </div>

                  {/* Transfer Quantum */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Transfer Quantum (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-xs font-mono font-bold text-[#0ae448]">
                        ₹
                      </span>
                      <input
                        type="number"
                        name="amount"
                        value={formData.amount}
                        onChange={handleInputChange}
                        placeholder="e.g. 85000"
                        min="1"
                        step="any"
                        required
                        className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl pl-10 pr-4 py-2.5 text-xs text-[#fffce1] font-mono font-bold focus:outline-none focus:border-[#0ae448] transition-all"
                      />
                    </div>
                  </div>

                  {/* Clearing Rail */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Clearing Rail
                    </label>
                    <select
                      name="rail"
                      value={formData.rail}
                      onChange={handleInputChange}
                      className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl px-4 py-2.5 text-xs text-[#fffce1] font-mono focus:outline-none focus:border-[#0ae448] transition-all"
                    >
                      <option value="NPCI_UPI_2.0">NPCI UPI 2.0 (India &middot; ₹ INR)</option>
                      <option value="US_FEDNOW">US FedNow Instant ($ USD)</option>
                      <option value="EU_SEPA_INSTANT">EU SEPA Instant (€ EUR)</option>
                    </select>
                  </div>

                  {/* Hardware Profile */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Hardware Profile
                    </label>
                    <select
                      name="device"
                      value={formData.device}
                      onChange={handleInputChange}
                      className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl px-4 py-2.5 text-xs text-[#fffce1] font-mono focus:outline-none focus:border-[#0ae448] transition-all"
                    >
                      <option value="Trusted Everyday Smartphone">Trusted Everyday Smartphone</option>
                      <option value="Unrecognized Phone">Unrecognized Hardware Device</option>
                      <option value="SIM Swap Flagged (<24h)">SIM Swap Flagged (&lt;24h)</option>
                      <option value="Rooted Emulator">Rooted Linux / Android Emulator</option>
                    </select>
                  </div>

                  {/* Audit Verdict Radio Group */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Audit Verdict
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { label: 'CLEARED', color: 'accent-[#0ae448] text-[#0ae448]' },
                        { label: 'HALTED', color: 'accent-amber-400 text-amber-400' },
                        { label: 'BLOCKED', color: 'accent-[#ff3b5c] text-[#ff3b5c]' }
                      ].map((item) => (
                        <label
                          key={item.label}
                          className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-[#0e100f] border border-[#2a302c] text-[11px] font-mono font-bold cursor-pointer hover:border-gray-500 transition-all"
                        >
                          <input
                            type="radio"
                            name="verdict"
                            value={item.label}
                            checked={formData.verdict === item.label}
                            onChange={handleInputChange}
                            className={item.color}
                          />
                          <span className={item.color}>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-7 py-3 rounded-xl bg-[#0ae448] hover:bg-[#09d242] text-black font-extrabold text-xs font-mono uppercase tracking-wider transition-all shadow-lg shadow-[#0ae448]/20 flex items-center justify-center gap-2"
                  >
                    <i className={`fa-solid ${editingTransaction ? 'fa-check' : 'fa-plus'}`}></i>
                    {editingTransaction ? 'PUT Update to MongoDB' : 'POST Record to MongoDB'}
                  </button>
                </div>
              </form>
            </div>

            {/* READ, SEARCH, UPDATE & DELETE TABLE */}
            <div className="p-7 sm:p-9 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl space-y-6">
              
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#222724]">
                <div>
                  <h3 className="text-lg font-bold font-['Outfit'] text-[#fffce1]">
                    MongoDB Transaction Collection
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Showing {displayedRecords.length} document(s) from{' '}
                    <code className="text-[#0ae448]">mongodb://127.0.0.1:27017/legalEyeDB</code>
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  
                  {/* Verdict Pill Filters */}
                  <div className="inline-flex p-1 bg-[#0e100f] rounded-xl border border-[#2a302c]">
                    {['ALL', 'CLEARED', 'HALTED', 'BLOCKED'].map((status) => (
                      <button
                        key={status}
                        onClick={() => setFilterVerdict(status)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          filterVerdict === status
                            ? 'bg-[#161917] text-[#0ae448] border border-[#0ae448]/40 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Live MongoDB Search Bar */}
                  <div className="relative w-full sm:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none text-xs">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search MongoDB collection..."
                      className="w-full bg-[#0e100f] border border-[#2a302c] rounded-xl pl-9 pr-4 py-2 text-xs text-[#fffce1] font-mono focus:outline-none focus:border-[#0ae448] transition-all"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white text-xs"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    )}
                  </div>

                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto rounded-2xl border border-[#2a302c]">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="bg-[#0e100f] text-gray-400 uppercase text-[11px] border-b border-[#222724]">
                    <tr>
                      <th className="p-4">Timestamp</th>
                      <th className="p-4">Transaction ID</th>
                      <th className="p-4">Participants</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Rail &amp; Device</th>
                      <th className="p-4">Verdict</th>
                      <th className="p-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222724] bg-[#161917]">
                    {isLoading ? (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-gray-400">
                          Querying MongoDB documents via Express REST API...
                        </td>
                      </tr>
                    ) : displayedRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-gray-500 italic">
                          <i className="fa-solid fa-database text-3xl mb-3 block text-gray-600"></i>
                          No documents found in MongoDB. Use the form above to insert your first transaction record.
                        </td>
                      </tr>
                    ) : (
                      displayedRecords.map((tx) => (
                        <tr key={tx._id} className="hover:bg-[#0e100f]/60 transition-colors">
                          <td className="p-4 text-gray-400 whitespace-nowrap">{tx.timestamp}</td>
                          <td className="p-4 font-bold text-[#fffce1] whitespace-nowrap">
                            <div>{tx.txId}</div>
                            <div className="text-[9px] text-gray-500 font-normal">_id: {tx._id.slice(-8)}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="text-gray-300 font-bold">{tx.sender}</div>
                            <div className="text-[10px] text-gray-500">to {tx.beneficiary}</div>
                          </td>
                          <td className="p-4 font-bold text-[#0ae448] whitespace-nowrap">
                            ₹{Number(tx.amount).toLocaleString('en-IN')}
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <div className="text-gray-300">{tx.rail}</div>
                            <div className="text-[10px] text-gray-500">{tx.device}</div>
                          </td>
                          <td className="p-4 whitespace-nowrap">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                                tx.verdict === 'CLEARED'
                                  ? 'bg-[#0ae448]/10 text-[#0ae448] border-[#0ae448]/30'
                                  : tx.verdict === 'HALTED'
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-[#ff3b5c]/10 text-[#ff3b5c] border-[#ff3b5c]/30'
                              }`}
                            >
                              {tx.verdict} ({tx.riskScore}%)
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingTransaction(tx);
                                window.scrollTo({ top: 150, behavior: 'smooth' });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#0e100f] hover:bg-[#2a302c] text-[#9d95ff] border border-[#2a302c] text-xs font-bold transition-all"
                              title="Edit Document"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i> Edit
                            </button>
                            <button
                              onClick={() => setDeleteCandidate(tx)}
                              className="px-3 py-1.5 rounded-xl bg-[#0e100f] hover:bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/30 text-xs font-bold transition-all"
                              title="Delete Document"
                            >
                              <i className="fa-solid fa-trash-can mr-1"></i> Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

            </div>

          </div>
        ) : (
          /* System Architecture View */
          <div className="p-8 sm:p-12 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0ae448]/15 border border-[#0ae448]/40 text-[#0ae448] text-xs font-mono font-bold uppercase mb-3">
                <i className="fa-solid fa-network-wired"></i> Full-Stack Pipeline Architecture
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#fffce1]">
                End-to-End MERN Telemetry &amp; Document Persistence
              </h2>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Legal Eye couples a reactive Vite client on Port 5173 with an asynchronous Node.js and Express.js REST gateway on Port 3001, enforcing Mongoose schema validation before committing BSON documents to MongoDB on Port 27017.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#0ae448] font-bold text-sm">POST /transactions &middot; Document Ingestion</div>
                <p className="text-gray-400 font-sans">
                  Validates sender VPA, beneficiary handle, and transfer quantum before computing anomaly risk scores and persisting documents via Mongoose.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#9d95ff] font-bold text-sm">GET /transactions &amp; /search/:query</div>
                <p className="text-gray-400 font-sans">
                  Executes indexed BSON queries and case-insensitive regular expression matching across transaction identifiers, rails, and hardware fingerprints.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-amber-400 font-bold text-sm">PUT /transactions/:id &middot; Atomic Modification</div>
                <p className="text-gray-400 font-sans">
                  Targets documents by MongoDB ObjectId (<code className="text-amber-300">_id</code>) to recalibrate verdict states and risk scores in real time.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#ff3b5c] font-bold text-sm">DELETE /transactions/:id &middot; Purging</div>
                <p className="text-gray-400 font-sans">
                  Removes verified false-positive records directly from the MongoDB collection with immediate UI state reconciliation.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-[#222724] bg-[#090b0a] py-8 text-xs font-mono text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>&copy; 2026 Legal Eye Systems &middot; Full-Stack Pre-Settlement Recourse Engine</div>
          <div className="text-gray-400">React &middot; Express &middot; Node.js &middot; MongoDB</div>
        </div>
      </footer>
    </div>
  );
}