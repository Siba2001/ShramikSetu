import React, { useState } from 'react';
import { Building, Plus, MapPin, Layers, FileDown, Edit3 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function DistrictsPage() {
  const { districts, applications, handleAddDistrict, handleAddBlockToDistrict, showToast } = useApp();
  const [newDistrictName, setNewDistrictName] = useState('');
  const [newDistrictCode, setNewDistrictCode] = useState('');
  const [newDistrictHq, setNewDistrictHq] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New block inline state
  const [activeDistrictForBlock, setActiveDistrictForBlock] = useState(null);
  const [newBlockName, setNewBlockName] = useState('');

  const handleSubmitDistrict = (e) => {
    e.preventDefault();
    if (!newDistrictName.trim()) return;
    handleAddDistrict({
      name: newDistrictName.trim(),
      code: newDistrictCode.trim(),
      headquarter: newDistrictHq.trim(),
      blocks: []
    });
    setNewDistrictName('');
    setNewDistrictCode('');
    setNewDistrictHq('');
    setIsAddOpen(false);
  };

  const handleCreateBlock = (districtId) => {
    if (!newBlockName.trim()) return;
    handleAddBlockToDistrict(districtId, newBlockName.trim());
    setNewBlockName('');
    setActiveDistrictForBlock(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Page Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building className="w-5 h-5 text-indigo-600" />
            <span>District Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage administrative districts, headquarters, and associated block jurisdictions
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add District</span>
        </button>
      </div>

      {/* Add District Inline Modal / Card */}
      {isAddOpen && (
        <form onSubmit={handleSubmitDistrict} className="bg-indigo-50/50 border border-indigo-200 rounded-2xl p-5 space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-indigo-200/60 pb-2">
            <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">New District Details</h3>
            <button 
              type="button" 
              onClick={() => setIsAddOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">District Name *</label>
              <input
                type="text"
                value={newDistrictName}
                onChange={(e) => setNewDistrictName(e.target.value)}
                placeholder="e.g. Ganjam, Gajapati, Puri..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">District Code</label>
              <input
                type="text"
                value={newDistrictCode}
                onChange={(e) => setNewDistrictCode(e.target.value)}
                placeholder="e.g. OD-GM"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Headquarter</label>
              <input
                type="text"
                value={newDistrictHq}
                onChange={(e) => setNewDistrictHq(e.target.value)}
                placeholder="e.g. Chhatrapur"
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
            >
              Save District
            </button>
          </div>
        </form>
      )}

      {/* Districts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {districts.map(dist => {
          // Count total applications in this district
          const distApps = applications.filter(a => 
            (a.district && a.district.toLowerCase() === dist.name.toLowerCase()) ||
            (dist.blocks && dist.blocks.some(b => a.block && a.block.toLowerCase() === b.toLowerCase()))
          );
          const totalApps = distApps.length;
          const pendingApps = distApps.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
          const approvedApps = distApps.filter(a => a.status === 'Approved').length;

          return (
            <div key={dist.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
              
              <div className="flex items-start justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                    {dist.code || dist.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold text-slate-900">{dist.name} District</h3>
                    <p className="text-xs text-slate-400">Headquarters: {dist.headquarter || 'Not set'}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">{totalApps}</div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Applications</div>
                </div>
              </div>

              {/* Status Mini Badges */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Blocks</div>
                  <div className="text-sm font-black text-slate-800">{dist.blocks ? dist.blocks.length : 0}</div>
                </div>
                <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                  <div className="text-[10px] text-amber-600 font-bold uppercase">Pending</div>
                  <div className="text-sm font-black text-amber-700">{pendingApps}</div>
                </div>
                <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                  <div className="text-[10px] text-emerald-600 font-bold uppercase">Approved</div>
                  <div className="text-sm font-black text-emerald-700">{approvedApps}</div>
                </div>
              </div>

              {/* Associated Blocks Chips */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Associated Blocks / Municipalities ({dist.blocks ? dist.blocks.length : 0}):</span>
                  <button
                    onClick={() => setActiveDistrictForBlock(activeDistrictForBlock === dist.id ? null : dist.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold"
                  >
                    + Add Block
                  </button>
                </div>

                {/* Inline add block input */}
                {activeDistrictForBlock === dist.id && (
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                    <input
                      type="text"
                      value={newBlockName}
                      onChange={(e) => setNewBlockName(e.target.value)}
                      placeholder="Enter new block name..."
                      className="flex-1 px-3 py-1 text-xs bg-white border border-slate-300 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleCreateBlock(dist.id)}
                      className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold"
                    >
                      Add
                    </button>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {dist.blocks && dist.blocks.map(b => (
                    <span 
                      key={b} 
                      className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[11px] font-medium border border-slate-200"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}

