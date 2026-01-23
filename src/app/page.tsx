'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

interface FileItem {
  id: string;
  name: string;
  filename: string;
  type: string;
  size: number;
  uploadedAt: string;
  uploadedBy?: string;
  isFolder: boolean;
  parentId?: string;
  isProtected?: boolean;
  emoji?: string | null;
}

type SortField = 'name' | 'type' | 'size' | 'uploadedAt';
type SortOrder = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getFileIcon(mimeType: string, isFolder: boolean = false, emoji?: string | null): React.ReactNode {
  if (isFolder && emoji) {
    return (
      <div className="file-type-icon emoji" style={{ fontSize: '2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', width: '100%' }}>
       {emoji}
      </div>
    );
  }
  if (isFolder) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon folder">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  if (mimeType.startsWith('image/')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon image">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <path d="m21 15-5-5L5 21"/>
      </svg>
    );
  }
  if (mimeType.startsWith('video/')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon video">
        <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
        <path d="m7 2 0 20"/>
        <path d="m17 2 0 20"/>
        <path d="m2 12 20 0"/>
        <path d="m2 7 5 0"/>
        <path d="m2 17 5 0"/>
        <path d="m17 17 5 0"/>
        <path d="m17 7 5 0"/>
      </svg>
    );
  }
  if (mimeType.startsWith('audio/')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon audio">
        <path d="M9 18V5l12-2v13"/>
        <circle cx="6" cy="18" r="3"/>
        <circle cx="18" cy="16" r="3"/>
      </svg>
    );
  }
  if (mimeType.includes('pdf')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon pdf">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M10 12h4"/>
        <path d="M10 16h4"/>
      </svg>
    );
  }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon archive">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        <line x1="12" y1="11" x2="12" y2="17"/>
        <line x1="9" y1="14" x2="15" y2="14"/>
      </svg>
    );
  }
  if (mimeType.includes('word') || mimeType.includes('document')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon doc">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M8 13h8"/>
        <path d="M8 17h8"/>
        <path d="M8 9h2"/>
      </svg>
    );
  }
  if (mimeType.includes('sheet') || mimeType.includes('excel')) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon spreadsheet">
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
        <polyline points="14,2 14,8 20,8"/>
        <path d="M8 13h2v2H8z"/>
        <path d="M14 13h2v2h-2z"/>
        <path d="M8 17h2v2H8z"/>
        <path d="M14 17h2v2h-2z"/>
      </svg>
    );
  }
  // Default file icon
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="file-type-icon default">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14,2 14,8 20,8"/>
    </svg>
  );
}

function getFileTypeLabel(mimeType: string, isFolder: boolean = false): string {
  if (isFolder) return 'Folder';
  if (mimeType.startsWith('image/')) return 'Image';
  if (mimeType.startsWith('video/')) return 'Video';
  if (mimeType.startsWith('audio/')) return 'Audio';
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'Archive';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'Document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'Spreadsheet';
  if (mimeType.includes('text')) return 'Text';
  const ext = mimeType.split('/')[1];
  return ext ? ext.toUpperCase() : 'File';
}

interface Breadcrumb {
  id: string;
  name: string;
}

export default function HomePage() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortField, setSortField] = useState<SortField>('uploadedAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showSortMenu, setShowSortMenu] = useState(false);
  
  // Folder state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Breadcrumb[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderEmoji, setNewFolderEmoji] = useState('');
  const [newFolderPassword, setNewFolderPassword] = useState('');
  const [creatingFolder, setCreatingFolder] = useState(false);
  
  // Password protection state
  const [folderPasswords, setFolderPasswords] = useState<Record<string, string>>({}); // id -> password
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [targetProtectedFolder, setTargetProtectedFolder] = useState<{id: string, name: string} | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  
  // Delete state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{id: string, name: string, isFolder: boolean} | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Edit Folder State
  const [showEditFolderModal, setShowEditFolderModal] = useState(false);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderEmoji, setEditFolderEmoji] = useState('');
  const [editFolderPassword, setEditFolderPassword] = useState('');
  const [editingFolder, setEditingFolder] = useState(false);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);

  // Bulk Selection State
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [downloadingZip, setDownloadingZip] = useState(false);

  // OTP State
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    fetchFiles();
    // Load view preference from localStorage
    const savedView = localStorage.getItem('fileViewMode') as ViewMode;
    if (savedView) setViewMode(savedView);
  }, [currentFolderId]); // Re-fetch when folder changes

  const fetchFiles = async () => {
    try {
      setLoading(true);
      setError('');
      
      const headers: HeadersInit = {};
      if (currentFolderId && folderPasswords[currentFolderId]) {
        headers['x-folder-password'] = folderPasswords[currentFolderId];
      }

      const url = currentFolderId 
        ? `/api/files?parentId=${currentFolderId}`
        : '/api/files';
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        if (response.status === 403) {
          // This should ideally be caught before navigation, but just in case
           throw new Error('Access denied. Password required.');
        }
        throw new Error('Failed to fetch files');
      }
      const data = await response.json();
      setFiles(data.files || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };
  
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    setError('');
    
    try {
      const response = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newFolderName.trim(),
          parentId: currentFolderId,
          password: newFolderPassword.trim() || undefined,
          emoji: newFolderEmoji.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create folder');
      }

      setNewFolderName('');
      setNewFolderEmoji('');
      setNewFolderPassword('');
      setShowFolderModal(false);
      fetchFiles();
      setSuccess(`Folder "${data.folder.name}" created!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create folder');
    } finally {
      setCreatingFolder(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProtectedFolder) return;
    
    // Store password
    const newPasswords = { ...folderPasswords };
    newPasswords[targetProtectedFolder.id] = passwordInput;
    setFolderPasswords(newPasswords);
    
    // Check if we are editing
    if (editFolderId === targetProtectedFolder.id) {
      try {
        const response = await fetch(`/api/files?parentId=${targetProtectedFolder.id}`, {
          headers: {
            'x-folder-password': passwordInput
          }
        });
        
        if (response.ok) {
          setShowPasswordModal(false);
          setPasswordInput('');
          setTargetProtectedFolder(null);
          setShowEditFolderModal(true);
        } else {
          setError('Incorrect password');
        }
      } catch (err) {
        setError('Failed to verify password');
      }
      return;
    }
    
    // Close modal and attempt navigation
    const folder = targetProtectedFolder; // capture ref
    setShowPasswordModal(false);
    setPasswordInput('');
    setTargetProtectedFolder(null);

    // Try verifying access with the password
    try {
      const response = await fetch(`/api/files?parentId=${folder.id}`, {
        headers: {
          'x-folder-password': passwordInput
        }
      });
      
      if (response.ok) {
        handleNavigate(folder.id, folder.name);
      } else {
        setError('Incorrect password');
      }
    } catch (err) {
      setError('Failed to verify password');
    }
  };

  const handleNavigate = (folderId: string, folderName: string) => {
    setCurrentFolderId(folderId);
    setBreadcrumbs([...breadcrumbs, { id: folderId, name: folderName }]);
  };

  const handleNavigateUp = (index: number) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setBreadcrumbs([]);
    } else {
      const targetBreadcrumb = breadcrumbs[index];
      setCurrentFolderId(targetBreadcrumb.id);
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  const handleUpload = async (files: File[]) => {
    if (files.length === 0) return;

    setError('');
    setSuccess('');
    setUploading(true);
    setUploadProgress(0);

    let completed = 0;
    const totalFiles = files.length;
    let hasError = false;

    // Helper to upload single file
    const uploadSingle = async (file: File) => {
       try {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId) {
          formData.append('parentId', currentFolderId);
        }

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.status === 413) {
          throw new Error(`File "${file.name}" is too large (Server limit exceeded)`);
        }

        let data;
        try {
          data = await response.json();
        } catch (e) {
          if (!response.ok) {
             throw new Error(`Upload failed for "${file.name}": ${response.status} ${response.statusText}`);
          }
          data = {}; 
        }

        if (!response.ok) {
          throw new Error(data.error || data.message || `Upload failed for "${file.name}"`);
        }
       } catch (err) {
         console.error(err);
         hasError = true;
         throw err;
       }
    };

    try {
      // Simulate progress for UX
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
           if (prev >= 95) return prev;
           return prev + 5;
        });
      }, 500);

      // Upload sequentially to avoid overwhelming server/network for huge lists
      // or use Promise.all for parallel. Let's do sequential for reliability with progress updates.
      // Actually Promise.allSettled is better to not fail all if one fails.
      
      const results = await Promise.allSettled(files.map(uploadSingle));
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      const failures = results.filter(r => r.status === 'rejected');
      const successful = results.filter(r => r.status === 'fulfilled');

      if (failures.length > 0) {
        const errors = failures.map((f: any) => f.reason.message).join(' | ');
        setError(`Failed to upload ${failures.length} file(s): ${errors.substring(0, 100)}...`);
        if (successful.length > 0) {
           // Partially successful - show success too? maybe just refresh
           setSuccess(`Uploaded ${successful.length} file(s) successfully, but some failed.`);
        }
      } else {
        setSuccess(`Successfully uploaded ${files.length} file(s)!`);
      }

      fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Batch upload failed');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
       handleUpload(Array.from(e.target.files));
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(Array.from(e.dataTransfer.files));
    }
  };

  const handleEditClick = (file: FileItem) => {
    if (!file.isFolder) return;

    setEditFolderId(file.id);
    setEditFolderName(file.name);
    setEditFolderEmoji(file.emoji || '');
    setEditFolderPassword('');
    setRecoveryToken(null);
    
    if (file.isProtected) {
      if (folderPasswords[file.id]) {
        setShowEditFolderModal(true);
      } else {
        setTargetProtectedFolder({ id: file.id, name: file.name });
        setShowPasswordModal(true);
      }
    } else {
      setShowEditFolderModal(true);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderId) return;

    setEditingFolder(true);
    setError('');

    try {
      const body: {
        name: string;
        emoji: string;
        password: string;
        recoveryToken?: string;
        currentPassword?: string;
      } = {
        name: editFolderName,
        emoji: editFolderEmoji,
        password: editFolderPassword
      };

      if (recoveryToken) {
        body.recoveryToken = recoveryToken;
      } else if (folderPasswords[editFolderId]) {
        body.currentPassword = folderPasswords[editFolderId];
      }

      const response = await fetch(`/api/folders/${editFolderId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(recoveryToken ? {} : { 'x-folder-password': folderPasswords[editFolderId] || '' })
        },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update folder');
      }
      
      if (editFolderPassword) {
         setFolderPasswords(prev => ({...prev, [editFolderId]: editFolderPassword}));
      }

      setSuccess(`Folder "${data.folder.name}" updated!`);
      setShowEditFolderModal(false);
      setEditFolderId(null);
      setRecoveryToken(null);
      fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update folder');
    } finally {
      setEditingFolder(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!targetProtectedFolder) return;
    setSendingOtp(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId: targetProtectedFolder.id })
      });
      
      if (!response.ok) throw new Error('Failed to send OTP');
      
      setShowPasswordModal(false);
      setShowOtpModal(true);
    } catch (err) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProtectedFolder) return;
    
    setVerifyingOtp(true);
    setError('');
    
    try {
      const response = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          folderId: targetProtectedFolder.id,
          otp: otpInput
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Invalid OTP');
      
      setRecoveryToken(data.recoveryToken);
      setShowOtpModal(false);
      setOtpInput('');
      
      const file = files.find(f => f.id === targetProtectedFolder.id);
      if (file) {
          setEditFolderId(file.id);
          setEditFolderName(file.name);
          setEditFolderEmoji(file.emoji || '');
          setEditFolderPassword(''); 
          setShowEditFolderModal(true);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleItemClick = (file: FileItem) => {
    // For folders, we rely on double click, EXCEPT if we are in list view where standard is single click often, 
    // but request said "double click the folder". Let's standardize on double click for folders.
    // However, for mobile friendliness or list view, usually single click is navigation.
    // But adhering to request: "i should be able to double click the folder"
    // I will implement double click handler on the container elements.
    
    // So this single click handler might select the item (future feature) or do nothing for folders.
    // For now, let's keep it doing nothing for folders for *single* click, 
    // or maybe toggle selection if we had that.
    
    // Actually, if I remove existing single click nav, I need to add double click listener.
    // For regular files, single click download is what we had, or maybe it should be double click too?
    // "Review: double click the folder" implies explicit change for folders.
  };

  const handleItemDoubleClick = (file: FileItem) => {
    if (file.isFolder) {
      // Check protection
      if (file.isProtected) {
        // If we already have a cached password, try to use it? 
        // Or always prompt? Let's check cache first.
        if (folderPasswords[file.id]) {
           handleNavigate(file.id, file.name);
        } else {
           setTargetProtectedFolder({ id: file.id, name: file.name });
           setShowPasswordModal(true);
        }
      } else {
        handleNavigate(file.id, file.name);
      }
    } else {
      handleDownload(file.id);
    }
  };

  const handleDownload = (fileId: string) => {
    window.open(`/api/files/${fileId}/download`, '_blank');
  };

  const handleDeleteClick = (item: FileItem) => {
    setItemToDelete({ id: item.id, name: item.name, isFolder: item.isFolder });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/files/${itemToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete item');
      }

      setSuccess(`${itemToDelete.isFolder ? 'Folder' : 'File'} "${itemToDelete.name}" deleted successfully!`);
      setShowDeleteModal(false);
      setItemToDelete(null);
      fetchFiles();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    } finally {
      setDeleting(false);
    }
  };

  // Restore view mode toggle
  const toggleViewMode = (mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('fileViewMode', mode);
  };

  const handleSelectFile = (fileId: string, multiSelect: boolean, rangeSelect: boolean) => {
    const newSelected = new Set(multiSelect ? selectedFiles : []);
    
    if (rangeSelect && lastSelectedId) {
       const start = sortedFiles.findIndex(f => f.id === lastSelectedId);
       const end = sortedFiles.findIndex(f => f.id === fileId);
       const low = Math.min(start, end);
       const high = Math.max(start, end);
       
       for (let i = low; i <= high; i++) {
         if (sortedFiles[i]) newSelected.add(sortedFiles[i].id);
       }
    } else {
       if (newSelected.has(fileId)) {
         newSelected.delete(fileId);
       } else {
         newSelected.add(fileId);
       }
    }
    
    setSelectedFiles(newSelected);
    setLastSelectedId(fileId);
  };

  const handleSelectAll = () => {
    if (selectedFiles.size === sortedFiles.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(sortedFiles.map(f => f.id)));
    }
  };

  const handleDownloadZip = async (items: string[] | null = null) => {
    setDownloadingZip(true);
    
    try {
      const body = items ? { fileIds: items } : { fileIds: Array.from(selectedFiles) };
      
      const response = await fetch('/api/files/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
         const data = await response.json();
         throw new Error(data.error || 'Failed to download zip');
      }

      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      // Get filename from header if possible, else default
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'download.zip';
      if (disposition && disposition.indexOf('attachment') !== -1) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
            filename = matches[1].replace(/['"]/g, '');
          }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      // Clear selection after download? Maybe optional.
      // setSelectedFiles(new Set()); 
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Download failed');
    } finally {
      setDownloadingZip(false);
    }
  };

  const handleDownloadFolder = async (folderId: string) => {
     setDownloadingZip(true);
     try {
       const response = await fetch('/api/files/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folderId }),
      });
      
      if (!response.ok) {
         const data = await response.json();
         throw new Error(data.error || 'Failed to download folder');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const disposition = response.headers.get('Content-Disposition');
      let filename = 'folder.zip';
      if (disposition) {
          const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
          const matches = filenameRegex.exec(disposition);
          if (matches != null && matches[1]) { 
            filename = matches[1].replace(/['"]/g, '');
          }
      }
      
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
     } catch (err) {
       setError(err instanceof Error ? err.message : 'Download failed');
     } finally {
       setDownloadingZip(false);
     }
  };
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setShowSortMenu(false);
  };

  const sortedFiles = [...files].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'type':
        comparison = a.type.localeCompare(b.type);
        break;
      case 'size':
        comparison = a.size - b.size;
        break;
      case 'uploadedAt':
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
        break;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const sortOptions = [
    { field: 'name' as SortField, label: 'Name' },
    { field: 'type' as SortField, label: 'Type' },
    { field: 'size' as SortField, label: 'Size' },
    { field: 'uploadedAt' as SortField, label: 'Date uploaded' },
  ];

  return (
    <div className="dashboard">
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17,8 12,3 7,8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>
          <h1>File Storage</h1>
        </div>
        <div className="header-actions">
           <button onClick={() => setShowFolderModal(true)} className="new-folder-btn">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              <line x1="12" y1="11" x2="12" y2="17" />
              <line x1="9" y1="14" x2="15" y2="14" />
            </svg>
            <span>New Folder</span>
          </button>
          <button onClick={handleLogout} className="logout-button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </header>

      <main className="main-content">
        {/* Breadcrumbs */}
        <div className="breadcrumbs">
          <button 
            className={`breadcrumb-item ${!currentFolderId ? 'active' : ''}`}
            onClick={() => handleNavigateUp(-1)}
          >
            Home
          </button>
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.id} className="breadcrumb-group">
              <span className="breadcrumb-separator">/</span>
              <button 
                className={`breadcrumb-item ${index === breadcrumbs.length - 1 ? 'active' : ''}`}
                onClick={() => handleNavigateUp(index)}
              >
                {crumb.name}
              </button>
            </div>
          ))}
        </div>

        {/* Create Folder Modal */}
        {showFolderModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Create New Folder</h3>
                <button onClick={() => setShowFolderModal(false)} className="close-btn">×</button>
              </div>
              <form onSubmit={handleCreateFolder}>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Folder Name"
                  className="folder-input"
                  autoFocus
                />
                <input
                  type="text"
                  value={newFolderEmoji}
                  onChange={(e) => setNewFolderEmoji(e.target.value)}
                  placeholder="Emoji / Icon (Optional)"
                  className="folder-input"
                />
                <input
                  type="password"
                  value={newFolderPassword}
                  onChange={(e) => setNewFolderPassword(e.target.value)}
                  placeholder="Password (Optional)"
                  className="folder-input"
                />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowFolderModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={creatingFolder || !newFolderName.trim()} className="create-btn">
                    {creatingFolder ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Password Prompt Modal */}
        {showPasswordModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Enter Password</h3>
                <button onClick={() => setShowPasswordModal(false)} className="close-btn">×</button>
              </div>
              <form onSubmit={handlePasswordSubmit}>
                <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>
                  This folder is protected. Please enter the password to open it.
                </p>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Password"
                  className="folder-input"
                  autoFocus
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                   <button 
                     type="button" 
                     onClick={handleForgotPassword} 
                     disabled={sendingOtp}
                     style={{ background: 'none', border: 'none', color: '#3b82f6', cursor: 'pointer', fontSize: '0.875rem' }}
                   >
                     {sendingOtp ? 'Sending OTP...' : 'Forgot Password?'}
                   </button>
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowPasswordModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={!passwordInput} className="create-btn">
                    Unlock
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* OTP Verification Modal */}
        {showOtpModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Verify Identity</h3>
                <button onClick={() => setShowOtpModal(false)} className="close-btn">×</button>
              </div>
              <form onSubmit={handleVerifyOtp}>
                <p style={{marginBottom: '1rem', color: 'var(--text-secondary)'}}>
                  An OTP has been sent to the admin email. Please enter it below.
                </p>
                <input
                  type="text"
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="Enter OTP"
                  className="folder-input"
                  autoFocus
                />
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowOtpModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={verifyingOtp || !otpInput} className="create-btn">
                    {verifyingOtp ? 'Verifying...' : 'Verify'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Folder Modal */}
        {showEditFolderModal && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Edit Folder</h3>
                <button onClick={() => setShowEditFolderModal(false)} className="close-btn">×</button>
              </div>
              <form onSubmit={handleEditSubmit}>
                <div style={{marginBottom: '1rem'}}>
                    <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem'}}>Folder Name</label>
                    <input
                      type="text"
                      value={editFolderName}
                      onChange={(e) => setEditFolderName(e.target.value)}
                      placeholder="Folder Name"
                      className="folder-input"
                    />
                </div>
                <div style={{marginBottom: '1rem'}}>
                    <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem'}}>Emoji / Icon</label>
                    <input
                      type="text"
                      value={editFolderEmoji}
                      onChange={(e) => setEditFolderEmoji(e.target.value)}
                      placeholder="Emoji"
                      className="folder-input"
                    />
                </div>
                <div style={{marginBottom: '1rem'}}>
                    <label style={{display:'block', marginBottom:'0.5rem', fontSize:'0.9rem'}}>Password</label>
                    <input
                      type="password"
                      value={editFolderPassword}
                      onChange={(e) => setEditFolderPassword(e.target.value)}
                      placeholder="New Password (leave empty to keep current)"
                      className="folder-input"
                    />
                </div>
                <div className="modal-actions">
                  <button type="button" onClick={() => setShowEditFolderModal(false)} className="cancel-btn">
                    Cancel
                  </button>
                  <button type="submit" disabled={editingFolder || !editFolderName.trim()} className="create-btn">
                    {editingFolder ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && itemToDelete && (
          <div className="modal-overlay">
            <div className="modal">
              <div className="modal-header">
                <h3>Delete {itemToDelete.isFolder ? 'Folder' : 'File'}</h3>
                <button onClick={() => setShowDeleteModal(false)} className="close-btn">×</button>
              </div>
              <div className="modal-content">
                <p className="modal-text">
                  Are you sure you want to delete <strong>{itemToDelete.name}</strong>?
                </p>
                {itemToDelete.isFolder && (
                  <p className="modal-warning">
                    Note: You can only delete empty folders.
                  </p>
                )}
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowDeleteModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button 
                  type="button" 
                  onClick={handleDeleteConfirm} 
                  disabled={deleting}
                  className="delete-btn"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Upload Section */}
        <div
          className={`upload-zone ${dragActive ? 'drag-active' : ''} ${uploading ? 'uploading' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => !uploading && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileSelect}
            className="hidden-input"
            disabled={uploading}
            multiple
          />
          
          {uploading ? (
            <div className="upload-progress">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${uploadProgress}%` }} />
              </div>
              <span>Uploading... {uploadProgress}%</span>
            </div>
          ) : (
            <>
              <div className="upload-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17,8 12,3 7,8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="upload-text">
                <strong>Click to upload</strong> or drag and drop
              </p>
              <p className="upload-hint">Any file type up to 100MB</p>
            </>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="message error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            {error}
            <button onClick={() => setError('')} className="close-btn">×</button>
          </div>
        )}

        {success && (
          <div className="message success">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22,4 12,14.01 9,11.01" />
            </svg>
            {success}
            <button onClick={() => setSuccess('')} className="close-btn">×</button>
          </div>
        )}

        {/* File List Section */}
        <div className="files-section">
          <div className="files-header">
            <h2>My Files</h2>
            <div className="files-actions">
              {/* Bulk Actions */}
              {selectedFiles.size > 0 && (
                <div className="bulk-actions">
                  <span className="selection-count">{selectedFiles.size} selected</span>
                  <button 
                    className="action-button primary"
                    onClick={() => handleDownloadZip()}
                    disabled={downloadingZip}
                  >
                    {downloadingZip ? 'Zipping...' : 'Download Zip'}
                  </button>
                </div>
              )}
              
              {/* Select All Toggle (simplified for grid) */}
              <div className="selection-toggle">
                  <input 
                    type="checkbox" 
                    checked={files.length > 0 && selectedFiles.size === files.length}
                    onChange={handleSelectAll}
                    disabled={files.length === 0}
                    title="Select All"
                    style={{width: 18, height: 18, cursor: 'pointer', accentColor: 'var(--accent-primary)'}}
                  />
              </div>

              {/* Sort Button */}
              <div className="sort-dropdown">
                <button 
                  className="action-button"
                  onClick={() => setShowSortMenu(!showSortMenu)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 6h18"/>
                    <path d="M6 12h12"/>
                    <path d="M9 18h6"/>
                  </svg>
                  <span>Sort</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="chevron">
                    <polyline points="6,9 12,15 18,9" />
                  </svg>
                </button>
                {showSortMenu && (
                  <div className="sort-menu">
                    {sortOptions.map((option) => (
                      <button
                        key={option.field}
                        className={`sort-option ${sortField === option.field ? 'active' : ''}`}
                        onClick={() => handleSort(option.field)}
                      >
                        {option.label}
                        {sortField === option.field && (
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            {sortOrder === 'asc' ? (
                              <path d="M12 19V5M5 12l7-7 7 7"/>
                            ) : (
                              <path d="M12 5v14M5 12l7 7 7-7"/>
                            )}
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* View Toggle */}
              <div className="view-toggle">
                <button
                  className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                  onClick={() => toggleViewMode('grid')}
                  title="Grid view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="7" height="7"/>
                    <rect x="14" y="3" width="7" height="7"/>
                    <rect x="3" y="14" width="7" height="7"/>
                    <rect x="14" y="14" width="7" height="7"/>
                  </svg>
                </button>
                <button
                  className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                  onClick={() => toggleViewMode('list')}
                  title="List view"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="8" y1="6" x2="21" y2="6"/>
                    <line x1="8" y1="12" x2="21" y2="12"/>
                    <line x1="8" y1="18" x2="21" y2="18"/>
                    <line x1="3" y1="6" x2="3.01" y2="6"/>
                    <line x1="3" y1="12" x2="3.01" y2="12"/>
                    <line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {loading ? (
            <div className="loading-state">
              <div className="spinner large"></div>
              <p>Loading files...</p>
            </div>
          ) : sortedFiles.length === 0 ? (
            <div className="empty-state">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-6l-2-2H5a2 2 0 0 0-2 2z" />
              </svg>
              <p>No files uploaded yet</p>
              <span>Upload your first file to get started</span>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="files-grid">
              {sortedFiles.map((file) => (
                <div 
                  key={file.id} 
                  className={`file-card ${file.isFolder ? 'folder-card' : ''}`}
                  onClick={(e) => {
                     // If clicking directly on card (background), maybe select it?
                     // Or standard nav. Let's keep nav on click, but maybe ctrl/cmd click selects.
                     if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        e.preventDefault();
                        handleSelectFile(file.id, true, e.shiftKey);
                     } else {
                        handleItemClick(file);
                     }
                  }}
                  onDoubleClick={() => handleItemDoubleClick(file)}
                >
                  <div className="file-selection-checkbox" onClick={(e) => e.stopPropagation()}>
                     <input 
                       type="checkbox"
                       checked={selectedFiles.has(file.id)}
                       onChange={(e) => {
                          handleSelectFile(file.id, true, false); // Explicit check is multi-select additive
                       }}
                       style={{width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--accent-primary)'}}
                     />
                  </div>
                  <div className="file-card-icon" style={{marginTop: 20}}>
                    {getFileIcon(file.type, file.isFolder, file.emoji)}
                    {file.isProtected && (
                      <div className="lock-badge">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                          <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="file-card-info">
                    <span className="file-card-name" title={file.name}>{file.name}</span>
                    <span className="file-card-meta">
                      {getFileTypeLabel(file.type, file.isFolder)} • {file.isFolder ? (file.isProtected ? 'Locked' : '-') : formatFileSize(file.size)}
                    </span>
                  </div>
                  <div className="file-card-actions">
                    {file.isFolder && (
                      <button 
                        className="file-card-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditClick(file);
                        }}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    )}
                    {file.isFolder && (
                      <button 
                        className="file-card-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadFolder(file.id);
                        }}
                        title="Download Folder"
                        disabled={downloadingZip}
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                           <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                           <polyline points="7,10 12,15 17,10"/>
                           <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    )}
                    {!file.isFolder && (
                      <button 
                        className="file-card-download"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(file.id);
                        }}
                        title="Download"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7,10 12,15 17,10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                    )}
                    <button 
                      className="file-card-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteClick(file);
                      }}
                      title="Delete"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 6h18"/>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="files-table-container">
              <table className="files-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('name')} className="sortable">
                      Name
                      {sortField === 'name' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th onClick={() => handleSort('type')} className="sortable">
                      Type
                      {sortField === 'type' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th onClick={() => handleSort('size')} className="sortable">
                      Size
                      {sortField === 'size' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th onClick={() => handleSort('uploadedAt')} className="sortable">
                      Uploaded
                      {sortField === 'uploadedAt' && (
                        <span className="sort-indicator">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                      )}
                    </th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFiles.map((file) => (
                    <tr 
                      key={file.id} 
                      onClick={() => handleItemClick(file)}
                      onDoubleClick={() => handleItemDoubleClick(file)}
                      className="file-row"
                    >
                      <td>
                        <div className="file-name-cell">
                          <span className="file-icon-small">
                            {getFileIcon(file.type, file.isFolder, file.emoji)}
                             {file.isProtected && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{width: 12, height: 12, marginLeft: -8, marginTop: -8, background: 'var(--bg-card)', borderRadius: '50%', color: 'var(--accent-primary)'}}>
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                                </svg>
                            )}
                          </span>
                          <span className="file-name-text" title={file.name}>
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="file-type">
                        <span className="type-badge">{getFileTypeLabel(file.type, file.isFolder)}</span>
                      </td>
                      <td className="file-size">{file.isFolder ? (file.isProtected ? 'Locked' : '-') : formatFileSize(file.size)}</td>
                      <td className="file-date">{formatDate(file.uploadedAt)}</td>
                      <td className="file-action">
                        <div className="action-buttons">
                          {file.isFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditClick(file);
                              }}
                              className="download-button"
                              title="Edit"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                              </svg>
                              <span>Edit</span>
                            </button>
                          )}
                          {file.isFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadFolder(file.id);
                              }}
                              className="download-button"
                              title="Download Zip"
                              disabled={downloadingZip}
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              <span>Download</span>
                            </button>
                          )}
                          {!file.isFolder && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownload(file.id);
                              }}
                              className="download-button"
                              title="Download file"
                            >
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                                <polyline points="7,10 12,15 17,10"/>
                                <line x1="12" y1="15" x2="12" y2="3"/>
                              </svg>
                              <span>Download</span>
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(file);
                            }}
                            className="delete-button"
                            title="Delete"
                          >
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"/>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              <line x1="10" y1="11" x2="10" y2="17"/>
                              <line x1="14" y1="11" x2="14" y2="17"/>
                            </svg>
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
