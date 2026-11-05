import React, { useEffect, useState } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';
import { adminAPI, AuthUserResponse, userAPI } from '../services/api';
import Modal from './Modal';
import { useToast } from './ToastProvider';

type VerificationGroup = 'users' | 'partners';
type VerificationStatus = 'Pending' | 'Verified' | 'Rejected';

const isViewableDocumentUrl = (value: string): boolean => /^(https?:|blob:|data:)/i.test(value);

const getDocumentEntries = (user: AuthUserResponse): Array<[string, string]> => {
    const entries = new Map<string, string>();
    const addEntries = (value: unknown) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) {
            return;
        }

        Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
            if (typeof entry === 'string' && entry.trim().length > 0) {
                entries.set(key, entry);
            }
        });
    };

    addEntries(user.verificationDocs);

    const userRecord = user as unknown as Record<string, unknown>;
    [
        'bvn',
        'nin',
        'idType',
        'govIdUrl',
        'cacNumber',
        'businessName',
        'cacCertUrl',
    ].forEach(key => {
        const value = userRecord[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            entries.set(key, value);
        }
    });

    return Array.from(entries.entries());
};

const AdminVerificationReview: React.FC = () => {
    const [group, setGroup] = useState<VerificationGroup>('users');
    const [submissions, setSubmissions] = useState<AuthUserResponse[]>([]);
    const [selected, setSelected] = useState<AuthUserResponse | null>(null);
    const [rejectTarget, setRejectTarget] = useState<AuthUserResponse | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingSubmission, setIsLoadingSubmission] = useState(false);
    const [busyId, setBusyId] = useState<number | null>(null);
    const toast = useToast();

    const loadSubmissions = async () => {
        setIsLoading(true);
        try {
            const [usersResponse, partnersResponse] = await Promise.all([
                adminAPI.getUsers(1, 100),
                adminAPI.getPartners(1, 100),
            ]);

            const pendingUsers = usersResponse.data.filter(
                user => user.role === 'User' && user.verificationStatus === 'Pending',
            );
            const pendingPartners = partnersResponse.data.filter(
                user => user.verificationStatus === 'Pending',
            );

            setSubmissions(group === 'users' ? pendingUsers : pendingPartners);
        } catch (error) {
            console.error('Failed to load verification submissions.', error);
            toast('Failed to load verification submissions.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void loadSubmissions();
    }, [group]);

    const openSubmission = async (user: AuthUserResponse) => {
        setIsLoadingSubmission(true);
        try {
            const fullUser = await adminAPI.getUser(user.id);
            setSelected(fullUser);
        } catch (error) {
            console.error('Failed to load verification submission details.', error);
            setSelected(user);
            toast('Showing available submission details.', 'warning');
        } finally {
            setIsLoadingSubmission(false);
        }
    };

    const updateVerification = async (
        user: AuthUserResponse,
        status: VerificationStatus,
        reason?: string,
    ) => {
        setBusyId(user.id);
        try {
            if (group === 'partners') {
                await adminAPI.verifyPartner(user.id, {
                    verificationStatus: status,
                    ...(reason ? { adminNotes: reason } : {}),
                });
            } else if (status === 'Verified') {
                await userAPI.approveVerification(user.id);
            } else {
                await userAPI.rejectVerification(user.id, reason || 'Rejected by admin');
            }

            toast(`${user.name} verification ${status.toLowerCase()}.`, 'success');
            setSelected(null);
            setRejectTarget(null);
            await loadSubmissions();
        } catch (error) {
            console.error('Failed to update verification.', error);
            toast('Failed to update verification.', 'error');
        } finally {
            setBusyId(null);
        }
    };

    const documentEntries = selected ? getDocumentEntries(selected) : [];

    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h3 className="font-serif text-2xl text-cream">Verification Submissions</h3>
                    <p className="text-sm text-cream/50">Review pending identity and partner applications.</p>
                </div>
                <div className="flex gap-2 border border-white/10 bg-black/20 p-1">
                    {(['users', 'partners'] as VerificationGroup[]).map(value => (
                        <button
                            key={value}
                            onClick={() => setGroup(value)}
                            className={`px-3 py-2 text-xs uppercase ${group === value ? 'bg-golden-orange text-espresso font-bold' : 'text-cream/60'}`}
                        >
                            {value === 'users' ? 'User Identity' : 'Partners'}
                        </button>
                    ))}
                </div>
            </div>

            {isLoading ? (
                <div className="flex items-center gap-2 p-6 text-cream/60"><Loader2 size={16} className="animate-spin" /> Loading submissions...</div>
            ) : submissions.length === 0 ? (
                <div className="border border-white/10 bg-white/5 p-8 text-center text-cream/50">No pending {group === 'users' ? 'user' : 'partner'} submissions.</div>
            ) : (
                <div className="space-y-3">
                    {submissions.map(user => (
                        <div key={user.id} className="flex flex-col gap-4 border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <p className="font-bold text-cream">{user.name}</p>
                                <p className="text-xs text-cream/50">{user.email} {user.phone ? `• ${user.phone}` : ''}</p>
                                <p className="mt-1 text-xs text-yellow-400">Pending review</p>
                            </div>
                            <div className="flex gap-2">
                                <button disabled={isLoadingSubmission} onClick={() => void openSubmission(user)} className="border border-white/10 px-3 py-2 text-xs text-cream disabled:opacity-50">{isLoadingSubmission ? 'Loading...' : 'View submission'}</button>
                                <button disabled={busyId === user.id} onClick={() => void updateVerification(user, 'Verified')} className="flex items-center gap-1 bg-green-600 px-3 py-2 text-xs text-white disabled:opacity-50"><Check size={14} /> Accept</button>
                                <button disabled={busyId === user.id} onClick={() => { setRejectTarget(user); setRejectReason(''); }} className="flex items-center gap-1 bg-red-600 px-3 py-2 text-xs text-white disabled:opacity-50"><X size={14} /> Reject</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Modal open={!!selected} title={`${selected?.name || ''} verification`} onClose={() => setSelected(null)} footer={
                <div className="flex justify-end gap-2">
                    <button onClick={() => setSelected(null)} className="px-3 py-2 text-sm text-cream/60">Close</button>
                    {selected && <button onClick={() => void updateVerification(selected, 'Verified')} className="bg-green-600 px-3 py-2 text-sm text-white">Accept</button>}
                </div>
            }>
                {selected && (
                    <div className="space-y-3 text-sm text-cream">
                        <p><span className="text-cream/50">Email:</span> {selected.email}</p>
                        <p><span className="text-cream/50">Role:</span> {selected.role}</p>
                        <p><span className="text-cream/50">Submitted:</span> {selected.updatedAt || selected.createdAt}</p>
                        {documentEntries.length === 0 ? <p className="text-cream/50">No verification documents were returned.</p> : documentEntries.map(([label, value]) => (
                            <div key={label} className="border-t border-white/10 pt-2">
                                <p className="text-xs uppercase text-cream/50">{label}</p>
                                {isViewableDocumentUrl(value) ? <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-golden-orange">Open document <ExternalLink size={13} /></a> : <p className="break-all">{value}</p>}
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            <Modal open={!!rejectTarget} title={`Reject ${rejectTarget?.name || ''}`} onClose={() => setRejectTarget(null)} footer={
                <div className="flex justify-end gap-2">
                    <button onClick={() => setRejectTarget(null)} className="px-3 py-2 text-sm text-cream/60">Cancel</button>
                    {rejectTarget && <button onClick={() => void updateVerification(rejectTarget, 'Rejected', rejectReason)} className="bg-red-600 px-3 py-2 text-sm text-white">Reject submission</button>}
                </div>
            }>
                <label className="text-xs uppercase text-cream/50">Reason</label>
                <textarea value={rejectReason} onChange={event => setRejectReason(event.target.value)} placeholder="Add a reason for the applicant" className="mt-2 min-h-24 w-full border border-white/10 bg-black/20 p-3 text-cream outline-none" />
            </Modal>
        </div>
    );
};

export default AdminVerificationReview;
