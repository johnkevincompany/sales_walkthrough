import React, { useState, useEffect } from 'react';
import { 
  MapPin, Phone, Mail, Camera, CheckCircle, AlertTriangle, 
  ChevronRight, ChevronLeft, Mic, Save, FileText, ClipboardCheck, 
  Building2, Loader2, Wifi, UserPlus, HardHat, Search, ArrowRight, 
  Link as LinkIcon, Lock, Unlock, TestTube, Edit2, UploadCloud, X, 
  Image as ImageIcon, DollarSign, FileCheck, Briefcase, Menu, Plus,
  Sparkles, FolderPlus, Trash2
} from 'lucide-react';

import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, updateDoc, doc, onSnapshot, query } from "firebase/firestore";

// ==========================================
// CONFIGURATION SECTION
// ==========================================

const firebaseConfig = {
  apiKey: "AIzaSyDzV7uc4fBmvjdTF67g6bsFElyfyCVMzsc",
  authDomain: "sales-walkthrough.firebaseapp.com",
  projectId: "sales-walkthrough",
  storageBucket: "sales-walkthrough.firebasestorage.app",
  messagingSenderId: "413932370308",
  appId: "1:413932370308:web:5827e29ade91fbfefa05d1"
};

// 1. ZAPIER - LEAD CREATION (Intake Form -> Contractor Foreman)
const ZAPIER_LEAD_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25601836/ukvgzxm/"; 

// 2. ZAPIER - DRIVE UPLOAD (Walkthrough -> Google Drive)
const ZAPIER_DRIVE_WEBHOOK_URL = "https://hooks.zapier.com/hooks/catch/25601836/ufb2iwb/"; 

// 3. GEMINI AI (For Writing the "Doc")
// Get a free key at https://aistudio.google.com/app/apikey
const GEMINI_API_KEY = "AIzaSyDpwgQTcCqpWpsBWW1N4LvYSx58eSpKAxI"; 

const appId = "lc-custom-sales"; 

// ==========================================
// UTILITIES
// ==========================================

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const compressImage = (file) => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800;
                const scaleSize = MAX_WIDTH / img.width;
                canvas.width = MAX_WIDTH;
                canvas.height = img.height * scaleSize;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve(canvas.toDataURL('image/jpeg', 0.7)); 
            };
        };
    });
};

const dataURItoBlob = (dataURI) => {
  try {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], {type: mimeString});
  } catch (e) { return null; }
};

// --- REAL GEMINI AI INTEGRATION (DYNAMIC PHOTOS) ---
const generateEstimateWithGemini = async (photosArray, scopeNotes) => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR_GEMINI")) {
        console.warn("No Gemini Key provided. Using Mock Data.");
        return null; // Fallback to mock
    }

    const inlineDataParts = photosArray.map(p => ({
        inlineData: {
            mimeType: "image/jpeg",
            data: p.data.split(",")[1]
        }
    }));

    const prompt = `
    You are an expert construction estimator. I have provided ${photosArray.length} photos of the site and the following scope notes from the salesman: "${scopeNotes}".
    
    Analyze ALL photos to identify construction requirements (demolition, framing, finishes, electrical, etc.).
    
    Create a detailed response in strict JSON format:
    {
      "summary": "A detailed Scope of Work paragraph describing the project...",
      "total": 0,
      "divisions": [
        { "code": "01", "name": "GENERAL", "items": [{ "task": "Task Name", "desc": "Description" }] }
        // Add divisions as needed based on photos
      ]
    }
    Return ONLY valid JSON.
    `;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }, ...inlineDataParts] }] })
        });
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("No text returned from Gemini");
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error("Gemini Error:", e);
        return null;
    }
};

// --- UI COMPONENTS ---

const Button = ({ children, onClick, disabled, variant = "primary", className = "" }) => {
  const base = "w-full py-4 rounded-full font-bold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center gap-2";
  const styles = {
    primary: "bg-neutral-900 text-white shadow-xl shadow-neutral-200",
    secondary: "bg-white text-neutral-900 border border-neutral-200 shadow-sm",
    ghost: "bg-transparent text-neutral-500 hover:text-neutral-900",
    danger: "bg-red-50 text-red-600 border border-red-100"
  };
  return <button onClick={onClick} disabled={disabled} className={`${base} ${styles[variant]} ${className}`}>{children}</button>;
};

const MinimalInput = ({ label, value, onChange, placeholder, type = "text" }) => (
  <div className="group">
    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-1 group-focus-within:text-neutral-900 transition-colors">{label}</label>
    <input 
      type={type} 
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      className="w-full py-3 bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none transition-colors text-lg text-neutral-800 placeholder-neutral-300 font-medium"
    />
  </div>
);

const MinimalArea = ({ label, value, onChange, placeholder }) => (
  <div className="group">
    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-widest mb-2 group-focus-within:text-neutral-900 transition-colors">{label}</label>
    <textarea 
      rows={4}
      value={value} 
      onChange={onChange} 
      placeholder={placeholder}
      className="w-full p-0 bg-transparent border-b border-neutral-200 focus:border-neutral-900 outline-none transition-colors text-lg text-neutral-800 placeholder-neutral-300 font-medium resize-none"
    />
  </div>
);

// --- VIEW COMPONENTS ---

const StaffLogin = ({ onLogin, onCancel }) => {
  const [passcode, setPasscode] = useState("");
  const [loading, setLoading] = useState(false);
  const handleLogin = (e) => { e.preventDefault(); setLoading(true); setTimeout(() => { if (passcode === "1234") onLogin(); else setPasscode(""); setLoading(false); }, 800); };
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center"><h2 className="text-3xl font-light text-neutral-900 mb-2">Staff Access</h2><p className="text-neutral-400">Enter your secure passcode</p></div>
        <form onSubmit={handleLogin} className="space-y-8"><input type="password" inputMode="numeric" autoFocus className="w-full p-4 text-center text-4xl font-light tracking-[1em] border-b-2 border-neutral-200 focus:border-neutral-900 outline-none bg-transparent transition-all" placeholder="••••" maxLength={4} value={passcode} onChange={(e) => setPasscode(e.target.value)} /><Button disabled={loading} type="submit">{loading ? <Loader2 className="animate-spin" /> : "Unlock Portal"}</Button></form>
        <button onClick={onCancel} className="w-full text-center text-sm font-bold text-neutral-400 uppercase tracking-widest hover:text-neutral-600">Cancel</button>
      </div>
    </div>
  );
};

const IntakeForm = ({ onCancel, onSubmit }) => {
  const [formData, setFormData] = useState({
    clientName: "", email: "", phone: "", address: "", mailingAddress: "", 
    projectType: "New Build", vision: "", budget: "", source: "", contactMethod: "Email"
  });
  const [isTestMode, setIsTestMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const nameParts = formData.clientName.trim().split(' ');
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : "Client";
    const finalClientName = isTestMode ? `[TEST] - ${formData.clientName}` : formData.clientName;
    const payload = { ...formData, firstName, lastName, clientName: finalClientName, status: "Ready for Walkthrough", dateCreated: new Date().toISOString(), isTest: isTestMode };

    try {
      if (ZAPIER_LEAD_WEBHOOK_URL && ZAPIER_LEAD_WEBHOOK_URL.includes('hooks.zapier.com')) {
         await fetch(ZAPIER_LEAD_WEBHOOK_URL, { method: 'POST', body: JSON.stringify(payload) }).catch(console.error);
      }
      await onSubmit(payload);
    } catch (error) {
      alert("Error submitting.");
      setIsSubmitting(false);
    }
  };

  const updateField = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      <div className="sticky top-0 z-20 bg-neutral-50/80 backdrop-blur-md px-6 py-4 border-b border-neutral-100 flex justify-between items-center">
         <button onClick={onCancel} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900"><X size={24}/></button>
         <h2 className="font-bold text-sm tracking-widest uppercase">New Client Intake</h2>
         <div className="w-8"></div>
      </div>

      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        <div className="mb-8">
            <h1 className="text-3xl font-light text-neutral-900 mb-2">Let's start the project.</h1>
            <p className="text-neutral-400">Please fill in the client details below.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="flex justify-end"><label className="flex items-center gap-2 cursor-pointer opacity-50 hover:opacity-100 transition-opacity"><input type="checkbox" checked={isTestMode} onChange={e => setIsTestMode(e.target.checked)} className="rounded text-amber-500" /><span className="text-xs font-bold uppercase tracking-wider text-neutral-600">Test Mode</span></label></div>
          
          <MinimalInput label="Full Name" placeholder="Jane Doe" value={formData.clientName} onChange={e => updateField('clientName', e.target.value)} />
          <MinimalInput label="Email Address" type="email" placeholder="jane@example.com" value={formData.email} onChange={e => updateField('email', e.target.value)} />
          <MinimalInput label="Project Address" placeholder="123 Ocean Dr, FL" value={formData.address} onChange={e => updateField('address', e.target.value)} />
          <MinimalArea label="Project Vision" placeholder="Describe the dream outcome..." value={formData.vision} onChange={e => updateField('vision', e.target.value)} />
          
          <div className="pt-8">
            <Button disabled={isSubmitting} type="submit">{isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Inquiry"}</Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const WalkthroughFlow = ({ lead, onBack, onComplete }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [photos, setPhotos] = useState([]); 
  
  const [formData, setFormData] = useState({
    ...lead,
    projectEstimateName: `${lead.clientName} - Estimate`, 
    budget: lead.budget || "",
    timeline: lead.timeline || "",
    scopeNotes: lead.scopeNotes || ""
  });

  const updateField = (f, v) => setFormData(p => ({ ...p, [f]: v }));
  
  const handleAddPhoto = async (e) => {
    const file = e.target.files[0];
    if (file) { 
        const compressedBase64 = await compressImage(file); 
        const newPhoto = { id: Date.now(), data: compressedBase64, name: `Photo ${photos.length + 1}` };
        setPhotos(prev => [...prev, newPhoto]);
    }
  };

  const removePhoto = (id) => setPhotos(prev => prev.filter(p => p.id !== id));

  const handleSync = async () => {
    setIsSubmitting(true);
    let aiEstimate = null;

    // STEP 1: AI GENERATION (Run this FIRST so the text file is smart)
    setStatusMsg(`AI Analyzing ${photos.length} photos...`);
    
    // Call Gemini
    const realAiResult = await generateEstimateWithGemini(photos, formData.scopeNotes);
    
    if (realAiResult) {
        aiEstimate = { ...realAiResult, dateGenerated: new Date().toISOString(), status: "Draft" };
    } else {
        // Fallback
        aiEstimate = {
            total: 0,
            summary: "AI could not generate estimate. See raw notes.",
            divisions: [],
            dateGenerated: new Date().toISOString(), status: "Draft"
        };
    }

    // STEP 2: PREPARE THE SMART SCOPE DOCUMENT
    // Now we can include the AI's summary inside the text file!
    const aiSummary = aiEstimate.summary || "No AI summary available.";
    const aiDivisions = aiEstimate.divisions ? aiEstimate.divisions.map(d => `DIV ${d.code} - ${d.name}:\n${d.items.map(i => ` - ${i.task}: ${i.desc}`).join('\n')}`).join('\n\n') : "";

    const fullDocumentContent = `
CLIENT: ${formData.clientName}
PROJECT: ${formData.projectEstimateName}
DATE: ${new Date().toLocaleDateString()}
TIMELINE: ${formData.timeline}
BUDGET: ${formData.budget}

--- SALESMAN NOTES ---
VISION:
${formData.vision}

WALKTHROUGH NOTES:
${formData.scopeNotes}

--- AI GENERATED SCOPE OF WORK ---
SUMMARY:
${aiSummary}

DETAILED BREAKDOWN:
${aiDivisions}
`;

    // STEP 3: UPLOAD TO DRIVE (ZAPIER)
    setStatusMsg("Uploading Smart Doc & Photos...");
    try {
       if (ZAPIER_DRIVE_WEBHOOK_URL && ZAPIER_DRIVE_WEBHOOK_URL.includes('hooks.zapier.com')) {
          const data = new FormData();
          
          data.append("clientName", formData.clientName);
          data.append("folderName", `${formData.clientName} - ESTIMATE`);
          
          // Attach the Smart Document
          const scopeBlob = new Blob([fullDocumentContent], { type: 'text/plain' });
          data.append('scope_document', scopeBlob, `Scope of Work.txt`);

          // Attach Photos
          photos.forEach((photo, index) => {
            const blob = dataURItoBlob(photo.data);
            if (blob) {
                data.append(`photo_${index + 1}`, blob, `site_photo_${index + 1}.jpg`);
            }
          });
          
          await fetch(ZAPIER_DRIVE_WEBHOOK_URL, { method: 'POST', body: data }).catch(console.error);
       }
    } catch (error) { console.error("Zapier Upload Failed", error); }

    // STEP 4: SAVE TO APP DATABASE
    const finalPayload = { 
        ...formData, 
        photos: photos.map(p => p.data), 
        status: "Needs Estimate Review", 
        aiEstimate 
    };
    await onComplete(finalPayload);
  };

  const steps = [ { title: "Project Setup", subtitle: "Name & Basics" }, { title: "Scope & Vision", subtitle: "Details & Budget" }, { title: "Site Photos", subtitle: "Capture Context" }, { title: "Review", subtitle: "Confirm & Submit" } ];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col font-sans">
      <div className="sticky top-0 z-20 bg-neutral-50/90 backdrop-blur-md px-6 py-4 border-b border-neutral-100 flex items-center justify-between">
         <button onClick={onBack} className="p-2 -ml-2 text-neutral-400 hover:text-neutral-900"><ChevronLeft/></button>
         <div className="flex flex-col items-center"><span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">Step {step + 1} of 4</span><span className="text-sm font-semibold text-neutral-900">{steps[step].title}</span></div>
         <div className="w-8"></div>
      </div>

      <main className="flex-1 p-6 pb-32 max-w-lg mx-auto w-full overflow-y-auto">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {step === 0 && (
                <div className="space-y-8">
                    <div className="p-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100"><MinimalInput label="Project Name" value={formData.projectEstimateName} onChange={e => updateField('projectEstimateName', e.target.value)} /></div>
                    <div className="p-6 bg-amber-50 rounded-3xl border border-amber-100"><h4 className="text-amber-900/50 text-xs font-bold uppercase tracking-wider mb-2">Client Vision</h4><p className="text-amber-900 text-lg leading-relaxed font-medium">"{lead.vision}"</p></div>
                </div>
            )}
            {step === 1 && (
                <div className="space-y-8">
                    <div className="p-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100 space-y-6"><MinimalInput label="Target Budget" placeholder="$" value={formData.budget} onChange={e => updateField('budget', e.target.value)} /><MinimalInput label="Desired Timeline" placeholder="e.g. Fall 2025" value={formData.timeline} onChange={e => updateField('timeline', e.target.value)} /></div>
                    <div className="p-6 bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-neutral-100"><MinimalArea label="Scope Notes (Voice Dictation)" placeholder="Tap microphone to dictate..." value={formData.scopeNotes} onChange={e => updateField('scopeNotes', e.target.value)} /><div className="mt-4 flex gap-2 text-neutral-400 text-xs font-medium items-center"><Mic size={14}/> <span>Voice dictation recommended for detail.</span></div></div>
                </div>
            )}
            {step === 2 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <span className="text-xs font-bold uppercase tracking-widest text-neutral-400">Gallery ({photos.length})</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="aspect-square rounded-3xl border-2 border-dashed border-neutral-300 hover:border-neutral-900 hover:bg-neutral-100 transition-all flex flex-col items-center justify-center relative overflow-hidden group">
                             <input type="file" accept="image/*" capture="environment" onChange={handleAddPhoto} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"/>
                             <div className="p-3 bg-neutral-900 text-white rounded-full mb-2 group-hover:scale-110 transition-transform"><Plus size={24}/></div>
                             <span className="text-xs font-bold uppercase tracking-widest text-neutral-900">Add Photo</span>
                        </div>
                        {photos.map((photo) => (
                            <div key={photo.id} className="aspect-square rounded-3xl relative overflow-hidden border border-neutral-100 shadow-sm bg-white">
                                <img src={photo.data} alt="Site" className="absolute inset-0 w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/10"></div>
                                <button onClick={() => removePhoto(photo.id)} className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full shadow-lg active:scale-90 transition-transform"><Trash2 size={16}/></button>
                                <div className="absolute bottom-2 left-2 right-2">
                                    <span className="bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-full">{photo.name}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {step === 3 && (
                <div className="space-y-6">
                    <div className="bg-neutral-900 text-white p-8 rounded-3xl shadow-xl shadow-neutral-300">
                        <h2 className="text-2xl font-light mb-6">Ready to Submit?</h2>
                        <div className="space-y-4 text-sm text-neutral-400">
                            <div className="flex justify-between border-b border-white/10 pb-3"><span>Folder Name</span> <span className="text-white font-medium">{formData.clientName} - ESTIMATE</span></div>
                            <div className="flex justify-between border-b border-white/10 pb-3"><span>Total Photos</span> <span className="text-white font-medium">{photos.length} Attached</span></div>
                        </div>
                    </div>
                    <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100 flex items-start gap-4">
                         <div className="p-2 bg-purple-100 rounded-full text-purple-600"><Sparkles size={20}/></div>
                         <div><h4 className="font-bold text-purple-900 text-sm mb-1">AI-Powered Workflow</h4><p className="text-purple-700/70 text-xs leading-relaxed">Gemini will first analyze your photos to write the scope, THEN the app will upload that smart document to Drive.</p></div>
                    </div>
                </div>
            )}
        </div>
      </main>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-neutral-50 via-neutral-50 to-transparent z-20">
         <div className="flex gap-4 max-w-lg mx-auto">
            {step > 0 && <button onClick={() => setStep(s => s-1)} className="w-14 h-14 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-lg shadow-neutral-200/50 active:scale-95 transition-transform"><ChevronLeft className="text-neutral-600"/></button>}
            <button onClick={step === 3 ? handleSync : () => setStep(s => s+1)} disabled={isSubmitting} className={`flex-1 h-14 rounded-full font-bold text-sm tracking-widest uppercase flex items-center justify-center gap-2 shadow-xl active:scale-95 transition-all ${step === 3 ? 'bg-neutral-900 text-white shadow-neutral-400/50' : 'bg-white text-neutral-900 border border-neutral-200'}`}>
                {isSubmitting ? <Loader2 className="animate-spin"/> : step === 3 ? "Generate Report" : "Next Step"}
                {!isSubmitting && step !== 3 && <ArrowRight size={16}/>}
            </button>
         </div>
         {isSubmitting && <div className="text-center text-xs font-bold text-neutral-400 mt-2 animate-pulse">{statusMsg}</div>}
      </div>
    </div>
  );
};

const OfficeEstimateView = ({ lead, onBack }) => {
  const estimate = lead.aiEstimate || {};
  const total = estimate.total || 0;
  const divisions = estimate.divisions || [];

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col font-sans text-neutral-900">
      <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-neutral-200 px-6 py-4 flex justify-between items-center">
            <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-neutral-100"><ChevronLeft className="text-neutral-500"/></button>
            <div className="text-center"><h1 className="text-sm font-bold uppercase tracking-widest">{lead.projectEstimateName}</h1><span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">AI Generated</span></div>
            <div className="w-8"></div>
      </div>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white p-8 rounded-none md:rounded-xl shadow-sm border border-neutral-200 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-amber-400"></div>
                <div className="flex justify-between items-start mb-4"><h3 className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Executive Summary</h3><span className="text-2xl font-bold tracking-tight">${total.toLocaleString()}</span></div>
                <p className="text-neutral-700 leading-relaxed text-lg font-light">{estimate.summary || "No summary generated yet."}</p>
            </div>

            <div className="space-y-2">
                {divisions.map((div, idx) => (
                    <div key={idx} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <div className="bg-neutral-50/50 px-6 py-4 border-b border-neutral-100 flex justify-between items-center"><span className="font-bold text-neutral-900 text-xs tracking-widest uppercase">Div {div.code} — {div.name}</span></div>
                        <div className="divide-y divide-neutral-100">
                            {div.items.map((item, i) => (
                                <div key={i} className="p-6 hover:bg-neutral-50 transition-colors group">
                                    <div className="flex justify-between items-start mb-2"><h4 className="font-semibold text-neutral-800">{item.task}</h4><button className="opacity-0 group-hover:opacity-100 p-2 text-neutral-400 hover:text-neutral-900 transition-all"><Edit2 size={14}/></button></div>
                                    <p className="text-neutral-500 text-sm leading-relaxed">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex gap-4 pt-8 pb-20"><Button variant="primary"><FileCheck size={18}/> Approve & Send</Button></div>
        </div>
      </main>
    </div>
  );
};

export default function WalkthroughApp() {
  const [view, setView] = useState('home'); 
  const [leads, setLeads] = useState([]);
  const [selectedLead, setSelectedLead] = useState(null);
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => { const initAuth = async () => { try { if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) await signInWithCustomToken(auth, __initial_auth_token); else await signInAnonymously(auth); } catch (e) {} }; initAuth(); return onAuthStateChanged(auth, (u) => { setUser(u); setAuthLoading(false); }); }, []);
  useEffect(() => { if (!user) return; return onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'leads')), (snap) => { setLeads(snap.docs.map(d => ({id: d.id, ...d.data()})).sort((a,b) => new Date(b.dateCreated) - new Date(a.dateCreated))); }); }, [user]);
  const handleCreateLead = async (d) => { if(user) { await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leads'), d); setView('intake-success'); }};
  const handleUpdateLead = async (d) => { if(user) { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leads', d.id), d); setView('walkthrough-success'); }};

  if (authLoading) return <div className="min-h-screen flex items-center justify-center bg-neutral-50"><Loader2 className="animate-spin text-neutral-300"/></div>;

  if (view === 'home') return (
      <div className="min-h-screen bg-neutral-100 flex flex-col justify-end p-6 pb-12 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-[60vh] bg-neutral-900 rounded-b-[3rem] z-0 flex items-center justify-center">
            <div className="text-center space-y-4 p-8"><div className="inline-flex p-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-4"><Building2 className="text-white" size={32}/></div><h1 className="text-4xl font-light text-white tracking-tight">LC CUSTOM</h1><p className="text-neutral-400 font-medium tracking-wide uppercase text-xs">Sales & Estimation Portal</p></div>
        </div>
        <div className="relative z-10 space-y-4 w-full max-w-sm mx-auto">
            <button onClick={() => setView('intake')} className="w-full bg-white p-6 rounded-3xl shadow-xl shadow-neutral-900/10 flex items-center justify-between group active:scale-95 transition-transform"><div className="flex items-center gap-4"><div className="p-3 bg-amber-100 text-amber-600 rounded-full"><UserPlus size={24}/></div><div className="text-left"><div className="font-bold text-neutral-900">New Client</div><div className="text-xs text-neutral-400 font-medium uppercase tracking-wider">Intake Form</div></div></div><div className="w-10 h-10 rounded-full border border-neutral-100 flex items-center justify-center group-hover:bg-neutral-50"><ChevronRight className="text-neutral-300"/></div></button>
            <button onClick={() => setView('login')} className="w-full bg-neutral-900 p-6 rounded-3xl shadow-xl shadow-neutral-900/20 flex items-center justify-between group active:scale-95 transition-transform"><div className="flex items-center gap-4"><div className="p-3 bg-white/10 text-white rounded-full"><Lock size={24}/></div><div className="text-left"><div className="font-bold text-white">Staff Access</div><div className="text-xs text-neutral-500 font-medium uppercase tracking-wider">Dashboard</div></div></div><ChevronRight className="text-neutral-600"/></button>
        </div>
      </div>
  );
  if (view === 'login') return <StaffLogin onLogin={() => setView('staff-dashboard')} onCancel={() => setView('home')} />;
  if (view === 'staff-dashboard') return (
      <div className="min-h-screen bg-neutral-50">
        <div className="sticky top-0 bg-neutral-50/80 backdrop-blur-md p-6 flex items-center justify-between border-b border-neutral-200 z-10"><h2 className="text-xl font-light text-neutral-900">Dashboard</h2><button onClick={() => setView('home')} className="text-xs font-bold uppercase tracking-widest text-neutral-400 hover:text-neutral-900">Exit</button></div>
        <div className="p-6 space-y-8">
            <div className="grid grid-cols-2 gap-4"><button onClick={() => setView('select-lead-field')} className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center gap-3 text-center active:scale-95 transition-transform"><div className="p-4 bg-blue-50 text-blue-600 rounded-2xl"><HardHat size={32}/></div><span className="font-bold text-sm text-neutral-700">Field Walk</span></button><button onClick={() => setView('select-lead-office')} className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center gap-3 text-center active:scale-95 transition-transform"><div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl"><Briefcase size={32}/></div><span className="font-bold text-sm text-neutral-700">Office Admin</span></button></div>
            <div><div className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4 px-2">Recent Inquiries</div><div className="space-y-3">{leads.slice(0,5).map(l => ( <div key={l.id} className="bg-white p-5 rounded-2xl border border-neutral-100 flex justify-between items-center shadow-sm"><div><div className="font-bold text-neutral-900 text-sm">{l.clientName}</div><div className="text-xs text-neutral-400 mt-1">{l.status}</div></div>{l.status === 'Needs Estimate Review' && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>}</div>))}</div></div>
        </div>
      </div>
  );
  if (view === 'select-lead-field') return ( <div className="min-h-screen bg-neutral-50 p-6"><div className="flex items-center gap-4 mb-8 pt-2"><button onClick={() => setView('staff-dashboard')} className="p-3 bg-white rounded-full shadow-sm"><ChevronLeft size={20}/></button><h2 className="text-xl font-light">Select Project</h2></div><div className="space-y-4">{leads.map(l => <button key={l.id} onClick={() => { setSelectedLead(l); setView('walkthrough'); }} className="w-full bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left active:scale-95 transition-transform"><div className="font-bold text-lg">{l.clientName}</div><div className="text-sm text-neutral-400 mt-1">{l.status}</div></button>)}</div></div>);
  if (view === 'select-lead-office') return ( <div className="min-h-screen bg-neutral-50 p-6"><div className="flex items-center gap-4 mb-8 pt-2"><button onClick={() => setView('staff-dashboard')} className="p-3 bg-white rounded-full shadow-sm"><ChevronLeft size={20}/></button><h2 className="text-xl font-light">Review Estimates</h2></div><div className="space-y-4">{leads.map(l => ( <button key={l.id} onClick={() => { setSelectedLead(l); setView('office-estimate'); }} className="w-full bg-white p-6 rounded-3xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] text-left flex justify-between items-center active:scale-95 transition-transform"><div><div className="font-bold text-lg">{l.clientName}</div><div className="text-sm text-neutral-400 mt-1">{l.status}</div></div>{l.aiEstimate && <div className="p-2 bg-green-50 text-green-600 rounded-full"><FileCheck size={20}/></div>}</button>))}</div></div>);
  if (view === 'intake') return <IntakeForm onCancel={() => setView('home')} onSubmit={handleCreateLead} />;
  if (view === 'intake-success') return <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-8 text-center text-white"><div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-green-500/50"><CheckCircle size={40} className="text-white"/></div><h2 className="text-3xl font-light mb-2">Success</h2><p className="text-neutral-400 mb-8">Client intake submitted successfully.</p><Button variant="secondary" onClick={() => setView('home')}>Done</Button></div>;
  if (view === 'walkthrough') return <WalkthroughFlow lead={selectedLead} onBack={() => setView('select-lead-field')} onComplete={handleUpdateLead} />;
  if (view === 'walkthrough-success') return <div className="min-h-screen bg-neutral-900 flex flex-col items-center justify-center p-8 text-center text-white"><div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mb-6 shadow-2xl shadow-blue-500/50"><UploadCloud size={40} className="text-white"/></div><h2 className="text-3xl font-light mb-2">Synced</h2><p className="text-neutral-400 mb-8">Photos saved to Drive. Estimate generated by AI.</p><Button variant="secondary" onClick={() => setView('staff-dashboard')}>Return to Dashboard</Button></div>;
  if (view === 'office-estimate') return <OfficeEstimateView lead={selectedLead} onBack={() => setView('select-lead-office')} />;

  return null;
}