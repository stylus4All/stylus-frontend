import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { CreditCard, DollarSign, ShieldAlert, Wallet, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProduct } from '../context/ProductContext';
import { useWishlist } from '../context/WishlistContext';
import { useOrders } from '../context/OrderContext';
import { Product, OrderStatus } from '../types';
import { Button } from '../components/Button';
import { UserVerificationForm } from '../components/UserVerificationForm';
import { PartnerVerificationForm } from '../components/PartnerVerificationForm';
import { DashboardAlert, DashboardAlertType } from '../components/Alert/DashboardAlert';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import { productAPI } from '../services/api';
import { PartnerDashboardPage } from './PartnerDashboardPage';
import { UserDashboardPage } from './UserDashboardPage';

export const Dashboard: React.FC = () => {
    const navigate = useNavigate();
    const toast = useToast();
    const { logout, currentUser, submitVerification, updateWallet, requestWithdrawal, transactions } = useAuth();
    const { removeProduct, updateProduct, incrementRentalCount } = useProduct();
    const { wishlist } = useWishlist();
    const { orders, updateOrderItemStatus } = useOrders();

    const [partnerListings, setPartnerListings] = useState<Product[]>([]);

    useEffect(() => {
        const ownerId = Number(currentUser?.id);
        if (currentUser?.role !== 'Partner' || !Number.isInteger(ownerId)) {
            setPartnerListings([]);
            return;
        }

        let cancelled = false;
        productAPI.getByOwner(ownerId)
            .then(listings => {
                if (!cancelled) setPartnerListings(listings);
            })
            .catch(error => {
                if (!cancelled) console.error('Failed to load partner listings.', error);
            });
        return () => {
            cancelled = true;
        };
    }, [currentUser?.id, currentUser?.role]);

    const [currentView, setCurrentView] = useState('overview');
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
    const [verificationModal, setVerificationModal] = useState(false);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmPayload, setConfirmPayload] = useState<any | null>(null);
    const [dashboardAlert, setDashboardAlert] = useState<{ type: DashboardAlertType; title: string; message: string } | null>(null);

    // Wallet Funding & Withdrawal State
    const [fundModal, setFundModal] = useState(false);
    const [withdrawModal, setWithdrawModal] = useState(false);
    const [fundAmount, setFundAmount] = useState('');
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [bankDetails, setBankDetails] = useState({ bankName: '', accountNumber: '', accountName: '' });
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);

    // Filter products for Partner
    const myListings = partnerListings;

    // User orders logic
    const userOrders = orders.filter(o => o.userId === currentUser?.id);

    // Transaction History for current user
    const userTransactions = transactions.filter(t => t.userId === currentUser?.id).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Split Active vs History based on items (if any item is active, show order in active)
    const activeStatuses: OrderStatus[] = ['Processing', 'Pending Approval', 'Accepted', 'Shipped'];

    const activeOrders = userOrders.filter(o => o.items.some(i => activeStatuses.includes(i.status)));
    const pastOrders = userOrders.filter(o => !activeOrders.includes(o));

    // Handle Verification Submission
    const handleVerificationSubmit = async (data: any) => {
        try {
            await submitVerification(currentUser!.id, data);
            setVerificationModal(false);
            setDashboardAlert({
                type: 'success',
                title: 'Verification Submitted',
                message: 'Your verification documents have been submitted successfully. Our team will review them within 24-48 hours. You\'ll be notified once verified.'
            });
        } catch (error: any) {
            setDashboardAlert({
                type: 'error',
                title: 'Submission Failed',
                message: error.message || 'Failed to submit verification. Please try again.'
            });
        }
    };

    const performLogout = () => {
        logout();
        navigate('/login');
    };

    const handleWithdrawSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(withdrawAmount);
        if (isNaN(amount) || amount <= 0) {
            setDashboardAlert({
                type: 'warning',
                title: 'Invalid Amount',
                message: 'Please enter a valid withdrawal amount.'
            });
            return;
        }
        if (amount > (currentUser?.walletBalance || 0)) {
            setDashboardAlert({
                type: 'error',
                title: 'Insufficient Funds',
                message: `You only have $${currentUser?.walletBalance.toFixed(2)} available in your wallet.`
            });
            return;
        }

        const details = `${bankDetails.bankName} - ${bankDetails.accountNumber} (${bankDetails.accountName})`;
        requestWithdrawal(currentUser!.id, amount, details);
        setWithdrawModal(false);
        setWithdrawAmount('');
        setDashboardAlert({
            type: 'info',
            title: 'Withdrawal Requested',
            message: `Your withdrawal request for $${amount} has been submitted. Funds will be processed within 2-3 business days.`
        });
    };

    const handleFundWallet = async (e: React.FormEvent) => {
        e.preventDefault();
        const amount = Number(fundAmount);
        if (isNaN(amount) || amount <= 0) {
            setDashboardAlert({
                type: 'warning',
                title: 'Invalid Amount',
                message: 'Please enter a valid amount to deposit.'
            });
            return;
        }

        setIsProcessingPayment(true);
        try {
            // Simulate payment gateway
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Update wallet via backend
            await updateWallet(currentUser!.id, amount, 'Wallet Fund via Card');

            setIsProcessingPayment(false);
            setFundModal(false);
            setFundAmount('');
            setDashboardAlert({
                type: 'success',
                title: 'Deposit Successful',
                message: `$${amount} has been added to your Stylus Wallet. Your new balance is $${(currentUser!.walletBalance + amount).toFixed(2)}.`
            });
        } catch (error: any) {
            setIsProcessingPayment(false);
            setDashboardAlert({
                type: 'error',
                title: 'Deposit Failed',
                message: error.message || 'Failed to fund wallet. Please try again.'
            });
        }
    };

    // Partner Action: Accept specific Item
    const handleAcceptItem = async (orderId: string, itemId: string, productId: string, price: number) => {
        if (currentUser?.status === 'Suspended') {
            toast('Action Blocked: Your account is suspended.', 'error');
            return;
        }
        try {
            await updateOrderItemStatus(orderId, itemId, 'Accepted');
            incrementRentalCount(productId);
            await updateWallet(currentUser!.id, price, `Order Earnings: #${orderId}`, 'Credit');
            toast('Order accepted and funds credited to your wallet.', 'success');
        } catch (error) {
            toast(error instanceof Error ? error.message : 'Failed to accept this order item.', 'error');
        }
    };

    const handleRejectItem = (orderId: string, itemId: string) => {
        if (currentUser?.status === 'Suspended') {
            toast('Action Blocked: Your account is suspended.', 'error');
            return;
        }
        const order = orders.find(o => o.id === orderId);
        const item = order?.items.find(i => i.id === itemId);
        if (!order || !item) return;
        setConfirmPayload({
            title: 'Decline Request',
            message: `Are you sure you want to DECLINE this request for ${item.product.name}?\n\nThis will trigger an immediate full refund of $${item.price} to the customer.`,
            danger: true,
            onConfirm: async () => {
                try {
                    await updateOrderItemStatus(orderId, itemId, 'Rejected');
                    await updateWallet(order.userId, item.price, `Refund: Request Declined for ${item.product.name}`, 'Credit');
                    toast('Order item declined and customer refunded.', 'info');
                    setConfirmOpen(false);
                } catch (error) {
                    toast(error instanceof Error ? error.message : 'Failed to decline this order item.', 'error');
                }
            }
        });
        setConfirmOpen(true);
    };

    const handleRemoveItem = (id: string) => {
        setConfirmPayload({
            title: 'Remove Item',
            message: 'Are you sure you want to remove this item from your store? This cannot be undone.',
            danger: true,
            onConfirm: async () => {
                try {
                    await productAPI.delete(id);
                    removeProduct(id);
                    setPartnerListings(prev => prev.filter(product => product.id !== id));
                    setConfirmOpen(false);
                    toast('Listing deleted.', 'success');
                } catch (error) {
                    toast(error instanceof Error ? error.message : 'Failed to delete listing.', 'error');
                }
            }
        });
        setConfirmOpen(true);
    };

    if (!currentUser) return null;

    // Suspension Overlay
    if (currentUser.status === 'Suspended') {
        return (
            <div className="min-h-screen bg-espresso flex items-center justify-center p-4">
                <div className="bg-red-900/20 border border-red-500 p-8 max-w-lg text-center rounded-sm">
                    <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h1 className="text-3xl font-serif text-cream mb-2">Account Suspended</h1>
                    <p className="text-red-300 mb-6 font-bold">{currentUser.suspensionReason || "Violation of Terms of Service"}</p>
                    <p className="text-cream/60 mb-8">Access to trading, renting, and wallet withdrawals has been temporarily revoked. Please contact support.</p>
                    <div className="flex justify-center gap-4">
                        <Button onClick={performLogout}>Sign Out</Button>
                        <Link to="/contact"><Button variant="outline">Contact Support</Button></Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-espresso pb-20 animate-fade-in">

            {/* Dashboard Alert */}
            {dashboardAlert && (
                <DashboardAlert
                    type={dashboardAlert.type}
                    title={dashboardAlert.title}
                    message={dashboardAlert.message}
                    onClose={() => setDashboardAlert(null)}
                />
            )}

            {/* Verification Modal */}
            {verificationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
                    <div className="max-w-md w-full relative animate-fade-in">
                        <button onClick={() => setVerificationModal(false)} className="absolute -top-10 right-0 text-cream hover:text-golden-orange"><X /></button>
                        {currentUser.role === 'User' ? (
                            <UserVerificationForm onSubmit={handleVerificationSubmit} />
                        ) : (
                            <PartnerVerificationForm onSubmit={handleVerificationSubmit} />
                        )}
                    </div>
                </div>
            )}

            {/* Withdrawal Modal */}
            {withdrawModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#1f0c05] border border-golden-orange w-full max-w-md p-8 relative shadow-2xl rounded-sm">
                        <button onClick={() => setWithdrawModal(false)} className="absolute top-4 right-4 text-cream/50 hover:text-golden-orange"><X size={24} /></button>
                        <h2 className="font-serif text-2xl text-cream mb-2">Withdraw Earnings</h2>
                        <p className="text-xs text-cream/50 mb-6 uppercase tracking-widest">Process Transfer to Bank</p>

                        <div className="bg-golden-orange/10 p-4 mb-6 border border-golden-orange/20 text-center">
                            <p className="text-xs text-golden-orange uppercase">Available Balance</p>
                            <p className="text-2xl font-serif text-cream">₦{currentUser.walletBalance.toFixed(2)}</p>
                        </div>

                        <form onSubmit={handleWithdrawSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs text-cream/50 mb-1 block uppercase">Amount to Withdraw (₦)</label>
                                <input
                                    type="number"
                                    required
                                    min="10"
                                    max={currentUser.walletBalance}
                                    value={withdrawAmount}
                                    onChange={e => setWithdrawAmount(e.target.value)}
                                    className="w-full bg-black/20 border border-white/10 p-3 text-cream focus:border-golden-orange outline-none font-serif text-lg"
                                />
                            </div>

                            <div className="pt-2">
                                <label className="text-xs text-cream/50 mb-2 block uppercase font-bold">Bank Details</label>
                                <div className="space-y-3">
                                    <input
                                        required
                                        type="text"
                                        placeholder="Bank Name"
                                        value={bankDetails.bankName}
                                        onChange={e => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none"
                                    />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Account Number"
                                        value={bankDetails.accountNumber}
                                        onChange={e => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none"
                                    />
                                    <input
                                        required
                                        type="text"
                                        placeholder="Account Name"
                                        value={bankDetails.accountName}
                                        onChange={e => setBankDetails({ ...bankDetails, accountName: e.target.value })}
                                        className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none"
                                    />
                                </div>
                            </div>

                            <Button fullWidth className="mt-4">Submit Request</Button>
                        </form>
                    </div>
                </div>
            )}
            {confirmPayload && (
                <ConfirmModal open={confirmOpen} title={confirmPayload.title} message={confirmPayload.message} danger={confirmPayload.danger} onConfirm={confirmPayload.onConfirm} onCancel={() => setConfirmOpen(false)} />
            )}

            {/* Fund Wallet Payment Modal */}
            {fundModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[#1f0c05] border border-golden-orange w-full max-w-md p-8 relative shadow-2xl rounded-sm">
                        <button onClick={() => setFundModal(false)} className="absolute top-4 right-4 text-cream/50 hover:text-golden-orange"><X size={24} /></button>
                        <h2 className="font-serif text-2xl text-cream mb-2">Fund Your Wallet</h2>
                        <p className="text-xs text-cream/50 mb-6 uppercase tracking-widest">Secure Payment Gateway</p>

                        <form onSubmit={handleFundWallet} className="space-y-4">
                            <div>
                                <label className="text-xs text-cream/50 mb-1 block uppercase">Amount to Add (₦)</label>
                                <div className="relative">
                                    <DollarSign size={16} className="absolute left-3 top-3 text-golden-orange" />
                                    <input
                                        type="number"
                                        required
                                        min="10"
                                        value={fundAmount}
                                        onChange={e => setFundAmount(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 pl-10 p-3 text-cream focus:border-golden-orange outline-none font-serif text-lg"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-white/10 pt-4 mt-4">
                                <label className="text-xs text-cream/50 mb-3 uppercase flex items-center gap-2"><CreditCard size={14} /> Card Details</label>
                                <div className="space-y-3">
                                    <input required type="text" placeholder="Card Number (0000 0000 0000 0000)" className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none rounded-sm" />
                                    <div className="grid grid-cols-2 gap-3">
                                        <input required type="text" placeholder="MM / YY" className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none rounded-sm" />
                                        <input required type="text" placeholder="CVV" className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none rounded-sm" />
                                    </div>
                                    <input required type="text" placeholder="Cardholder Name" className="w-full bg-black/20 border border-white/10 p-3 text-cream text-sm focus:border-golden-orange outline-none rounded-sm" />
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mt-2 mb-4">
                                <div className="w-full h-px bg-white/10"></div>
                                <span className="text-[10px] text-cream/30 uppercase whitespace-nowrap">Secured by Stripe</span>
                                <div className="w-full h-px bg-white/10"></div>
                            </div>

                            <Button fullWidth disabled={isProcessingPayment}>
                                {isProcessingPayment ? 'Processing Transaction...' : `Pay $${fundAmount || '0.00'}`}
                            </Button>
                        </form>
                    </div>
                </div>
            )}

            {/* Logout Modal */}
            {showLogoutConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setShowLogoutConfirm(false)}>
                    <div className="bg-[#1f0c05] border border-golden-orange w-full max-w-md p-8 text-center relative" onClick={e => e.stopPropagation()}>
                        <h2 className="font-serif text-2xl text-cream mb-2">Sign Out</h2>
                        <div className="flex gap-4 justify-center mt-6">
                            <Button variant="outline" onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
                            <Button onClick={performLogout}>Confirm</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Header */}
            <div className="h-48 bg-[#1a0a04] border-b border-white/5 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#e1af4d 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-10">
                <div className="flex flex-col md:flex-row gap-8">

                    {/* Sidebar */}
                    <div className="w-full md:w-1/4">
                        <div className="bg-[#1f0c05] border border-golden-orange/20 p-6 shadow-2xl relative text-center rounded-sm">
                            <div className="w-20 h-20 bg-golden-orange rounded-full mx-auto mb-4 flex items-center justify-center text-espresso text-2xl font-serif font-bold border-4 border-[#1f0c05]">
                                {currentUser.name.charAt(0)}
                            </div>
                            <h2 className="font-serif text-xl text-cream">{currentUser.name}</h2>
                            <div className="flex justify-center items-center gap-2 mt-2">
                                <span className={`text-[10px] px-2 py-0.5 uppercase tracking-widest border rounded ${currentUser.role === 'Partner' ? 'border-blue-400 text-blue-400' : 'border-golden-orange text-golden-orange'}`}>
                                    {currentUser.role}
                                </span>
                                <span className={`text-[10px] px-2 py-0.5 uppercase tracking-widest border rounded ${currentUser.verificationStatus === 'Verified' ? 'border-green-400 text-green-400' : currentUser.verificationStatus === 'Rejected' ? 'border-red-400 text-red-400' : 'border-red-400 text-red-400'}`}>
                                    {currentUser.verificationStatus}
                                </span>
                            </div>

                            {/* Wallet Preview */}
                            <div className="mt-6 pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-xs uppercase text-cream/40">Wallet Balance</p>
                                    <Wallet size={14} className="text-golden-orange" />
                                </div>
                                <p className="text-2xl font-serif text-golden-orange mb-3">₦{currentUser.walletBalance.toFixed(2)}</p>

                                {currentUser.role === 'Partner' ? (
                                    <div className="flex gap-2">
                                        <button onClick={() => setFundModal(true)} className="flex-1 bg-white/5 border border-white/10 text-cream py-2 text-xs uppercase font-bold hover:bg-white/10 transition-colors">Deposit</button>
                                        <button onClick={() => setWithdrawModal(true)} className="flex-1 bg-white/5 border border-white/10 text-cream py-2 text-xs uppercase font-bold hover:bg-white/10 transition-colors">Withdraw</button>
                                    </div>
                                ) : (
                                    <button onClick={() => setFundModal(true)} className="w-full bg-golden-orange text-espresso py-2 text-xs uppercase font-bold hover:bg-white hover:text-espresso transition-colors shadow-lg">Fund Wallet</button>
                                )}
                            </div>

                            {currentUser.verificationStatus !== 'Verified' && currentUser.verificationStatus !== 'Pending' && (
                                <button onClick={() => setVerificationModal(true)} className="w-full mt-4 bg-red-500/10 text-red-400 border border-red-500/50 py-2 text-xs uppercase font-bold hover:bg-red-500 hover:text-white transition-colors">
                                    {currentUser.role === 'Partner' ? 'Complete Business Verification' : 'Verify Identity'}
                                </button>
                            )}
                        </div>

                        <nav className="mt-4 space-y-2">
                            {currentUser.role === 'Partner' ? (
                                <>
                                    <button onClick={() => setCurrentView('overview')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'overview' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Dashboard</button>
                                    <button onClick={() => setCurrentView('finances')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'finances' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Financials</button>
                                    <button onClick={() => setCurrentView('listings')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'listings' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>My Listings</button>
                                    <button onClick={() => setCurrentView('add-item')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'add-item' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Add New Item</button>
                                    <button onClick={() => setCurrentView('orders')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'orders' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Incoming Requests</button>
                                </>
                            ) : (
                                <>
                                    <button onClick={() => setCurrentView('overview')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'overview' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Active Activity</button>
                                    <button onClick={() => setCurrentView('history')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'history' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Order History</button>
                                    <button onClick={() => setCurrentView('finances')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'finances' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Transactions</button>
                                    <button onClick={() => setCurrentView('wishlist')} className={`w-full text-left px-4 py-3 border-l-2 transition-all ${currentView === 'wishlist' ? 'border-golden-orange bg-white/5 text-golden-orange' : 'border-transparent text-cream hover:bg-white/5'}`}>Wishlist</button>
                                </>
                            )}
                            <button onClick={() => setShowLogoutConfirm(true)} className="w-full text-left px-4 py-3 text-red-400 hover:bg-white/5 transition-colors">Sign Out</button>
                        </nav>
                    </div>

                    {/* Main Content */}
                    <div className="w-full md:w-3/4">
                        {currentUser.role === 'Partner' ? (
                            <PartnerDashboardPage
                                currentUser={currentUser}
                                currentView={currentView}
                                listings={myListings}
                                orders={orders}
                                transactions={userTransactions}
                                onViewChange={setCurrentView}
                                onRequestWithdrawal={() => setWithdrawModal(true)}
                                onRequestVerification={() => setVerificationModal(true)}
                                onRemoveItem={handleRemoveItem}
                                onAcceptItem={handleAcceptItem}
                                onRejectItem={handleRejectItem}
                                onProductCreated={product => setPartnerListings(prev => [product, ...prev])}
                                onProductUpdated={product => {
                                    updateProduct(product.id, product);
                                    setPartnerListings(prev => prev.map(listing => listing.id === product.id ? product : listing));
                                }}
                            />
                        ) : (
                            <UserDashboardPage
                                currentUser={currentUser}
                                currentView={currentView}
                                activeOrders={activeOrders}
                                pastOrders={pastOrders}
                                transactions={userTransactions}
                                wishlist={wishlist}
                                onRequestVerification={() => setVerificationModal(true)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};