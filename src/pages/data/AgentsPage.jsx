import React, { useState, useMemo } from 'react';
import { 
  UserCheck, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  FileDown, 
  Eye, 
  Trash2, 
  User, 
  Calendar,
  CheckCircle,
  Clock,
  HelpCircle,
  Camera,
  Edit3
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { exportApplications } from '../../utils/exportUtils';
import AddAgentModal from '../../components/AddAgentModal';

export default function AgentsPage() {
  const { 
    applications, 
    agents, 
    handleDeleteAgent, 
    handleOpenViewModal, 
    showToast 
  } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [agentToEdit, setAgentToEdit] = useState(null);

  // Group applications by agent
  const enrichedAgents = useMemo(() => {
    return agents.map(agent => {
      const agentApps = applications.filter(a => 
        a.agent && (
          a.agent.toLowerCase() === agent.name.toLowerCase() ||
          a.agent.toLowerCase().includes(agent.name.toLowerCase())
        )
      );

      const total = agentApps.length;
      const approved = agentApps.filter(a => a.status === 'Approved').length;
      const pending = agentApps.filter(a => a.status === 'Pending' || a.status === 'E-Sign Pending').length;
      const queries = agentApps.filter(a => a.status === 'Query Raised').length;

      return {
        ...agent,
        total,
        approved,
        pending,
        queries,
        apps: agentApps
      };
    }).sort((a, b) => b.total - a.total);
  }, [agents, applications]);

  const filteredAgents = useMemo(() => {
    if (!searchTerm.trim()) return enrichedAgents;
    const q = searchTerm.toLowerCase();
    return enrichedAgents.filter(a => 
      a.name.toLowerCase().includes(q) ||
      (a.mobile && a.mobile.includes(q)) ||
      (a.village && a.village.toLowerCase().includes(q))
    );
  }, [enrichedAgents, searchTerm]);

  // Active agent selected for detail panel
  const activeAgent = useMemo(() => {
    if (!selectedAgentId) return filteredAgents[0] || null;
    return enrichedAgents.find(a => a.id === selectedAgentId) || null;
  }, [selectedAgentId, filteredAgents, enrichedAgents]);

  const handleExportAgentCases = (agent) => {
    if (agent.apps.length === 0) {
      showToast('info', 'No applications found to export for this agent.');
      return;
    }
    exportApplications(agent.apps, {
      filenamePrefix: `Agent_${agent.name.replace(/\s+/g, '_')}_Cases`
    });
    showToast('success', `Exported ${agent.apps.length} applications for ${agent.name}.`);
  };

  const handleOpenCreateModal = () => {
    setAgentToEdit(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (agent) => {
    setAgentToEdit(agent);
    setIsAddModalOpen(true);
  };

  const handleDeleteAgentWithConfirm = (agent) => {
    if (window.confirm(`Are you sure you want to delete agent "${agent.name}"? This will remove the agent from the registered list.`)) {
      handleDeleteAgent(agent.id);
      if (activeAgent && activeAgent.id === agent.id) {
        setSelectedAgentId(null);
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-blue-600" />
            <span>Agent / Worker Management</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Register, edit and manage field agents with mobile, village, and photo. Monitor workload and assigned applications.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          <span>Add Agent</span>
        </button>
      </div>

      {/* Main 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Registered Agents List */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-3">
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search agent by name, phone, village..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-1">
            <span>Agents Directory ({filteredAgents.length})</span>
            <button
              onClick={handleOpenCreateModal}
              className="text-xs text-blue-600 hover:underline"
            >
              + New Agent
            </button>
          </div>

          <div className="max-h-[580px] overflow-y-auto space-y-1">
            {filteredAgents.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No agents found matching search.
              </div>
            ) : (
              filteredAgents.map(ag => {
                const isSelected = activeAgent && activeAgent.id === ag.id;
                return (
                  <div
                    key={ag.id}
                    className={`w-full p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-blue-50/80 border border-blue-200 shadow-2xs ring-1 ring-blue-500/20' 
                        : 'hover:bg-slate-50 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedAgentId(ag.id)}
                      className="flex items-center space-x-3 min-w-0 flex-1 text-left"
                    >
                      {/* Avatar / Photo */}
                      <div className="w-10 h-10 rounded-xl bg-blue-100 border border-blue-200 overflow-hidden flex items-center justify-center shrink-0">
                        {ag.photo ? (
                          <img src={ag.photo} alt={ag.name} className="w-full h-full object-cover" />
                        ) : (
                          <span className="font-bold text-blue-700 text-xs">
                            {ag.name.slice(0, 2).toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">{ag.name}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                          <Phone className="w-2.5 h-2.5 text-emerald-600" />
                          <span>{ag.mobile || 'No mobile'}</span>
                        </div>
                        {ag.village && (
                          <div className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                            <span>{ag.village}</span>
                          </div>
                        )}
                      </div>
                    </button>

                    <div className="flex items-center space-x-1 shrink-0">
                      <span className="text-xs font-black text-slate-900 font-mono px-2 py-0.5 bg-white/80 rounded border border-slate-100">
                        {ag.total}
                      </span>
                      
                      {/* Quick Edit button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(ag);
                        }}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded transition-colors"
                        title="Edit Agent"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

        </div>

        {/* Right Column: Selected Agent Details & Dossier */}
        <div className="lg:col-span-2 space-y-5">
          {activeAgent ? (
            <>
              {/* Agent Profile Card */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                  
                  <div className="flex items-center space-x-4">
                    {/* Photo with frame */}
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-sm shrink-0">
                      <div className="w-full h-full bg-white rounded-2xl overflow-hidden flex items-center justify-center">
                        {activeAgent.photo ? (
                          <img src={activeAgent.photo} alt={activeAgent.name} className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-8 h-8 text-blue-600" />
                        )}
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-black text-slate-900">{activeAgent.name}</h3>
                        <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                          Active Agent
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="flex items-center gap-1 text-slate-700 font-semibold font-mono">
                          <Phone className="w-3.5 h-3.5 text-emerald-600" />
                          <a href={`tel:${activeAgent.mobile}`} className="hover:underline">
                            {activeAgent.mobile || 'Not set'}
                          </a>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-rose-500" />
                          <span>{activeAgent.village || 'Odisha'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit, Delete, Export */}
                  <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto">
                    
                    {/* Edit Agent Button */}
                    <button
                      onClick={() => handleOpenEditModal(activeAgent)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1.5"
                      title="Edit Agent Details (Name, Mobile, Village, Photo)"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Edit Agent</span>
                    </button>

                    {/* Export Cases */}
                    <button
                      onClick={() => handleExportAgentCases(activeAgent)}
                      className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors flex items-center gap-1.5"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      <span>Export Cases</span>
                    </button>

                    {/* Delete Agent Button */}
                    <button
                      onClick={() => handleDeleteAgentWithConfirm(activeAgent)}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold border border-rose-200 transition-colors flex items-center gap-1.5"
                      title="Delete Agent"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>

                  </div>

                </div>

                {/* KPI Counters */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Assigned Cases</span>
                    <div className="text-xl font-black text-slate-900 font-mono">{activeAgent.total}</div>
                  </div>
                  <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-bold text-emerald-700 uppercase">Approved</span>
                    <div className="text-xl font-black text-emerald-700 font-mono">{activeAgent.approved}</div>
                  </div>
                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <span className="text-[10px] font-bold text-amber-700 uppercase">Pending</span>
                    <div className="text-xl font-black text-amber-700 font-mono">{activeAgent.pending}</div>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-xl border border-purple-100">
                    <span className="text-[10px] font-bold text-purple-700 uppercase">Queries (Q)</span>
                    <div className="text-xl font-black text-purple-700 font-mono">{activeAgent.queries}</div>
                  </div>
                </div>

              </div>

              {/* Assigned Applications Table */}
              <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Applications Managed by {activeAgent.name} ({activeAgent.apps.length})
                  </h4>
                  <span className="text-xs text-slate-400">Live Queue</span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase text-[10px] font-bold border-b border-slate-100">
                        <th className="pb-2">Beneficiary Name</th>
                        <th className="pb-2">Scheme</th>
                        <th className="pb-2">Track No</th>
                        <th className="pb-2">Block</th>
                        <th className="pb-2">Status</th>
                        <th className="pb-2 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeAgent.apps.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400">
                            No active applications currently assigned to {activeAgent.name}.
                          </td>
                        </tr>
                      ) : (
                        activeAgent.apps.map(app => (
                          <tr key={app.id} className="hover:bg-slate-50">
                            <td className="py-2.5 font-bold text-slate-900">{app.applicantName}</td>
                            <td className="py-2.5 text-slate-600">{app.serviceType}</td>
                            <td className="py-2.5 font-mono text-blue-600 font-semibold">{app.trackNo || '-'}</td>
                            <td className="py-2.5 text-slate-600">{app.block}</td>
                            <td className="py-2.5">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                {app.status}
                              </span>
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                onClick={() => handleOpenViewModal(app)}
                                className="p-1 text-slate-400 hover:text-blue-600 transition-colors"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
              Select an agent to view their details or click <strong>+ Add Agent</strong> above.
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Agent Modal */}
      <AddAgentModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAgentToEdit(null);
        }}
        agentToEdit={agentToEdit}
      />

    </div>
  );
}
