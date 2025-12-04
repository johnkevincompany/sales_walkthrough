import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  Phone, 
  Mail, 
  Camera, 
  CheckCircle, 
  AlertTriangle, 
  ChevronRight, 
  ChevronLeft, 
  Mic, 
  Save, 
  FileText,
  ClipboardCheck,
  Building2,
  Loader2,
  Wifi,
  UserPlus,
  HardHat,
  Search,
  ArrowRight,
  Share2,
  Copy,
  Link as LinkIcon,
  Lock,
  Unlock,
  TestTube 
} from 'lucide-react';

// --- FIREBASE IMPORTS ---
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken,
  onAuthStateChanged 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query 
} from "firebase/firestore";

// --- CONFIGURATION ---
// 1. FIREBASE
  const firebaseConfig = {
    apiKey: "AIzaSyDzV7uc4fBmvjdTF67g6bsFElyfyCVMzsc",
    authDomain: "sales-walkthrough.firebaseapp.com",
    projectId: "sales-walkthrough",
    storageBucket: "sales-walkthrough.firebasestorage.app",
    messagingSenderId: "413932370308",
    appId: "1:413932370308:web:5827e29ade91fbfefa05d1"
  };

  // 2. YOU MUST HAVE THESE 3 LINES TO FIX THE ERROR:
const app = initializeApp(firebaseConfig); // <--- This line uses 'initializeApp'
const auth = getAuth(app);
const db = getFirestore(app);
const appId = "lc-custom-sales";

// 2. ZAPIER (REPLACE THIS WITH YOUR ACTUAL WEBHOOK URL)
// Create a Zap -> Trigger: Webhooks by Zapier (Catch Hook) -> Copy URL
const ZAPIER_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25601836/ukvgzxm/"; 

/ --- SUB-COMPONENTS --- /

// 1. STAFF LOGIN GATE
const StaffLogin = ({ onLogin, onCancel }) => {
  const [passcode, setPasscode] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setLoading(true);
    setTimeout(() => {
      if (passcode === "1234") {
        onLogin();
      } else {
        setError(true);
        setPasscode("");
      }
      setLoading(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="bg-amber-500 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full mx-auto flex items-center justify-center mb-2 backdrop-blur-sm">
            <Lock className="text-slate-900" size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">STAFF ACCESS</h2>
          <p className="text-slate-900/80 font-medium">Secured Client Files</p>
        </div>
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          <div>
             <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Enter Access Code</label>
             <input 
               type="password" 
               inputMode="numeric"
               autoFocus
               className={`w-full p-4 text-center text-3xl font-bold tracking-widest border-2 rounded-xl focus:ring-4 focus:ring-amber-500/20 outline-none transition-all ${error ? 'border-red-500 bg-red-50 text-red-600' : 'border-slate-200 text-slate-800'}`}
               placeholder="••••"
               maxLength={4}
               value={passcode}
               onChange={(e) => { setError(false); setPasscode(e.target.value); }}
             />
             {error && <p className="text-red-500 text-sm font-bold text-center mt-2 animate-pulse">Incorrect Access Code</p>}
          </div>
          <button 
            disabled={loading || passcode.length < 4}
            type="submit" 
            className="w-full py-4 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all flex justify-center items-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin" /> : "Unlock Dashboard"}
          </button>
        </form>
        <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
          <button onClick={onCancel} className="text-slate-500 font-bold text-sm hover:text-slate-800">Cancel / Return Home</button>
        </div>
      </div>
      <p className="text-slate-500 mt-8 text-sm">Demo Access Code: <span className="font-mono bg-slate-800 text-white px-2 py-1 rounded">1234</span></p>
    </div>
  );
};

// 2. LEAD INTAKE FORM (The "Customer" View)
const IntakeForm = ({ onCancel, onSubmit }) => {
  const [formData, setFormData] = useState({
    clientName: "",
    email: "",
    phone: "",
    address: "",
    mailingAddress: "",
    projectType: "New Build",
    vision: "",
    budget: "",
    source: "",
    contactMethod: "Email"
  });
  const [isTestMode, setIsTestMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Auto-Split Name Logic for Contractor Foreman
    const nameParts = formData.clientName.trim().split(' ');
    const firstName = nameParts[0] || "Unknown";
    // Join the rest of the name parts for Last Name, or default to "Client" if none
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "Client";
    
    const finalClientName = isTestMode ? `[TEST] - ${formData.clientName}` : formData.clientName;
    
    const payload = {
      ...formData,
      firstName: firstName, // Explicitly send first name
      lastName: lastName,   // Explicitly send last name
      clientName: finalClientName,
      status: "Ready for Walkthrough",
      dateCreated: new Date().toISOString(),
      isTest: isTestMode
    };

    try {
      // Send to Zapier
      if (ZAPIER_WEBHOOK_URL && ZAPIER_WEBHOOK_URL.includes('hooks.zapier.com')) {
         try {
           await fetch(ZAPIER_WEBHOOK_URL, {
             method: 'POST',
             body: JSON.stringify(payload)
           });
           console.log("Zapier Payload Sent");
         } catch (zapError) {
           console.warn("Zapier connection failed (ignoring for app flow):", zapError);
         }
      }

      // Save to Firebase
      await onSubmit(payload);

    } catch (error) {
      console.error("Error submitting form:", error);
      alert("Error submitting. Please try again.");
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 animate-in fade-in slide-in-from-bottom-8">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-xl overflow-hidden border border-slate-200">
        <div className="bg-slate-900 p-8 text-white text-center relative overflow-hidden">
          {isTestMode && (
            <div className="absolute top-0 left-0 right-0 bg-amber-400 text-slate-900 text-xs font-bold py-1">
              TEST MODE ACTIVE - DATA WILL BE FLAGGED
            </div>
          )}
          <div className="w-16 h-16 bg-amber-500 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg text-slate-900 font-black text-2xl">LC</div>
          <h2 className="text-3xl font-bold mb-2">Start Your Project</h2>
          <p className="text-slate-400">Tell us about your vision below.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-end">
            <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-3 py-1 rounded-full border border-slate-200 hover:bg-slate-200 transition-colors">
              <input 
                type="checkbox" 
                checked={isTestMode} 
                onChange={e => setIsTestMode(e.target.checked)}
                className="rounded text-amber-500 focus:ring-amber-500" 
              />
              <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                <TestTube size={12}/> {isTestMode ? "Test Mode ON" : "Test Mode OFF"}
              </span>
            </label>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Contact Information</h3>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Jane Doe" 
                value={formData.clientName} onChange={e => updateField('clientName', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Email address <span className="text-red-500">*</span></label>
                <input required type="email" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="name@example.com"
                  value={formData.email} onChange={e => updateField('email', e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Phone Number <span className="text-red-500">*</span></label>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-slate-400 text-sm font-medium">(+1)</span>
                  <input required type="tel" className="w-full pl-12 p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="555-0123"
                    value={formData.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Preferred Contact Method <span className="text-red-500">*</span></label>
              <div className="flex gap-4">
                {['Email', 'Phone', 'Text'].map(method => (
                  <label key={method} className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="contactMethod"
                      value={method}
                      checked={formData.contactMethod === method}
                      onChange={e => updateField('contactMethod', e.target.value)}
                      className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-slate-700">{method}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Locations & Vision */}
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-bold text-slate-900 border-b pb-2">Project Vision</h3>
             <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">What's the project address? <span className="text-red-500">*</span></label>
              <input required type="text" className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="123 Project St..."
                value={formData.address} onChange={e => updateField('address', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Type Of Project <span className="text-red-500">*</span></label>
              <select className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.projectType} onChange={e => updateField('projectType', e.target.value)}>
                <option>New Build</option>
                <option>Renovation</option>
                <option>Addition</option>
                <option>Repair/Maintenance</option>
                <option>Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Estimated Budget <span className="text-slate-400 font-normal">(Optional)</span></label>
              <select className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                value={formData.budget} onChange={e => updateField('budget', e.target.value)}>
                <option value="">Select a range</option>
                <option>$5k - $10k</option>
                <option>$10k - $25k</option>
                <option>$25k - $50k</option>
                <option>$50k - $100k</option>
                <option>$100k+</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Tell Us About Your Vision <span className="text-red-500">*</span></label>
              <textarea 
                required 
                className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                rows="5" 
                maxLength={2000}
                placeholder="I want to update my kitchen with modern cabinets..."
                value={formData.vision} 
                onChange={e => updateField('vision', e.target.value)}
              ></textarea>
              <div className="text-right text-xs text-slate-400 mt-1">{formData.vision.length}/2000</div>
            </div>
          </div>

          <div className="pt-6 flex gap-3">
            <button type="button" onClick={onCancel} className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">Cancel</button>
            <button disabled={isSubmitting} type="submit" className="flex-1 py-3 bg-slate-900 text-white font-bold rounded-lg shadow-lg hover:bg-slate-800 flex justify-center items-center gap-2 transition-all active:scale-95">
              {isSubmitting ? <Loader2 className="animate-spin" /> : <>Submit Inquiry <ArrowRight size={18}/></>}
            </button>
          </div>
        </form>
      </div>
      <p className="text-center text-slate-400 text-xs mt-6 pb-6">Secure Form • Live Database Connection</p>
    </div>
  );
};

// 3. WALKTHROUGH FLOW (The "Salesman" View)
const WalkthroughFlow = ({ lead, onBack, onComplete }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    ...lead,
    decisionMakers: lead.decisionMakers || "",
    parking: lead.parking || "",
    access: lead.access || "",
    budget: lead.budget || "",
    timeline: lead.timeline || "",
    scopeNotes: lead.scopeNotes || "",
    photos: lead.photos || { exterior: false, interior: false, detail: false, systems: false },
    nextStepDate: lead.nextStepDate || "",
    leadTemperature: lead.leadTemperature || ""
  });

  const updateField = (f, v) => setFormData(p => ({ ...p, [f]: v }));
  const updatePhoto = (t) => setFormData(p => ({ ...p, photos: { ...p.photos, [t]: !p.photos[t] } }));

  // --- STEPS ---
  const renderStep = () => {
    switch(step) {
      case 0: // Pre-Walkthrough Review
        return (
          <div className="space-y-6 animate-in slide-in-from-right">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">{lead.clientName}</h2>
                    <p className="text-slate-500 flex items-center gap-1 mt-1"><MapPin size={16}/> {lead.address}</p>
                  </div>
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-green-700">
                    <UserPlus size={20}/>
                  </div>
                </div>
                <div className="space-y-3 pt-4 border-t border-slate-100">
                   <div className="flex gap-3">
                      <a href={`tel:${lead.phone}`} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center gap-2 text-sm font-bold">
                        <Phone size={16}/> Call
                      </a>
                      <a href={`mailto:${lead.email}`} className="flex-1 py-2 bg-slate-100 text-slate-700 rounded-lg flex items-center justify-center gap-2 text-sm font-bold">
                        <Mail size={16}/> Email
                      </a>
                   </div>
                   <div className="bg-amber-50 p-4 rounded-lg text-amber-900 text-sm mt-4 space-y-2">
                      <div><strong>Vision:</strong> "{lead.vision}"</div>
                      {lead.budget && <div><strong>Initial Budget:</strong> {lead.budget}</div>}
                   </div>
                </div>
             </div>
             <p className="text-center text-slate-500 text-sm">Review this before exiting your vehicle.</p>
          </div>
        );
      case 1: // Scope
        return (
          <div className="space-y-6 animate-in slide-in-from-right">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2"><Building2 className="text-blue-600"/> Estimate Prep</h3>
               <div className="grid grid-cols-2 gap-4 mb-4">
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Target Budget</label>
                   <input type="text" placeholder="$0" className="w-full p-3 bg-slate-50 border rounded-lg font-bold" 
                     value={formData.budget} onChange={e => updateField('budget', e.target.value)} />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-slate-500 uppercase">Timeline</label>
                   <input type="text" placeholder="By when?" className="w-full p-3 bg-slate-50 border rounded-lg font-bold"
                     value={formData.timeline} onChange={e => updateField('timeline', e.target.value)} />
                 </div>
               </div>
               <div>
                  <label className="flex justify-between text-sm font-bold text-slate-600 mb-2">
                    <span>Scope of Work</span>
                    <span className="text-blue-600 flex items-center gap-1 text-xs"><Mic size={12}/> Dictate</span>
                  </label>
                  <textarea rows={6} className="w-full p-4 border rounded-lg text-lg leading-relaxed focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe the work to be estimated..."
                    value={formData.scopeNotes} onChange={e => updateField('scopeNotes', e.target.value)}></textarea>
               </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
               <h3 className="font-bold text-slate-800 mb-3">Site Logistics</h3>
               <div className="grid grid-cols-2 gap-3">
                 <select className="p-3 border rounded-lg bg-white" value={formData.parking} onChange={e => updateField('parking', e.target.value)}>
                   <option value="">Parking...</option>
                   <option>Driveway</option>
                   <option>Street</option>
                   <option>Difficult</option>
                 </select>
                 <select className="p-3 border rounded-lg bg-white" value={formData.access} onChange={e => updateField('access', e.target.value)}>
                   <option value="">Access...</option>
                   <option>Front Door</option>
                   <option>Side Gate</option>
                   <option>Garage</option>
                 </select>
               </div>
            </div>
          </div>
        );
      case 2: // Photos
        return (
          <div className="space-y-6 animate-in slide-in-from-right">
             <div className="text-center"><h2 className="text-xl font-bold">Photo Checklist</h2></div>
             <div className="grid grid-cols-2 gap-4">
                {['exterior', 'interior', 'detail', 'systems'].map(k => (
                  <button key={k} onClick={() => updatePhoto(k)} className={`p-6 rounded-xl border-2 flex flex-col items-center gap-2 ${formData.photos[k] ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-dashed text-slate-400'}`}>
                    {formData.photos[k] ? <CheckCircle size={32}/> : <Camera size={32}/>}
                    <span className="capitalize font-semibold">{k}</span>
                  </button>
                ))}
             </div>
          </div>
        );
      case 3: // Audit
        return (
           <div className="space-y-6 animate-in slide-in-from-right">
             <div className="bg-slate-900 text-white p-6 rounded-xl">
                <h2 className="text-xl font-bold mb-4">Driveway Audit</h2>
                <label className="text-xs font-bold text-slate-400 uppercase">Next Activity</label>
                <input type="text" placeholder="e.g. Send Quote by Friday" className="w-full p-3 bg-slate-800 border-slate-700 border rounded-lg text-white mb-4"
                  value={formData.nextStepDate} onChange={e => updateField('nextStepDate', e.target.value)} />
                <label className="text-xs font-bold text-slate-400 uppercase">Lead Temp</label>
                <div className="flex gap-2 mt-1">
                   {['Cold', 'Warm', 'Hot'].map(t => (
                     <button key={t} onClick={() => updateField('leadTemperature', t)} className={`flex-1 py-2 rounded border font-bold ${formData.leadTemperature === t ? 'bg-amber-500 border-amber-500' : 'border-slate-600 text-slate-400'}`}>{t}</button>
                   ))}
                </div>
             </div>
           </div>
        );
      default: return null;
    }
  };

  const handleSync = async () => {
    setIsSubmitting(true);
    try {
      await onComplete({
        ...formData,
        status: "Estimate Pending"
      });
    } catch (error) {
      console.error("Error saving walkthrough:", error);
      alert("Failed to save walkthrough. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 flex justify-between items-center">
        <button onClick={onBack} className="text-slate-400 hover:text-white"><ChevronLeft/></button>
        <span className="font-bold">Walkthrough: {lead.clientName}</span>
        <div className="w-6"></div>
      </header>
      <main className="flex-1 p-4 overflow-y-auto pb-24">
        {renderStep()}
      </main>
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 flex gap-4 shadow-lg">
        {step > 0 && <button onClick={() => setStep(s => s-1)} className="px-4 py-3 border rounded-lg"><ChevronLeft/></button>}
        <button 
          onClick={step === 3 ? handleSync : () => setStep(s => s+1)}
          disabled={isSubmitting}
          className={`flex-1 py-3 rounded-lg font-bold text-white flex justify-center items-center gap-2 ${step === 3 ? 'bg-green-600' : 'bg-blue-600'}`}
        >
          {isSubmitting ? <Loader2 className="animate-spin"/> : step === 3 ? "Sync to Estimate" : "Next"}
          {step !== 3 && <ChevronRight/>}
        </button>
      </div>
    </div>
  );
};

// 4. MAIN APP CONTROLLER
export default function WalkthroughApp() {
  const [view, setView] = useState('home'); 
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [lastSyncedData, setLastSyncedData] = useState(null);
  
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isStaffAuthenticated, setIsStaffAuthenticated] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth Error:", err);
      }
    };
    initAuth();
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!user) return;
    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    const q = query(leadsRef); 

    const unsubscribeData = onSnapshot(q, (snapshot) => {
      const loadedLeads = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      loadedLeads.sort((a, b) => new Date(b.dateCreated) - new Date(a.dateCreated));
      setLeads(loadedLeads);
    }, (error) => {
      console.error("Firestore Listen Error:", error);
    });

    return () => unsubscribeData();
  }, [user]);

  const handleCreateLead = async (leadData) => {
    if (!user) return;
    const leadsRef = collection(db, 'artifacts', appId, 'public', 'data', 'leads');
    await addDoc(leadsRef, leadData);
    setView('intake-success');
  };

  const handleUpdateLead = async (updatedData) => {
    if (!user) return;
    const leadRef = doc(db, 'artifacts', appId, 'public', 'data', 'leads', updatedData.id);
    await updateDoc(leadRef, updatedData);
    setLastSyncedData(updatedData);
    setView('walkthrough-success');
  };

  const handleStaffAccess = () => {
    if (isStaffAuthenticated) {
      setView('select-lead');
    } else {
      setView('staff-login');
    }
  };

  const handleStaffLogout = () => {
    setIsStaffAuthenticated(false);
    setView('home');
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-slate-400" size={40} />
      </div>
    );
  }

  // View Routing
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex flex-col justify-center">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-slate-900 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-xl">
            <span className="text-amber-500 font-black text-2xl">LC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-800">Sales Portal</h1>
          <p className="text-slate-500">Choose your workspace</p>
        </div>
        <div className="grid gap-4 max-w-sm mx-auto w-full">
          <button onClick={() => setView('intake')} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all text-left flex items-center gap-4 group">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <UserPlus size={24}/>
            </div>
            <div>
              <div className="font-bold text-slate-800 text-lg">New Lead Intake</div>
              <div className="text-slate-500 text-sm">Open Form (Public)</div>
            </div>
          </button>
          
          <button 
            onClick={() => {
              alert("Link copied to clipboard: https://lccustom.biz/form");
            }}
            className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-all text-left flex items-center gap-4 group"
          >
             <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-600">
               <LinkIcon size={20}/>
             </div>
             <div>
               <div className="font-bold text-slate-800">Copy Customer Form Link</div>
               <div className="text-slate-500 text-xs">Send this link to clients</div>
             </div>
          </button>
          <div className="w-full h-px bg-slate-300 my-2"></div>
          <button onClick={handleStaffAccess} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 hover:border-amber-500 hover:shadow-md transition-all text-left flex items-center gap-4 group">
             <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isStaffAuthenticated ? 'bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white' : 'bg-slate-100 text-slate-400 group-hover:bg-amber-600 group-hover:text-white'}`}>
              {isStaffAuthenticated ? <Unlock size={24}/> : <Lock size={24}/>}
            </div>
            <div>
              <div className="font-bold text-slate-800 text-lg">Sales Walkthrough</div>
              <div className="text-slate-500 text-sm">{isStaffAuthenticated ? 'Unlocked' : 'Staff Access Only'}</div>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (view === 'staff-login') {
    return <StaffLogin 
      onLogin={() => {
        setIsStaffAuthenticated(true);
        setView('select-lead');
      }}
      onCancel={() => setView('home')}
    />;
  }

  if (view === 'intake') {
    return <IntakeForm 
      onCancel={() => setView('home')} 
      onSubmit={handleCreateLead} 
    />;
  }

  if (view === 'intake-success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"><ClipboardCheck size={40}/></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Lead Created!</h2>
        <p className="text-slate-500 mb-8">The inquiry has been saved to the database.</p>
        <button onClick={() => setView('home')} className="px-8 py-3 bg-slate-900 text-white rounded-lg font-bold">Back to Dashboard</button>
      </div>
    );
  }

  if (view === 'select-lead') {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <div className="flex items-center justify-between mb-6 pt-4 bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200"><ChevronLeft size={20}/></button>
            <h2 className="text-xl font-bold">Select Project</h2>
          </div>
          <button onClick={handleStaffLogout} className="text-xs bg-red-50 text-red-600 px-3 py-2 rounded-lg font-bold flex items-center gap-1 hover:bg-red-100">
            <Lock size={12}/> Lock Access
          </button>
        </div>
        <div className="relative mb-6">
          <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
          <input type="text" placeholder="Search address or name..." className="w-full pl-10 p-3 rounded-lg border border-slate-200 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="space-y-3 pb-10">
          {leads.length === 0 ? (
             <div className="text-center py-10 text-slate-400">
               No active leads found. Create one in Intake first.
             </div>
          ) : (
            leads.map(lead => (
              <button key={lead.id} onClick={() => { setSelectedLead(lead); setView('walkthrough'); }} className="w-full bg-white p-4 rounded-xl shadow-sm border border-slate-200 text-left hover:border-blue-500 transition-colors">
                <div className="flex justify-between items-start mb-2">
                   <span className="font-bold text-slate-800">{lead.clientName}</span>
                   <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">{lead.status}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                  <MapPin size={14}/> {lead.address}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    );
  }

  if (view === 'walkthrough') {
    return <WalkthroughFlow 
      lead={selectedLead} 
      onBack={() => setView('select-lead')}
      onComplete={handleUpdateLead}
    />;
  }

  if (view === 'walkthrough-success') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-50">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-6"><Wifi size={40}/></div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Estimate Started!</h2>
        <p className="text-slate-500 mb-8 max-w-xs mx-auto">Data saved to cloud. The Estimator can now see photos and scope.</p>
        <div className="w-full bg-slate-900 text-slate-300 text-left p-4 rounded-lg font-mono text-xs overflow-auto max-h-40 mb-6">
          {JSON.stringify(lastSyncedData, null, 2)}
        </div>
        <button onClick={() => setView('select-lead')} className="px-8 py-3 bg-blue-600 text-white rounded-lg font-bold shadow-lg">Return to List</button>
      </div>
    );
  }

  return null;
}