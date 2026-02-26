
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, Role } from '../types';
import { storageService, compareNamesFuzzy } from '../services/storageService';

interface DutyRequestsProps {
  user: User;
}

export const DutyRequests: React.FC<DutyRequestsProps> = ({ user }) => {
  const [actingRequests, setActingRequests] = useState<{leave: LeaveRequest, date: string, periods: string[]}[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const identities = useMemo(() => storageService.getUserIdentities(user), [user]);

  useEffect(() => {
    const fetchDuties = () => {
        const reqs = storageService.getActingRequests(identities);
        const pendingNotifications: {leave: LeaveRequest, date: string, periods: string[]}[] = [];
        
        reqs.forEach(r => {
            Object.entries(r.actingStaff).forEach(([date, dailyAssignment]) => {
                const periodsForDate: string[] = [];
                Object.entries(dailyAssignment).forEach(([pKey, staffName]) => {
                    if (staffName && identities.some(id => compareNamesFuzzy(staffName, id))) {
                        if (r.actingStaffStatuses?.[date]?.[pKey] === 'Pending') {
                            periodsForDate.push(pKey.replace('period', 'P'));
                        }
                    }
                });
                if (periodsForDate.length > 0) {
                    pendingNotifications.push({ leave: r, date, periods: periodsForDate });
                }
            });
        });
        setActingRequests(pendingNotifications);
    };

    fetchDuties();
    const handleSyncUpdate = () => fetchDuties();
    window.addEventListener('storage', handleSyncUpdate);
    window.addEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
    const interval = setInterval(fetchDuties, 3000);
    return () => {
        window.removeEventListener('storage', handleSyncUpdate);
        window.removeEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
        clearInterval(interval);
    };
  }, [identities, refreshKey]);

  const handleAction = async (leaveId: string, action: 'Approved' | 'Rejected') => {
    if (action === 'Rejected' && !declineReason.trim()) {
        setDecliningId(leaveId);
        return;
    }

    setLoadingId(leaveId);
    await storageService.updateActingStatus(leaveId, identities, action, action === 'Rejected' ? declineReason : undefined);
    
    setLoadingId(null);
    setDecliningId(null);
    setDeclineReason('');
    setRefreshKey(prev => prev + 1);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { 
        day: 'numeric', 
        month: 'long', 
        year: 'numeric' 
    });
  };

  return (
    <div className="space-y-8 animate-fade-in pb-12 text-slate-900">
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-6 gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight">Duty Requests</h2>
          <p className="text-slate-500 font-medium">Review and respond to session cover requests.</p>
        </div>
        <div className="bg-blue-50 px-4 py-2 rounded-2xl border border-blue-100">
           <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{actingRequests.length} Pending Actions</span>
        </div>
      </div>

      {actingRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-white rounded-[2.5rem] shadow-sm border-2 border-dashed border-slate-100 text-center">
          <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-300">
            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          </div>
          <h3 className="text-xl font-bold text-slate-900">All caught up!</h3>
          <p className="text-slate-400 mt-1 font-medium">No pending duty delegation requests for you.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {actingRequests.map((note, idx) => {
            const isDeclining = decliningId === note.leave.id;

            return (
                <div key={idx} className={`bg-white rounded-[2rem] p-8 border border-slate-100 transition-all relative overflow-hidden group shadow-xl`}>
                  {loadingId === note.leave.id && (
                    <div className="absolute inset-0 bg-white/50 z-20 flex items-center justify-center">
                       <svg className="animate-spin h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    </div>
                  )}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform -z-0"></div>
                  
                  <div className="relative z-10">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-4">
                            <div>
                            <h4 className="font-black text-slate-900 leading-tight">{note.leave.name}</h4>
                            <p className="text-[10px] text-blue-600 font-black uppercase tracking-widest">{note.leave.department}</p>
                            </div>
                        </div>
                        <div className="flex flex-col items-end gap-1.5">
                            <div className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border ${
                                note.leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' : 
                                note.leave.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 
                                'bg-orange-50 text-orange-700 border-orange-100'
                            }`}>
                                {note.leave.status === 'Pending' ? 'Leave: Pending' : `Leave: ${note.leave.status}`}
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 mb-8">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2-2v12a2 2 0 002 2z" /></svg>
                          </div>
                          <p className="text-sm font-bold text-slate-700">{formatDate(note.date)}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-400">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          </div>
                          <p className="text-sm font-black text-slate-700">Periods: <span className="text-blue-600">{note.periods.join(', ')}</span></p>
                        </div>
                    </div>

                    {isDeclining ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                             <textarea 
                                value={declineReason}
                                onChange={(e) => setDeclineReason(e.target.value)}
                                className="w-full bg-slate-50 border border-red-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-red-500 outline-none"
                                placeholder="Reason for declining..."
                                rows={2}
                            />
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleAction(note.leave.id, 'Rejected')}
                                    disabled={!declineReason.trim()}
                                    className="flex-1 py-3 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl disabled:opacity-50"
                                >
                                    Confirm Decline
                                </button>
                                <button onClick={() => { setDecliningId(null); setDeclineReason(''); }} className="px-4 py-3 bg-white text-slate-400 font-black text-[10px] uppercase tracking-widest rounded-xl border border-slate-200">Cancel</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-3">
                          <button 
                            onClick={() => handleAction(note.leave.id, 'Approved')}
                            className="flex-1 py-4 bg-green-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-green-700 shadow-lg shadow-green-100 transition-all transform active:scale-95"
                          >
                            Accept Duty
                          </button>
                          <button 
                            onClick={() => setDecliningId(note.leave.id)}
                            className="flex-1 py-4 bg-white text-red-600 border border-red-100 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-red-50 transition-all"
                          >
                            Decline
                          </button>
                        </div>
                    )}
                  </div>
                </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
