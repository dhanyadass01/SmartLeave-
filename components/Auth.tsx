
import React, { useState, useEffect } from 'react';
import { User, Role, Gender } from '../types';
import { storageService, DEPARTMENTS_DATA, OFFICIAL_STAFF_DIRECTORY } from '../services/storageService';

interface AuthProps {
  initialRole: Role | null;
  forcedIsTeaching?: boolean;
  onLoginSuccess: (user: User) => void;
  onBack: () => void;
}

export const Auth: React.FC<AuthProps> = ({ initialRole, forcedIsTeaching = true, onLoginSuccess, onBack }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [selectedAdminRole, setSelectedAdminRole] = useState<Role>(Role.PRINCIPAL);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminPortal = initialRole === Role.PRINCIPAL || initialRole === Role.VICE_PRINCIPAL;
  // HOD portal should ALWAYS show department selection during registration and for login as requested.
  const isHodPortal = initialRole === Role.HOD;
  const hideDepartmentSelection = isAdminPortal || (!forcedIsTeaching && !isHodPortal);

  useEffect(() => {
    if (isAdminPortal) setDepartment('Administration');
    else if (!forcedIsTeaching && !isHodPortal) setDepartment('Non-Teaching Support');
    else setDepartment('');
  }, [isAdminPortal, forcedIsTeaching, isHodPortal, view]);

  // Auto-resolve identity by Email for both Login and Registration
  useEffect(() => {
    const targetEmail = email.trim().toLowerCase();
    if (targetEmail.endsWith('@sankara.ac.in')) {
      // 1. Check official staff directory
      const match = storageService.getOfficialProfileByEmail(targetEmail);
      
      // 2. Specifically for HODs, check the HOD specific emails in DEPARTMENTS_DATA
      let hodDeptMatch = '';
      if (isHodPortal) {
        const foundDept = Object.values(DEPARTMENTS_DATA).find(d => 
          d.email.toLowerCase() === targetEmail
        );
        if (foundDept) hodDeptMatch = foundDept.department;
      }

      if (hodDeptMatch) {
        setDepartment(hodDeptMatch);
      } else if (match) {
        if (!isAdminPortal) {
          // If we are in HOD portal, we prefer the match from DEPARTMENTS_DATA 
          // but fallback to the staff directory department if needed.
          setDepartment(match.department);
        }
      }

      // If registering, also auto-fill the name
      if (view === 'register' && match) {
        setName(match.name);
      }
    }
  }, [email, view, isAdminPortal, isHodPortal]);

  // Fallback identity resolution by Name (Registration only)
  useEffect(() => {
    if (view === 'register' && name.length > 2 && !email) {
      const match = storageService.getOfficialProfile(name);
      if (match && !isAdminPortal && (forcedIsTeaching || isHodPortal)) setDepartment(match.department);
    }
  }, [name, view, isAdminPortal, forcedIsTeaching, isHodPortal]);

  const validateDomain = (email: string) => email.trim().toLowerCase().endsWith('@sankara.ac.in');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validateDomain(email)) {
      setError('Please use your official @sankara.ac.in email address.');
      return;
    }
    setLoading(true);
    const loggedUser = await storageService.loginUser(email, password);
    if (loggedUser) {
      // If logging in as HOD, ensure selected department matches account
      if (isHodPortal && loggedUser.department !== department) {
        setError(`This account is registered for ${loggedUser.department}. Please select correctly.`);
        setLoading(false);
        return;
      }
      onLoginSuccess(loggedUser);
    } else {
      setError('Invalid credentials. Please verify your email and password.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Final sanity check against directory
    const officialByEmail = storageService.getOfficialProfileByEmail(email);
    const officialByName = storageService.getOfficialProfile(name);
    const resolvedMatch = officialByEmail || officialByName;

    let finalName = resolvedMatch ? resolvedMatch.name : name.trim();
    let finalDept = isAdminPortal ? 'Administration' : (resolvedMatch ? resolvedMatch.department : ((forcedIsTeaching || isHodPortal) ? department : 'Non-Teaching Support'));
    
    const targetEmail = email.trim().toLowerCase();
    if (!email || !password || !finalName || !finalDept) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!validateDomain(email)) {
      setError('Registration requires a @sankara.ac.in email.');
      return;
    }
    setLoading(true);
    const existingUsers = storageService.getUsers();
    if (existingUsers.find(u => u.email.trim().toLowerCase() === targetEmail && u.password)) {
      setError('An account with this email already exists.');
      setLoading(false);
      return;
    }
    const newUser: User = {
      id: crypto.randomUUID(),
      name: finalName,
      email: email.trim(),
      password,
      role: isAdminPortal ? selectedAdminRole : (initialRole || Role.STAFF),
      department: finalDept,
      isTeachingStaff: (forcedIsTeaching || isHodPortal) && !isAdminPortal,
      gender: 'Other' // Defaulting gender as requested to remove selection
    };
    await storageService.saveUser(newUser);
    const logged = await storageService.loginUser(email, password);
    if (logged) onLoginSuccess(logged);
    else setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="w-full max-w-md relative z-10">
        <button onClick={onBack} className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-[0.2em]">
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg> Back
        </button>
        <div className="bg-white/80 backdrop-blur-xl p-6 md:p-8 rounded-3xl shadow-2xl border border-white/20">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center mb-4 transform hover:scale-105 transition-transform duration-500">
                <img 
                    src="https://www.sankaraadmissions.com/images/shield.png" 
                    alt="Sankara Logo" 
                    className="w-16 h-16 object-contain"
                    referrerPolicy="no-referrer"
                />
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
            <p className="text-slate-500 text-xs mt-1 font-medium">{isAdminPortal ? 'Administration Portal' : (isHodPortal ? 'Head of Department' : (forcedIsTeaching ? 'Teaching Faculty' : 'Non-Teaching Staff'))} • Sankara</p>
          </div>
          {error && <div className="mb-4 p-3 bg-red-50 border border-red-100 text-red-600 text-[10px] font-bold rounded-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2"><svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> {error} </div>}
          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-4">
            {view === 'register' && isAdminPortal && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Administrative Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setSelectedAdminRole(Role.PRINCIPAL)}
                    className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedAdminRole === Role.PRINCIPAL ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Principal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedAdminRole(Role.VICE_PRINCIPAL)}
                    className={`py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${selectedAdminRole === Role.VICE_PRINCIPAL ? 'bg-blue-600 border-blue-600 text-white shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
                  >
                    Vice Principal
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Email</label>
              <div className="relative">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@sankara.ac.in" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold text-sm placeholder:text-slate-300" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300">
                    {storageService.getOfficialProfileByEmail(email) ? (
                        <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                    ) : (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                    )}
                </div>
              </div>
            </div>

            {(view === 'login' || view === 'register') && isHodPortal && (
              <div className="space-y-1 animate-in slide-in-from-top-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Department</label>
                <select 
                  required
                  value={department} 
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold text-sm text-slate-900"
                >
                  <option value="">Select your department...</option>
                  {Object.keys(DEPARTMENTS_DATA).map(d => d !== 'Non-Teaching Support' && d !== 'Administration' && <option key={d} value={d}>{d}</option>)}
                </select>
                {department && (
                  <p className="text-[9px] text-blue-600 font-black ml-1 uppercase tracking-tight">Department Identified ✓</p>
                )}
              </div>
            )}

            {view === 'register' && (
              <>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name (Institutional)</label>
                  <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter official name" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold text-sm placeholder:text-slate-300" />
                  {storageService.getOfficialProfile(name) && <p className="text-[8px] text-green-600 font-black ml-1 uppercase tracking-tight">Identity Recognized ✓</p>}
                </div>
                
                {!hideDepartmentSelection && !isHodPortal && (
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept</label>
                    <select required value={department} onChange={(e) => setDepartment(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold text-sm">
                      <option value="">Select...</option>
                      {Object.keys(DEPARTMENTS_DATA).map(d => d !== 'Non-Teaching Support' && d !== 'Administration' && <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                )}
              </>
            )}
            
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Password</label>
              <div className="relative">
                <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold text-sm placeholder:text-slate-300" />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300"><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg></div>
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform active:scale-[0.98] flex items-center justify-center gap-2 relative overflow-hidden group">
              {loading && <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              <span className="uppercase tracking-widest text-xs">{loading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Join Now')}</span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            </button>
          </form>
          <div className="mt-6 text-center">
            <button onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }} className="text-[10px] font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest">{view === 'login' ? "Don't have an account? Create one" : "Already registered? Sign in instead"}</button>
          </div>
        </div>
        <p className="mt-6 text-center text-slate-400 text-[9px] font-black uppercase tracking-[0.3em]">Secure Gateway • Sankara Institution</p>
      </div>
    </div>
  );
};
