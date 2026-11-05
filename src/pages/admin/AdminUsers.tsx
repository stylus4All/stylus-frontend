import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { adminAPI, userAPI } from '../../services/api';
import { useToast } from '../../components/ToastProvider';
import CustomSelect from '../../components/CustomSelect';
import ConfirmModal from '../../components/ConfirmModal';
import Modal from '../../components/Modal';

const AdminUsers: React.FC<{ users?: any[] }> = ({ users = [] }) => {
  const { updateUserStatus, updateUserRole, approveVerification, rejectVerification, updateWallet, refreshUserFromBackend } = useAuth();
  const [filter, setFilter] = useState<'all' | 'active' | 'partners'>('all');
  const [selected, setSelected] = useState<any | null>(null);

  const handleRoleMenu = (user: any) => {
    // open role selection modal
    setRoleTarget(user);
    setRoleCandidate(user.role || 'User');
    setRoleModalOpen(true);
  };

  const handleApprove = (user: any) => {
    if (!approveVerification) return;
    setConfirmPayload({
      title: 'Approve Verification',
      message: `Approve verification for ${user.name}?`,
      danger: false,
      onConfirm: async () => {
        // optimistic
        const prevStatus = user.verificationStatus;
        approveVerification && approveVerification(user.id);
        toast(`${user.name} approved.`, 'success');
        try {
          if (user.role === 'Partner') {
            await adminAPI.verifyPartner(parseInt(user.id), { verificationStatus: 'Verified' });
          } else {
            await userAPI.approveVerification(parseInt(user.id));
          }
          setSelected(null);
        } catch (err: any) {
          console.error(err);
          toast('Failed to approve verification. Reverting.', 'error');
          // rollback to authoritative backend state
          await refreshUserFromBackend(user.id);
        }
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const handleReject = (user: any) => {
    if (!rejectVerification) return;
    setRejectTarget(user);
    setRejectReason('Invalid documents');
    setRejectModalOpen(true);
  };

  const handleChangeRole = (user: any) => {
    handleRoleMenu(user);
  };

  const handleAdjustWallet = async (user: any) => {
    if (!updateWallet) return;
    setWalletTarget(user);
    setWalletAmount('');
    setWalletReason('Admin adjustment');
    setWalletModalOpen(true);
  };

  const visible = users.filter(u => {
    if (filter === 'all') return true;
    if (filter === 'active') return u.status === 'Active';
    if (filter === 'partners') return u.role === 'Partner';
    return true;
  });

  const toggleStatus = (user: any) => {
    if (!updateUserStatus) return;
    if (user.status === 'Active') {
      setSuspendTarget(user);
      setSuspendReason('No reason provided');
      setSuspendModalOpen(true);
      return;
    }

    // Reactivate user via admin endpoint
    setConfirmPayload({
      title: 'Reactivate User',
      message: `Reactivate ${user.name}?`,
      onConfirm: async () => {
        try {
          await adminAPI.updateUser(parseInt(user.id), { status: 'Active' });
          updateUserStatus(user.id, 'Active');
          toast(`${user.name} reactivated.`, 'success');
        } catch (err: any) {
          console.error(err);
          toast('Failed to reactivate user.', 'error');
        }
        setConfirmOpen(false);
      }
    });
    setConfirmOpen(true);
  };

  const toast = useToast();

  // modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleTarget, setRoleTarget] = useState<any | null>(null);
  const [roleCandidate, setRoleCandidate] = useState<'User' | 'Partner' | 'Admin'>('User');

  const [walletModalOpen, setWalletModalOpen] = useState(false);
  const [walletTarget, setWalletTarget] = useState<any | null>(null);
  const [walletAmount, setWalletAmount] = useState<string>('');
  const [walletReason, setWalletReason] = useState<string>('');

  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<any | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
  const [suspendReason, setSuspendReason] = useState<string>('');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any | null>(null);

  return (
    <div className="bg-[#1f0c05] border border-white/10 rounded-sm p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-serif text-xl text-cream">Users</h3>
        <div className="flex gap-2">
          <button onClick={() => setFilter('all')} className={`text-xs px-3 py-1 rounded ${filter === 'all' ? 'bg-golden-orange text-espresso' : 'text-cream/60 hover:text-golden-orange'}`}>All</button>
          <button onClick={() => setFilter('active')} className={`text-xs px-3 py-1 rounded ${filter === 'active' ? 'bg-golden-orange text-espresso' : 'text-cream/60 hover:text-golden-orange'}`}>Active</button>
          <button onClick={() => setFilter('partners')} className={`text-xs px-3 py-1 rounded ${filter === 'partners' ? 'bg-golden-orange text-espresso' : 'text-cream/60 hover:text-golden-orange'}`}>Partners</button>
        </div>
      </div>

      <div className="space-y-2">
        {visible.length === 0 ? (
          <p className="text-cream/50">No users available.</p>
        ) : (
          visible.map(u => (
            <div key={u.id} className="p-3 bg-black/20 rounded-sm flex justify-between items-center">
              <div>
                <div className="font-bold text-cream">{u.name} <span className="text-xs text-cream/50">· {u.role}</span></div>
                <div className="text-xs text-cream/50">{u.email} • {u.phone || '—'}</div>
                <div className="text-xs text-cream/40 mt-1">Status: <span className={`font-bold ${u.status === 'Active' ? 'text-green-400' : 'text-red-400'}`}>{u.status}</span></div>
                <div className="text-xs text-cream/40">Wallet: <span className="font-bold">₦{(u.walletBalance || 0).toLocaleString()}</span></div>
              </div>

              <div className="flex items-center gap-2">
                <button onClick={() => toggleStatus(u)} className={`text-xs px-3 py-1 rounded ${u.status === 'Active' ? 'bg-red-600 text-white' : 'bg-green-600 text-white'}`}>{u.status === 'Active' ? 'Suspend' : 'Activate'}</button>
                <button onClick={() => setSelected(u)} className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-cream">Details</button>
                <button onClick={() => handleRoleMenu(u)} className="text-xs px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-cream">Role</button>
              </div>
            </div>
          ))
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl bg-[#1f0c05] border border-golden-orange p-6 rounded-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-serif text-2xl text-cream">{selected.name}</h3>
                <p className="text-xs text-cream/50">{selected.role} · Joined: {selected.joined || '—'}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(null)} className="text-cream/60 hover:text-golden-orange">Close</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-cream/50 text-xs">Email</p>
                <p className="text-cream font-bold">{selected.email}</p>

                <p className="text-cream/50 text-xs mt-3">Phone</p>
                <p className="text-cream">{selected.phone || '—'}</p>

                <p className="text-cream/50 text-xs mt-3">Address</p>
                <p className="text-cream">{selected.address || '—'}</p>
              </div>

              <div>
                <p className="text-cream/50 text-xs">Wallet Balance</p>
                <p className="text-cream font-bold">₦{(selected.walletBalance || 0).toLocaleString()}</p>

                <p className="text-cream/50 text-xs mt-3">Verification</p>
                <p className="text-cream">{selected.verificationStatus}</p>

                <p className="text-cream/50 text-xs mt-3">Rental Count / Avg Spend</p>
                <p className="text-cream">{selected.rentalHistoryCount || 0} / {selected.avgSpend || '₦0'}</p>
              </div>
            </div>

            <div className="flex gap-2">
              {selected.verificationStatus === 'Pending' && (
                <>
                  <button onClick={() => handleApprove(selected)} className="px-3 py-2 bg-green-600 text-cream rounded text-sm">Approve</button>
                  <button onClick={() => handleReject(selected)} className="px-3 py-2 bg-red-600 text-cream rounded text-sm">Reject</button>
                </>
              )}

              <button onClick={() => handleChangeRole(selected)} className="px-3 py-2 bg-white/5 text-cream rounded text-sm">Change Role</button>
              <button onClick={() => handleAdjustWallet(selected)} className="px-3 py-2 bg-white/5 text-cream rounded text-sm">Adjust Wallet</button>
            </div>
          </div>
        </div>
      )}
      {/* Role modal */}
      <Modal open={roleModalOpen} title={`Change role for ${roleTarget?.name || ''}`} onClose={() => setRoleModalOpen(false)} footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setRoleModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
          <button onClick={async () => {
            if (!roleTarget) return;
            // optimistic
            const prevRole = roleTarget.role;
            updateUserRole && updateUserRole(roleTarget.id, roleCandidate as any);
            toast(`${roleTarget.name} is now ${roleCandidate}`, 'success');
            try {
              await adminAPI.updateUser(parseInt(roleTarget.id), { role: roleCandidate });
              setRoleModalOpen(false);
            } catch (err: any) {
              console.error(err);
              toast('Failed to change role. Reverting.', 'error');
              await refreshUserFromBackend(roleTarget.id);
            }
          }} className="px-3 py-1 rounded bg-golden-orange text-espresso">Save</button>
        </div>
      }>
        <div className="space-y-2">
          <label className="text-cream/70 text-xs">Select role</label>
          <CustomSelect
            options={['User', 'Partner', 'Admin']}
            value={roleCandidate}
            onChange={(v) => setRoleCandidate(v as 'User' | 'Partner' | 'Admin')}
          />
        </div>
      </Modal>

      {/* Wallet modal */}
      <Modal open={walletModalOpen} title={walletTarget ? `Adjust wallet for ${walletTarget.name}` : 'Adjust wallet'} onClose={() => setWalletModalOpen(false)} footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setWalletModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
          <button onClick={async () => {
            if (!updateWallet || !walletTarget) return;
            const amount = Number(walletAmount);
            if (isNaN(amount) || amount === 0) {
              toast('Invalid amount', 'error');
              return;
            }
            try {
              await updateWallet(walletTarget.id, amount, walletReason);
              toast('Wallet updated.', 'success');
              setWalletModalOpen(false);
              setSelected(null);
            } catch (err) {
              console.error(err);
              toast('Failed to update wallet.', 'error');
            }
          }} className="px-3 py-1 rounded bg-golden-orange text-espresso">Apply</button>
        </div>
      }>
        <div className="space-y-3">
          <label className="text-cream/70 text-xs">Amount (positive to credit, negative to debit)</label>
          <input value={walletAmount} onChange={e => setWalletAmount(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
          <label className="text-cream/70 text-xs">Reason</label>
          <input value={walletReason} onChange={e => setWalletReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={rejectModalOpen} title={`Reject verification for ${rejectTarget?.name || ''}`} onClose={() => setRejectModalOpen(false)} footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setRejectModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
          <button onClick={async () => {
            if (!rejectVerification || !rejectTarget) return;
            try {
              if (rejectTarget.role === 'Partner') {
                await adminAPI.verifyPartner(parseInt(rejectTarget.id), {
                  verificationStatus: 'Rejected',
                  adminNotes: rejectReason,
                });
              } else {
                await userAPI.rejectVerification(parseInt(rejectTarget.id), rejectReason);
              }
              rejectVerification(rejectTarget.id, rejectReason);
              toast(`${rejectTarget.name} rejected.`, 'info');
              setRejectModalOpen(false);
              setSelected(null);
            } catch (err: any) {
              console.error(err);
              toast('Failed to reject verification.', 'error');
            }
          }} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
        </div>
      }>
        <div className="space-y-2">
          <label className="text-cream/70 text-xs">Reason</label>
          <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
        </div>
      </Modal>

      {/* Suspend modal */}
      <Modal open={suspendModalOpen} title={`Suspend ${suspendTarget?.name || ''}`} onClose={() => setSuspendModalOpen(false)} footer={
        <div className="flex justify-end gap-2">
          <button onClick={() => setSuspendModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
          <button onClick={async () => {
            if (!suspendTarget) return;
            // optimistic
            updateUserStatus && updateUserStatus(suspendTarget.id, 'Suspended', suspendReason);
            toast(`${suspendTarget.name} suspended.`, 'info');
            try {
              await adminAPI.updateUser(parseInt(suspendTarget.id), { status: 'Suspended', reason: suspendReason });
              setSuspendModalOpen(false);
            } catch (err: any) {
              console.error(err);
              toast('Failed to suspend user. Reverting.', 'error');
              await refreshUserFromBackend(suspendTarget.id);
            }
          }} className="px-3 py-1 rounded bg-red-600 text-white">Suspend</button>
        </div>
      }>
        <div className="space-y-2">
          <label className="text-cream/70 text-xs">Reason</label>
          <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
        </div>
      </Modal>

      {/* Generic confirm modal */}
      {confirmPayload && (
        <ConfirmModal open={confirmOpen} title={confirmPayload.title} message={confirmPayload.message} danger={confirmPayload.danger} onConfirm={confirmPayload.onConfirm} onCancel={() => setConfirmOpen(false)} />
      )}
    </div>
  );
};

export default AdminUsers;
