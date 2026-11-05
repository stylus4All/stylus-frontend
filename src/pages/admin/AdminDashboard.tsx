import React, { useState } from 'react';
import {
    Check, Plus, Search, Trash2, ShieldCheck, Power,
    AlertTriangle, Wallet, BarChart3, PieChart, Star,
    Activity, TrendingUp, DollarSign, ArrowUp, X,
    CheckCircle, XCircle, FileText, Eye, Building2, User,
    Download, Menu
} from 'lucide-react';
import { Button } from '../../components/Button';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Product } from '../../types';
import AdminSidebar from './AdminSidebar';
import AdminUsers from './AdminUsers';
import AdminVerificationReview from '../../components/AdminVerificationReview';
import { useEffect } from 'react';
import { useToast } from '../../components/ToastProvider';
import Modal from '../../components/Modal';
import ConfirmModal from '../../components/ConfirmModal';
import {
    adminAPI,
    userAPI,
    productAPI,
    AdminDashboardMetrics,
    AuthUserResponse,
} from '../../services/api';

type AdminOrder = {
    id: string;
    userId: string;
    userName: string;
    date: string;
    total: number;
    status: string;
    items: Array<{
        id: string;
        status: string;
        type: string;
        price: number;
        product: { name: string; images: string[]; ownerId?: string };
    }>;
};

export const AdminDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'users' | 'rentals' | 'inventory' | 'marketing' | 'verifications' | 'global_activity' | 'financials' | 'analytics' | 'settings'>('analytics');
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [selectedDoc, setSelectedDoc] = useState<{ url: string, title: string, body?: string } | null>(null);
    const [userFilter, setUserFilter] = useState<'All' | 'User' | 'Partner'>('All');

    const auth = useAuth();
    const {
        logout,
        deleteUser,
        approveVerification,
        rejectVerification,
        updateUserStatus,
        processWithdrawal,
        updateWallet
    } = auth || {};

    const [products, setProducts] = useState<Product[]>([]);
    const [orders, setOrders] = useState<AdminOrder[]>([]);

    const removeProduct = (productId: string) => {
        setProducts(previous => previous.filter(product => product.id !== productId));
    };

    const updateProduct = (productId: string, patch: Partial<Product>) => {
        setProducts(previous => previous.map(product => product.id === productId ? { ...product, ...patch } : product));
    };

    const updateOrderItemStatus = (orderId: string, itemId: string, status: string) => {
        setOrders(previous => previous.map(order => order.id === orderId
            ? { ...order, items: order.items.map(item => item.id === itemId ? { ...item, status } : item) }
            : order));
    };

    const navigate = useNavigate();

    const toast = useToast();

    useEffect(() => {
        let cancelled = false;

        const loadAdminData = async () => {
            try {
                const [metricsResponse, usersResponse, productsResponse, ordersResponse] = await Promise.all([
                    adminAPI.getOverview(),
                    adminAPI.getUsers(1, 100),
                    adminAPI.getProducts(),
                    adminAPI.getOrders(),
                ]);

                if (cancelled) return;

                setAdminMetrics(metricsResponse);
                setAdminUsers(usersResponse.data);
                setProducts(productsResponse as Product[]);
                setOrders(ordersResponse as AdminOrder[]);
                setAdminDataLoaded(true);
            } catch (error) {
                if (!cancelled) {
                    console.error('Failed to load admin data.', error);
                    toast('Failed to load live admin data.', 'error');
                }
            }
        };

        if (auth?.isAdmin) {
            void loadAdminData();
        }

        return () => {
            cancelled = true;
        };
    }, [auth?.isAdmin, toast]);

    // modal & confirm state
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmPayload, setConfirmPayload] = useState<any | null>(null);
    const [adminMetrics, setAdminMetrics] = useState<AdminDashboardMetrics | null>(null);
    const [adminUsers, setAdminUsers] = useState<AuthUserResponse[]>([]);
    const [adminDataLoaded, setAdminDataLoaded] = useState(false);

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectTarget, setRejectTarget] = useState<any | null>(null);
    const [rejectReason, setRejectReason] = useState<string>('');

    const [suspendModalOpen, setSuspendModalOpen] = useState(false);
    const [suspendTarget, setSuspendTarget] = useState<any | null>(null);
    const [suspendReason, setSuspendReason] = useState<string>('');

    const [productRejectModalOpen, setProductRejectModalOpen] = useState(false);
    const [productRejectTarget, setProductRejectTarget] = useState<any | null>(null);
    const [productRejectField, setProductRejectField] = useState<string>('');
    const [productRejectReason, setProductRejectReason] = useState<string>('');

    const filteredUsers = adminUsers.filter(u => {
        if (userFilter === 'All') return true;
        return u?.role === userFilter;
    });

    // Analytics helpers
    const totalUsers = adminMetrics?.users ?? 0;
    const activePartners = adminMetrics?.partners ?? 0;
    const totalProducts = adminMetrics?.products ?? 0;
    const totalOrders = adminMetrics?.orders ?? 0;
    const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
    const totalRentedItems = orders.reduce((sum, order) => sum + order.items.filter(item => item.type === 'rent').length, 0);
    const totalSalesAmount = orders.reduce((sum, order) => sum + order.items.filter(item => item.type === 'buy').reduce((amount, item) => amount + (item.price || 0), 0), 0);

    // Monthly revenue for last 6 months
    const getMonthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}`;
    const months: string[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const dt = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push(getMonthKey(dt));
    }
    const monthLabels = months.map(m => {
        const [y, mon] = m.split('-');
        const date = new Date(Number(y), Number(mon) - 1, 1);
        return date.toLocaleString('default', { month: 'short', year: 'numeric' });
    });

    const monthlyRevenue = months.map(mk => {
        const [y, mon] = mk.split('-');
        const sum = orders.reduce((s, o) => {
            const d = new Date(o.date);
            const key = getMonthKey(d);
            if (key === mk) return s + (o.total || 0);
            return s;
        }, 0);
        return sum;
    });

    // Category distribution for pie chart
    const categoryCounts = products.reduce((acc: Record<string, number>, p) => {
        const k = p.category || 'Other';
        acc[k] = (acc[k] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);
    const categoryEntries = Object.entries(categoryCounts);

    // Top rented products
    const topRented = [...products].sort((a, b) => (b.rentalCount || 0) - (a.rentalCount || 0)).slice(0, 8);

    const handleLogout = () => {
        if (logout) logout();
        navigate('/login');
    };

    const handleSuspendToggle = (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'Active' ? 'Suspended' : 'Active';
        if (newStatus === 'Suspended') {
            setSuspendTarget({ id: userId });
            setSuspendReason('No reason provided');
            setSuspendModalOpen(true);
            return;
        }
        // reactivate path
        setConfirmPayload({
            title: 'Reactivate User',
            message: `Reactivate user?`,
            onConfirm: async () => {
                try {
                    await adminAPI.updateUser(parseInt(userId), { status: 'Active' });
                    updateUserStatus && updateUserStatus(userId, 'Active');
                    toast('User reactivated.', 'success');
                } catch (err: any) {
                    console.error(err);
                    toast('Failed to reactivate user.', 'error');
                }
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    };

    const handleDeleteUser = (userId: string) => {
        setConfirmPayload({
            title: 'Delete User',
            message: "Are you sure you want to PERMANENTLY DELETE this user? This action cannot be undone.",
            danger: true,
            onConfirm: () => {
                (async () => {
                    try {
                        await userAPI.delete(parseInt(userId));
                        deleteUser && deleteUser(userId);
                        toast('User deleted.', 'info');
                    } catch (err: any) {
                        console.error(err);
                        toast('Failed to delete user.', 'error');
                    }
                    setConfirmOpen(false);
                })();
            }
        });
        setConfirmOpen(true);
    };

    const handleApprove = (userId: string, userName: string) => {
        setConfirmPayload({
            title: 'Approve Verification',
            message: `Approve verification for ${userName}?`,
            onConfirm: () => {
                (async () => {
                    try {
                        await userAPI.approveVerification(parseInt(userId));
                        approveVerification && approveVerification(userId);
                        toast(`${userName} approved.`, 'success');
                    } catch (err: any) {
                        console.error(err);
                        toast('Failed to approve verification.', 'error');
                    }
                    setConfirmOpen(false);
                })();
            }
        });
        setConfirmOpen(true);
    };

    const handleReject = (userId: string) => {
        setRejectTarget({ id: userId });
        setRejectReason('Document ID number did not match upload.');
        setRejectModalOpen(true);
    };

    const handleManualVerify = (userId: string, userName: string) => {
        setConfirmPayload({
            title: 'Force Verify',
            message: `FORCE VERIFY: Are you sure you want to manually verify ${userName} without waiting for document submission?`,
            danger: false,
            onConfirm: () => {
                if (approveVerification) approveVerification(userId);
                toast(`${userName} force-verified.`, 'success');
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    }

    // ESV SYSTEM (Export Save View)
    const handleExportData = (type: 'users' | 'products' | 'transactions') => {
        let headers: string[] = [];
        let rows: any[] = [];
        let filename = `stylus_export_${type}_${new Date().toISOString().split('T')[0]}.csv`;

        if (type === 'users') {
            headers = ["ID", "Name", "Email", "Role", "Status", "Joined", "Verification", "Wallet"];
            rows = adminUsers.map(u => [u.id, u.name, u.email, u.role, u.status, u.createdAt, u.verificationStatus, u.walletBalance]);
        } else if (type === 'products') {
            headers = ["ID", "Name", "Brand", "Category", "Rental Price", "Buy Price", "Owner", "Rentals"];
            rows = products.map(p => [p.id, p.name, p.brand, p.category, p.rentalPrice, p.buyPrice, p.ownerId, p.rentalCount]);
        } else if (type === 'transactions') {
            headers = ["ID", "Date", "User", "Type", "Amount", "Status", "Description"];
            rows = orders.map(order => [order.id, order.date, order.userName, 'Order', order.total, order.status, '']);
        }

        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDeleteProduct = (id: string) => {
        setConfirmPayload({
            title: 'Delete Product',
            message: 'Are you sure you want to delete this product from the global inventory?',
            danger: true,
            onConfirm: () => {
                (async () => {
                    try {
                        await productAPI.delete(id);
                        removeProduct && removeProduct(id);
                        toast('Product removed from inventory.', 'info');
                    } catch (err: any) {
                        console.error(err);
                        toast('Failed to remove product.', 'error');
                    }
                    setConfirmOpen(false);
                })();
            }
        });
        setConfirmOpen(true);
    };

    const handleForceStatus = (orderId: string, itemId: string, status: any) => {
        setConfirmPayload({
            title: 'Force Update Transaction',
            message: `Are you sure you want to FORCE update this transaction to '${status}'? This overrides partner control.`,
            danger: false,
            onConfirm: () => {
                if (updateOrderItemStatus) updateOrderItemStatus(orderId, itemId, status);
                toast('Transaction status updated.', 'success');
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    };

    const handleProcessWithdrawal = (txId: string) => {
        setConfirmPayload({
            title: 'Confirm Withdrawal',
            message: "Confirm that you have transferred funds to the partner's bank account?",
            onConfirm: () => {
                if (processWithdrawal) processWithdrawal(txId);
                toast('Withdrawal marked as completed.', 'success');
                setConfirmOpen(false);
            }
        });
        setConfirmOpen(true);
    }

    if (!auth) return <div className="min-h-screen bg-espresso flex items-center justify-center text-cream">Loading Dashboard...</div>;

    return (
        <div className="min-h-screen bg-espresso pt-8 pb-20 animate-fade-in relative">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-6">
                <AdminSidebar
                    active={activeTab === 'users' ? 'users' : activeTab === 'rentals' ? 'dashboard' : activeTab}
                    onSelect={(k: string) => setActiveTab(k as any)}
                    isMobileOpen={sidebarOpen}
                    onClose={() => setSidebarOpen(false)}
                    collapsed={sidebarCollapsed}
                />

                {/* Desktop collapse toggle placed close to the sidebar */}
                <div className="hidden md:flex items-start">
                    <button onClick={() => setSidebarCollapsed(s => !s)} className="p-2 bg-black/20 rounded text-cream/90 ml-[-6px]" title="Toggle sidebar">
                        <Menu size={16} />
                    </button>
                </div>

                <main className="flex-1">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-end mb-8 border-b border-white/10 pb-6">
                        <div>
                            <h1 className="font-serif text-4xl text-cream mt-2">Executive Dashboard</h1>
                            <p className="text-golden-orange text-xs uppercase tracking-widest mt-1">Admin Control Panel</p>
                        </div>
                        {/* <div className="flex gap-2 flex-wrap mt-4 md:mt-0 items-center"> */}
                        {/* <div className="flex items-center gap-2">
                                    <button onClick={() => setSidebarOpen(s => !s)} className="p-2 bg-black/20 rounded text-cream/90" title="Toggle menu"><Menu size={16} /></button>
                                </div> */}
                        {/* Controls moved to sidebar per request - header left intentionally minimal */}
                        {/* </div> */}
                    </div>

                    {/* Mobile tab nav (visible on small screens) */}
                    <div className="md:hidden mb-4">
                        <div className="overflow-x-auto">
                            <div className="flex gap-2 px-1">
                                {[
                                    { key: 'analytics', label: 'Overview' },
                                    { key: 'users', label: 'Users' },
                                    { key: 'global_activity', label: 'Activity' },
                                    { key: 'inventory', label: 'Inventory' },
                                    { key: 'verifications', label: 'Verify' },
                                    { key: 'financials', label: 'Financials' },
                                    { key: 'settings', label: 'Settings' }
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key as any)}
                                        className={`whitespace-nowrap px-3 py-2 rounded text-xs ${activeTab === tab.key ? 'bg-golden-orange text-espresso font-bold' : 'bg-black/20 text-cream/80 hover:bg-white/5'}`}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* ESV / EXPORT DATA SECTION */}
                    <div className="mb-8 p-6 bg-white/5 border border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h3 className="text-cream font-bold mb-1 flex items-center gap-2"><Download size={16} /> Data Export (ESV)</h3>
                            <p className="text-xs text-cream/50">Export system data for external analysis.</p>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => handleExportData('users')} className="bg-white/5 hover:bg-golden-orange hover:text-espresso border border-white/10 text-cream px-4 py-2 text-xs uppercase font-bold transition-all rounded-sm">Export Users</button>
                            <button onClick={() => handleExportData('products')} className="bg-white/5 hover:bg-golden-orange hover:text-espresso border border-white/10 text-cream px-4 py-2 text-xs uppercase font-bold transition-all rounded-sm">Export Inventory</button>
                            <button onClick={() => handleExportData('transactions')} className="bg-white/5 hover:bg-golden-orange hover:text-espresso border border-white/10 text-cream px-4 py-2 text-xs uppercase font-bold transition-all rounded-sm">Export Financials</button>
                        </div>
                    </div>

                    {/* 1. USER MANAGEMENT TAB */}
                    {activeTab === 'users' && (
                        <div className="animate-fade-in">
                            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                                <h2 className="font-serif text-2xl text-cream">User Management</h2>
                                <div className="flex gap-2 items-center flex-wrap">
                                    <div className="bg-black/20 p-1 rounded border border-white/10 flex">
                                        <button onClick={() => setUserFilter('All')} className={`px-3 py-1 text-xs uppercase rounded ${userFilter === 'All' ? 'bg-golden-orange text-espresso font-bold' : 'text-cream/50'}`}>All</button>
                                        <button onClick={() => setUserFilter('User')} className={`px-3 py-1 text-xs uppercase rounded ${userFilter === 'User' ? 'bg-golden-orange text-espresso font-bold' : 'text-cream/50'}`}>Users</button>
                                        <button onClick={() => setUserFilter('Partner')} className={`px-3 py-1 text-xs uppercase rounded ${userFilter === 'Partner' ? 'bg-golden-orange text-espresso font-bold' : 'text-cream/50'}`}>Partners</button>
                                    </div>
                                </div>
                            </div>

                            <AdminUsers users={adminDataLoaded ? adminUsers.filter(user => userFilter === 'All' || user.role === userFilter) : filteredUsers} />
                        </div>
                    )}

                    {activeTab === 'global_activity' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="font-serif text-2xl text-cream mb-6">Global Rental Activity</h3>
                            {orders.length === 0 ? <p className="text-cream/50">No active orders.</p> : orders.map(order => (
                                <div key={order.id} className="bg-white/5 p-6 border border-white/10 rounded-sm">
                                    <div className="flex justify-between mb-4 border-b border-white/5 pb-2">
                                        <div>
                                            <span className="font-bold text-cream">Order {order.id}</span>
                                            <span className="text-xs text-cream/50 ml-2">by {order.userName}</span>
                                        </div>
                                        <span className="text-xs text-cream/50">{order.date}</span>
                                    </div>
                                    <div className="space-y-2">
                                        {order.items.map(item => (
                                            <div key={item.id} className="flex justify-between items-center bg-black/20 p-3 rounded-sm">
                                                <div className="flex items-center gap-4">
                                                    <img src={item.product.images[0]} className="w-10 h-10 object-cover rounded-sm" />
                                                    <div>
                                                        <p className="text-sm text-cream font-bold">{item.product.name}</p>
                                                        <p className="text-xs text-cream/50">Owner: {item.product.ownerId}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${item.status === 'Pending Approval' ? 'bg-yellow-500/10 text-yellow-500' : item.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                        {item.status}
                                                    </span>
                                                    {item.status === 'Pending Approval' && (
                                                        <div className="flex gap-2">
                                                            <button onClick={() => {
                                                                if (updateOrderItemStatus) {
                                                                    updateOrderItemStatus(order.id, item.id, 'Accepted');
                                                                    toast('Forced accepted.', 'success');
                                                                }
                                                            }} className="p-1 hover:text-green-400 border border-white/10 rounded" title="Force Accept"><CheckCircle size={14} /></button>

                                                            <button onClick={() => {
                                                                setConfirmPayload({
                                                                    title: 'Force Decline',
                                                                    message: 'Force Decline? This will refund the user.',
                                                                    danger: true,
                                                                    onConfirm: () => {
                                                                        if (updateOrderItemStatus && updateWallet) {
                                                                            updateOrderItemStatus(order.id, item.id, 'Rejected');
                                                                            // Admin refund trigger
                                                                            updateWallet(order.userId, item.price, `Refund: Admin Declined - ${item.product.name}`, 'Credit');
                                                                            toast('Forced declined & user refunded.', 'info');
                                                                        }
                                                                        setConfirmOpen(false);
                                                                    }
                                                                });
                                                                setConfirmOpen(true);
                                                            }} className="p-1 hover:text-red-400 border border-white/10 rounded" title="Force Decline"><XCircle size={14} /></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* OTHER TABS OMITTED FOR BREVITY - logic remains in original dashboard */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Metric Blocks */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <p className="text-cream/50 text-xs">Total Users</p>
                                    <p className="text-3xl font-serif text-cream font-bold">{totalUsers}</p>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <p className="text-cream/50 text-xs">Active Partners</p>
                                    <p className="text-3xl font-serif text-cream font-bold">{activePartners}</p>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <p className="text-cream/50 text-xs">Total Products</p>
                                    <p className="text-3xl font-serif text-cream font-bold">{totalProducts}</p>
                                </div>
                                <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <p className="text-cream/50 text-xs">Total Orders</p>
                                    <p className="text-3xl font-serif text-cream font-bold">{totalOrders}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                <div className="col-span-2 p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <h4 className="text-cream font-bold mb-3">Monthly Revenue (Last 6 months)</h4>
                                    <div className="w-full h-56 flex items-end gap-2">
                                        <svg viewBox={`0 0 ${monthlyRevenue.length * 40} 120`} className="w-full h-full">
                                            {(() => {
                                                const max = Math.max(...monthlyRevenue, 1);
                                                return monthlyRevenue.map((val, idx) => {
                                                    const w = 24;
                                                    const x = idx * 40 + 8;
                                                    const h = Math.round((val / max) * 80) + 10;
                                                    const y = 100 - h;
                                                    return (
                                                        <g key={idx}>
                                                            <rect x={x} y={y} width={w} height={h} rx={4} fill="#e1af4d" />
                                                            <text x={x + w / 2} y={115} fontSize={10} fill="#f7f3ea" textAnchor="middle">{monthLabels[idx].split(' ')[0]}</text>
                                                            <title>{monthLabels[idx]}: ₦{val.toLocaleString()}</title>
                                                        </g>
                                                    );
                                                });
                                            })()}
                                        </svg>
                                    </div>
                                    <p className="text-cream/50 text-xs mt-2">Total revenue: <span className="font-bold">₦{totalRevenue.toLocaleString()}</span></p>
                                </div>

                                <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                    <h4 className="text-cream font-bold mb-3">Product Categories</h4>
                                    <div className="flex items-center gap-4">
                                        <svg viewBox="0 0 120 120" className="w-36 h-36">
                                            {(() => {
                                                if (!categoryEntries || categoryEntries.length === 0) {
                                                    return (
                                                        <>
                                                            <circle cx={60} cy={60} r={50} fill="#1f0c05" />
                                                            <text x={60} y={66} fontSize={10} fill="#f7f3ea" textAnchor="middle">No data</text>
                                                        </>
                                                    );
                                                }

                                                const total = categoryEntries.reduce((s, e) => s + (Number(e[1]) || 0), 0) || 1;
                                                let start = 0;
                                                const colors = ['#e1af4d', '#ebc35b', '#f9edd2', '#854d0e', '#c49a43', '#7c4a1f'];
                                                return categoryEntries.map(([k, v], i) => {
                                                    const portion = (Number(v) || 0) / total;
                                                    const end = start + portion;
                                                    const large = portion > 0.5 ? 1 : 0;
                                                    const startRad = start * Math.PI * 2 - Math.PI / 2;
                                                    const endRad = end * Math.PI * 2 - Math.PI / 2;
                                                    const x1 = 60 + 50 * Math.cos(startRad);
                                                    const y1 = 60 + 50 * Math.sin(startRad);
                                                    const x2 = 60 + 50 * Math.cos(endRad);
                                                    const y2 = 60 + 50 * Math.sin(endRad);
                                                    const d = `M60,60 L ${x1},${y1} A 50 50 0 ${large} 1 ${x2} ${y2} Z`;
                                                    start = end;
                                                    return <path key={k} d={d} fill={colors[i % colors.length]} stroke="#1f0c05" />;
                                                });
                                            })()}
                                        </svg>

                                        <div className="text-cream text-sm">
                                            {categoryEntries.map(([k, v], i) => (
                                                <div key={k} className="flex items-center gap-2 mb-1">
                                                    <span style={{ width: 12, height: 12, background: ['#e1af4d', '#ebc35b', '#f9edd2', '#854d0e', '#c49a43', '#7c4a1f'][i % 6] }} className="inline-block rounded-sm" />
                                                    <span className="text-cream/60">{k}</span>
                                                    <span className="ml-2 font-bold">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                <h4 className="text-cream font-bold mb-3">Top Rented Products</h4>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-cream/60 text-xs">
                                                <th className="pb-2">Product</th>
                                                <th className="pb-2">Rentals</th>
                                                <th className="pb-2">Rental Price</th>
                                                <th className="pb-2">Owner</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {topRented.map(p => (
                                                <tr key={p.id} className="border-t border-white/5">
                                                    <td className="py-2 text-cream">{p.name}</td>
                                                    <td className="py-2 text-cream/60">{p.rentalCount || 0}</td>
                                                    <td className="py-2 text-cream/60">₦{(p.rentalPrice || 0).toLocaleString()}</td>
                                                    <td className="py-2 text-cream/60">{p.ownerId || 'Stylus'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Products Inventory Panel */}
                    {activeTab === 'inventory' && (
                        <div className="space-y-6 animate-fade-in mt-4">
                            <h3 className="font-serif text-2xl text-cream">Partner Inventory</h3>
                            {products.filter(p => typeof p.ownerId === 'number' && p.ownerId > 0 && p.status !== 'Approved').length === 0 ? (
                                <p className="text-cream/50">No partner products pending review.</p>
                            ) : (
                                products.filter(p => typeof p.ownerId === 'number' && p.ownerId > 0 && p.status !== 'Approved').map(p => (
                                    <div key={p.id} className="bg-white/5 p-4 border border-white/10 rounded-sm flex flex-col md:flex-row gap-4">
                                        <div className="w-full md:w-40">
                                            <img src={p.images?.[0] || '/placeholder.png'} className="w-full h-32 object-cover rounded-sm" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="text-cream font-bold">{p.name}</h4>
                                                    <div className="text-cream/60 text-xs">By: {p.ownerId} • Category: {p.category}</div>
                                                </div>
                                                <div className="text-cream/50 text-sm">Status: <span className="font-bold">{p.status || 'Pending'}</span></div>
                                            </div>

                                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                                <div className="p-2 bg-black/20 rounded">
                                                    <p className="text-cream/60 text-xs">Price</p>
                                                    <p className="text-cream font-bold">₦{(p.rentalPrice || 0).toLocaleString()}</p>
                                                </div>
                                                <div className="p-2 bg-black/20 rounded">
                                                    <p className="text-cream/60 text-xs">Description</p>
                                                    <p className="text-cream text-sm line-clamp-3">{p.description || 'No description provided.'}</p>
                                                </div>
                                            </div>

                                            <div className="mt-3 flex gap-2">
                                                <button onClick={async () => {
                                                    try {
                                                        const updated = await adminAPI.updateProduct(p.id, { status: 'Approved' });
                                                        updateProduct(p.id, updated as unknown as Partial<Product>);
                                                        toast('Product approved and published.', 'success');
                                                    } catch (err: any) {
                                                        console.error(err);
                                                        toast('Failed to approve product.', 'error');
                                                    }
                                                }} className="px-2 py-1 rounded bg-green-600 text-cream text-xs">Approve</button>
                                                <button onClick={() => {
                                                    setProductRejectTarget(p);
                                                    setProductRejectField('status');
                                                    setProductRejectReason('Rejected by admin');
                                                    setProductRejectModalOpen(true);
                                                }} className="px-2 py-1 rounded bg-red-600 text-cream text-xs">Reject</button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'rentals' && <div className="p-4 bg-white/5 border border-white/10"><p className="text-center text-cream/50">Rentals Overview (see Inventory & Activity for details)</p></div>}

                    {activeTab === 'financials' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="font-serif text-2xl text-cream">Financial Ledger</h3>
                            <div className="p-4 bg-white/5 border border-white/10 rounded-sm">
                                <div className="flex justify-between items-center mb-4">
                                    <div className="text-cream/60">Showing orders returned by the admin API</div>
                                    <div className="text-cream/50">Total: <span className="font-bold">₦{orders.reduce((sum, order) => sum + Number(order.total || 0), 0).toLocaleString()}</span></div>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr className="text-cream/60 text-xs">
                                                <th className="pb-2">Date</th>
                                                <th className="pb-2">User</th>
                                                <th className="pb-2">Type</th>
                                                <th className="pb-2">Amount</th>
                                                <th className="pb-2">Status</th>
                                                <th className="pb-2">Notes</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {orders.map(order => (
                                                <tr key={order.id} className="border-t border-white/5">
                                                    <td className="py-2 text-cream/60">{order.date}</td>
                                                    <td className="py-2 text-cream">{order.userName}</td>
                                                    <td className="py-2 text-cream/60">Order</td>
                                                    <td className="py-2 text-cream font-bold">₦{Number(order.total || 0).toLocaleString()}</td>
                                                    <td className="py-2 text-cream/60">{order.status}</td>
                                                    <td className="py-2 text-cream/50 text-xs">{order.id}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'verifications' && <AdminVerificationReview />}

                    {activeTab === 'global_activity' && (
                        <div className="space-y-4 animate-fade-in">
                            <h3 className="font-serif text-2xl text-cream mb-6">Global Rental Activity</h3>
                            {orders.length === 0 ? <p className="text-cream/50">No activity available.</p> : (
                                orders.map(order => (
                                    <div key={order.id} className="bg-white/5 p-4 border border-white/10 rounded-sm">{/* existing order rendering */}
                                        <div className="flex justify-between mb-4 border-b border-white/5 pb-2">
                                            <div>
                                                <span className="font-bold text-cream">Order {order.id}</span>
                                                <span className="text-xs text-cream/50 ml-2">by {order.userName}</span>
                                            </div>
                                            <span className="text-xs text-cream/50">{order.date}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {order.items.map(item => (
                                                <div key={item.id} className="flex justify-between items-center bg-black/20 p-3 rounded-sm">
                                                    <div className="flex items-center gap-4">
                                                        <img src={item.product.images[0]} className="w-10 h-10 object-cover rounded-sm" />
                                                        <div>
                                                            <p className="text-sm text-cream font-bold">{item.product.name}</p>
                                                            <p className="text-xs text-cream/50">Owner: {item.product.ownerId}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${item.status === 'Pending Approval' ? 'bg-yellow-500/10 text-yellow-500' : item.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                                            {item.status}
                                                        </span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'settings' && <div className="p-4 bg-white/5 border border-white/10 rounded-sm"><p className="text-cream/50">No admin settings are available.</p></div>}
                    {/* Modals */}
                    {confirmPayload && (
                        <ConfirmModal open={confirmOpen} title={confirmPayload.title} message={confirmPayload.message} danger={confirmPayload.danger} onConfirm={confirmPayload.onConfirm} onCancel={() => setConfirmOpen(false)} />
                    )}

                    <Modal open={rejectModalOpen} title={`Reject user`} onClose={() => setRejectModalOpen(false)} footer={
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setRejectModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
                            <button onClick={async () => {
                                try {
                                    if (rejectTarget) await userAPI.rejectVerification(parseInt(rejectTarget.id), rejectReason);
                                    if (rejectVerification && rejectTarget) rejectVerification(rejectTarget.id, rejectReason);
                                    toast('User rejected and notified.', 'info');
                                    setRejectModalOpen(false);
                                } catch (err: any) {
                                    console.error(err);
                                    toast('Failed to reject verification.', 'error');
                                }
                            }} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                        </div>
                    }>
                        <div>
                            <label className="text-cream/70 text-xs">Reason</label>
                            <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
                        </div>
                    </Modal>

                    <Modal open={suspendModalOpen} title={`Suspend user`} onClose={() => setSuspendModalOpen(false)} footer={
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setSuspendModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
                            <button onClick={async () => {
                                try {
                                    if (suspendTarget) await adminAPI.updateUser(parseInt(suspendTarget.id), { status: 'Suspended', reason: suspendReason });
                                    if (updateUserStatus && suspendTarget) updateUserStatus(suspendTarget.id, 'Suspended', suspendReason);
                                    toast('User suspended.', 'info');
                                    setSuspendModalOpen(false);
                                } catch (err: any) {
                                    console.error(err);
                                    toast('Failed to suspend user.', 'error');
                                }
                            }} className="px-3 py-1 rounded bg-red-600 text-white">Suspend</button>
                        </div>
                    }>
                        <div>
                            <label className="text-cream/70 text-xs">Reason</label>
                            <textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
                        </div>
                    </Modal>

                    <Modal open={productRejectModalOpen} title={`Reject ${productRejectField}`} onClose={() => setProductRejectModalOpen(false)} footer={
                        <div className="flex justify-end gap-2">
                            <button onClick={() => setProductRejectModalOpen(false)} className="px-3 py-1 rounded text-cream/60 hover:text-golden-orange">Cancel</button>
                            <button onClick={async () => {
                                if (!productRejectTarget || !updateProduct) return;
                                const field = productRejectField;
                                const patch = field === 'product'
                                    ? { status: 'Rejected' as const, notes: productRejectReason }
                                    : { status: 'Rejected' as const, notes: productRejectReason };
                                try {
                                    const updated = await adminAPI.updateProduct(productRejectTarget.id, patch);
                                    updateProduct(productRejectTarget.id, updated as unknown as Partial<Product>);
                                    toast('Rejection recorded.', 'info');
                                    setProductRejectModalOpen(false);
                                } catch (error) {
                                    console.error(error);
                                    toast('Failed to record rejection.', 'error');
                                }
                            }} className="px-3 py-1 rounded bg-red-600 text-white">Reject</button>
                        </div>
                    }>
                        <div>
                            <label className="text-cream/70 text-xs">Reason</label>
                            <textarea value={productRejectReason} onChange={e => setProductRejectReason(e.target.value)} className="w-full p-2 rounded bg-black/10 text-cream border border-white/5" />
                        </div>
                    </Modal>

                    <Modal open={!!selectedDoc} title={selectedDoc?.title || 'Document'} onClose={() => setSelectedDoc(null)}>
                        <pre className="text-cream text-xs whitespace-pre-wrap">{selectedDoc?.body}</pre>
                    </Modal>
                </main>
            </div>
        </div>
    );
};

export default AdminDashboard;
