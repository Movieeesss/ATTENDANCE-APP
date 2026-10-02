import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

type AttendanceStatus = 'FULL' | 'HALF' | 'ABSENT' | 'OT';
type Lang = 'en' | 'ta';

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
    weeklyTab: 'Saturday Payout',
    addWorker: '+ Add New Worker',
    name: 'Name',
    site: 'Site / Location',
    wage: 'Daily Wage (₹)',
    upi: 'GPay Mobile / UPI ID',
    selectDate: 'Date',
    full: 'Full Day',
    half: 'Half Day',
    ot: 'Overtime',
    absent: 'Absent',
    advance: 'Advance',
    totalWages: "Today's Wages",
    totalAdvance: 'Advance Given',
    netCash: 'Net Cash Needed',
    exportCsv: '📊 Export to Excel',
    shareReport: '📲 Share Full Report',
    clearAll: '⚠️️ Reset All Data',
    listening: 'Listening... Speak now',
    voiceHint: '🎤 Mic Attendance',
    cameraSnap: '📷 Snap Photo',
    payUpi: 'Pay via UPI / GPay ⚡',
    earned: 'Earned',
    advDeducted: 'Advance',
    balancePayable: 'Net Payable',
    langToggle: 'தமிழ்'
  },
  ta: {
    title: 'தொழிலாளர் வருகை & சம்பளம்',
    subtitle: 'வாய்ஸ் பதிவு, யுபிஐ பேமண்ட் & வார பட்டுவாடா',
    dailyTab: 'தினசரி வருகை',
    weeklyTab: 'வார பட்டுவாடா',
    addWorker: '+ புதிய ஆள் சேர்க்க',
    name: 'பெயர்',
    site: 'வேலை இடம் (Site)',
    wage: 'நாள் சம்பளம் (₹)',
    upi: 'GPay எண் / UPI ID',
    selectDate: 'தேதி',
    full: 'முழு நாள்',
    half: 'அரை நாள்',
    ot: 'ஓவர்டைம்',
    absent: 'வரவில்லை',
    advance: 'முன்பணம்',
    totalWages: 'இன்றைய சம்பளம்',
    totalAdvance: 'கொடுத்த முன்பணம்',
    netCash: 'தேவைப்படும் ரொக்கம்',
    exportCsv: '📊 எக்செல் டவுன்லோட்',
    shareReport: '📲 அறிக்கை பகிர்க',
    clearAll: '⚠️️ டேட்டா ரீசெட் செய்',
    listening: 'கேட்கிறது... பேசுங்கள்!',
    voiceHint: '🎤 மைக் வருகை',
    cameraSnap: '📷 புகைப்படம்',
    payUpi: 'UPI / GPay மூலம் செலுத்த ⚡',
    earned: 'சம்பாதித்தது',
    advDeducted: 'முன்பணம்',
    balancePayable: 'தர வேண்டிய தொகை',
    langToggle: 'English'
  }
};

export default function Attendance() {
  // Default language is strictly set to English ('en')
  const [lang, setLang] = useState<Lang>('en');
  const t = UI_TEXT[lang];

  const [labours, setLabours] = useState<Labour[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [selectedSite, setSelectedSite] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Drag and drop state for touch/drag reorder
  const [draggedWorkerId, setDraggedWorkerId] = useState<string | null>(null);

  // 1. Initial LocalStorage Load
  useEffect(() => {
    try {
      const savedLabours = localStorage.getItem('app_labours_master_v3');
      const savedAttendance = localStorage.getItem('app_attendance_master_v3');
      const savedLang = localStorage.getItem('app_lang_pref_v3') as Lang;
      if (savedLabours) setLabours(JSON.parse(savedLabours));
      if (savedAttendance) setAttendance(JSON.parse(savedAttendance));
      // If user previously chose a language, use that; otherwise stays default English
      if (savedLang) setLang(savedLang);
    } catch (e) {
      console.error('Storage error', e);
    }
  }, []);

  const saveLabours = useCallback((list: Labour[]) => {
    setLabours(list);
    localStorage.setItem('app_labours_master_v3', JSON.stringify(list));
  }, []);

  const saveAttendance = useCallback((rec: AttendanceRecord) => {
    setAttendance(rec);
    localStorage.setItem('app_attendance_master_v3', JSON.stringify(rec));
  }, []);

  const toggleLanguage = () => {
    const nextLang: Lang = lang === 'en' ? 'ta' : 'en';
    setLang(nextLang);
    localStorage.setItem('app_lang_pref_v3', nextLang);
  };

  // Add Labour
  const handleAddLabour = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newWage) return;

    let formattedUpi = newUpi.trim();
    if (/^\d{10}$/.test(formattedUpi)) {
      formattedUpi = `${formattedUpi}@upi`;
    }

    const newWorker: Labour = {
      id: `labour_${Date.now()}`,
      name: newName.trim(),
      site: newSite.trim() || 'General',
      dailyWage: parseFloat(newWage) || 0,
      upiId: formattedUpi
    };

    saveLabours([...labours, newWorker]);
    setNewName('');
    setNewWage('');
    setNewUpi('');
  };

  // Mark Status
  const handleStatusChange = (labourId: string, status: AttendanceStatus) => {
    const dayData = attendance[selectedDate] || {};
    const workerData = dayData[labourId] || { status: 'ABSENT', advance: 0 };

    saveAttendance({
      ...attendance,
      [selectedDate]: {
        ...dayData,
        [labourId]: {
          ...workerData,
          status
        }
      }
    });
  };

  // Advance Handler
  const handleSaveAdvance = (labourId: string) => {
    const val = parseFloat(advanceAmount) || 0;
    const dayData = attendance[selectedDate] || {};
    const workerData = dayData[labourId] || { status: 'FULL', advance: 0 };

    saveAttendance({
      ...attendance,
      [selectedDate]: {
        ...dayData,
        [labourId]: {
          ...workerData,
          advance: val
        }
      }
    });
    setAdvanceInputId(null);
    setAdvanceAmount('');
  };

  // Reset All Data
  const handleClearAllData = () => {
    const confirmMsg = lang === 'ta' 
      ? "⚠️ அனைத்து தொழிலாளர் மற்றும் வருகை விவரங்களும் நிரந்தரமாக அழிக்கப்படும். தொடரவா?" 
      : "⚠️ This will permanently delete all worker names and attendance records. Confirm?";
    if (window.confirm(confirmMsg)) {
      localStorage.removeItem('app_labours_master_v3');
      localStorage.removeItem('app_attendance_master_v3');
      setLabours([]);
      setAttendance({});
    }
  };

  // Camera Handler
  const startCamera = async (labourId: string) => {
    try {
      setActiveCameraWorkerId(labourId);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      alert('Camera access denied or unsupported.');
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
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.6);

      const dayData = attendance[selectedDate] || {};
      const workerData = dayData[labourId] || { status: 'FULL', advance: 0 };

      saveAttendance({
        ...attendance,
        [selectedDate]: {
          ...dayData,
          [labourId]: {
            ...workerData,
            photoProof: photoDataUrl
          }
        }
      });
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

  // Voice Recognition
  const handleVoiceInput = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Use Google Chrome for voice recognition support.');
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
          } else if (speech.includes('ot') || speech.includes('ஓவர்')) {
            handleStatusChange(worker.id, 'OT');
          } else {
            handleStatusChange(worker.id, 'FULL');
          }
        }
      });
    };

    recognition.start();
  };

  // Optimized Filtered Labours via useMemo
  const filteredLabours = useMemo(() => {
    return labours.filter(l => {
      const matchesSite = selectedSite === 'All' || l.site === selectedSite;
      const matchesSearch = l.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSite && matchesSearch;
    });
  }, [labours, selectedSite, searchQuery]);

  const uniqueSites = useMemo(() => {
    return ['All', ...Array.from(new Set(labours.map(l => l.site)))];
  }, [labours]);

  const getDayWage = (status: AttendanceStatus, dailyWage: number) => {
    if (status === 'FULL') return dailyWage;
    if (status === 'HALF') return dailyWage * 0.5;
    if (status === 'OT') return dailyWage * 1.5;
    return 0;
  };

  // Daily Calculations via useMemo
  const dailyMetrics = useMemo(() => {
    const dayData = attendance[selectedDate] || {};
    let totalWage = 0;
    let totalAdv = 0;

    filteredLabours.forEach(l => {
      const rec = dayData[l.id] || { status: 'ABSENT', advance: 0 };
      totalWage += getDayWage(rec.status, l.dailyWage);
      totalAdv += (rec.advance || 0);
    });

    return {
      totalWage,
      totalAdv,
      netCash: totalWage + totalAdv
    };
  }, [filteredLabours, attendance, selectedDate]);

  // Weekly Settlement Calculation via useMemo
  const weeklySummaries = useMemo(() => {
    const dates = Object.keys(attendance).sort().slice(-7);
    const summaryMap: { [id: string]: { earned: number; advance: number; balance: number; daysInfo: string } } = {};

    labours.forEach(labour => {
      let fullDays = 0, halfDays = 0, otDays = 0, totalAdv = 0;

      dates.forEach(d => {
        const item = attendance[d]?.[labour.id];
        if (item) {
          if (item.status === 'FULL') fullDays += 1;
          if (item.status === 'HALF') halfDays += 1;
          if (item.status === 'OT') otDays += 1;
          totalAdv += (item.advance || 0);
        }
      });

      const earned = (fullDays * labour.dailyWage) + (halfDays * labour.dailyWage * 0.5) + (otDays * labour.dailyWage * 1.5);
      const balance = Math.max(0, earned - totalAdv);

      summaryMap[labour.id] = {
        earned,
        advance: totalAdv,
        balance,
        daysInfo: `${fullDays}F + ${halfDays}H + ${otDays}OT`
      };
    });

    return summaryMap;
  }, [labours, attendance]);

  // GPay & UPI Deep Link with Name & Amount
  const openUpiPayment = (upiTarget: string, workerName: string, amount: number) => {
    let cleanUpi = upiTarget.trim();
    if (!cleanUpi) {
      alert(lang === 'ta' ? 'UPI ID அல்லது மொபைல் எண் கொடுக்கப்படவில்லை.' : 'UPI ID or Mobile Number not provided.');
      return;
    }

    if (/^\d{10}$/.test(cleanUpi)) {
      cleanUpi = `${cleanUpi}@upi`;
    }

    const upiUri = `upi://pay?pa=${encodeURIComponent(cleanUpi)}&pn=${encodeURIComponent(workerName)}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent('Wage Settlement')}`;
    window.location.href = upiUri;
  };

  // Universal Share (WhatsApp, Gmail, Telegram via Web Share API)
  const shareUniversalReport = async () => {
    const dayData = attendance[selectedDate] || {};
    let msg = `📅 *${t.title} - ${selectedDate}*\n\n`;

    filteredLabours.forEach(l => {
      const rec = dayData[l.id] || { status: 'ABSENT', advance: 0 };
      msg += `• *${l.name}* (${l.site}): ${rec.status} | Adv: ₹${rec.advance}\n`;
    });

    msg += `\n💰 *Total Daily Cash Needed: ₹${dailyMetrics.netCash}*`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Labour Report ${selectedDate}`,
          text: msg
        });
      } catch {
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
      }
    } else {
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  // Excel UTF-8 BOM CSV Export
  const exportToExcelFormat = () => {
    let csv = "\uFEFFWorker Name,Site,Daily Wage,Weekly Earned,Advance Taken,Balance Payable\n";
    labours.forEach(l => {
      const sum = weeklySummaries[l.id] || { earned: 0, advance: 0, balance: 0 };
      csv += `"${l.name}","${l.site}",${l.dailyWage},${sum.earned},${sum.advance},${sum.balance}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Labour_Report_${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  // Drag and Drop (Touch Move Reorder)
  const handleDragStart = (id: string) => {
    setDraggedWorkerId(id);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedWorkerId || draggedWorkerId === targetId) return;

    const fromIndex = labours.findIndex(l => l.id === draggedWorkerId);
    const toIndex = labours.findIndex(l => l.id === targetId);

    const reordered = [...labours];
    const [moved] = reordered.splice(fromIndex, 1);
    reordered.splice(toIndex, 0, moved);
    saveLabours(reordered);
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '500px',
      margin: '0 auto',
      minHeight: '100dvh',
      backgroundColor: '#f1f5f9',
      display: 'flex',
      flexDirection: 'column',
      boxSizing: 'border-box'
    }}>
      {/* Header */}
      <header style={{
        backgroundColor: '#0f172a',
        padding: '16px',
        color: '#fff',
        borderBottom: '3px solid #f59e0b',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 900 }}>👷 {t.title}</h1>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>{t.subtitle}</div>
          </div>
          <button
            onClick={toggleLanguage}
            style={{
              backgroundColor: '#334155',
              color: '#f59e0b',
              border: '1px solid #f59e0b',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '12px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {t.langToggle}
          </button>
        </div>
      </header>

      {/* Tabs */}
      <nav style={{ display: 'flex', backgroundColor: '#fff', borderBottom: '1px solid #cbd5e1' }}>
        <button
          onClick={() => setActiveTab('daily')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: 'none',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'daily' ? '3px solid #f59e0b' : 'none',
            color: activeTab === 'daily' ? '#f59e0b' : '#64748b'
          }}
        >
          📅 {t.dailyTab}
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          style={{
            flex: 1,
            padding: '12px',
            border: 'none',
            background: 'none',
            fontWeight: 'bold',
            fontSize: '13px',
            cursor: 'pointer',
            borderBottom: activeTab === 'weekly' ? '3px solid #f59e0b' : 'none',
            color: activeTab === 'weekly' ? '#f59e0b' : '#64748b'
          }}
        >
          💰 {t.weeklyTab}
        </button>
      </nav>

      {/* Content Area */}
      <main style={{ padding: '14px', flex: 1 }}>
        {activeTab === 'daily' ? (
          <>
            {/* Quick Actions Row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                onClick={handleVoiceInput}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  backgroundColor: isListening ? '#ef4444' : '#f59e0b',
                  color: '#fff',
                  border: 'none',
                  padding: '10px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {isListening ? `🔴 ${t.listening}` : t.voiceHint}
              </button>

              <button
                onClick={shareUniversalReport}
                style={{
                  backgroundColor: '#10b981',
                  color: '#fff',
                  border: 'none',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {t.shareReport}
              </button>
            </div>

            {/* Filter Bar */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '8px', marginBottom: '12px' }}>
              <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#64748b', display: 'block' }}>{t.selectDate}</span>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={{ border: 'none', width: '100%', fontWeight: 'bold', fontSize: '13px', outline: 'none' }}
                />
              </div>

              <div style={{ backgroundColor: '#fff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
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

            {/* Fast Search Input */}
            <input
              type="text"
              placeholder={lang === 'ta' ? "🔍 பெயர் மூலம் தேடவும்..." : "🔍 Search worker by name..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                marginBottom: '12px',
                fontSize: '13px',
                boxSizing: 'border-box'
              }}
            />

            {/* Add Worker Form */}
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

            {/* Camera Overlay */}
            {activeCameraWorkerId && (
              <div style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', marginBottom: '14px', border: '2px solid #f59e0b', textAlign: 'center' }}>
                <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '180px', objectFit: 'cover', borderRadius: '8px', backgroundColor: '#000' }} />
                <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                  <button
                    onClick={() => capturePhoto(activeCameraWorkerId)}
                    style={{ flex: 1, backgroundColor: '#10b981', color: '#fff', border: 'none', padding: '8px', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    📸 Snap & Save
                  </button>
                  <button
                    onClick={stopCamera}
                    style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: '6px', fontWeight: 'bold' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Worker Cards with Drag/Touch Move Reorder */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredLabours.map(labour => {
                const dayRec = attendance[selectedDate]?.[labour.id] || { status: 'ABSENT', advance: 0 };

                return (
                  <div
                    key={labour.id}
                    draggable
                    onDragStart={() => handleDragStart(labour.id)}
                    onDragOver={(e) => handleDragOver(e, labour.id)}
                    style={{
                      backgroundColor: '#fff',
                      padding: '12px',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                      touchAction: 'pan-y'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {dayRec.photoProof ? (
                          <img src={dayRec.photoProof} alt="Proof" style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981' }} />
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
                          <div style={{ fontWeight: 'bold', fontSize: '14px', color: '#1e293b' }}>
                            <span style={{ color: '#94a3b8', marginRight: '4px', cursor: 'grab' }}>⠿</span>
                            {labour.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>📍 {labour.site} | ₹{labour.dailyWage}/day</div>
                        </div>
                      </div>

                      <button
                        onClick={() => { setAdvanceInputId(labour.id); setAdvanceAmount(dayRec.advance ? String(dayRec.advance) : ''); }}
                        style={{
                          backgroundColor: dayRec.advance > 0 ? '#fee2e2' : '#f1f5f9',
                          color: dayRec.advance > 0 ? '#dc2626' : '#475569',
                          border: '1px solid #cbd5e1',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer'
                        }}
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

                    {/* Status Toggle Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {(['FULL', 'HALF', 'OT', 'ABSENT'] as AttendanceStatus[]).map((status) => {
                        const isActive = dayRec.status === status;
                        let bg = '#f1f5f9';
                        let color = '#475569';

                        if (isActive) {
                          if (status === 'FULL') { bg = '#10b981'; color = '#fff'; }
                          if (status === 'HALF') { bg = '#f59e0b'; color = '#fff'; }
                          if (status === 'OT') { bg = '#2563eb'; color = '#fff'; }
                          if (status === 'ABSENT') { bg = '#ef4444'; color = '#fff'; }
                        }

                        return (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleStatusChange(labour.id, status)}
                            style={{
                              padding: '8px 2px',
                              border: 'none',
                              borderRadius: '6px',
                              backgroundColor: bg,
                              color: color,
                              fontSize: '11px',
                              fontWeight: 'bold',
                              cursor: 'pointer'
                            }}
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

            {/* Daily Summary Box */}
            <div style={{ marginTop: '16px', backgroundColor: '#fff', padding: '14px', borderRadius: '10px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t.totalWages}:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#10b981' }}>₹{dailyMetrics.totalWage}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#64748b' }}>{t.totalAdvance}:</span>
                <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#ef4444' }}>₹{dailyMetrics.totalAdv}</span>
              </div>
              <div style={{ height: '1px', backgroundColor: '#e2e8f0', margin: '8px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#0f172a' }}>{t.netCash}:</span>
                <span style={{ fontSize: '16px', fontWeight: 900, color: '#f59e0b' }}>₹{dailyMetrics.netCash}</span>
              </div>
            </div>
          </>
        ) : (
          /* Weekly Settlement Payout View */
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <button
                onClick={exportToExcelFormat}
                style={{
                  backgroundColor: '#0284c7',
                  color: '#fff',
                  border: 'none',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t.exportCsv}
              </button>

              <button
                onClick={handleClearAllData}
                style={{
                  backgroundColor: '#fee2e2',
                  color: '#ef4444',
                  border: '1px solid #fca5a5',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 'bold',
                  cursor: 'pointer'
                }}
              >
                {t.clearAll}
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {labours.map(labour => {
                const sum = weeklySummaries[labour.id] || { earned: 0, advance: 0, balance: 0, daysInfo: '' };

                return (
                  <div key={labour.id} style={{ backgroundColor: '#fff', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>{labour.name}</div>
                        <div style={{ fontSize: '11px', color: '#64748b' }}>{labour.site} | Daily: ₹{labour.dailyWage}</div>
                      </div>
                      <span style={{ fontSize: '11px', backgroundColor: '#e0f2fe', color: '#0369a1', padding: '4px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                        {sum.daysInfo}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', backgroundColor: '#f8fafc', padding: '8px', borderRadius: '6px', textAlign: 'center', marginBottom: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.earned}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#10b981' }}>₹{sum.earned}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.advDeducted}</div>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#ef4444' }}>₹{sum.advance}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: '#64748b' }}>{t.balancePayable}</div>
                        <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a' }}>₹{sum.balance}</div>
                      </div>
                    </div>

                    {/* Direct UPI / GPay Trigger Button */}
                    {sum.balance > 0 && (
                      <button
                        onClick={() => openUpiPayment(labour.upiId || '', labour.name, sum.balance)}
                        style={{
                          width: '100%',
                          backgroundColor: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          padding: '10px',
                          borderRadius: '6px',
                          fontWeight: 'bold',
                          fontSize: '12px',
                          cursor: 'pointer'
                        }}
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
      </main>
    </div>
  );
}
