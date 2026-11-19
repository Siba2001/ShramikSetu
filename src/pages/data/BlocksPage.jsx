import React, { useState, useMemo } from 'react';
import { MapPin, Search, FileDown, Plus, CheckCircle, Clock, Archive } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportApplications } from '../../utils/exportUtils';

export default function BlocksPage() {
  const { applications, archivedApplications, allBlocksList, handleAddBlockToDistrict, districts, showToast } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [newBlockName, setNewBlockName] = useState('');
  const [targetDistrict, setTargetDistrict] = useState('Ganjam');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Group applications by block
  const blockStats = useMemo(() => {
    return allBlocksList.map(blockName => {
      const activeInBlock = applications.filter(a => a.block && a.block.toLowerCase() === blockName.toLowerCase());
      const archivedInBlock = archivedApplications.filter(a => a.block && a.block.toLowerCase() === blockName.toLowerCase());

      const total = activeInBlock.length;
      const pending = activeInBlock.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
      const inProgress = activeInBlock.filter(a => a.status === 'In Progress' || a.status === 'Query Replied').length;
      const approved = activeInBlock.filter(a => a.status === 'Approved').length;
      const completed = archivedInBlock.length;

      return {
        name: blockName,
        total,
        pending,
        inProgress,
        approved,
        completed
      };
    }).sort((a, b) => b.total - a.total);
  }, [allBlocksList, applications, archivedApplications]);

  const filteredBlocks = useMemo(() => {
    if (!searchTerm.trim()) return blockStats;
    const q = searchTerm.toLowerCase();
    return blockStats.filter(b => b.name.toLowerCase().includes(q));
  }, [blockStats, searchTerm]);

  // 1-Click Download for this block
  const handleDownloadBlock = (blockName) => {
    const blockApps = applications.filter(a => a.block && a.block.toLowerCase() === blockName.toLowerCase());
    if (blockApps.length === 0) {
      showToast('info', `No active applications found in ${blockName} block to export.`);
      return;
    }
    exportApplications(blockApps, {
      block: blockName,
      format: 'xlsx',
      filenamePrefix: `${blockName}_Block_Report`
    });
    showToast('success', `Exported ${blockApps.length} records for ${blockName} block.`);
  };

  const handleCreateBlock = (e) => {
    e.preventDefault();
    if (!newBlockName.trim()) return;
    handleAddBlockToDistrict(targetDistrict, newBlockName.trim());
    setNewBlockName('');
    setIsAddOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-teal-600" />
            <span>Block Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor block-wise application loads, pending queues, and download official block Excel spreadsheets
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Block</span>
        </button>
      </div>

      {/* Add Block Form */}
      {isAddOpen && (
        <form onSubmit={handleCreateBlock} className="bg-teal-50/50 border border-teal-200 rounded-2xl p-5 space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-teal-200/60 pb-2">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Add New Block to System</h3>
            <button 
              type="button" 
              onClick={() => setIsAddOpen(false)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Block / Municipality Name *</label>
              <input
                type="text"
                value={newBlockName}
                onChange={(e) => setNewBlockName(e.target.value)}
                placeholder="Enter block name..."
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-normal text-slate-800 placeholder:text-slate-400 placeholder:font-normal"
                required
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Parent District</label>
              <select
                value={targetDistrict}
                onChange={(e) => setTargetDistrict(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-xl font-medium"
              >
                {districts.map(d => (
                  <option key={d.id} value={d.name}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold"
            >
              Register Block
            </button>
          </div>
        </form>
      )}

      {/* Search Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search block name..."
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20"
          />
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Showing {filteredBlocks.length} blocks
        </span>
      </div>

      {/* Blocks Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10.5px] font-bold tracking-wider">
                <th className="py-3 px-4">Block / Municipality</th>
                <th className="py-3 px-3 text-center">Active Load</th>
                <th className="py-3 px-3 text-center">Pending</th>
                <th className="py-3 px-3 text-center">In Progress</th>
                <th className="py-3 px-3 text-center">Approved</th>
                <th className="py-3 px-3 text-center">Completed (Archived)</th>
                <th className="py-3 px-4 text-right">Block Report</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {filteredBlocks.map(block => (
                <tr key={block.name} className="hover:bg-slate-50/70 transition-colors">
                  
                  <td className="py-3 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-600" />
                    <span>{block.name} Block</span>
                  </td>

                  <td className="py-3 px-3 text-center font-black text-slate-900 font-mono">
                    {block.total}
                  </td>

                  <td className="py-3 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200 text-[11px]">
                      {block.pending}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px]">
                      {block.inProgress}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                      {block.approved}
                    </span>
                  </td>

                  <td className="py-3 px-3 text-center font-mono text-slate-600">
                    {block.completed}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDownloadBlock(block.name)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-700 text-xs font-bold border border-teal-200 transition-colors"
                      title={`Download Excel Data for ${block.name} Block`}
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Download Excel</span>
                    </button>
                  </td>

                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

