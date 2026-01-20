import React, { useState, useRef, useEffect, useMemo } from 'react';
import logo from './logo.png';

import {
  LayoutDashboard,
  PlusCircle,
  LogOut,
  ChefHat,
  Menu as MenuIcon,
  X as CloseIcon,
  Search,
  ExternalLink,
  Upload,
  Download,
  FileText,
  AlertCircle,
  Database,
  Lock,
  User,
  Hand,
  CheckCircle,
  Users,
  Trash2,
  Edit,
  AlertTriangle,
  Eye,
  Calendar,
  Layers,
  Maximize2,
  X,
  Filter,
  UserCheck,
  History,
  ArrowRight
} from 'lucide-react';
import { Button } from './components/Button';
import { Input, Select, TextArea } from './components/Input';
import { Badge } from './components/Badge';
import { DesignRequest, ViewState, DashboardTab, DesignType, User as UserType, UserRole } from './types';
import {
  initDB,
  getAllRequests,
  insertRequest,
  updateRequest,
  deleteRequest,
  updateRequestResult,
  clearDB,
  assignDesignerToRequest,
  updateRequestStatus,
  loginUser,
  getAllUsers,
  addUser,
  deleteUser
} from './services/db';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
};

const openFile = (base64Data: string, fileName: string = 'file') => {
  try {
    // If it's a direct URL (not base64), just open it
    if (!base64Data.startsWith('data:')) {
      window.open(base64Data, '_blank');
      return;
    }

    const base64Content = base64Data.split(',')[1];
    const mimeType = base64Data.split(';')[0].split(':')[1];

    if (!base64Content) {
      window.open(base64Data, '_blank');
      return;
    }

    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    const url = URL.createObjectURL(blob);

    // Create a temporary link to force download/open with correct name if possible
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.download = fileName;
    document.body.appendChild(link);
    link.click();

    // Clean up
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 1000);

  } catch (e) {
    console.error("Failed to open blob:", e);
    window.open(base64Data, '_blank');
  }
};

const FilePreview = ({ url, label }: { url: string, label: string }) => {
  if (!url) return <div className="aspect-video bg-stone-50 rounded-xl border border-dashed flex items-center justify-center text-stone-400 text-sm">No {label.toLowerCase()}</div>;

  // Handle External Links (GDrive, etc)
  if (!url.startsWith('data:')) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="w-full aspect-video bg-stone-50 rounded-xl overflow-hidden border hover:border-brand-500 transition-colors flex flex-col items-center justify-center text-stone-600 gap-3 hover:bg-brand-50 group">
        <ExternalLink className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />
        <span className="font-bold text-sm text-center px-4 truncate w-full">Open {label} Link</span>
      </a>
    );
  }

  const isImage = url.startsWith('data:image') || url.match(/\.(jpeg|jpg|gif|png|webp)$/i);
  const isPdf = url.startsWith('data:application/pdf') || url.endsWith('.pdf');

  if (isImage) {
    return (
      <button onClick={() => openFile(url, `${label}.png`)} className="block w-full aspect-video bg-stone-100 rounded-xl overflow-hidden border hover:border-brand-500 transition-colors relative group">
        <img src={url} className="w-full h-full object-contain bg-stone-900/5" alt={label} />
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
          <Maximize2 className="w-8 h-8 text-white drop-shadow-md" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={() => openFile(url, `${label}`)}
      className="w-full aspect-video bg-stone-50 rounded-xl overflow-hidden border hover:border-brand-500 transition-colors flex flex-col items-center justify-center text-stone-600 gap-3 hover:bg-brand-50 group"
    >
      {isPdf ? <FileText className="w-12 h-12 text-red-500 group-hover:scale-110 transition-transform" /> : <Database className="w-12 h-12 text-blue-500 group-hover:scale-110 transition-transform" />}
      <span className="font-bold text-sm">
        {isPdf ? `View ${label} (PDF)` : `Download ${label} File`}
      </span>
    </button>
  );
};

const App: React.FC = () => {
  const [viewState, setViewState] = useState<ViewState>('LOGIN');
  const [activeTab, setActiveTab] = useState<DashboardTab>('STATUS');
  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [users, setUsers] = useState<UserType[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [designerFilter, setDesignerFilter] = useState('All');
  const [historyStartDate, setHistoryStartDate] = useState('');
  const [historyEndDate, setHistoryEndDate] = useState('');
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    outletName: '',
    designType: 'Social Media' as DesignType,
    dimensions: '',
    elements: '',
    referenceUrl: '',
  });
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formFileError, setFormFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClaiming, setIsClaiming] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearTimer, setClearTimer] = useState(10);
  const [uploadingRequestId, setUploadingRequestId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [newUserFormData, setNewUserFormData] = useState({ name: '', username: '', password: '', role: 'User' as UserRole });
  const [claimConfirmId, setClaimConfirmId] = useState<string | null>(null);
  const [resultSubmissionRequestId, setResultSubmissionRequestId] = useState<string | null>(null);
  const [resultLink, setResultLink] = useState('');
  const [activeResultTab, setActiveResultTab] = useState<'UPLOAD' | 'LINK'>('UPLOAD');

  const resultFileInputRef = useRef<HTMLInputElement>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const setupDB = async () => {
      try {
        await initDB();
        setIsDbReady(true);
      } catch (err) {
        console.error("Failed to connect to Neon DB:", err);
      }
    };
    setupDB();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (showClearConfirm && clearTimer > 0) {
      interval = setInterval(() => setClearTimer((prev) => prev - 1), 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [showClearConfirm, clearTimer]);

  const refreshRequests = async () => {
    try {
      const data = await getAllRequests();
      setRequests(data);
      if (selectedRequest) {
        const updated = data.find(r => r.id === selectedRequest.id);
        if (updated) setSelectedRequest(updated);
      }
    } catch (e) {
      console.error("Refresh failed:", e);
    }
  };

  const refreshUsers = async () => {
    const data = await getAllUsers();
    setUsers(data);
  };

  const userRequests = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === 'User') {
      return requests.filter(req => req.requestorUsername === currentUser.username);
    }
    return requests;
  }, [requests, currentUser]);

  const filteredRequests = useMemo(() => {
    // Start filtering from the user-scoped list
    return userRequests.filter(req => {
      const matchesSearch = req.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.designType.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'All' || req.status === statusFilter;
      const matchesDesigner = designerFilter === 'All' ? true :
        designerFilter === 'Unassigned' ? !req.designerName :
          req.designerName === designerFilter;
      return matchesSearch && matchesStatus && matchesDesigner;
    });
  }, [userRequests, searchQuery, statusFilter, designerFilter]);

  const historyRequests = useMemo(() => {
    // Start filtering from the user-scoped list
    return userRequests.filter(req => {
      if (req.status !== 'Done') return false;
      const requestDate = new Date(req.createdAt);
      const start = historyStartDate ? new Date(historyStartDate) : null;
      const end = historyEndDate ? new Date(historyEndDate) : null;
      if (start && requestDate < start) return false;
      if (end) {
        const endDay = new Date(end);
        endDay.setHours(23, 59, 59, 999);
        if (requestDate > endDay) return false;
      }
      const matchesSearch = req.outletName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.designType.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [userRequests, historyStartDate, historyEndDate, searchQuery]);

  const availableDesigners = useMemo(() => {
    const designers = Array.from(new Set(requests.map(r => r.designerName).filter(Boolean)));
    return designers.sort() as string[];
  }, [requests]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      const user = await loginUser(loginUsername, loginPassword);
      if (user) {
        setCurrentUser(user);
        const reqData = await getAllRequests();
        setRequests(reqData);
        if (user.role === 'Admin') await refreshUsers();
        setViewState('DASHBOARD');
      } else {
        setAuthError('Invalid username or password');
      }
    } catch (e) {
      setAuthError('Connection error during login');
    }
  };

  const handleLogout = () => {
    setViewState('LOGIN');
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setActiveTab('STATUS');
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserFormData.username || !newUserFormData.password || !newUserFormData.name) {
      alert("Please fill all fields");
      return;
    }
    try {
      await addUser(newUserFormData);
      await refreshUsers();
      setNewUserFormData({ name: '', username: '', password: '', role: 'User' });
      alert("User added successfully");
    } catch (e: any) {
      alert("Failed to add user: " + e.message);
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(`Are you sure you want to delete user ${username}?`)) return;
    try {
      await deleteUser(username);
      await refreshUsers();
    } catch (e: any) {
      alert("Failed to delete user");
    }
  };

  const handleClaimRequest = async () => {
    if (!currentUser || !claimConfirmId) return;
    setIsClaiming(claimConfirmId);
    try {
      const designerName = currentUser.name || currentUser.username;
      await assignDesignerToRequest(claimConfirmId, designerName);
      await refreshRequests();
      setClaimConfirmId(null);
    } catch (e: any) {
      console.error("Claim failed:", e);
      alert(`Gagal mengambil job: ${e.message || "Unknown error"}`);
    } finally {
      setIsClaiming(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm("Are you sure?")) return;
    try {
      await deleteRequest(id);
      await refreshRequests();
      if (selectedRequest?.id === id) setSelectedRequest(null);
    } catch (e) {
      alert("Delete failed.");
    }
  };

  const handleEditRequest = (req: DesignRequest) => {
    setEditingRequestId(req.id);
    setFormData({
      outletName: req.outletName,
      designType: req.designType,
      dimensions: req.dimensions,
      elements: req.elements,
      referenceUrl: req.referenceUrl
    });
    setFormFile(null);
    setFormFileError('');
    setSelectedRequest(null);
    setActiveTab('NEW_REQUEST');
  };

  const processFile = (file: File) => {
    if (file.size > MAX_FILE_SIZE) {
      setFormFileError('File too large (max 15MB)');
      setFormFile(null);
    } else {
      setFormFileError('');
      setFormFile(file);
    }
  };

  const handleReferenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) processFile(e.target.files[0]);
  };

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    let finalReferenceUrl = formData.referenceUrl;
    if (formFile) {
      try {
        finalReferenceUrl = await convertToBase64(formFile);
      } catch (error) {
        setFormFileError("File error.");
        setIsSubmitting(false);
        return;
      }
    } else if (formData.referenceUrl.trim() === '') {
      // Allow empty reference if validation allows, otherwise check your logic. 
      // Current logic requires one or the other? Or just optional?
      // Assuming optional based on before. 
    }
    try {
      const requestData = {
        ...formData,
        referenceUrl: finalReferenceUrl // Ensure the base64 string is used
      };

      if (editingRequestId) {
        await updateRequest({ ...requestData, id: editingRequestId } as DesignRequest);
      } else {
        const newRequest: DesignRequest = {
          id: `req_${Date.now()}`,
          ...requestData,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          requestorUsername: currentUser?.username
        };
        await insertRequest(newRequest);
      }
      await refreshRequests();
      setActiveTab('STATUS');
      setEditingRequestId(null);
    } catch (e) {
      alert("Submit failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelForm = () => {
    setActiveTab('STATUS');
    setEditingRequestId(null);
    setFormData({ outletName: '', designType: 'Social Media', dimensions: '', elements: '', referenceUrl: '' });
    setFormFile(null);
  };

  const handleSubmitResult = async () => {
    if (!resultSubmissionRequestId) return;

    if (activeResultTab === 'LINK') {
      if (!resultLink.trim()) {
        alert("Please enter a link.");
        return;
      }
      try {
        await updateRequestResult(resultSubmissionRequestId, "External Link", resultLink);
        await refreshRequests();
        setResultSubmissionRequestId(null);
        setResultLink('');
      } catch (e) {
        alert("Submit link failed");
      }
      return;
    }

    // If Upload tab, click the hidden input
    resultFileInputRef.current?.click();
  };

  const handleResultFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && resultSubmissionRequestId) {
      const file = e.target.files[0];
      if (file.size > MAX_FILE_SIZE) {
        alert("File too large (max 15MB)");
        // Don't close modal, let them try again
        if (resultFileInputRef.current) resultFileInputRef.current.value = '';
        return;
      }

      try {
        const base64 = await convertToBase64(file);
        await updateRequestResult(resultSubmissionRequestId, file.name, base64);
        await refreshRequests();
        setResultSubmissionRequestId(null); // Close modal on success
      } catch (e) {
        alert("Upload failed.");
      }
      if (resultFileInputRef.current) resultFileInputRef.current.value = '';
    }
  };

  if (!isDbReady) return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="text-center"><ChefHat className="w-12 h-12 text-brand-600 animate-pulse mx-auto mb-4" /><p className="font-medium text-stone-500">Connecting to Database...</p></div></div>;

  if (viewState === 'LOGIN') return (
    <div className="min-h-screen flex items-center justify-center bg-stone-100 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-stone-200">
        <div className="text-center mb-8"><img src={logo} alt="JAR Design Hub" className="h-24 mx-auto mb-4 object-contain" /><h1 className="text-2xl font-bold text-stone-900 tracking-tight">JAR Design Hub</h1><p className="text-stone-500 mt-1">Please sign in to your account</p></div>
        <form onSubmit={handleLoginSubmit} className="space-y-4">
          <Input label="Username" value={loginUsername} onChange={e => setLoginUsername(e.target.value)} placeholder="Enter username" required />
          <Input label="Password" type="password" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} placeholder="••••••••" required />
          {authError && <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2 font-medium"><AlertCircle className="w-4 h-4" />{authError}</div>}
          <Button type="submit" fullWidth>Sign In</Button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-stone-50 flex overflow-hidden">
      <input type="file" ref={resultFileInputRef} className="hidden" onChange={handleResultFileChange} accept="image/*,.pdf" />

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b flex justify-between items-center bg-white sticky top-0">
              <div className="flex gap-3 items-center">
                {(currentUser?.role === 'Admin' || currentUser?.role === 'Designer') ? (
                  <select
                    value={selectedRequest.status}
                    onChange={async (e) => {
                      const newStatus = e.target.value;
                      try {
                        await updateRequestStatus(selectedRequest.id, newStatus);
                        await refreshRequests();
                        setSelectedRequest({ ...selectedRequest, status: newStatus as any });
                      } catch (err) {
                        alert("Failed to update status");
                      }
                    }}
                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 cursor-pointer focus:ring-2 focus:ring-offset-1 transition-all outline-none appearance-none pr-8 relative ${selectedRequest.status === 'Done' ? 'bg-green-100 text-green-800' :
                        selectedRequest.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                      }`}
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.2rem center`, backgroundRepeat: 'no-repeat', backgroundSize: '1.2em 1.2em' }}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Done">Done</option>
                  </select>
                ) : (
                  <Badge status={selectedRequest.status} />
                )}
                <h2 className="font-bold text-stone-900 truncate">{selectedRequest.outletName}</h2>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="p-2 hover:bg-stone-100 rounded-full text-stone-400 transition-colors"><X className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Type</p><p className="font-semibold text-stone-800">{selectedRequest.designType}</p></div>
                <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Dimensions</p><p className="font-semibold text-stone-800">{selectedRequest.dimensions}</p></div>
                <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Designer</p><p className="font-semibold text-brand-600">{selectedRequest.designerName || 'Unassigned'}</p></div>
                <div className="space-y-1"><p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Requested</p><p className="font-semibold text-stone-800">{new Date(selectedRequest.createdAt).toLocaleDateString()}</p></div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Reference</p>
                <FilePreview url={selectedRequest.referenceUrl} label="Reference" />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] uppercase font-bold text-stone-400 tracking-widest">Result</p>
                {selectedRequest.status === 'Done' ? (
                  <a href={selectedRequest.resultFileUrl} target="_blank" rel="noreferrer" className="block aspect-video bg-stone-100 rounded-xl overflow-hidden border-2 border-green-500 shadow-sm">
                    <img src={selectedRequest.resultFileUrl} className="w-full h-full object-cover" alt="Result" />
                  </a>
                ) : <div className="aspect-video bg-stone-50 rounded-xl border border-dashed flex items-center justify-center text-stone-400 text-sm text-center p-4">{selectedRequest.status === 'In Progress' ? 'Designer is working on it...' : 'Awaiting designer claim...'}</div>}
              </div>
            </div>

            <div className="flex justify-center pt-4 border-t">
              {selectedRequest.status === 'Pending' && currentUser?.role === 'Designer' && (
                <Button
                  onClick={() => setClaimConfirmId(selectedRequest.id)}
                  disabled={isClaiming === selectedRequest.id}
                  icon={<Hand className="w-4 h-4" />}
                  className="px-8"
                >
                  {isClaiming === selectedRequest.id ? 'Claiming...' : 'Ambil Job Ini'}
                </Button>
              )}
              {selectedRequest.status === 'In Progress' && currentUser?.role === 'Designer' && selectedRequest.designerName === currentUser.name && (
                <Button
                  onClick={() => { setResultSubmissionRequestId(selectedRequest.id); setActiveResultTab('UPLOAD'); }}
                  icon={<CheckCircle className="w-4 h-4" />}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Submit Result
                </Button>
              )}
            </div>
          </div>
        </div>
      )
      }

      {/* Sidebar */}
      <aside className={`fixed md:relative z-30 w-64 h-full bg-white border-r transform transition-transform md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b flex items-center gap-3"><img src={logo} alt="JAR Portal" className="h-10 w-auto object-contain" /><span className="font-bold text-lg text-stone-900">JAR Portal</span></div>
        <nav className="flex-1 p-4 space-y-1">
          <button onClick={() => { setActiveTab('STATUS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'STATUS' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><LayoutDashboard className="w-5 h-5" />Dashboard</button>
          <button onClick={() => { setActiveTab('HISTORY'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'HISTORY' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><History className="w-5 h-5" />History</button>
          <button onClick={() => { setActiveTab('NEW_REQUEST'); setEditingRequestId(null); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'NEW_REQUEST' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><PlusCircle className="w-5 h-5" />New Request</button>
          {currentUser?.role === 'Admin' && (
            <button onClick={() => { setActiveTab('USERS'); setIsSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${activeTab === 'USERS' ? 'bg-brand-50 text-brand-700 font-bold' : 'text-stone-600 hover:bg-stone-50'}`}><Users className="w-5 h-5" />Manage Users</button>
          )}
        </nav>
        <div className="p-4 border-t bg-stone-50">
          <div className="px-4 py-2 mb-2"><p className="text-xs font-bold text-stone-400 uppercase tracking-widest">Logged in as</p><p className="text-sm font-bold text-stone-800 truncate">{currentUser?.name}</p></div>
          <Button variant="ghost" fullWidth onClick={handleLogout} icon={<LogOut className="w-4 h-4" />} className="justify-start">Sign Out</Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto h-full flex flex-col">
        {/* Claim Confirmation Modal */}
        {claimConfirmId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full text-center space-y-4 animate-in zoom-in-95">
              <div className="w-12 h-12 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Hand className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-stone-900">Take this Job?</h3>
                <p className="text-stone-500 text-sm mt-1">Status will change to "In Progress" and you will be assigned as the designer.</p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="ghost" className="flex-1" onClick={() => setClaimConfirmId(null)}>Cancel</Button>
                <Button className="flex-1" onClick={handleClaimRequest}>Confirm Take Job</Button>
              </div>
            </div>
          </div>
        )}

        {/* Result Submission Modal */}
        {resultSubmissionRequestId && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden animate-in zoom-in-95">
              <div className="px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-bold text-lg text-stone-900">Submit Design Result</h3>
                <button onClick={() => setResultSubmissionRequestId(null)} className="p-2 hover:bg-stone-100 rounded-full text-stone-400"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex bg-stone-100 p-1 rounded-xl">
                  <button onClick={() => setActiveResultTab('UPLOAD')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeResultTab === 'UPLOAD' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>Upload File</button>
                  <button onClick={() => setActiveResultTab('LINK')} className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeResultTab === 'LINK' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-400 hover:text-stone-600'}`}>External Link</button>
                </div>

                {activeResultTab === 'UPLOAD' ? (
                  <div onClick={() => resultFileInputRef.current?.click()} className="border-2 border-dashed border-stone-200 hover:border-brand-500 hover:bg-brand-50 rounded-2xl p-8 text-center cursor-pointer transition-all">
                    <Upload className="w-12 h-12 text-stone-300 mx-auto mb-3" />
                    <p className="font-bold text-stone-700">Click to Upload Result File</p>
                    <p className="text-xs text-stone-400 mt-1">JPG, PNG, PDF, PSD, AI up to 15MB</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Input label="Google Drive / Dropbox Link" value={resultLink} onChange={e => setResultLink(e.target.value)} placeholder="https://..." />
                    <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      Make sure the link is accessible (Public or Shared with Client).
                    </div>
                  </div>
                )}

                <Button fullWidth onClick={handleSubmitResult} disabled={activeResultTab === 'LINK' && !resultLink}>
                  {activeResultTab === 'UPLOAD' ? 'Select File & Submit' : 'Submit Link'}
                </Button>
              </div>
            </div>
          </div>
        )}

        <header className="bg-white border-b p-4 md:hidden flex justify-between items-center sticky top-0 z-20 shadow-sm"><button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-stone-100 rounded-lg"><MenuIcon /></button><span className="font-bold text-brand-600">JAR Design Hub</span><div className="w-8"></div></header>
        <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">

          {/* Tab: Dashboard */}
          {activeTab === 'STATUS' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h1 className="text-3xl font-bold text-stone-900 tracking-tight">Design Requests</h1><p className="text-stone-500 font-medium">Real-time design queue management.</p></div>
                <Button onClick={() => setActiveTab('NEW_REQUEST')} icon={<PlusCircle className="w-5 h-5" />}>New Request</Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Total</p><p className="text-2xl font-bold text-stone-900">{userRequests.length}</p></div>
                <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[10px] font-bold text-yellow-600 uppercase tracking-widest">Pending</p><p className="text-2xl font-bold text-stone-900">{userRequests.filter(r => r.status === 'Pending').length}</p></div>
                <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">In Progress</p><p className="text-2xl font-bold text-stone-900">{userRequests.filter(r => r.status === 'In Progress').length}</p></div>
                <div className="bg-white p-4 rounded-2xl border shadow-sm"><p className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Done</p><p className="text-2xl font-bold text-stone-900">{userRequests.filter(r => r.status === 'Done').length}</p></div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b"><tr className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
                      <th className="px-6 py-4">Outlet / Mitra</th><th className="px-6 py-4">Type</th><th className="px-6 py-4">Designer</th><th className="px-6 py-4">Status</th><th className="px-6 py-4 text-right">Actions</th>
                    </tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {filteredRequests.length === 0 ? (
                        <tr><td colSpan={5} className="p-12 text-center text-stone-400 italic">No requests found...</td></tr>
                      ) : filteredRequests.map(req => (
                        <tr key={req.id} onClick={() => setSelectedRequest(req)} className="cursor-pointer hover:bg-brand-50/50 transition-colors group">
                          <td className="px-6 py-4"><span className="block font-bold text-stone-900 group-hover:text-brand-600">{req.outletName}</span><span className="text-[10px] text-stone-400">{new Date(req.createdAt).toLocaleDateString()}</span></td>
                          <td className="px-6 py-4 font-medium text-stone-700">{req.designType}</td>
                          <td className="px-6 py-4"><div className="flex items-center gap-2">{req.designerName ? <><div className="w-6 h-6 bg-brand-100 text-brand-600 rounded-full flex items-center justify-center text-[10px] font-bold">{req.designerName.charAt(0)}</div><span className="text-sm font-semibold">{req.designerName}</span></> : <span className="text-xs text-stone-400 italic">Unassigned</span>}</div></td>
                          <td className="px-6 py-4"><Badge status={req.status} /></td>
                          <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                            <div className="flex gap-2 justify-end">
                              {req.status === 'Pending' && currentUser?.role === 'Designer' && <button onClick={() => setClaimConfirmId(req.id)} className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-xs font-bold hover:bg-brand-700 shadow-sm">Ambil</button>}
                              {req.status === 'In Progress' && currentUser?.role === 'Designer' && req.designerName === currentUser.name && <button onClick={() => { setResultSubmissionRequestId(req.id); setActiveResultTab('UPLOAD'); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700">Finish</button>}
                              {req.status === 'Pending' && ((currentUser?.role === 'User' && req.requestorUsername === currentUser.username) || currentUser?.role === 'Admin') && (
                                <button onClick={(e) => { e.stopPropagation(); handleEditRequest(req); }} className="p-2 text-stone-400 hover:text-blue-600 transition-colors" title="Edit Request">
                                  <Edit className="w-5 h-5" />
                                </button>
                              )}
                              {currentUser?.role === 'Admin' && (
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteRequest(req.id); }} className="p-2 text-stone-400 hover:text-red-600 transition-colors" title="Delete Request">
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              )}
                              <button onClick={() => setSelectedRequest(req)} className="p-2 text-stone-400 hover:text-brand-600 transition-colors"><Eye className="w-5 h-5" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Tab: New Request */}
          {activeTab === 'NEW_REQUEST' && (
            <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div className="bg-white p-8 rounded-3xl shadow-sm border">
                <div className="mb-8"><h1 className="text-2xl font-bold text-stone-900">{editingRequestId ? 'Edit Request' : 'Create New Request'}</h1><p className="text-stone-500 font-medium mt-1">Submit your design requirements to the team.</p></div>
                <form onSubmit={handleRequestSubmit} className="space-y-6">
                  <Input label="Outlet Name / Mitra" value={formData.outletName} onChange={e => setFormData({ ...formData, outletName: e.target.value })} placeholder="e.g. Kopi Kenangan - Mall Indonesia" required />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Select label="Design Modality" value={formData.designType} onChange={e => setFormData({ ...formData, designType: e.target.value as DesignType })} options={[{ value: 'Social Media', label: 'Social Media Content' }, { value: 'Banner', label: 'Spanduk / Banner' }, { value: 'Menu', label: 'Menu Catalog' }, { value: 'Flyer', label: 'Promotion Flyer' }]} />
                    <Input label="Size / Dimensions" value={formData.dimensions} onChange={e => setFormData({ ...formData, dimensions: e.target.value })} placeholder="e.g. 1080x1080 or 2x1 meter" required />
                  </div>
                  <TextArea label="Design Elements & Copywriting" value={formData.elements} onChange={e => setFormData({ ...formData, elements: e.target.value })} placeholder="Describe colors, text content, logos, and special instructions..." rows={4} required />

                  <div
                    onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={e => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files[0]) processFile(e.dataTransfer.files[0]); }}
                    className={`border-2 border-dashed p-8 rounded-2xl text-center transition-all ${isDragging ? 'bg-brand-50 border-brand-500 scale-[1.01]' : 'border-stone-200 hover:border-brand-300'}`}
                  >
                    <div className={`w-12 h-12 rounded-full mx-auto mb-3 flex items-center justify-center ${formFile ? 'bg-brand-600 text-white' : 'bg-stone-100 text-stone-400'}`}>{formFile ? <FileText /> : <Upload />}</div>
                    <p className="text-sm font-bold text-stone-700">{formFile ? formFile.name : 'Click or Drag Reference Image'}</p>
                    <p className="text-xs text-stone-400 mt-1">JPG, PNG, or PDF up to 15MB</p>
                    <input type="file" onChange={handleReferenceFileChange} className="hidden" id="ref-file" accept="image/*,.pdf" />
                    <label htmlFor="ref-file" className="mt-4 inline-block px-4 py-2 text-xs font-bold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg cursor-pointer transition-colors">Browse Files</label>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center"><span className="bg-white px-3 text-sm text-stone-400 font-medium">OR</span></div>
                    <div className="border-t"></div>
                  </div>

                  <Input label="External Link (Google Drive / Dropbox)" value={formData.referenceUrl} onChange={e => setFormData({ ...formData, referenceUrl: e.target.value })} placeholder="https://drive.google.com/..." />

                  <div className="flex gap-3 pt-6 border-t"><Button type="button" variant="ghost" onClick={handleCancelForm} className="flex-1">Cancel</Button><Button type="submit" disabled={isSubmitting} className="flex-1 shadow-lg shadow-brand-200">{isSubmitting ? 'Saving...' : 'Submit to Queue'}</Button></div>
                </form>
              </div>
            </div>
          )}

          {/* Tab: History */}
          {activeTab === 'HISTORY' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div><h1 className="text-3xl font-bold text-stone-900 tracking-tight">Design History</h1><p className="text-stone-500 font-medium">Archive of all completed creative assets.</p></div>
              </div>

              <div className="bg-white p-6 rounded-2xl border flex flex-col md:flex-row gap-6 items-end shadow-sm">
                <div className="flex-1 w-full space-y-2"><p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest px-1">Filter by Period</p><div className="flex gap-3"><input type="date" value={historyStartDate} onChange={e => setHistoryStartDate(e.target.value)} className="border border-stone-200 p-2.5 rounded-xl w-full focus:ring-2 focus:ring-brand-500 text-sm" /><input type="date" value={historyEndDate} onChange={e => setHistoryEndDate(e.target.value)} className="border border-stone-200 p-2.5 rounded-xl w-full focus:ring-2 focus:ring-brand-500 text-sm" /></div></div>
                <Button variant="ghost" onClick={() => { setHistoryStartDate(''); setHistoryEndDate(''); setSearchQuery(''); }} icon={<ArrowRight className="w-4 h-4" />}>Reset Filter</Button>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 border-b"><tr className="text-[10px] font-bold text-stone-500 uppercase tracking-widest"><th className="px-6 py-4">Outlet</th><th className="px-6 py-4">Designer</th><th className="px-6 py-4">Finished At</th><th className="px-6 py-4 text-right">Preview Assets</th></tr></thead>
                    <tbody className="divide-y divide-stone-100">
                      {historyRequests.length === 0 ? (
                        <tr><td colSpan={4} className="p-16 text-center text-stone-400 italic font-medium">No history recorded for this period...</td></tr>
                      ) : historyRequests.map(req => (
                        <tr key={req.id} className="hover:bg-stone-50 transition-colors cursor-pointer" onClick={() => setSelectedRequest(req)}>
                          <td className="px-6 py-4"><span className="block font-bold text-stone-900">{req.outletName}</span><span className="text-[10px] text-stone-400">{req.designType}</span></td>
                          <td className="px-6 py-4"><span className="text-sm font-semibold text-stone-700">{req.designerName}</span></td>
                          <td className="px-6 py-4"><span className="text-xs text-stone-500 font-medium">{new Date(req.createdAt).toLocaleDateString()}</span></td>
                          <td className="px-6 py-4 text-right"><button onClick={(e) => { e.stopPropagation(); setSelectedRequest(req); }} className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-4 py-2 rounded-lg transition-all">View Details</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          {/* Tab: Users (Admin Only) */}
          {activeTab === 'USERS' && currentUser?.role === 'Admin' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300">
              <div><h1 className="text-3xl font-bold text-stone-900 tracking-tight">Manage Users</h1><p className="text-stone-500 font-medium">Create and manage system access.</p></div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Create User Form */}
                <div className="md:col-span-1">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
                    <h3 className="font-bold text-lg text-stone-900">Add New User</h3>
                    <form onSubmit={handleCreateUser} className="space-y-4">
                      <Input label="Full Name" value={newUserFormData.name} onChange={e => setNewUserFormData({ ...newUserFormData, name: e.target.value })} placeholder="e.g. John Doe" required />
                      <Input label="Username" value={newUserFormData.username} onChange={e => setNewUserFormData({ ...newUserFormData, username: e.target.value })} placeholder="e.g. johndoe" required />
                      <Input label="Password" type="password" value={newUserFormData.password} onChange={e => setNewUserFormData({ ...newUserFormData, password: e.target.value })} placeholder="••••••••" required />
                      <Select label="Role" value={newUserFormData.role} onChange={e => setNewUserFormData({ ...newUserFormData, role: e.target.value as UserRole })} options={[{ value: 'User', label: 'User (Client)' }, { value: 'Designer', label: 'Designer' }, { value: 'Admin', label: 'Admin' }]} />
                      <Button type="submit" fullWidth icon={<PlusCircle className="w-4 h-4" />}>Create User</Button>
                    </form>
                  </div>
                </div>

                {/* User List */}
                <div className="md:col-span-2">
                  <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-stone-50 border-b"><tr className="text-[10px] font-bold text-stone-500 uppercase tracking-widest"><th className="px-6 py-4">User</th><th className="px-6 py-4">Role</th><th className="px-6 py-4 text-right">Actions</th></tr></thead>
                        <tbody className="divide-y divide-stone-100">
                          {users.map(u => (
                            <tr key={u.username} className="hover:bg-stone-50">
                              <td className="px-6 py-4"><span className="block font-bold text-stone-900">{u.name}</span><span className="text-xs text-stone-400">@{u.username}</span></td>
                              <td className="px-6 py-4"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${u.role === 'Admin' ? 'bg-purple-100 text-purple-800' : u.role === 'Designer' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{u.role}</span></td>
                              <td className="px-6 py-4 text-right">
                                {u.username !== currentUser.username && (
                                  <button onClick={() => handleDeleteUser(u.username)} className="p-2 text-stone-400 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;