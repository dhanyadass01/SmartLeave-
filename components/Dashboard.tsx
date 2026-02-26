import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, ApprovalStatus, LeavePurpose, Role } from '../types';
import { storageService, compareNamesFuzzy } from '../services/storageService';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [actingRequests, setActingRequests] = useState<{leave: LeaveRequest, date: string, periods: string[]}[]>([]);
  const [myHistory, setMyHistory] = useState<LeaveRequest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [decliningId, setDecliningId] = useState<string | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const identities = useMemo(() => storageService.getUserIdentities(user), [user]);

  useEffect(() => {
    const fetchDuties = () => {
      if (!user.isTeachingStaff) {
          setActingRequests([]);
          setMyHistory(storageService.getLeaves(user.id));
          return;
      }

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
      setMyHistory(storageService.getLeaves(user.id));
    };

    fetchDuties();
    const handleSyncUpdate = () => fetchDuties();
    window.addEventListener('storage', handleSyncUpdate);
    window.addEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
    const interval = setInterval(fetchDuties, 5000);
    return () => {
        window.removeEventListener('storage', handleSyncUpdate);
        window.removeEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
        clearInterval(interval);
    };
  }, [identities, user.id, user.isTeachingStaff, refreshKey]);

  const handleActingAction = async (leaveId: string, action: 'Approved' | 'Rejected') => {
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

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Approved': return 'text-green-600 bg-green-50 border-green-100';
        case 'Rejected': return 'text-red-600 bg-red-50 border-red-100';
        case 'Pending': return 'text-orange-500 bg-orange-50 border-orange-100';
        default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const activeLeave = useMemo(() => {
    return myHistory.find(l => l.status === 'Pending' || new Date(l.fromDate) >= new Date());
  }, [myHistory]);

  const leaveStats = useMemo(() => {
    const approved = myHistory.filter(l => l.status === 'Approved');
    let casualUsed = 0;
    let medicalUsed = 0;
    let onDutyUsed = 0;
    
    approved.forEach(l => {
        const start = new Date(l.fromDate);
        const end = new Date(l.toDate);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const val = l.dayType === 'Half Day' ? 0.5 : diffDays;
        
        if (l.purpose === LeavePurpose.ON_DUTY) {
            onDutyUsed += val;
        } else if (l.purpose === LeavePurpose.MEDICAL_LEAVE) {
            medicalUsed += val;
        } else {
            casualUsed += val;
        }
    });
    return { casualUsed, medicalUsed, onDutyUsed };
  }, [myHistory]);

  return (
    <div className="space-y-6 animate-fade-in pb-8 text-slate-900">
      <div className="mb-8">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Staff Dashboard</h2>
      </div>
      {/* Actionable Duties for colleagues - ONLY FOR TEACHING STAFF */}
      {user.isTeachingStaff && actingRequests.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-blue-600 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Pending Colleague Duties</h3>
                  <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{actingRequests.length} Pending</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actingRequests.map((note, idx) => {
                      const isDeclining = decliningId === note.leave.id;

                      return (
                        <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 relative">
                            {loadingId === note.leave.id && (
                                <div className="absolute inset-0 bg-white/50 z-10 rounded-2xl flex items-center justify-center">
                                    <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                </div>
                            )}
                            <p className="text-[11px] font-black text-slate-900 mb-1">{note.leave.name}</p>
                            <p className="text-[9px] text-blue-600 font-bold uppercase mb-3">{new Date(note.date).toLocaleDateString()} • {note.periods.join(', ')}</p>
                            
                            {isDeclining ? (
                                <div className="space-y-2">
                                    <textarea 
                                        value={declineReason}
                                        onChange={(e) => setDeclineReason(e.target.value)}
                                        className="w-full bg-white border border-red-200 rounded-lg p-2 text-[10px] outline-none"
                                        placeholder="Reason..."
                                    />
                                    <div className="flex gap-1">
                                        <button onClick={() => handleActingAction(note.leave.id, 'Rejected')} className="flex-1 py-1.5 bg-red-600 text-white text-[8px] font-black rounded-lg">Confirm</button>
                                        <button onClick={() => { setDecliningId(null); setDeclineReason(''); }} className="px-2 py-1.5 bg-white text-slate-400 border border-slate-200 text-[8px] font-black rounded-lg">Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-2">
                                    <button onClick={() => handleActingAction(note.leave.id, 'Approved')} className="flex-1 py-2 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Accept</button>
                                    <button onClick={() => setDecliningId(note.leave.id)} className="flex-1 py-2 bg-white text-slate-400 border border-slate-200 text-[9px] font-black rounded-lg uppercase tracking-widest">Decline</button>
                                </div>
                            )}
                        </div>
                      );
                  })}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest relative">Casual Leave</h4>
              <div className="flex items-baseline mt-2 relative">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{leaveStats.casualUsed}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">/ 12 Days</span>
              </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest relative">Medical Leave</h4>
              <div className="flex items-baseline mt-2 relative">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{leaveStats.medicalUsed}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">/ 3 Days</span>
              </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <h4 className="text-[9px] font-black text-emerald-500 uppercase tracking-widest relative">On Duty</h4>
              <div className="flex items-baseline mt-2 relative">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{leaveStats.onDutyUsed}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">Total Days</span>
              </div>
          </div>
      </div>

    </div>
  );
};
