import React, { useState, useEffect, useRef } from 'react';

type AttendanceStatus = 'FULL' | 'HALF' | 'ABSENT' | 'OT';
type Lang = 'ta' | 'en';

interface Labour {
  id: string;
  name: string;
  site: string;
  dailyWage: number;
  upiId?: string;
  photoUrl?: string;
}

interface AttendanceRecord {
  [dateStr: string]: {
    [labourId: string]: {
      status: AttendanceStatus;
      advance: number;
      photoProof?: string;
    };
  };
}

const UI_TEXT = {
  en: {
    title: 'LABOUR PRO MASTER',
    subtitle: 'Daily Wage, Voice, UPI & Weekly Settlement',
    dailyTab: 'Daily Attendance',
    weeklyTab: 'Saturday / Weekly Payout',
    addWorker: '+ Add New Worker',
    name: 'Name',
    site: 'Site / Location',
    wage: 'Daily Wage (₹)',
    upi: 'UPI ID / Mobile (GPay)',
    selectDate: 'Date',
    full: 'Full Day',
    half: 'Half Day',
    ot: 'Overtime',
    absent: 'Absent',
    advance: 'Advance',
    totalWages: "Today's Wage Budget",
    totalAdvance: 'Advance Given Today',
    netCash: 'Net Cash Needed Today',
    exportCsv: '📥 Export Excel/CSV',
    voiceHint: '🎤 Click mic & speak: e.g., "Suresh Full" or "Ramesh 200 advance"',
    listening: 'Listening... Pesunga!',
    cameraSnap: '📷 Snap Photo',
    payUpi: 'Pay via UPI / GPay ⚡',
    settleWeek: 'Mark This Week Paid ✅',
    earned: 'Earned',
    advDeducted: 'Adv Taken',
    balancePayable: 'Balance to Pay'
  },
  ta: {
    title: 'தொழிலாளர் வருகை & சம்பளம்',
    subtitle: 'வாய்ஸ் பதிவு, யுபிஐ பேமண்ட் & வார பட்டுவாடா',
    dailyTab: 'தினசரி வருகை',
    weeklyTab: 'வார பட்டுவாடா (சனிக்கிழமை)',
    addWorker: '+ புதிய ஆள் சேர்க்க',
    name: 'பெயர்',
    site: 'வேலை இடம் (Site)',
    wage: 'நாள் சம்பளம் (₹)',
    upi: 'UPI ID / GPay எண்',
    selectDate: 'தேதி',
    full: 'முழு நாள்',
    half: 'அரை நாள்',
    ot: 'ஓவர்டைம்',
    absent: 'வரவில்லை',
    advance: 'முன்பணம்',
    totalWages: 'இன்றைய மொத்த சம்பளம்',
    totalAdvance: 'இன்று கொடுத்த முன்பணம்',
    netCash: 'இன்று தேவைப்படும் மொத்த பணம்',
    exportCsv: '📥 எக்செல் டவுன்லோட்',
    voiceHint: '🎤 மைக் அமுக்கி பேசவும்: எ.கா: "சுரேஷ் முழு நாள்" / "ரமேஷ் 200 முன் பணம்"',
    listening: 'கேட்கிறது... பேசுங்கள்!',
    cameraSnap: '📷 புகைப்படம் எடு',
    payUpi: 'UPI / GPay மூலம் செலுத்த ⚡',
    settleWeek: 'இந்த வாரம் கொடுத்தாச்சு ✅',
    earned: 'சம்பாதித்தது',
    advDeducted: 'முன்பணம்',
    balancePayable: 'தர வேண்டிய பாக்கி'
  }
};

export default function LabourTrackerPro() {
  const [lang, setLang] = useState<Lang>('ta');
  const t = UI_TEXT[lang];

  const [labours, setLabours] = useState<Labour[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'daily' | 'weekly'>('daily');

  // Form states
  const [newName, setNewName] = useState('');
  const [newSite, setNewSite] = useState('Site-1');
  const [newWage, setNewWage] = useState('');
  const [newUpi, setNewUpi] = useState('');

  // Advance Popover
  const [advanceInputId, setAdvanceInputId] = useState<string | null>(null);
  const [advanceAmount, setAdvanceAmount] = useState<string>('');

  // Voice State
  const [isListening, setIsListening] = useState(false);

  // Camera State
  const [activeCameraWorkerId, setActiveCameraWorkerId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // 1. Initial LocalStorage Load
  useEffect(() => {
    try {
      const savedLabours = localStorage.getItem('app_labours_master');
      const savedAttendance = localStorage.getItem('app_attendance_master');
      const savedLang = localStorage.getItem('app_lang_pref') as Lang;
      if (savedLabours) setLabours(JSON.parse(savedLabours));
      if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
      if (savedLang) setLang(savedLang);
    } catch (e) {
      console.error('Storage load error', e);
    }
  }, []);

  const saveLabours = (list: Labour[]) => {
    setLabours(list);
    localStorage.setItem('app_labours_master', JSON.stringify(list));
  };

  const saveAttendance = (rec: AttendanceRecord) => {
    setAttendance(rec);
    localStorage.setItem('app_attendance_master', JSON.stringify(rec));
  };

  const toggleLanguage = () => {
    const nextLang = lang === 'ta' ? 'en' : 'ta';
    setLang(nextLang);
    localStorage.setItem('app_lang_pref', nextLang);
  };

  // 2. Add New Labour
  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWage) return;

    const newWorker: Labour = {
      id: `labour_${Date.now()}`,
      name: newName.trim(),
      site: newSite.trim() || 'General',
      dailyWage: parseFloat(newWage) || 0,
      upiId: newUpi.trim()
    };

    saveLabours([...labours, newWorker]);
    setNewName('');
    setNewWage('');
    setNewUpi('');
  };

  // 3. Mark Status
  const handleStatusChange = (labourId: string, status: AttendanceStatus) => {
    const dayData = attendance[selectedDate] || {};
    const workerData = dayData[labourId] || { status: 'ABSENT', advance: 0 };

    const updated = {
      ...attendance,
      [selectedDate]: {
        ...dayData,
        [labourId]: {
          ...workerData,
          status
        }
      }
    };
    saveAttendance(updated);
  };

  // 4. Advance Handler
  const handleSaveAdvance = (labourId: string) => {
    const val = parseFloat(advanceAmount) || 0;
    const dayData = attendance[selectedDate] || {};
    const workerData = dayData[labourId] || { status: 'FULL', advance: 0 };

    const updated = {
      ...attendance,
      [selectedDate]: {
        ...dayData,
        [labourId]: {
          ...workerData,
          advance: val
        }
      }
    };
    saveAttendance(updated);
    setAdvanceInputId(null);
    setAdvanceAmount('');
  };

  // 5. Camera Photo Verification
  const startCamera = async (labourId: string) => {
    try {
      setActiveCameraWorkerId(labourId);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      alert('Camera access denied or unavailable.');
      setActiveCameraWorkerId(null);
    }
  };

  const capturePhoto = (labourId: string) => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = 160;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, 160, 160);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.7);

      const dayData = attendance[selectedDate] || {};
      const workerData = dayData[labourId] || { status: 'FULL', advance: 0 };

      const updated = {
        ...attendance,
        [selectedDate]: {
          ...dayData,
          [labourId]: {
            ...workerData,
            photoProof: photoDataUrl
          }
        }
      };
      saveAttendance(updated);
    }
    stopCamera();
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setActiveCameraWorkerId(null);
  };

  // 6. Voice Recognition (Tamil & English Speech API)
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Voice recognition not supported on this browser. Chrome mobile/desktop use pannavum.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = lang === 'ta' ? 'ta-IN' : 'en-IN';
    recognition.continuous = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: any) => {
      const speech = event.results[0][0].transcript.toLowerCase();
      labours.forEach(worker => {
        if (speech.includes(worker.name.toLowerCase())) {
          if (speech.includes('half') || speech.includes('அரை')) {
            handleStatusChange(worker.id, 'HALF');
          } else if (speech.includes('absent') || speech.includes('வரல')) {
            handleStatusChange(worker.id, 'ABSENT');
          } else if (speech.includes('overtime') || speech.includes('ot')) {
            handleStatusChange(worker.id, 'OT');
          } else {
            handleStatusChange(worker.id, 'FULL');
          }
        }
      });
    };

    recognition.start();
  };

  // 7. Filter & Computations
  const filteredLabours = selectedSite === 'All' ? labours : labours.filter(l => l.site === selectedSite);
  const uniqueSites = ['All', ...Array.from(new Set(labours.map(l => l.site)))];

  const getDayWage = (status: AttendanceStatus, dailyWage: number) => {
    if (status === 'FULL') return dailyWage;
    if (status === 'HALF') return dailyWage * 0.5;
    if (status === 'OT') return dailyWage * 1.5;
    return 0;
  };

  const calculateDailyTotal = () => {
    const dayData = attendance[selectedDate] || {};
    return filteredLabours.reduce((acc, l) => {
      const rec = dayData[l.id] || { status: 'ABSENT', advance: 0 };
      return acc + getDayWage(rec.status, l.dailyWage);
    }, 0);
  };

  const calculateDailyAdvance = () => {
    const dayData = attendance[selectedDate] || {};
    return filteredLabours.reduce((acc, l) => {
      const rec = dayData[l.id] || { status: 'ABSENT', advance: 0 };
      return acc + (rec.advance || 0);
    }, 0);
  };

  // 8. Weekly Saturday Calculation (Past 7 Days)
  const getWeeklySettlement = (labourId: string) => {
    let fullDays = 0, halfDays = 0, otDays = 0, totalAdvance = 0;
    const targetLabour = labours.find(l => l.id === labourId);
    if (!targetLabour) return { earned: 0, advance: 0, balance: 0 };

    // Get last 7 days keys
    const dates = Object.keys(attendance).sort().slice(-7);
    dates.forEach(d => {
      const item = attendance[d]?.[labourId];
      if (item) {
        if (item.status === 'FULL') fullDays += 1;
        if (item.status === 'HALF') halfDays += 1;
        if (item.status === 'OT') otDays += 1;
        totalAdvance += (item.advance || 0);
      }
    });

    const earned = (fullDays * targetLabour.dailyWage) + (halfDays * targetLabour.dailyWage * 0.5) + (otDays * targetLabour.dailyWage * 1.5);
    const balance = Math.max(0, earned - totalAdvance);
    return { earned, advance: totalAdvance, balance, fullDays, halfDays, otDays };
  };

  // 9. UPI Trigger Link
  const openUpiPayment = (upiId: string, name: string, amount: number) => {
    if (!upiId) {
      alert('Worker UPI ID add pannala. Edit panni UPI ID add pannavum.');
      return;
    }
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(name)}&am=${amount}&cu=INR&tn=LabourWageSettlement`;
    window.location.href = upiUrl;
  };

  // 10. Export CSV
  const exportToCSV = () => {
    let csv = "Worker Name,Site,Daily Wage,Earned,Advance Taken,Balance Payable\n";
    labours.forEach(l => {
      const sum = getWeeklySettlement(l.id);
      csv += `"${l.name}","${l.site}",${l.dailyWage},${sum.earned},${sum.advance},${sum.balance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Weekly_Settlement_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '480px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'system-ui, sans-serif', paddingBottom: '40px' }}>
      {/* Top Bar with Language Switcher */}
      <header style={{ backgroundColor: '#0f172a', padding: '14px 16px', color: '#fff', borderBottom: '3px solid #f59e0b' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '17px', fontWeight: 900 }}>👷 {t.title}</h2>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.subtitle}</div>
          </div>
          <button
            onClick={toggleLanguage}
            style={{ backgroundColor: '#334155', color: '#f59e0b', border: '1px solid #f59e0b', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
          >
            {lang === 'ta' ? 'English' : 'தமிழ்'}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #e2e8f0' }}>
        <button
          onClick={() => setActiveTab('daily')}
          style={{ flex: 1, padding: '12px', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderBottom: activeTab === 'daily' ? '3px solid #f59e0b' : 'none', color: activeTab === 'daily' ? '#f59e0b' : '#64748b' }}
        >
          📅 {t.dailyTab}
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          style={{ flex: 1, padding: '12px', border: 'none', background: 'none', fontWeight: 'bold', fontSize: '13px', cursor: 'pointer', borderBottom: activeTab === 'weekly' ? '3px solid #f59e0b' : 'none', color: activeTab === 'weekly' ? '#f59e0b' : '#64748b' }}
        >
          💰 {t.weeklyTab}
        </button>
      </div>

      <div style={{ padding: '14px' }}>
        {activeTab === 'daily' ? (
          <>
            {/* Voice Input Prompt Button */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={handleVoiceInput}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', backgroundColor: isListening ? '#ef4444' : '#f59e0b', color: '#fff', border: 'none', padding: '10px', borderRadius: '8px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
              >
                {isListening ? `🔴 ${t.listening}` : t.voiceHint}
              </button>
            </div>

            {/* Date & Site Filter */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>{t.selectDate}</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ border: 'none', width: '100%', fontWeight: 'bold', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ backgroundColor: '#fff', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>{t.site}</span>
                <select
                  value={selectedSite}
                  onChange={(e) => setSelectedSite(e.target.value)}
                  style={{ border: 'none', width: '100%', fontWeight: 'bold', fontSize: '13px', outline: 'none', background: 'transparent' }}
                >
                  {uniqueSites.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Quick Add Form */}
            <form onSubmit={handleAddLabour} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '1px solid #e2e8f0' }}>
              <span style={{ fontSize: '11px', fontWeight: 'bold', color: '#475569', textTransform: 'uppercase' }}>{t.addWorker}</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px', marginTop: '6px' }}>
                <input
                  type="text"
                  placeholder={t.name}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  required
                />
                <input
                  type="text"
                  placeholder={t.site}
                  value={newSite}
                  onChange={(e) => setNewSite(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  required
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 60px', gap: '6px', marginTop: '6px' }}>
                <input
                  type="number"
                  placeholder={t.wage}
                  value={newWage}
                  onChange={(e) => setNewWage(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                  required
                />
                <input
                  type="text"
                  placeholder={t.upi}
                  value={newUpi}
                  onChange={(e) => setNewUpi(e.target.value)}
                  style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '12px' }}
                />
                <button
                  type="submit"
                  style={{ backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' }}
                >
                  Add
                </button>
              </div>
            </form>

            {/* Camera Overlay Modal if Active */}
            {activeCameraWorkerId && (
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '2px solid #f59e0b', textAlign: 'center' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#000' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => capturePhoto(activeCameraWorkerId)}
                    style={{ flex: 1, backgroundColor: '#16a34a', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    📸 Snap & Save
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{ backgroundColor: '#dc2626', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Worker Cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLabours.map(labour => {
                const dayRec = attendance[selectedDate]?.[labour.id] || { status: 'ABSENT', advance: 0 };

                return (
                  <div key={labour.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {dayRec.photoProof ? (
                          <img src={dayRec.photoProof} alt="Proof" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #16a34a' }} />
                        ) : (
                          <button
                            onClick={() => startCamera(labour.id)}
                            style={{ width: '38px', height: '38px', borderRadius: '50%', border: '1px dashed #94a3b8', backgroundColor: '#f1f5f9', cursor: 'pointer', fontSize: '14px' }}
                            title={t.cameraSnap}
                          >
                            📷
                          </button>
                        )}
                        <div>
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>{labour.name}</div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {labour.site} | ₹{labour.dailyWage}/day</div>
                        </div>
                      </div>

                      <button
                        onClick={() => { setAdvanceInputId(labour.id); setAdvanceAmount(dayRec.advance ? String(dayRec.advance) : ''); }}
                        style={{ backgroundColor: dayRec.advance > 0 ? '#fee2e2' : '#f1f5f9', color: dayRec.advance > 0 ? '#dc2626' : '#475569', border: '1px solid #cbd5e1', padding: '4px 8px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                      >
                        {dayRec.advance > 0 ? `Adv: ₹${dayRec.advance}` : `+ ${t.advance}`}
                      </button>
                    </div>

                    {/* Advance Input */}
                    {advanceInputId === labour.id && (
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px', padding: '6px', backgroundColor: '#fffbeb', borderRadius: '6px' }}>
                        <input
                          type="number"
                          placeholder="Advance ₹"
                          value={advanceAmount}
                          onChange={(e) => setAdvanceAmount(e.target.value)}
                          style={{ flex: 1, padding: '6px', borderRadius: '4px', border: '1px solid #f59e0b', fontSize: '12px' }}
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveAdvance(labour.id)}
                          style={{ backgroundColor: '#f59e0b', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 10px', fontSize: '11px', fontWeight: 'bold' }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setAdvanceInputId(null)}
                          style={{ backgroundColor: '#94a3b8', color: '#fff', border: 'none', borderRadius: '4px', padding: '0 8px', fontSize: '11px' }}
                        >
                          ✕
                        </button>
                      </div>
                    )}

                    {/* Status Select Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {(['FULL', 'HALF', 'OT', 'ABSENT'] as AttendanceStatus[]).map((status) => {
                        const isActive = dayRec.status === status;
                        let bg = '#f1f5f9';
                        let color = '#475569';

                        if (isActive) {
                          if (status === 'FULL') { bg = '#16a34a'; color = '#fff'; }
                          if (status === 'HALF') { bg = '#ea580c'; color = '#fff'; }
                          if (status === 'OT') { bg = '#2563eb'; color = '#fff'; }
                          if (status === 'ABSENT') { bg = '#dc2626'; color = '#fff'; }
                        }

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleStatusChange(labour.id, status)}
                            style={{ padding: '8px 2px', border: 'none', borderRadius: '6px', backgroundColor: bg, color: color, fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
                          >
                            {status === 'FULL' && t.full}
                            {status === 'HALF' && t.half}
                            {status === 'OT' && t.ot}
                            {status === 'ABSENT' && t.absent}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Daily Summary */}
            <div style={{ marginTop: '16px', backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t.totalWages}:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#16a34a' }}>₹{calculateDailyTotal()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t.totalAdvance}:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#dc2626' }}>₹{calculateDailyAdvance()}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{t.netCash}:</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b' }}>₹{calculateDailyTotal() + calculateDailyAdvance()}</span>
              </div>
            </div>
          </>
        ) : (
          /* Weekly Saturday Payout Settlement View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1e293b' }}>Weekly Payout Report</span>
              <button
                onClick={exportToCSV}
                style={{ backgroundColor: '#0284c7', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                {t.exportCsv}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {labours.map(labour => {
                const sum = getWeeklySettlement(labour.id);

                return (
                  <div key={labour.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{labour.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{labour.site} | Daily: ₹{labour.dailyWage}</div>
                      </div>
                      <span style={{ fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                        {sum.fullDays}F + {sum.halfDays}H + {sum.otDays}OT
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.earned}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#16a34a' }}>₹{sum.earned}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.advDeducted}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dc2626' }}>₹{sum.advance}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.balancePayable}</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>₹{sum.balance}</div>
                      </div>
                    </div>

                    {/* Direct UPI Trigger Shortcut */}
                    {labour.upiId && sum.balance > 0 && (
                      <button
                        onClick={() => openUpiPayment(labour.upiId!, labour.name, sum.balance)}
                        style={{ width: '100%', backgroundColor: '#2563eb', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', cursor: 'pointer' }}
                      >
                        {t.payUpi} (₹{sum.balance})
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
