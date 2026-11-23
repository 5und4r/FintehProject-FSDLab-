import React, { useState, useEffect } from 'react';

// ============================================================================
// LEGAL EYE: REACT TRANSACTION AUDIT & CRUD ENGINE (LAB EXERCISES 5 & 6)
// Built with React Functional Components, Hooks, Form Handling & LocalStorage
// ============================================================================

const STORAGE_KEY = 'legalEye_react_crud_v2';

// Initial Mock Seed Data
const INITIAL_TRANSACTIONS = [
  {
    id: 'TX-948201',
    sender: 'rahul.sharma@okaxis',
    beneficiary: 'merchant.intl@swiftwire',
    amount: 145000,
    rail: 'NPCI_UPI_2.0',
    device: 'Unrecognized Phone',
    verdict: 'HALTED',
    riskScore: 96.8,
    timestamp: '2026-10-05 10:14:22'
  },
  {
    id: 'TX-552109',
    sender: 'enterprise.ops@chase',
    beneficiary: 'aws.cloud@bofa',
    amount: 2400,
    rail: 'US_FEDNOW',
    device: 'Trusted Everyday Smartphone',
    verdict: 'CLEARED',
    riskScore: 2.1,
    timestamp: '2026-10-05 10:18:05'
  },
  {
    id: 'TX-948202',
    sender: 'priya.k@icici',
    beneficiary: 'mule.drain.99@ybl',
    amount: 199999,
    rail: 'NPCI_UPI_2.0',
    device: 'SIM Swap Flagged (<24h)',
    verdict: 'BLOCKED',
    riskScore: 99.1,
    timestamp: '2026-10-05 10:22:40'
  },
  {
    id: 'TX-339182',
    sender: 'lukas.weber@n26',
    beneficiary: 'metro.transit@berlin',
    amount: 35.5,
    rail: 'EU_SEPA_INSTANT',
    device: 'Trusted Everyday Smartphone',
    verdict: 'CLEARED',
    riskScore: 0.8,
    timestamp: '2026-10-05 10:26:11'
  }
];

export default function App() {
  // --------------------------------------------------------------------------
  // STATE MANAGEMENT (React useState Hook)
  // --------------------------------------------------------------------------
  const [transactions, setTransactions] = useState(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : INITIAL_TRANSACTIONS;
    } catch (e) {
      console.error('Failed reading from localStorage:', e);
      return INITIAL_TRANSACTIONS;
    }
  });

  // Active View Tab State
  const [activeTab, setActiveTab] = useState('crud');

  // Search and Filter State (Bonus Requirement)
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVerdict, setFilterVerdict] = useState('ALL');

  // Edit / Update Form State
  const [editingTransaction, setEditingTransaction] = useState(null);

  // Form Fields State
  const [formData, setFormData] = useState({
    sender: '',
    beneficiary: '',
    amount: '',
    rail: 'NPCI_UPI_2.0',
    device: 'Trusted Everyday Smartphone',
    verdict: 'CLEARED'
  });

  // In-App Toast & Modal Feedback (Strictly No alert() or confirm())
  const [toastMessage, setToastMessage] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);

  // Synchronize state changes to Local Storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    } catch (e) {
      console.error('Failed writing to localStorage:', e);
    }
  }, [transactions]);

  // Synchronize Form Fields when editingTransaction changes
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

  // Notification Helper
  const triggerToast = (title, text, type = 'success') => {
    setToastMessage({ title, text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
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

  // Form Field Change Handler
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // --------------------------------------------------------------------------
  // CRUD OPERATION 1: CREATE & UPDATE (Form Submit)
  // --------------------------------------------------------------------------
  const handleSubmit = (e) => {
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

    // Dynamic Risk Score Assessment
    let calculatedRisk = 4.2;
    if (formData.verdict === 'BLOCKED') calculatedRisk = 98.4;
    else if (formData.verdict === 'HALTED') calculatedRisk = 88.7;
    else if (formData.device.includes('SIM Swap') || formData.device.includes('Rooted')) calculatedRisk = 76.5;

    if (editingTransaction) {
      // UPDATE OPERATION
      const updatedList = transactions.map((tx) => {
        if (tx.id === editingTransaction.id) {
          return {
            ...tx,
            sender: formData.sender.trim(),
            beneficiary: formData.beneficiary.trim(),
            amount: numericAmount,
            rail: formData.rail,
            device: formData.device,
            verdict: formData.verdict,
            riskScore: calculatedRisk
          };
        }
        return tx;
      });

      setTransactions(updatedList);
      triggerToast('Record Updated', `Audit record ${editingTransaction.id} successfully updated.`);
      setEditingTransaction(null);
    } else {
      // CREATE OPERATION
      const newId = `TX-${Math.floor(100000 + Math.random() * 900000)}`;
      const now = new Date();
      const timestamp = `${now.toISOString().split('T')[0]} ${now.toLocaleTimeString()}`;

      const newRecord = {
        id: newId,
        sender: formData.sender.trim(),
        beneficiary: formData.beneficiary.trim(),
        amount: numericAmount,
        rail: formData.rail,
        device: formData.device,
        verdict: formData.verdict,
        riskScore: calculatedRisk,
        timestamp
      };

      setTransactions([newRecord, ...transactions]);
      triggerToast('Record Created', `Transaction ${newId} logged to persistent ledger.`);
      resetForm();
    }
  };

  // --------------------------------------------------------------------------
  // CRUD OPERATION 2: DELETE (With In-App Confirmation Modal)
  // --------------------------------------------------------------------------
  const confirmDelete = () => {
    if (!deleteCandidate) return;
    const remaining = transactions.filter((tx) => tx.id !== deleteCandidate.id);
    setTransactions(remaining);
    triggerToast('Record Purged', `Record ${deleteCandidate.id} removed from LocalStorage.`, 'warning');
    setDeleteCandidate(null);
    if (editingTransaction?.id === deleteCandidate.id) {
      setEditingTransaction(null);
    }
  };

  // --------------------------------------------------------------------------
  // CRUD OPERATION 3 & BONUS: READ WITH SEARCH & FILTER
  // --------------------------------------------------------------------------
  const filteredRecords = transactions.filter((tx) => {
    const query = searchQuery.toLowerCase().trim();
    const matchesSearch =
      tx.id.toLowerCase().includes(query) ||
      tx.sender.toLowerCase().includes(query) ||
      tx.beneficiary.toLowerCase().includes(query) ||
      tx.rail.toLowerCase().includes(query) ||
      tx.device.toLowerCase().includes(query);

    const matchesFilter = filterVerdict === 'ALL' || tx.verdict === filterVerdict;
    return matchesSearch && matchesFilter;
  });

  // Calculate Metrics
  const totalVolume = transactions.reduce((acc, curr) => acc + (curr.amount || 0), 0);
  const blockedCount = transactions.filter((t) => t.verdict === 'BLOCKED' || t.verdict === 'HALTED').length;

  return (
    <div className="min-h-screen flex flex-col bg-[#0e100f] text-[#fffce1] font-sans">
      
      {/* =================================================================== */}
      {/* IN-APP TOAST NOTIFICATION MODAL                                     */}
      {/* =================================================================== */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full bg-[#161917] border-2 border-[#0ae448] p-4 rounded-2xl shadow-2xl flex items-start gap-3 transition-all">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${toastMessage.type === 'error' ? 'bg-[#ff3b5c]/20 text-[#ff3b5c]' : 'bg-[#0ae448]/20 text-[#0ae448]'}`}>
            <i className={`fa-solid ${toastMessage.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-check'}`}></i>
          </div>
          <div className="flex-1">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-[#0ae448]">{toastMessage.title}</h4>
            <p className="text-xs text-gray-300 mt-0.5">{toastMessage.text}</p>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white">
            <i className="fa-solid fa-xmark text-xs"></i>
          </button>
        </div>
      )}

      {/* =================================================================== */}
      {/* IN-APP CONFIRMATION MODAL FOR DELETE                                */}
      {/* =================================================================== */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#161917] border border-[#ff3b5c]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#ff3b5c]/10 text-[#ff3b5c] border border-[#ff3b5c]/30 flex items-center justify-center text-xl mb-4">
              <i className="fa-solid fa-trash-can"></i>
            </div>
            <h3 className="text-lg font-bold font-['Outfit'] text-[#fffce1]">Confirm Audit Deletion</h3>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              Are you sure you want to permanently delete transaction record <strong className="text-[#fffce1] font-mono">{deleteCandidate.id}</strong> from your browser's persistent Local Storage?
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
                Yes, Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =================================================================== */}
      {/* APPLICATION HEADER & NAVIGATION                                     */}
      {/* =================================================================== */}
      <header className="sticky top-0 z-40 bg-[#0e100f]/90 backdrop-blur-xl border-b border-[#222724]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-[#161917] border border-[#0ae448]/50 flex items-center justify-center text-[#0ae448] shadow-[0_0_20px_rgba(10,228,72,0.2)]">
              <i className="fa-solid fa-eye text-xl"></i>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black font-['Outfit'] tracking-tight text-[#fffce1]">
                  Legal <span className="text-[#0ae448]">Eye</span>
                </span>
                <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-[#0ae448]/15 text-[#0ae448] border border-[#0ae448]/40 uppercase tracking-wider">
                  Autonomous Pre-Settlement Gateway
                </span>
              </div>
              <p className="text-[11px] text-gray-400 font-mono">Real-Time Recourse &amp; Audit Engine</p>
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
              <i className="fa-solid fa-table-list"></i>
              <span>Audit Ledger ({transactions.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('spec')}
              className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 ${
                activeTab === 'spec'
                  ? 'bg-[#0ae448] text-black shadow-lg shadow-[#0ae448]/20'
                  : 'bg-[#161917] text-gray-400 hover:text-white border border-[#2a302c]'
              }`}
            >
              <i className="fa-solid fa-shield-halved"></i>
              <span>Compliance Protocol</span>
            </button>
          </div>
        </div>
      </header>

      {/* =================================================================== */}
      {/* MAIN CONTENT AREA                                                   */}
      {/* =================================================================== */}
      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
        {activeTab === 'crud' ? (
          <div className="space-y-10">
            
            {/* Top Operational Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">TOTAL RECORDS</div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#fffce1] mt-1">{transactions.length}</div>
                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-database text-[#0ae448]"></i> LocalStorage synced
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">INTERCEPTED THREATS</div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#ff3b5c] mt-1">{blockedCount}</div>
                <div className="text-xs text-rose-400/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-ban"></i> Halted &amp; Blocked
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">CLEARED PAYMENTS</div>
                <div className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#0ae448] mt-1">{transactions.length - blockedCount}</div>
                <div className="text-xs text-[#0ae448]/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-check-double"></i> Verified safe
                </div>
              </div>
              <div className="p-5 rounded-2xl bg-[#161917] border border-[#2a302c]">
                <div className="text-[10px] font-mono text-gray-400 uppercase tracking-widest font-bold">AUDITED VALUE</div>
                <div className="text-xl sm:text-2xl font-black font-['Outfit'] text-[#9d95ff] mt-1 truncate">
                  ₹{totalVolume.toLocaleString('en-IN')}
                </div>
                <div className="text-xs text-[#9d95ff]/80 mt-1 flex items-center gap-1">
                  <i className="fa-solid fa-money-bill-wave"></i> Multi-rail volume
                </div>
              </div>
            </div>

            {/* FORM COMPONENT (CREATE & UPDATE) */}
            <div className="p-7 sm:p-9 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#222724] gap-2 mb-6">
                <div>
                  <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-[#0ae448]/10 text-[#0ae448] border border-[#0ae448]/30 text-[10px] font-mono font-bold uppercase mb-2">
                    <i className="fa-solid fa-sliders"></i> React Form &amp; State Handling
                  </div>
                  <h2 className="text-lg font-bold font-['Outfit'] text-[#fffce1] flex items-center gap-2">
                    <i className={`fa-solid ${editingTransaction ? 'fa-pen-to-square text-[#9d95ff]' : 'fa-circle-plus text-[#0ae448]'}`}></i>
                    {editingTransaction ? `Modify Record: ${editingTransaction.id}` : 'Create New Transaction Audit Log'}
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
                  
                  {/* Field 1: Sender VPA (Text Input) */}
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

                  {/* Field 2: Beneficiary VPA (Text Input) */}
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

                  {/* Field 3: Amount (Number Input) */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Transfer Quantum (₹) *
                    </label>
                    <div className="relative">
                      <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none text-xs font-mono font-bold text-[#0ae448]">
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

                  {/* Field 4: Payment Rail (Select Dropdown) */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Clearing Rail (Dropdown)
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

                  {/* Field 5: Hardware Fingerprint (Select Dropdown) */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Hardware Profile (Dropdown)
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

                  {/* Field 6: Double-Check Verdict (Radio Buttons) */}
                  <div>
                    <label className="block text-xs font-mono font-bold text-gray-300 uppercase tracking-wider mb-2">
                      Audit Verdict (Radio Group)
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
                    {editingTransaction ? 'Commit Updates to Storage' : 'Create & Save Audit Record'}
                  </button>
                </div>
              </form>
            </div>

            {/* TRANSACTION LEDGER TABLE (READ, UPDATE, DELETE & SEARCH) */}
            <div className="p-7 sm:p-9 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl space-y-6">
              
              {/* Filter and Search Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-[#222724]">
                <div>
                  <h3 className="text-lg font-bold font-['Outfit'] text-[#fffce1]">
                    Persistent Audit Records (Read, Filter, Update, Delete)
                  </h3>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">
                    Displaying {filteredRecords.length} of {transactions.length} total entries stored in <code className="text-[#0ae448]">localStorage</code>
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

                  {/* Search Bar (Bonus Task) */}
                  <div className="relative w-full sm:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-500 pointer-events-none text-xs">
                      <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search ID, handle, rail..."
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

              {/* Responsive Records Table */}
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
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="p-10 text-center text-gray-500 italic">
                          <i className="fa-solid fa-folder-open text-3xl mb-3 block text-gray-600"></i>
                          No audit records found matching query &ldquo;{searchQuery}&rdquo;.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((tx) => (
                        <tr key={tx.id} className="hover:bg-[#0e100f]/60 transition-colors">
                          
                          {/* Timestamp */}
                          <td className="p-4 text-gray-400 whitespace-nowrap">{tx.timestamp}</td>
                          
                          {/* ID */}
                          <td className="p-4 font-bold text-[#fffce1] whitespace-nowrap">
                            <span className="font-mono">{tx.id}</span>
                          </td>

                          {/* Participants */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="text-gray-300 font-bold">{tx.sender}</div>
                            <div className="text-[10px] text-gray-500">to {tx.beneficiary}</div>
                          </td>

                          {/* Amount */}
                          <td className="p-4 font-bold text-[#0ae448] whitespace-nowrap">
                            ₹{Number(tx.amount).toLocaleString('en-IN')}
                          </td>

                          {/* Rail & Device */}
                          <td className="p-4 whitespace-nowrap">
                            <div className="text-gray-300">{tx.rail}</div>
                            <div className="text-[10px] text-gray-500">{tx.device}</div>
                          </td>

                          {/* Verdict */}
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

                          {/* Action Buttons (Update & Delete) */}
                          <td className="p-4 text-right space-x-2 whitespace-nowrap">
                            <button
                              onClick={() => {
                                setEditingTransaction(tx);
                                window.scrollTo({ top: 150, behavior: 'smooth' });
                              }}
                              className="px-3 py-1.5 rounded-xl bg-[#0e100f] hover:bg-[#2a302c] text-[#9d95ff] border border-[#2a302c] text-xs font-bold transition-all"
                              title="Edit Record"
                            >
                              <i className="fa-solid fa-pen-to-square mr-1"></i> Edit
                            </button>
                            <button
                              onClick={() => setDeleteCandidate(tx)}
                              className="px-3 py-1.5 rounded-xl bg-[#0e100f] hover:bg-[#ff3b5c]/20 text-[#ff3b5c] border border-[#ff3b5c]/30 text-xs font-bold transition-all"
                              title="Delete Record"
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
          /* =============================================================== */
          /* REGULATORY COMPLIANCE & ARCHITECTURAL SPECIFICATION             */
          /* =============================================================== */
          <div className="p-8 sm:p-12 rounded-3xl bg-[#161917] border border-[#2a302c] shadow-2xl space-y-8">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#0ae448]/15 border border-[#0ae448]/40 text-[#0ae448] text-xs font-mono font-bold uppercase mb-3">
                <i className="fa-solid fa-shield-halved"></i> Statutory Compliance &amp; Protocol Standards
              </div>
              <h2 className="text-2xl sm:text-3xl font-black font-['Outfit'] text-[#fffce1]">
                Institutional Settlement &amp; Recourse Architecture
              </h2>
              <p className="text-sm text-gray-400 mt-2 leading-relaxed">
                Operating directly in the pre-clearing pathway across modern instant payment rails (UPI 2.0, FedNow, and SEPA Instant) to enforce deterministic zero-loss recourse before ledger settlement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-mono text-xs">
              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#0ae448] font-bold text-sm">1. Deterministic State &amp; Atomic Integrity</div>
                <p className="text-gray-400 font-sans">
                  Transactional records are immutably buffered through declarative component state. Real-time reconciliation eliminates latency-induced double-spend and unauthorized balance drain.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#9d95ff] font-bold text-sm">2. Non-Volatile Client Ledger Synchronization</div>
                <p className="text-gray-400 font-sans">
                  Continuous client-side persistence prevents audit footprint loss during transient network disconnects, maintaining complete forensic evidence trails across sessions.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-amber-400 font-bold text-sm">3. Multi-Rail Regulatory Calibration</div>
                <p className="text-gray-400 font-sans">
                  Dynamic rules enforce jurisdiction-specific mandates (RBI Master Directions for UPI, EU DORA for SEPA Instant, and FinCEN thresholds for FedNow) with automated velocity ceilings.
                </p>
              </div>

              <div className="p-5 rounded-2xl bg-[#0e100f] border border-[#2a302c] space-y-2">
                <div className="text-[#ff3b5c] font-bold text-sm">4. Sub-Millisecond Anomaly Quarantine</div>
                <p className="text-gray-400 font-sans">
                  High-risk payments flagged by SIM-swap attestation, impossible geographic velocity, or abnormal quantum spikes are quarantined before permanent settlement occurs.
                </p>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#0e100f] border border-[#2a302c]">
              <h4 className="text-xs font-mono font-bold text-[#0ae448] uppercase tracking-wider mb-2">
                Audit Ledger Engine Status
              </h4>
              <p className="text-xs text-gray-300 font-mono">
                Storage Namespace: <span className="text-[#fffce1]">{STORAGE_KEY}</span> | Active Verified Records: <span className="text-[#0ae448] font-bold">{transactions.length}</span> | Security Attestation: Origin-Isolated Non-Volatile Store
              </p>
            </div>
          </div>
        )}
      </main>

      {/* =================================================================== */}
      {/* FOOTER                                                              */}
      {/* =================================================================== */}
      <footer className="border-t border-[#222724] bg-[#090b0a] py-8 text-xs font-mono text-gray-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>&copy; 2026 Legal Eye Systems &middot; Autonomous Pre-Settlement Recourse Engine</div>
          <div className="text-gray-400">Global Financial Cyber-Resilience &amp; Payment Integrity Network</div>
        </div>
      </footer>

    </div>
  );
}
