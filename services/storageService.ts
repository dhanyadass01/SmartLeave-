
import { User, LeaveRequest, Role, ActingStaffStatuses, ApprovalStatus, Gender, AppNotification } from '../types';

const USERS_KEY = 'smartleave_users_v20';
const LEAVES_KEY = 'smartleave_requests_v20';
const CURRENT_USER_KEY = 'smartleave_current_user_v20';
const NOTIFS_KEY = 'smartleave_notifications_v20';

const normalizeValue = (val: string) => (val || '').trim().toLowerCase();

/**
 * Robustly matches names by ignoring prefixes and comparing meaningful tokens.
 * Handles cases where one name has initials (e.g., "M. Lingaraj") and another doesn't ("Lingaraj").
 */
export const compareNamesFuzzy = (n1: string, n2: string): boolean => {
    if (!n1 || !n2) return false;
    
    const cleanTokens = (s: string) => s.toLowerCase()
        .replace(/\b(dr|mrs|mr|ms|prof)\.?\b/gi, '') // Remove common prefixes
        .split(/[\s\.\-]+/) // Split by space, dot, or hyphen
        .filter(t => t.length > 0);

    const t1 = cleanTokens(n1);
    const t2 = cleanTokens(n2);
    
    if (t1.length === 0 || t2.length === 0) return false;

    // Full token match (regardless of order)
    if (t1.length === t2.length && t1.every(t => t2.includes(t))) return true;

    // Subset match: Check significant tokens (length > 2)
    const sig1 = t1.filter(t => t.length > 2);
    const sig2 = t2.filter(t => t.length > 2);

    if (sig1.length > 0 && sig2.length > 0) {
        const [short, long] = sig1.length <= sig2.length ? [sig1, sig2] : [sig2, sig1];
        if (short.every(t => long.includes(t))) return true;
    }

    // Fallback: simple subset check for cases with many initials
    const [allShort, allLong] = t1.length <= t2.length ? [t1, t2] : [t2, t1];
    return allShort.every(t => allLong.includes(t));
};

export const DEPARTMENTS_DATA: Record<string, { hodName: string; email: string; department: string; hasMaternityLeave: boolean; shortCode: string }> = {
  'Computer Science': { hodName: 'Dr.M.Lingaraj Mani', email: 'lingarajmani@sankara.ac.in', department: 'Computer Science', hasMaternityLeave: false, shortCode: 'CS' },
  'CSDA': { hodName: 'Dr.R.Sasikala', email: 'sasikala@sankara.ac.in', department: 'CSDA', hasMaternityLeave: true, shortCode: 'CSDA' },
  'BSC IT': { hodName: 'Dr.A.Muthuchudar', email: 'muthuchudara@sankara.ac.in', department: 'BSC IT', hasMaternityLeave: true, shortCode: 'BSC IT' },
  'AI/ML': { hodName: 'Dr.M.Lingaraj Mani', email: 'lingarajmani.aiml@sankara.ac.in', department: 'AI/ML', hasMaternityLeave: false, shortCode: 'AIML' },
  'B.COM IT': { hodName: 'Dr.R.Umadevi', email: 'umadevi@sankara.ac.in', department: 'B.COM IT', hasMaternityLeave: true, shortCode: 'BCOM IT' },
  'B.COM': { hodName: 'Dr.P.S.Deepa', email: 'deepaps@sankara.ac.in', department: 'B.COM', hasMaternityLeave: true, shortCode: 'BCOM' },
  'B.COM PA': { hodName: 'Dr.R.Umadevi', email: 'umadevi.pa@sankara.ac.in', department: 'B.COM PA', hasMaternityLeave: true, shortCode: 'BCOM PA' },
  'CSHM': { hodName: 'Mr.P.Anandaraj', email: 'anandaraj@sankara.ac.in', department: 'CSHM', hasMaternityLeave: false, shortCode: 'CSHM' },
  'BBA CA': { hodName: 'Dr.S.Kavitha', email: 'skavitha@sankara.ac.in', department: 'BBA CA', hasMaternityLeave: true, shortCode: 'BBA CA' },
  'BCOM CA': { hodName: 'Mrs.C.Udaya', email: 'udayac@sankara.ac.in' , department: 'BCOM CA' , hasMaternityLeave: true, shortCode: 'BCOM CA' },
  'MBA': { hodName: 'Dr.Priya Kalyanasundaram', email: 'priya.mba@sankara.ac.in', department: 'MBA', hasMaternityLeave: true, shortCode: 'MBA' },
  'Msc.CS': { hodName: 'Dr.A.Muthuchudar', email: 'muthuchudar.msc@sankara.ac.in', department: 'Msc.CS', hasMaternityLeave: false, shortCode: 'MSC CS' },
  'M.Com': { hodName: 'Dr.P.S.Deepa', email: 'deepaps@sankara.ac.in', department: 'M.Com', hasMaternityLeave: true, shortCode: 'MCOM' },
  'Tamil': { hodName: 'Mr.R.Satheesh Mohan', email: 'satheeshmohanr@sankara.ac.in', department: 'Tamil', hasMaternityLeave: true, shortCode: 'TAM' },
  'English': { hodName: 'Dr.K.Valarmathi', email: 'valarmathik@sankara.ac.in', department: 'English', hasMaternityLeave: true, shortCode: 'ENG' },
  'Maths': { hodName: 'DR.M.Thiruchelvi', email: 'thiruchelvim@sankara.ac.in', department: 'Maths', hasMaternityLeave: true, shortCode: 'MAT' },
  'Non-Teaching Support': { hodName: 'Administrative Office', email: 'office@sankara.ac.in', department: 'Non-Teaching Support', hasMaternityLeave: false, shortCode: 'NTS' }
};

// Fix: Declared COMMON_DEPARTMENTS here once.
export const COMMON_DEPARTMENTS = ['Tamil', 'English', 'Maths'];

export const OFFICIAL_STAFF_DIRECTORY: Record<string, { name: string; department: string; email: string }> = {
  // Administration
  "dr.v.radhika": { name: "Dr.V.Radhika", department: "Administration", email: "radhikav@sankara.ac.in" },
  "mr.s.bernard edward": { name: "Mr.S.Bernard Edward", department: "Administration", email: "bernardedward@sankara.ac.in" },

  "dr.m.lingaraj mani": { name: "Dr.M.Lingaraj Mani", department: "Computer Science", email: "lingarajm@sankara.ac.in" },
  "dr.s.sathyapriya": { name: "Dr.S.SathyaPriya", department: "Computer Science", email: "sathyapriyas@sankara.ac.in" },
  "ms.p.bhavya": { name: "Ms.P.Bhavya", department: "Computer Science", email: "bhavyap@sankara.ac.in" },
  "mrs.t.nandhini": { name: "Mrs.T.Nandhini", department: "Computer Science", email: "nandhinit@sankara.ac.in" },
  "ms.d.hemalatha": { name: "Ms.D.Hemalatha", department: "Computer Science", email: "hemalathad@sankara.ac.in" },
  "dr.r.sasikala": { name: "Dr.R.Sasikala", department: "CSDA", email: "sasikalar@sankara.ac.in" },
  "mr.a.jayachandran": { name: "Mr.A.Jayachandran", department: "CSDA", email: "jayachandrana@sankara.ac.in" },
  "mrs.s.v.kavitha": { name: "Mrs.S.V.Kavitha", department: "CSDA", email: "kavithasv@sankara.ac.in" },
  "ms.a.swarnamugi": { name: "Ms.A.Swarnamugi", department: "CSDA", email: "swarnamugia@sankara.ac.in" },
  "mrs.gayathri": { name: "Mrs.Gayathri", department: "CSDA", email: "gayathri@sankara.ac.in" },
  "dr.a.muthuchudar": { name: "Dr.A.Muthuchudar", department: "BSC IT & Msc.CS", email: "muthuchudara@sankara.ac.in" },
  "ms.c.soundarya": { name: "Ms.C.Soundarya", department: "BSC IT", email: "soundaryac@sankara.ac.in" },
  "mrs.d.vinothini": { name: "Mrs.D.Vinothini", department: "BSC IT", email: "vinothinid@sankara.ac.in" },
  "mrs.s.sridevi karumari": { name: "Mrs.S.Sridevi Karumari", department: "BSC IT", email: "sridevikarumaris@sankara.ac.in" },
  "mr.s.atheesh kumar": { name: "Mr.S.Atheesh Kumar", department: "AI/ML", email: "atheeshkumars@sankara.ac.in" },
  "dr.r.umadevi": { name: "Dr.R.Umadevi", department: "B.COM IT & B.COM PA", email: "umadevir@sankara.ac.in" },
  "mr.n.thiagarajan": { name: "Mr.N.Thiagarajan", department: "B.COM IT & B.COM PA", email: "thiagarajann@sankara.ac.in" },
  "ms.a.sumathi": { name: "Ms.A.Sumathi", department: "B.COM IT & B.COM PA", email: "sumathia@sankara.ac.in" },
  "dr.c.a.anuratha": { name: "Dr.C.A.Anuratha", department: "B.COM IT & B.COM PA", email: "anurathaca@sankara.ac.in" },
  "dr.c.nandhini": { name: "Dr.C.Nandhini", department: "B.COM IT & B.COM PA", email: "nandhinic@sankara.ac.in" },
  "ms.s.keerthana": { name: "Ms.S.Keerthana", department: "B.COM IT & B.COM PA", email: "keerthanas@sankara.ac.in" },
  "mrs.so.priya": { name: "Mrs.So.Priya", department: "B.COM IT & B.COM PA", email: "priyaso@sankara.ac.in" },
  "dr.k.aruljothi": { name: "Dr.K.ArulJothi", department: "B.COM IT & B.COM PA", email: "aruljothik@sankara.ac.in" },
  "dr.p.s.deepa": { name: "Dr.P.S.Deepa", department: "B.COM & M.COM", email: "deepaps@sankara.ac.in" },
  "dr.p.ramachandran": { name: "Dr.P.Ramachandran", department: "B.COM & M.COM", email: "ramachandranp@sankara.ac.in" },
  "dr.m.saranya": { name: "Dr.M.Saranya", department: "B.COM & M.COM", email: "saranyam@sankara.ac.in" },
  "dr.a.vaideki": { name: "Dr.A.Vaideki", department: "B.COM & M.COM", email: "vaidekia@sankara.ac.in" },
  "ms.k.kiruthika": { name: "Ms.K.Kiruthika", department: "B.COM & M.COM", email: "kiruthikak@sankara.ac.in" },
  "mrs.j.indudurga": { name: "Mrs.J.Indudurga", department: "B.COM & M.COM", email: "dudurgaj@sankara.ac.in" },
  "dr.s.vinothini": { name: "Dr.S.Vinothini", department: "B.COM & M.COM", email: "vinothinis@sankara.ac.in" },
  "mr.libin christopher": { name: "Mr.Libin Christopher", department: "B.COM & M.COM", email: "libinchristopher@sankara.ac.in" },
  "mr.g.rohith": { name: "Mr.G.Rohith", department: "B.COM & M.COM", email: "rohith@sankara.ac.in" },
  "mrs.kanchana devi": { name: "Mrs.Kanchana Devi", department: "B.COM & M.COM", email: "kanchanam@sankara.ac.in" },
  
  // CSHM Department
  "mr.p.anandaraj": { name: "Mr.P.Anandaraj", department: "CSHM", email: "anandarajp@sankara.ac.in" },
  "mr.s.bernardedward": { name: "Mr.S.Bernard Edward", department: "CSHM", email: "viceprincipalarts@sankara.ac.in" },
  "mr.t.maruthasala prabu": { name: "Mr.T.Maruthasala Prabu", department: "CSHM", email: "maruthasalaprabut@sankara.ac.in" },
  "mr.c.rajasekar": { name: "Mr.C.Rajasekar", department: "CSHM", email: "rajasekarc@sankara.ac.in" },
  "mrs.m.revathi": { name: "Mrs.M.Revathi", department: "CSHM", email: "revathim@sankara.ac.in" },
  "ms.m.gayathri": { name: "Ms.M.Gayathri", department: "CSHM", email: "gayathrim@sankara.ac.in" },
  "mr.t.nandhakumar": { name: "Mr.T.Nandhakumar", department: "CSHM", email: "nandhakumart@sankara.ac.in" },

  // BBA CA Department
  "dr.s.kavitha": { name: "Dr.S.Kavitha", department: "BBA CA", email: "kavithas@sankara.ac.in" },
  "dr.b.bhuvaneswari": { name: "Dr.B.Bhuvaneswari", department: "BBA CA", email: "bhuvaneswarib@sankara.ac.in" },
  "ms.g.lakshmi priya": { name: "Ms.G.Lakshmi Priya", department: "BBA CA", email: "lakshmipriyag@sankara.ac.in" },
  "ms.s.chitralekha": { name: "Ms.S.ChitraLekha", department: "BBA CA", email: "chitralekhas@sankara.ac.in" },

  // MBA Department
  "dr.priya kalyanasundaram": { name: "Dr.Priya Kalyanasundaram", department: "MBA", email: "simshod@sankara.ac.in" },
  "dr.k.thirugnana sambanthan": { name: "Dr.K.Thirugnana Sambanthan", department: "MBA", email: "simsthiru@sankara.ac.in" },
  "dr.s.sethuram": { name: "Dr.S.Sethuram", department: "MBA", email: "sethuramsims@sankara.ac.in" },
  "mr.r.srithar": { name: "Mr.R.Srithar", department: "MBA", email: "sritharsims@sankara.ac.in" },
  "mr.n.venugopal": { name: "Mr.N.Venugopal", department: "MBA", email: "venugopalsims@sankara.ac.in" },
  "mrs.m.manjuladevi": { name: "Mrs.M.Manjuladevi", department: "MBA", email: "manjuladevisims@sankara.ac.in" },
  "mr.s.matheswaran": { name: "Mr.S.Matheswaran", department: "MBA", email: "matheswaransims@sankara.ac.in" },
  "ms.n.t.shrie bhubaneswari": { name: "Ms.N.T.Shrie Bhubaneswari", department: "MBA", email: "shriebhubaneswarisims@sankara.ac.in" },

  // Msc.CS Department
  "dr.a.muthuchudar.msc": { name: "Dr.A.Muthuchudar", department: "BSC IT & Msc.CS", email: "muthuchudar.msc@sankara.ac.in" },
  "ms.m.theinmozhi": { name: "Ms.M.Theinmozhi", department: "Msc.CS", email: "theinmozhim@sankara.ac.in" },
  "ms.s.bharathi": { name: "Ms.S.Bharathi", department: "Msc.CS", email: "bharathis@sankara.ac.in" },
  
  // Maths Department
  "dr.m.thiruchelvi": { name: "DR.M.Thiruchelvi", department: "Maths", email: "thiruchelvim@sankara.ac.in" },
  "mr.k.gunasekaran": { name: "MR.K.Gunasekaran", department: "Maths", email: "gunasekarank@sankara.ac.in" },
  "mr.s.bharath": { name: "MR.S.Bharath", department: "Maths", email: "bharaths@sankara.ac.in" },
  "dr.k.abirami": { name: "DR.K.Abirami", department: "Maths", email: "abiramik@sankara.ac.in" },
  "dr.k.bhuvaneshwari": { name: "DR.K.Bhuvaneshwari", department: "Maths", email: "bhuvaneshwarik@sankara.ac.in" },
  
  // English Department
  "dr.k.valarmathi": { name: "Dr.K.Valarmathi", department: "English", email: "valarmathik@sankara.ac.in" },
  "mr.s.sivakumar": { name: "Mr.S.Sivakumar", department: "English", email: "sivakumars@sivakumar@sankara.ac.in" },
  "ms.n.m.prabha": { name: "Ms.N.M.Prabha", department: "English", email: "prabhanm@sankara.ac.in" },
  "dr.r.divyadharshini": { name: "Dr.R.Divyadharshini", department: "English", email: "divyadharshinir@sankara.ac.in" },
  "ms.j.shruthi": { name: "Ms.J.Shruthi", department: "English", email: "shruthij@sankara.ac.in" },
  "ms.m.veerarajeshwari": { name: "Ms.M.Veera Rajeshwari", department: "English", email: "veerarajeshwarim@sankara.ac.in" },

  // Tamil Department
  "mr.r.satheesh mohan": { name: "Mr.R.Satheesh Mohan", department: "Tamil", email: "satheeshmohanr@sankara.ac.in" },
  "mrs.a.indumathi": { name: "Mrs.A.Indumathi", department: "Tamil", email: "indumathia@sankara.ac.in" },
  "mrs.p.sasikala": { name: "Mrs.P.Sasikala", department: "Tamil", email: "sasikalap@sankara.ac.in" },
  "mrs.s.poongodi": { name: "Mrs.S.Poongodi", department: "Tamil", email: "poongodis@sankara.ac.in" },
  "mrs.n.saratha mani": { name: "Mrs.N.Saratha Mani", department: "Tamil", email: "sarathamanin@sankara.ac.in" },

  // B.COM CA
  "mrs.c.udaya": { name: "Mrs.C.Udaya", department: "B.COM CA", email: "udayac@sankara.ac.in" },
  "ms.b.parimalam": { name: "Ms.B.Parimalam", department: "B.COM  CA", email: "parimalamb@sankara.ac.in" },
  "dr.m.kumudham": { name: "Dr.M.Kumudham", department: "B.COM CA", email: "kumudhamm@sankara.ac.in" },
  "ms.p. shri bhuvaneshwari": { name: "Ms.P. Shri Bhuvaneshwari", department: "B.COM CA", email: "shribhuvaneshwarip@sankara.ac.in" },
  "dr.s.easwari": { name: "Dr.S.Easwari", department: "B.COM CA", email: "easwaris@sankara.ac.in" },
  "ms.s.vinitha": { name: "Ms.S.Vinitha", department: "B.COM CA", email: "vinithas@sankara.ac.in" },
  "ms.s.archana": { name: "Ms.S.Archana", department: "B.COM CA", email: "archanas@sankara.ac.in" },
  "dr.s.sathyanarayanan": { name: "Dr.S.Sathyanarayanan", department: "B.COM CA", email: "sathyanarayanans@sankara.ac.in" },

};

export const storageService = {
  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  saveUser: async (user: User): Promise<void> => {
    const users = storageService.getUsers();
    const idx = users.findIndex(u => normalizeValue(u.email) === normalizeValue(user.email));
    if (idx > -1) users[idx] = user;
    else users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  loginUser: async (email: string, password?: string): Promise<User | null> => {
    const users = storageService.getUsers();
    const user = users.find(u => normalizeValue(u.email) === normalizeValue(email));
    if (user && user.password === password) {
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
    return null;
  },

  logoutUser: (): void => { localStorage.removeItem(CURRENT_USER_KEY); },

  getLeaves: (userId?: string): LeaveRequest[] => {
    const data = localStorage.getItem(LEAVES_KEY);
    const all: LeaveRequest[] = data ? JSON.parse(data) : [];
    const sorted = all.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    return userId ? sorted.filter(l => l.userId === userId) : sorted;
  },

  saveLeave: async (leave: LeaveRequest): Promise<void> => {
    const all = storageService.getLeaves();
    const idx = all.findIndex(l => l.id === leave.id);
    if (idx > -1) all[idx] = leave;
    else all.push(leave);
    localStorage.setItem(LEAVES_KEY, JSON.stringify(all));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getOfficialProfileByEmail: (email: string) => {
    const target = normalizeValue(email);
    return Object.values(OFFICIAL_STAFF_DIRECTORY).find(s => normalizeValue(s.email) === target) || null;
  },

  getOfficialProfile: (name: string) => {
    const target = normalizeValue(name);
    if (OFFICIAL_STAFF_DIRECTORY[target]) return OFFICIAL_STAFF_DIRECTORY[target];
    return Object.values(OFFICIAL_STAFF_DIRECTORY).find(s => compareNamesFuzzy(s.name, name)) || null;
  },

  getUserIdentities: (user: User): string[] => {
    const ids = [user.name];
    const offByEmail = storageService.getOfficialProfileByEmail(user.email);
    const offByName = storageService.getOfficialProfile(user.name);
    
    [offByEmail, offByName].forEach(official => {
        if (official && !ids.some(existing => normalizeValue(existing) === normalizeValue(official.name))) {
            ids.push(official.name);
        }
    });
    return ids;
  },

  getActingStaffOptions: (targetDept: string, userId: string) => {
    const registered = storageService.getUsers();
    const dir = Object.values(OFFICIAL_STAFF_DIRECTORY);
    const target = normalizeValue(targetDept);
    const common = COMMON_DEPARTMENTS.map(d => normalizeValue(d));

    const isCommon = common.includes(target);
    const filterFn = (s: { department?: string; name: string }) => {
        const d = normalizeValue(s.department || '');
        if (isCommon) return d === target;
        return d === target || common.includes(d);
    };

    const regFiltered = registered.filter(u => u.id !== userId && filterFn(u));
    const dirFiltered = dir.filter(filterFn);
    
    const results: User[] = [...regFiltered];
    const seen = new Set(regFiltered.map(u => normalizeValue(u.name)));

    dirFiltered.forEach(d => {
        if (!seen.has(normalizeValue(d.name))) {
            results.push({ id: `dir-${d.name}`, name: d.name, email: d.email, role: Role.STAFF, department: d.department, isTeachingStaff: true, gender: 'Other' });
        }
    });
    return results.sort((a,b) => a.name.localeCompare(b.name));
  },

  getActingRequests: (identities: string[]) => {
    const all = storageService.getLeaves();
    return all.filter(l => {
        if (!l.actingStaff) return false;
        return Object.values(l.actingStaff).some(day => 
            Object.values(day).some(name => name && identities.some(id => compareNamesFuzzy(name, id)))
        );
    });
  },

  notifyActingStaff: async (leave: LeaveRequest, senderName?: string) => {
    const users = storageService.getUsers();
    const notifsData = localStorage.getItem(NOTIFS_KEY);
    const allNotifs: AppNotification[] = notifsData ? JSON.parse(notifsData) : [];
    
    const targets = new Set<string>();
    Object.values(leave.actingStaff).forEach(day => {
        Object.values(day).forEach(name => {
            if (name && !['Free', 'N/A', ''].includes(name.trim())) targets.add(name);
        });
    });

    targets.forEach(staffName => {
        // Find registered user by checking all their possible identities against the assigned name
        const user = users.find(u => {
            const userIdentities = storageService.getUserIdentities(u);
            return userIdentities.some(id => compareNamesFuzzy(id, staffName));
        });

        if (user) {
            allNotifs.unshift({
                id: crypto.randomUUID(),
                userId: user.id,
                message: senderName ? `${senderName} (HoD) assigned you duty for ${leave.name}.` : `${leave.name} requested you for coverage.`,
                type: 'info',
                isRead: false,
                timestamp: new Date().toISOString(),
                leaveId: leave.id
            });
        }
    });
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(allNotifs));
    // Immediately notify UI that data has changed
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  updateActingStatus: async (leaveId: string, identities: string[], status: 'Approved' | 'Rejected', reason?: string) => {
    const all = storageService.getLeaves();
    const idx = all.findIndex(l => l.id === leaveId);
    if (idx === -1) return;

    const leave = all[idx];
    const newStats = { ...leave.actingStaffStatuses };
    const newReasons = { ...leave.actingStaffRejectionReasons };
    let affectedDate = "";

    Object.entries(leave.actingStaff).forEach(([date, day]) => {
        Object.entries(day).forEach(([p, name]) => {
            if (name && identities.some(id => compareNamesFuzzy(name, id))) {
                newStats[date][p] = status;
                affectedDate = date;
                if (status === 'Rejected' && reason) {
                    if (!newReasons[date]) newReasons[date] = {};
                    newReasons[date][p] = reason;
                }
            }
        });
    });

    leave.actingStaffStatuses = newStats;
    leave.actingStaffRejectionReasons = newReasons;
    await storageService.saveLeave(leave);

    // Notify the leave taker about acceptance/rejection
    const notifsData = localStorage.getItem(NOTIFS_KEY);
    const allNotifs = notifsData ? JSON.parse(notifsData) : [];
    allNotifs.unshift({
        id: crypto.randomUUID(),
        userId: leave.userId,
        message: `${identities[0]} has ${status.toLowerCase()} duty for ${affectedDate}.${status === 'Rejected' && reason ? ` Reason: ${reason}` : ''}`,
        type: status === 'Approved' ? 'success' : 'warning',
        isRead: false,
        timestamp: new Date().toISOString(),
        leaveId: leave.id
    });
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(allNotifs));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getNotifications: (userId: string) => {
    const data = localStorage.getItem(NOTIFS_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    return all.filter(n => n.userId === userId);
  },

  markNotificationsRead: async (userId: string) => {
    const data = localStorage.getItem(NOTIFS_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getLeavesForAuthority: (user: User) => {
    const all = storageService.getLeaves();
    return all.filter(l => {
        if (l.userId === user.id) return false;
        if (user.role === Role.HOD) {
            const userDept = normalizeValue(user.department || '');
            const leaveDept = normalizeValue(l.department || '');
            
            // Exact match
            if (userDept === leaveDept) return true;
            
            // Combined departments match (e.g. "B.COM & M.COM" oversees "B.COM" and "M.Com")
            if (userDept.includes('&')) {
                const depts = userDept.split('&').map(d => d.trim());
                return depts.some(d => normalizeValue(d) === leaveDept);
            }

            return false;
        }
        if (user.role === Role.PRINCIPAL || user.role === Role.VICE_PRINCIPAL) return l.hodApproval === 'Approved' || !l.isTeachingStaff;
        return false;
    });
  },

  getLeaveSummaryByDate: (date: string) => {
    const all = storageService.getLeaves();
    return all.filter(l => date >= l.fromDate && date <= l.toDate);
  },

  exportToExcel: (data: any[], fileName: string) => {
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(o => Object.values(o).join(',')).join('\n');
    const blob = new Blob([headers + '\n' + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `${fileName}.csv`; a.click();
  },

  isHodName: (name: string, department?: string): boolean => {
    if (department && DEPARTMENTS_DATA[department]) {
      return compareNamesFuzzy(DEPARTMENTS_DATA[department].hodName, name);
    }
    return Object.values(DEPARTMENTS_DATA).some(dept => compareNamesFuzzy(dept.hodName, name));
  },

  clearAllData: (): void => {
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(LEAVES_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);
    localStorage.removeItem(NOTIFS_KEY);
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
    window.location.reload();
  }
};
