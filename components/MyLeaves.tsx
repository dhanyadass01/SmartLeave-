
import React from 'react';
import { LeaveRequest, User, DayType } from '../types';
import { storageService } from '../services/storageService';

interface MyLeavesProps {
  user: User;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

export const MyLeaves: React.FC<MyLeavesProps> = ({ user }) => {
  const leaves = storageService.getLeaves(user.id);

  const handleExport = () => {
    const exportData = leaves.map(r => ({
        ID: r.id.slice(0, 8),
        Purpose: r.purpose,
        From: r.fromDate,
        To: r.toDate,
        Type: r.dayType,
        Status: r.status,
        SubmittedAt: new Date(r.submittedAt).toLocaleString()
    }));
    storageService.exportToExcel(exportData, `My_Leave_History_${user.name.replace(/\s+/g, '_')}`);
  };

  if (leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 bg-white rounded-3xl shadow-sm border border-slate-200 mt-6 text-center">
        <h3 className="text-xl font-bold text-slate-900">No leaves applied yet</h3>
      </div>
    );
  }

  return (
    <div className="space-y-8 mt-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Leave History</h2>
        <button onClick={handleExport} className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-bold rounded-lg border border-green-200 hover:bg-green-100 transition-all">Export CSV</button>
      </div>
      
      <div className="grid gap-6">
        {leaves.map((leave) => (
          <div key={leave.id} className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 group">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-6 gap-4">
              <div>
                <span className={`inline-flex items-center px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide border ${leave.status === 'Approved' ? 'bg-green-50 text-green-700 border-green-100' : leave.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100' : 'bg-yellow-50 text-yellow-700 border-yellow-100'}`}>
                    {leave.status}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-2">{leave.purpose}</h3>
              </div>
              <div className="text-right text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                <span className="block text-xs font-bold uppercase text-slate-400 mb-1">Applied On</span>
                <span className="font-semibold text-slate-800">{new Date(leave.submittedAt).toLocaleDateString('en-GB')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Dates</span>
                <div className="font-semibold text-slate-800">
                   {leave.dayType === DayType.HALF_DAY ? formatDate(leave.fromDate) : `${formatDate(leave.fromDate)} to ${formatDate(leave.toDate)}`}
                </div>
              </div>
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 overflow-hidden">
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Acting Staff Verification</span>
                <div className="space-y-1 mt-2">
                    {Object.keys(leave.actingStaff).slice(0, 2).map(date => (
                        <div key={date} className="flex justify-between text-[10px]">
                            <span className="text-slate-500">{date}</span>
                            <span className="text-blue-600 font-bold">Details in Letter</span>
                        </div>
                    ))}
                    {Object.keys(leave.actingStaff).length > 2 && <p className="text-[10px] text-slate-400 italic">+ {Object.keys(leave.actingStaff).length - 2} more days</p>}
                </div>
              </div>
            </div>
            
            <details>
              <summary className="cursor-pointer text-sm font-bold text-blue-600">View Full Letter & Assignments</summary>
              <div className="mt-4 p-6 bg-slate-50 rounded-xl border border-slate-200 text-sm font-serif whitespace-pre-wrap text-slate-800 leading-relaxed">{leave.finalLetterContent}</div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
};
