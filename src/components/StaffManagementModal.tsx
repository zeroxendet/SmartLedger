import React, { useState } from 'react';
import { 
  X, 
  UserPlus, 
  Shield, 
  Lock, 
  QrCode, 
  Share2, 
  Copy, 
  Check, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Key, 
  Activity, 
  ChevronRight,
  ExternalLink,
  MessageSquare
} from 'lucide-react';
import { 
  StaffMember, 
  StaffRole, 
  StaffPermissions, 
  SaleCorrectionRequest, 
  StaffActivityLogEntry,
  CurrencyCode 
} from '../types';
import { 
  hashStaffPin, 
  generateStaffAccessToken, 
  getDefaultPermissionsForRole,
  getStaffInviteUrl as generateStaffInviteUrl
} from '../utils/staffSecurity';
import { generateQRCodeSVG } from '../utils/qrCode';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  businessName: string;
  ownerId: string;
  currency: CurrencyCode;
  staffList: StaffMember[];
  onUpdateStaffList: (updated: StaffMember[]) => void;
  correctionRequests: SaleCorrectionRequest[];
  onApproveCorrection: (request: SaleCorrectionRequest) => void;
  onRejectCorrection: (request: SaleCorrectionRequest, notes?: string) => void;
  activityLogs: StaffActivityLogEntry[];
  onOpenOwnerPinVerification?: (onSuccess: () => void) => void;
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  businessId,
  businessName,
  ownerId,
  currency,
  staffList,
  onUpdateStaffList,
  correctionRequests,
  onApproveCorrection,
  onRejectCorrection,
  activityLogs,
  onOpenOwnerPinVerification,
}) => {
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'corrections'>('members');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [managingStaff, setManagingStaff] = useState<StaffMember | null>(null);
  const [sharingStaff, setSharingStaff] = useState<StaffMember | null>(null);
  const [removingStaff, setRemovingStaff] = useState<StaffMember | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Form states for Add Staff
  const [newStaffName, setNewStaffName] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<StaffRole>('Cashier');
  const [newStaffPin, setNewStaffPin] = useState('');
  const [newStaffPermissions, setNewStaffPermissions] = useState<StaffPermissions>(
    getDefaultPermissionsForRole('Cashier')
  );
  const [formError, setFormError] = useState('');

  // Editing PIN states
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [editedPin, setEditedPin] = useState('');

  if (!isOpen) return null;

  const activeCount = staffList.filter((s) => s.status === 'ACTIVE').length;
  const disabledCount = staffList.filter((s) => s.status === 'DISABLED').length;
  const pendingCorrections = correctionRequests.filter((r) => r.status === 'PENDING');

  const getStaffInviteUrl = (staff: StaffMember) => {
    return generateStaffInviteUrl(staff, businessId);
  };

  const handleRolePresetSelect = (role: StaffRole) => {
    setNewStaffRole(role);
    setNewStaffPermissions(getDefaultPermissionsForRole(role));
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) {
      setFormError('Please enter a staff member name.');
      return;
    }
    if (newStaffPin.length !== 4 || !/^\d{4}$/.test(newStaffPin)) {
      setFormError('Please set a 4-digit numeric Cashier PIN (e.g. 1234).');
      return;
    }

    const pinHash = await hashStaffPin(newStaffPin, businessId);
    const newMember: StaffMember = {
      id: `staff_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: newStaffName.trim(),
      role: newStaffRole,
      status: 'ACTIVE',
      cashierPinHash: pinHash,
      hasPin: true,
      pinMasked: '••••',
      permissions: newStaffPermissions,
      businessId,
      businessName,
      ownerId,
      createdAt: new Date().toISOString(),
      accessToken: generateStaffAccessToken(),
    };

    const updated = [newMember, ...staffList];
    onUpdateStaffList(updated);

    // Reset and show share dialog
    setNewStaffName('');
    setNewStaffPin('');
    setFormError('');
    setIsAddStaffOpen(false);
    setSharingStaff(newMember);
  };

  const handleToggleStatus = (staffId: string) => {
    const performToggle = () => {
      const updated = staffList.map((s) => {
        if (s.id === staffId) {
          const nextStatus = s.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
          return { ...s, status: nextStatus, updatedAt: new Date().toISOString() };
        }
        return s;
      });
      onUpdateStaffList(updated);
      if (managingStaff && managingStaff.id === staffId) {
        setManagingStaff({
          ...managingStaff,
          status: managingStaff.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE',
        });
      }
    };

    if (onOpenOwnerPinVerification) {
      onOpenOwnerPinVerification(performToggle);
    } else {
      performToggle();
    }
  };

  const handleSaveManagingStaff = () => {
    if (!managingStaff) return;
    const updated = staffList.map((s) => (s.id === managingStaff.id ? managingStaff : s));
    onUpdateStaffList(updated);
    setManagingStaff(null);
  };

  const handleChangePin = async () => {
    if (!managingStaff) return;
    if (editedPin.length !== 4 || !/^\d{4}$/.test(editedPin)) {
      alert('Cashier PIN must be exactly 4 digits.');
      return;
    }
    const pinHash = await hashStaffPin(editedPin, businessId);
    const updatedStaff: StaffMember = {
      ...managingStaff,
      cashierPinHash: pinHash,
      hasPin: true,
      updatedAt: new Date().toISOString(),
    };
    setManagingStaff(updatedStaff);
    const updated = staffList.map((s) => (s.id === updatedStaff.id ? updatedStaff : s));
    onUpdateStaffList(updated);
    setIsChangingPin(false);
    setEditedPin('');
    alert(`Cashier PIN for ${managingStaff.name} updated. The previous PIN immediately stopped working.`);
  };

  const handleConfirmRemoveStaff = () => {
    if (!removingStaff) return;
    const updated = staffList.filter((s) => s.id !== removingStaff.id);
    onUpdateStaffList(updated);
    if (managingStaff?.id === removingStaff.id) setManagingStaff(null);
    setRemovingStaff(null);
  };

  const handleCopyLink = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleShareWhatsApp = (staff: StaffMember) => {
    const link = getStaffInviteUrl(staff);
    const message = `Hello ${staff.name}, here is your secure SmartLedger Staff Access link for ${businessName}:\n\n${link}\n\nEnter your 4-digit Cashier PIN to start your shift.`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleNativeShare = (staff: StaffMember) => {
    const link = getStaffInviteUrl(staff);
    if (navigator.share) {
      navigator.share({
        title: `${businessName} - Staff Access`,
        text: `SmartLedger Staff Access link for ${staff.name}`,
        url: link,
      }).catch(() => {});
    } else {
      handleCopyLink(link);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
      <div 
        id="staff-management-modal-container"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden"
      >
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-sm shadow-indigo-200">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 font-['Outfit',sans-serif] flex items-center gap-2">
                <span>Staff Management</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800 font-semibold">
                  Owner Control
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Control cashier & staff access, roles, PINs, and transaction permissions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-2 px-5 sm:px-6 pt-3 border-b border-slate-100 bg-white">
          <button
            onClick={() => setActiveTab('members')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'members'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Staff Members</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-bold">
              {staffList.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('activity')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'activity'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Staff Activity</span>
          </button>

          <button
            onClick={() => setActiveTab('corrections')}
            className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'corrections'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Corrections</span>
            {pendingCorrections.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500 text-white font-bold animate-pulse">
                {pendingCorrections.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* TAB 1: STAFF MEMBERS */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              {/* Summary and Action Bar */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white shadow-sm">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      Staff Access Status
                    </h3>
                    <p className="text-xs text-slate-600 flex items-center gap-2 mt-0.5">
                      <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                        {activeCount} Active
                      </span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-semibold text-rose-700">
                        <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                        {disabledCount} Disabled
                      </span>
                    </p>
                  </div>
                </div>

                <button
                  id="btn-add-staff-open"
                  onClick={() => setIsAddStaffOpen(true)}
                  className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 transition-all flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>+ Add Staff</span>
                </button>
              </div>

              {/* Staff Members List */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Staff Members
                  </h4>
                  <span className="text-xs text-slate-400">
                    Owner/Manager controlled
                  </span>
                </div>

                {staffList.length === 0 ? (
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                    <Shield className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h4 className="text-base font-bold text-slate-800">No Staff Members Added Yet</h4>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
                      Create cashier accounts with restricted access so employees can ring up sales without viewing your profits or business settings.
                    </p>
                    <button
                      onClick={() => setIsAddStaffOpen(true)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
                    >
                      + Add First Staff Member
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {staffList.map((staff) => (
                      <div
                        key={staff.id}
                        id={`staff-card-${staff.id}`}
                        className="p-4 rounded-2xl border border-slate-200 bg-white shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                      >
                        {/* Member identity */}
                        <div className="flex items-center gap-3">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-base shadow-sm ${
                            staff.status === 'ACTIVE' 
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                              : 'bg-rose-100 text-rose-800 border border-rose-200'
                          }`}>
                            {staff.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                                {staff.name}
                              </span>
                              {staff.status === 'ACTIVE' ? (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                                  Disabled
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
                              <span className="font-semibold text-slate-700">Role: {staff.role}</span>
                              <span>•</span>
                              <span>PIN: {staff.pinMasked || '••••'}</span>
                            </div>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                          <button
                            id={`btn-share-${staff.id}`}
                            onClick={() => setSharingStaff(staff)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                            title="Share Access link and QR Code"
                          >
                            <Share2 className="w-3.5 h-3.5" />
                            <span>Share</span>
                          </button>

                          <button
                            id={`btn-manage-${staff.id}`}
                            onClick={() => setManagingStaff({ ...staff })}
                            className="px-3 py-1.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                          >
                            <span>Manage</span>
                          </button>

                          {/* One-Tap Owner Control Button */}
                          <button
                            id={`btn-toggle-status-${staff.id}`}
                            onClick={() => handleToggleStatus(staff.id)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                              staff.status === 'ACTIVE'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            }`}
                          >
                            {staff.status === 'ACTIVE' ? 'Disable' : 'Enable'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: STAFF ACTIVITY */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Staff Activity Log
                  </h4>
                  <p className="text-xs text-slate-500">
                    Chronological record of transactions performed by cashiers and staff. Staff cannot edit or delete this history.
                  </p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-semibold">
                  Read-Only Audit Trail
                </span>
              </div>

              {activityLogs.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <Clock className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-600">No staff activity recorded yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sales recorded by cashiers in Staff Mode will appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {activityLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-start justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-100 shrink-0">
                          {log.staffName.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{log.staffName}</span>
                            <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                              {log.staffRole || 'Cashier'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs font-semibold text-slate-800 mt-1">
                            {log.title}: <span className="font-normal text-slate-600">{log.details}</span>
                          </p>
                          {log.paymentMethod && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Payment: <span className="font-semibold text-slate-700">{log.paymentMethod}</span>
                            </p>
                          )}
                        </div>
                      </div>

                      {log.amount !== undefined && (
                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-emerald-700 font-['Outfit',sans-serif]">
                            {log.amount.toLocaleString()} {currency}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CORRECTIONS */}
          {activeTab === 'corrections' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Transaction Correction Requests
                </h4>
                <p className="text-xs text-slate-500">
                  Review and approve cashier requests to correct or void mistaken sales. Financial records remain strictly under Owner control.
                </p>
              </div>

              {correctionRequests.length === 0 ? (
                <div className="text-center py-12 rounded-2xl border border-dashed border-slate-200 bg-slate-50">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700">No correction requests</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    When a cashier requests a sale correction, it will be listed here for your review.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {correctionRequests.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                              {req.status}
                            </span>
                            <span className="text-sm font-bold text-slate-900">
                              Sale #{req.invoiceNumber || req.saleId.slice(-6)}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Requested by <span className="font-bold text-slate-800">{req.staffName}</span> • {new Date(req.requestedAt).toLocaleString()}
                          </p>
                        </div>

                        <span className="text-base font-extrabold text-slate-900 font-['Outfit',sans-serif]">
                          {req.saleAmount.toLocaleString()} {currency}
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                        <p className="text-slate-700">
                          <span className="font-semibold text-slate-900">Reason:</span> {req.reason}
                        </p>
                        {req.notes && (
                          <p className="text-slate-600">
                            <span className="font-semibold text-slate-900">Details:</span> {req.notes}
                          </p>
                        )}
                        <p className="text-slate-500">
                          <span className="font-semibold text-slate-700">Items:</span> {req.saleItemsSummary}
                        </p>
                      </div>

                      {req.status === 'PENDING' && (
                        <div className="flex items-center justify-end gap-2 pt-1">
                          <button
                            onClick={() => onRejectCorrection(req)}
                            className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => onApproveCorrection(req)}
                            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm shadow-emerald-200"
                          >
                            Approve Correction (Void Sale)
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted with SHA-256 salted PIN hashes</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>

      {/* MODAL: ADD STAFF FORM */}
      {isAddStaffOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-sm">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                  Add Staff Member
                </h3>
              </div>
              <button
                onClick={() => {
                  setIsAddStaffOpen(false);
                  setFormError('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateStaff} className="flex-1 overflow-y-auto p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Staff Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Staff name:
                </label>
                <input
                  id="input-new-staff-name"
                  type="text"
                  required
                  placeholder="e.g. John, Sarah"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                />
              </div>

              {/* Role Preset Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role:
                </label>
                <select
                  id="select-new-staff-role"
                  value={newStaffRole}
                  onChange={(e) => handleRolePresetSelect(e.target.value as StaffRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm bg-white"
                >
                  <option value="Cashier">Cashier (Standard POS & selling)</option>
                  <option value="Manager">Staff / Manager (Stock & operational management)</option>
                  <option value="Owner">Owner (Full unrestricted access)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Selecting Cashier configures standard cashier selling permissions and locks financial reports.
                </p>
              </div>

              {/* Cashier PIN */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Set 4-digit Cashier PIN:
                </label>
                <div className="relative">
                  <input
                    id="input-new-staff-pin"
                    type="password"
                    maxLength={4}
                    inputMode="numeric"
                    required
                    placeholder="e.g. 1234"
                    value={newStaffPin}
                    onChange={(e) => setNewStaffPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm tracking-widest font-mono font-bold"
                  />
                  <Key className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Hashed securely on device. Never stored in plain text.
                </p>
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Staff Permissions
                </h4>

                {/* Cashier Defaults */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                  <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
                    Cashier Permissions (Default ON)
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canRecordSales}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canRecordSales: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Record Sales</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewProductsForSelling}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewProductsForSelling: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>View Products needed for selling</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewStockAvailability}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewStockAvailability: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>View available stock</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canCreateViewReceipts}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canCreateViewReceipts: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Create / View receipts</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canSelectPaymentMethod}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canSelectPaymentMethod: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Select payment method</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canSelectCustomerForSale}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canSelectCustomerForSale: e.target.checked })}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Select customer for a sale</span>
                  </label>
                </div>

                {/* Transaction Control (Requires Owner Permission) */}
                <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200 space-y-2">
                  <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block">
                    Transaction Control (Requires Owner Permission)
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canDeleteSales}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canDeleteSales: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Delete sales</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canEditCompletedSales}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canEditCompletedSales: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Edit completed sales</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canChangeProductPrices}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canChangeProductPrices: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Change product prices</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canChangeStock}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canChangeStock: e.target.checked })}
                      className="rounded text-amber-600 focus:ring-amber-500"
                    />
                    <span>Change stock / inventory</span>
                  </label>
                </div>

                {/* Owner Information (Strictly Locked by default) */}
                <div className="p-3.5 rounded-2xl bg-rose-50/70 border border-rose-200 space-y-2">
                  <span className="text-[11px] font-bold text-rose-900 uppercase tracking-wider block">
                    Owner Financial Information (Protected)
                  </span>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewProfit}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewProfit: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>View Today's Profit & Total Profit</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewReports}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewReports: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>View Financial Reports & Revenue Analysis</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewExpenses}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewExpenses: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>View Business Expenses</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newStaffPermissions.canViewSupplierBalances}
                      onChange={(e) => setNewStaffPermissions({ ...newStaffPermissions, canViewSupplierBalances: e.target.checked })}
                      className="rounded text-rose-600 focus:ring-rose-500"
                    />
                    <span>View Supplier Balances & Creditor Debt</span>
                  </label>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddStaffOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  id="btn-submit-create-staff"
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200"
                >
                  Create Staff Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STAFF ACCESS CREATED / SHARE INVITATION */}
      {sharingStaff && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden p-6 space-y-5">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2 shadow-sm border border-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif]">
                Staff Access Created
              </h3>
              <p className="text-xs text-slate-500">
                Send this secure access link to <span className="font-bold text-slate-700">{sharingStaff.name}</span>.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Staff Member:</span>
                <span className="font-bold text-slate-800">{sharingStaff.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Role:</span>
                <span className="font-bold text-indigo-700">{sharingStaff.role}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Business:</span>
                <span className="font-bold text-slate-800">{businessName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Cashier PIN:</span>
                <span className="font-mono font-bold text-slate-800">•••• (Configured)</span>
              </div>
            </div>

            {/* Direct Staff Access URL box */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                SmartLedger Staff Access Link:
              </label>
              <div className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={getStaffInviteUrl(sharingStaff)}
                  className="flex-1 bg-transparent text-xs font-mono text-slate-800 outline-none select-all truncate"
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(getStaffInviteUrl(sharingStaff))}
                  className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedLink ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Uses the live production host so staff can connect immediately without DNS errors.
              </p>
            </div>

            {/* QR Code preview */}
            <div className="p-4 rounded-2xl bg-slate-100/80 border border-slate-200 flex flex-col items-center justify-center">
              <div 
                dangerouslySetInnerHTML={{ 
                  __html: generateQRCodeSVG(getStaffInviteUrl(sharingStaff), 140) 
                }} 
              />
              <p className="text-[11px] text-slate-500 mt-2 font-medium">
                Scan with phone or tablet camera to open Staff Mode
              </p>
            </div>

            {/* Share action buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleCopyLink(getStaffInviteUrl(sharingStaff))}
                className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-800 flex items-center justify-center gap-1.5 transition-colors"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
              </button>

              <button
                onClick={() => handleShareWhatsApp(sharingStaff)}
                className="p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm shadow-emerald-200 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                <span>Send via WhatsApp</span>
              </button>

              <button
                onClick={() => handleNativeShare(sharingStaff)}
                className="col-span-2 p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold text-white flex items-center justify-center gap-1.5 shadow-sm shadow-indigo-200 transition-colors"
              >
                <Share2 className="w-4 h-4" />
                <span>Share Link</span>
              </button>
            </div>

            <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-100 text-[11px] text-indigo-900 space-y-1">
              <p className="font-semibold">🔒 Security Guaranteed:</p>
              <ul className="list-disc pl-4 space-y-0.5 text-indigo-800">
                <li>Staff will NOT need to create a separate account or business.</li>
                <li>Your Owner email and password are never shared in the link.</li>
                <li>Access is isolated strictly to this business.</li>
              </ul>
            </div>

            <button
              onClick={() => setSharingStaff(null)}
              className="w-full py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL: MANAGE INDIVIDUAL STAFF */}
      {managingStaff && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                  {managingStaff.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-['Outfit',sans-serif]">
                    Manage: {managingStaff.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update role, permissions, or Cashier PIN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setManagingStaff(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* One-Tap Status Control */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Access Status</h4>
                  <p className="text-[11px] text-slate-500">
                    {managingStaff.status === 'ACTIVE' 
                      ? '🟢 Active: Staff member can enter Staff Mode and record sales' 
                      : '🔴 Disabled: Staff access is immediately blocked'}
                  </p>
                </div>
                <button
                  onClick={() => handleToggleStatus(managingStaff.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    managingStaff.status === 'ACTIVE'
                      ? 'bg-rose-100 text-rose-800 border border-rose-200 hover:bg-rose-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200 hover:bg-emerald-200'
                  }`}
                >
                  {managingStaff.status === 'ACTIVE' ? 'Disable Access' : 'Enable Access'}
                </button>
              </div>

              {/* Role selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role:
                </label>
                <select
                  value={managingStaff.role}
                  onChange={(e) => {
                    const nextRole = e.target.value as StaffRole;
                    setManagingStaff({
                      ...managingStaff,
                      role: nextRole,
                      permissions: getDefaultPermissionsForRole(nextRole),
                    });
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
                >
                  <option value="Cashier">Cashier</option>
                  <option value="Manager">Staff / Manager</option>
                  <option value="Owner">Owner</option>
                </select>
              </div>

              {/* Cashier PIN Management */}
              <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-indigo-600" />
                    <span className="text-xs font-bold text-slate-900">Cashier PIN</span>
                  </div>
                  <button
                    onClick={() => setIsChangingPin(!isChangingPin)}
                    className="text-xs font-bold text-indigo-700 hover:underline"
                  >
                    {isChangingPin ? 'Cancel' : 'Change PIN'}
                  </button>
                </div>

                {isChangingPin ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      placeholder="Enter new 4-digit PIN"
                      value={editedPin}
                      onChange={(e) => setEditedPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full px-3 py-2 rounded-xl border border-indigo-200 text-sm font-mono tracking-widest"
                    />
                    <p className="text-[11px] text-slate-500">
                      If you change the PIN, the previous PIN immediately stops working.
                    </p>
                    <button
                      type="button"
                      onClick={handleChangePin}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold"
                    >
                      Save New PIN
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Current PIN: <span className="font-mono font-bold">••••</span> (Secured)
                  </p>
                )}
              </div>

              {/* Permissions Checklist */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Permissions Checklist
                </h4>

                <div className="space-y-2 text-xs">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={managingStaff.permissions.canRecordSales}
                      onChange={(e) => setManagingStaff({
                        ...managingStaff,
                        permissions: { ...managingStaff.permissions, canRecordSales: e.target.checked }
                      })}
                    />
                    <span>Record Sales</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={managingStaff.permissions.canViewProductsForSelling}
                      onChange={(e) => setManagingStaff({
                        ...managingStaff,
                        permissions: { ...managingStaff.permissions, canViewProductsForSelling: e.target.checked }
                      })}
                    />
                    <span>View Products for selling</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={managingStaff.permissions.canDeleteSales}
                      onChange={(e) => setManagingStaff({
                        ...managingStaff,
                        permissions: { ...managingStaff.permissions, canDeleteSales: e.target.checked }
                      })}
                    />
                    <span>Delete Sales (Requires Owner Approval)</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={managingStaff.permissions.canChangeProductPrices}
                      onChange={(e) => setManagingStaff({
                        ...managingStaff,
                        permissions: { ...managingStaff.permissions, canChangeProductPrices: e.target.checked }
                      })}
                    />
                    <span>Change Product Prices</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={managingStaff.permissions.canViewProfit}
                      onChange={(e) => setManagingStaff({
                        ...managingStaff,
                        permissions: { ...managingStaff.permissions, canViewProfit: e.target.checked }
                      })}
                    />
                    <span>View Profit (Owner Financial Data)</span>
                  </label>
                </div>
              </div>

              {/* Share link & QR code quick action */}
              <button
                onClick={() => {
                  setSharingStaff(managingStaff);
                  setManagingStaff(null);
                }}
                className="w-full py-2.5 rounded-xl border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 text-xs font-bold flex items-center justify-center gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span>Show Access Link & QR Code</span>
              </button>

              {/* Remove Staff Button */}
              <div className="pt-2 border-t border-slate-100">
                <button
                  onClick={() => setRemovingStaff(managingStaff)}
                  className="w-full py-2.5 rounded-xl text-rose-600 hover:bg-rose-50 border border-rose-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Remove Staff</span>
                </button>
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                onClick={() => setManagingStaff(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveManagingStaff}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm shadow-indigo-200"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION: REMOVE STAFF MODAL */}
      {removingStaff && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit',sans-serif]">
                Remove {removingStaff.name} from this business?
              </h3>
              <p className="text-xs text-slate-500">
                {removingStaff.name} will immediately lose access to Staff Mode. Previous sales and activity records will remain associated with this staff member.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
              <p className="font-bold">Historical Records Protected:</p>
              <p className="mt-0.5">
                Past transactions recorded by {removingStaff.name} will not be deleted and will stay in your business ledger.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRemovingStaff(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveStaff}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white shadow-sm shadow-rose-200"
              >
                Remove Staff
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
