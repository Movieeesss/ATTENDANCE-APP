import React, { useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { 
  DndContext, 
  closestCenter, 
  TouchSensor, 
  MouseSensor, 
  useSensor, 
  useSensors,
} from '@dnd-kit/core';
import { 
  arrayMove, 
  SortableContext, 
  verticalListSortingStrategy, 
  useSortable 
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface FileItem {
  id: string;
  file: File;
  name: string;
}

// Natural sort function: name01, name02, RB2 nu correct-ah Ascending order-la sort pannum
const sortAscending = (list: FileItem[]): FileItem[] => {
  return [...list].sort((a, b) => 
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
  );
};

// --- Sortable Item Component ---
const SortableItem = ({ file, onRemove }: { file: FileItem; onRemove: (id: string) => void }) => {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform, 
    transition, 
    isDragging 
  } = useSortable({ id: file.id });
  
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    backgroundColor: isDragging ? '#eefaff' : 'white',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '8px',
    border: isDragging ? '2px solid #92d050' : '1px solid #0070c0',
    display: 'flex',
    alignItems: 'center',
    boxShadow: isDragging ? '0 8px 15px rgba(0,0,0,0.2)' : '0 2px 5px rgba(0,0,0,0.1)',
    zIndex: isDragging ? 10 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div 
        {...attributes} 
        {...listeners} 
        style={{ 
          marginRight: '15px', 
          color: '#0070c0', 
          fontSize: '20px', 
          cursor: 'grab', 
          padding: '10px 5px',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none'
        }}
      >
        ☰
      </div>
      
      <div style={{ flex: 1, fontSize: '13px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </div>

      <button 
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(file.id);
        }}
        style={{ 
          background: '#ff4d4d', 
          color: 'white', 
          border: 'none', 
          borderRadius: '50%', 
          width: '28px', 
          height: '28px', 
          cursor: 'pointer', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          fontSize: '16px', 
          fontWeight: 'bold', 
          marginLeft: '10px' 
        }}
      >
        ×
      </button>
    </div>
  );
};

export default function MergePDF() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 }, 
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 }, 
    })
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const newFiles: FileItem[] = Array.from(e.target.files).map((file) => ({
      id: `${file.name}-${Date.now()}-${Math.random()}`,
      file,
      name: file.name
    }));

    // Files select aana odane automatic-ah Ascending order-la sort aagum
    setFiles(prev => sortAscending([...prev, ...newFiles]));
    e.target.value = ''; 
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setFiles((items) => {
        const oldIndex = items.findIndex(i => i.id === active.id);
        const newIndex = items.findIndex(i => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const processPDF = async () => {
    const mergedPdf = await PDFDocument.create();
    for (const f of files) {
      const bytes = await f.file.arrayBuffer();
      const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true });
      const pages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
      pages.forEach(p => mergedPdf.addPage(p));
    }
    const pdfBytes = await mergedPdf.save();
    return new File([pdfBytes], `Merged_Report_${Date.now()}.pdf`, { type: 'application/pdf' });
  };

  const onDownload = async () => {
    if (files.length < 2) return alert("Select at least 2 files!");
    setLoading(true);
    try {
      const file = await processPDF();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = file.name;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Error generating PDF.");
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    if (files.length < 2) return alert("Select at least 2 files!");
    setLoading(true);
    try {
      const file = await processPDF();
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Merged PDF', text: 'Structural Report' });
      } else {
        alert("Sharing not supported. Using Download instead.");
        onDownload();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '450px', margin: '0 auto', minHeight: '100vh', backgroundColor: '#f9f9f9', fontFamily: 'sans-serif' }}>
      <header style={{ backgroundColor: '#92d050', padding: '18px', textAlign: 'center', fontWeight: '900', fontSize: '18px', borderBottom: '4px solid #76b041', color: '#333' }}>
        MERGE PDF
      </header>
      
      <div style={{ padding: '15px' }}>
        <label style={{ display: 'block', padding: '25px', border: '2px dashed #0070c0', textAlign: 'center', borderRadius: '12px', backgroundColor: '#eefaff', cursor: 'pointer', marginBottom: '15px' }}>
          <input type="file" multiple accept=".pdf" onChange={handleFileChange} style={{ display: 'none' }} />
          <span style={{ fontWeight: 'bold', color: '#0070c0', fontSize: '14px' }}>+ SELECT PDF FILES</span>
        </label>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={files.map(f => f.id)} strategy={verticalListSortingStrategy}>
            <div style={{ paddingBottom: '10px' }}>
              {files.map(f => (
                <SortableItem key={f.id} file={f} onRemove={(id: string) => setFiles(prev => prev.filter(x => x.id !== id))} />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {files.length > 0 && (
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ backgroundColor: '#ffff00', padding: '12px', textAlign: 'center', fontWeight: 'bold', borderRadius: '8px', border: '1px solid #e6e600', fontSize: '14px' }}>
              TOTAL FILES: {files.length}
            </div>
            
            <button onClick={onDownload} disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: '#0070c0', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
              {loading ? "MERGING..." : "DOWNLOAD MERGED PDF"}
            </button>

            <button onClick={onShare} disabled={loading} style={{ width: '100%', padding: '16px', backgroundColor: '#25D366', color: 'white', border: 'none', borderRadius: '10px', fontWeight: '900', cursor: 'pointer' }}>
              {loading ? "PREPARING..." : "SHARE TO WHATSAPP"}
            </button>
            
            <button onClick={() => setFiles([])} style={{ background: 'none', border: 'none', color: '#888', textDecoration: 'underline', cursor: 'pointer', fontSize: '12px', marginTop: '5px' }}>
              Clear All Files
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
