
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, Role, DayType, ApprovalStatus } from '../types';
import { storageService } from '../services/storageService';

interface AuthorityDashboardProps {
  user: User;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [viewDate, setViewDate] = useState(new Date().toISOString().split('T')[0]);
  const [filterPendingOnly, setFilterPendingOnly] = useState(false);

  // Sync data whenever a change occurs
  useEffect(() => {
    const handleUpdate = () => setRefreshKey(prev => prev + 1);
    window.addEventListener('SMARTLEAVE_UPDATE', handleUpdate);
    return () => window.removeEventListener('SMARTLEAVE_UPDATE', handleUpdate);
  }, []);

  const allRequests = storageService.getLeavesForAuthority(user);
  
  // Logic to determine if a request is actionable by the current user
  const isActionable = (l: LeaveRequest) => {
    if (user.role === Role.HOD) return l.hodApproval === 'Pending';
    return l.adminApproval === 'Pending';
  };

  // Filter leaves based on the date they were RECEIVED (submittedAt)
  const dailyBoardData = useMemo(() => {
    const filteredByDate = allRequests.filter(l => l.submittedAt.startsWith(viewDate));
    if (filterPendingOnly) {
        return filteredByDate.filter(isActionable);
    }
    return filteredByDate;
  }, [allRequests, viewDate, filterPendingOnly]);

  const pendingCount = allRequests.filter(r => 
    user.role === Role.HOD ? r.hodApproval === 'Pending' : r.adminApproval === 'Pending'
  ).length;

  const handleAction = async (request: LeaveRequest, action: 'Approved' | 'Rejected') => {
    if (action === 'Rejected' && !rejectionReason.trim()) { 
        setRejectingId(request.id); 
        return; 
    }
    
    setLoadingAction(request.id);
    const updatedRequest = { ...request };

    if (user.role === Role.HOD) {
        updatedRequest.hodApproval = action;
        if (action === 'Rejected') { 
            updatedRequest.status = 'Rejected'; 
            updatedRequest.hodRejectionReason = rejectionReason; 
        }
    } else {
        updatedRequest.adminApproval = action;
        updatedRequest.status = action === 'Approved' ? 'Approved' : 'Rejected'; 
        if (action === 'Rejected') updatedRequest.adminRejectionReason = rejectionReason;
    }

    await storageService.saveLeave(updatedRequest);
    
    setRejectingId(null); 
    setRejectionReason(''); 
    setLoadingAction(null); 
    setRefreshKey(prev => prev + 1);
  };

  const handleExportSummary = () => {
    if (dailyBoardData.length === 0) return;
    
    const exportData = dailyBoardData.map(l => ({
        Staff_Name: l.name,
        Department: l.department,
        Type: l.dayType,
        From: l.fromDate,
        To: l.toDate,
        Reason: l.purpose,
        Status: l.status,
        Teaching: l.isTeachingStaff ? 'Yes' : 'No',
        Received_At: new Date(l.submittedAt).toLocaleString()
    }));
    
    storageService.exportToExcel(exportData, `Received_Leaves_${viewDate}`);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'Approved': return 'bg-green-100 text-green-700 border-green-200';
        case 'Rejected': return 'bg-red-100 text-red-700 border-red-200';
        case 'Pending': return 'bg-orange-100 text-orange-700 border-orange-200';
        default: return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col border-b border-slate-200 pb-8 gap-8">
        <div className="flex justify-between items-end">
          <div className="flex items-center gap-6">
            <img 
                src="https://www.sankaraadmissions.com/images/shield.png" 
                alt="Sankara Logo" 
                className="w-20 h-20 object-contain"
                referrerPolicy="no-referrer"
            />
            <div>
                <h2 className="text-4xl font-black text-slate-900 tracking-tight">Management Hub</h2>
                <p className="text-slate-500 font-medium">Internal Administration & Approval Center</p>
            </div>
          </div>
          <div className="text-right">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Total Outstanding Pending</span>
             <span className="text-2xl font-black text-blue-600">{pendingCount}</span>
          </div>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>Requests Board</button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>All History</button>
        </div>
      </div>

      {activeTab === 'pending' ? (
        <div className="bg-white rounded-[2.5rem] p-8 md:p-12 shadow-2xl border border-slate-100 overflow-hidden relative min-h-[600px]">
            {/* Background Accent Decor */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-50/40 rounded-full -mr-48 -mt-48 blur-3xl"></div>
            
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12 relative z-10">
                <div>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight">Daily Inbox Container</h3>
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px] mt-1">Viewing all requests received on selected date</p>
                </div>
                <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-[1.5rem] border border-slate-200 shadow-sm">
                        <button 
                            onClick={() => {
                                const d = new Date(viewDate);
                                d.setDate(d.getDate() - 1);
                                setViewDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-90"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <div className="px-4 flex flex-col items-center">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Received On</span>
                            <input 
                                type="date" 
                                value={viewDate} 
                                onChange={(e) => setViewDate(e.target.value)} 
                                className="bg-transparent border-none focus:ring-0 font-black text-sm text-slate-900 p-0 text-center"
                            />
                        </div>
                        <button 
                            onClick={() => {
                                const d = new Date(viewDate);
                                d.setDate(d.getDate() + 1);
                                setViewDate(d.toISOString().split('T')[0]);
                            }}
                            className="p-3 bg-white border border-slate-100 rounded-xl text-slate-400 hover:text-blue-600 transition-all shadow-sm active:scale-90"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleExportSummary}
                            disabled={dailyBoardData.length === 0}
                            className="bg-green-600 text-white px-5 py-3.5 rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 disabled:opacity-40 disabled:shadow-none flex items-center gap-2 text-[10px] font-black uppercase tracking-widest active:scale-95"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export
                        </button>
                    </div>
                </div>
            </div>

            {/* Daily Metrics Container */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10 relative z-10">
                <div 
                    onClick={() => setFilterPendingOnly(false)}
                    className={`p-6 rounded-3xl border shadow-sm flex flex-col cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${!filterPendingOnly ? 'bg-blue-600 border-blue-500 text-white shadow-blue-100' : 'bg-white border-slate-100 text-slate-900'}`}
                >
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${!filterPendingOnly ? 'text-blue-100' : 'text-slate-400'}`}>Total Received</span>
                    <span className="text-3xl font-black">{allRequests.filter(l => l.submittedAt.startsWith(viewDate)).length}</span>
                </div>
                <div 
                    onClick={() => setFilterPendingOnly(true)}
                    className={`p-6 rounded-3xl border shadow-sm flex flex-col cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${filterPendingOnly ? 'bg-orange-600 border-orange-500 text-white shadow-orange-100' : 'bg-white border-slate-100 text-orange-600'}`}
                >
                    <span className={`text-[9px] font-black uppercase tracking-widest block mb-1 ${filterPendingOnly ? 'text-orange-100' : 'text-orange-600'}`}>Pending Review</span>
                    <span className="text-3xl font-black">{allRequests.filter(l => l.submittedAt.startsWith(viewDate) && isActionable(l)).length}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                    <span className="text-[9px] font-black text-green-600 uppercase tracking-widest block mb-1">Approved Cases</span>
                    <span className="text-3xl font-black text-green-600">{allRequests.filter(l => l.submittedAt.startsWith(viewDate) && l.status === 'Approved').length}</span>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col">
                    <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-1">View Date</span>
                    <span className="text-sm font-black text-blue-800 uppercase">{new Date(viewDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
            </div>

            {/* Unified Request List Container */}
            <div className="bg-slate-50/50 rounded-[2.5rem] border border-slate-100 p-2 md:p-6 relative z-10">
                {dailyBoardData.length === 0 ? (
                    <div className="py-32 text-center flex flex-col items-center justify-center">
                        <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center border border-slate-100 mx-auto mb-6 shadow-sm">
                            <svg className="w-12 h-12 text-slate-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v10a2 2 0 002 2z" /></svg>
                        </div>
                        <h4 className="text-xl font-black text-slate-900 tracking-tight">{filterPendingOnly ? 'No Actionable Items' : 'Empty Inbox'}</h4>
                        <p className="text-slate-400 font-bold text-xs mt-2 uppercase tracking-[0.2em]">{filterPendingOnly ? 'All requests for this date have been processed.' : 'No leave requests were received on this date.'}</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {dailyBoardData.map(req => {
                            const actionable = isActionable(req);
                            const isRejecting = rejectingId === req.id;

                            return (
                                <div key={req.id} className={`bg-white p-6 md:p-8 rounded-[2.5rem] border transition-all ${actionable ? 'border-blue-200 shadow-xl shadow-blue-50/50 scale-[1.01]' : 'border-slate-100 shadow-sm opacity-80'}`}>
                                    <div className="flex flex-col lg:flex-row justify-between gap-8">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-5 mb-6">
                                                <div>
                                                    <h4 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{req.name}</h4>
                                                    <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg uppercase tracking-widest border border-blue-100">{req.department}</span>
                                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border shadow-sm ${getStatusBadge(req.status)}`}>
                                                            {req.status}
                                                        </span>
                                                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Received: {new Date(req.submittedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Leave Duration</span>
                                                    <p className="text-xs font-black text-slate-800">{formatDate(req.fromDate)} {req.toDate !== req.fromDate ? `to ${formatDate(req.toDate)}` : ''}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Leave Category</span>
                                                    <p className="text-xs font-black text-slate-800">{req.purpose}</p>
                                                </div>
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Day Type</span>
                                                    <p className="text-xs font-black text-slate-800">{req.dayType}</p>
                                                </div>
                                            </div>

                                            <details className="group">
                                                <summary className="text-[10px] font-black text-blue-600 cursor-pointer uppercase tracking-widest hover:text-blue-700 transition-colors flex items-center gap-2 w-fit">
                                                    <svg className="w-3 h-3 group-open:rotate-180 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" /></svg>
                                                    View Detailed Application
                                                </summary>
                                                <div className="mt-4 p-8 bg-slate-50 rounded-[2rem] border border-slate-200 font-serif italic text-sm text-slate-700 leading-relaxed whitespace-pre-wrap animate-in fade-in slide-in-from-top-1 shadow-inner">
                                                    {req.finalLetterContent}
                                                </div>
                                            </details>
                                        </div>

                                        {actionable && (
                                            <div className="flex flex-col gap-3 w-full lg:w-56 shrink-0 justify-center">
                                                {isRejecting ? (
                                                    <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                                                        <textarea 
                                                            value={rejectionReason}
                                                            onChange={(e) => setRejectionReason(e.target.value)}
                                                            className="w-full bg-slate-50 border border-red-200 rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-red-500 outline-none transition-all"
                                                            placeholder="Enter rejection reason..."
                                                            rows={3}
                                                        />
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => handleAction(req, 'Rejected')} 
                                                                className="flex-1 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-lg shadow-red-100 hover:bg-red-700 active:scale-95 transition-all"
                                                            >
                                                                Confirm
                                                            </button>
                                                            <button 
                                                                onClick={() => { setRejectingId(null); setRejectionReason(''); }} 
                                                                className="px-4 py-3 bg-white text-slate-400 border border-slate-200 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-slate-50 transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <>
                                                        <button 
                                                            disabled={loadingAction === req.id}
                                                            onClick={() => handleAction(req, 'Approved')} 
                                                            className="w-full py-5 bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            {loadingAction === req.id ? (
                                                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                            ) : (
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                                                            )}
                                                            Approve Request
                                                        </button>
                                                        <button 
                                                            disabled={loadingAction === req.id}
                                                            onClick={() => setRejectingId(req.id)} 
                                                            className="w-full py-5 bg-white border border-red-100 text-red-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:bg-red-50 active:scale-95 transition-all flex items-center justify-center gap-3"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            Reject
                                                        </button>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            
            <div className="mt-12 text-center text-slate-300 text-[10px] font-black uppercase tracking-[0.4em]">
                Unified Daily Requests Registry • Sankara Institutions
            </div>
        </div>
      ) : (
        <div className="grid gap-6">
            {allRequests.length === 0 ? (
                <div className="bg-white p-20 rounded-[2.5rem] border border-slate-100 text-center shadow-xl">
                    <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No history recorded yet</p>
                </div>
            ) : (
                allRequests.map(req => (
                    <div key={req.id} className="bg-white rounded-[2rem] p-8 md:p-10 shadow-lg border border-slate-100 flex flex-col md:flex-row justify-between gap-8 items-start md:items-center">
                        <div className="flex items-center gap-5">
                            <div>
                                <h4 className="font-black text-slate-900 tracking-tight">{req.name}</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{req.department} • Leave: {formatDate(req.fromDate)}</p>
                                <p className="text-[8px] text-slate-300 font-black uppercase mt-1">Received On: {new Date(req.submittedAt).toLocaleDateString()}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                            <div className="text-right">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Final Status</span>
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border ${getStatusBadge(req.status)}`}>
                                    {req.status}
                                </span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
      )}
    </div>
  );
};
