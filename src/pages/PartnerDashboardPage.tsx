import React, { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, Banknote, Ban, Clock, History, ShieldCheck, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '../components/Button';
import { ProductForm } from '../components/ProductForm';
import { Order, OrderItem } from '../context/OrderContext';
import { RegisteredUser } from '../context/AuthContext';
import { Product, Transaction } from '../types';

interface PartnerDashboardPageProps {
    currentUser: RegisteredUser;
    currentView: string;
    listings: Product[];
    orders: Order[];
    transactions: Transaction[];
    onViewChange: (view: string) => void;
    onRequestWithdrawal: () => void;
    onRequestVerification: () => void;
    onRemoveItem: (id: string) => void;
    onAcceptItem: (orderId: string, itemId: string, productId: string, price: number) => void;
    onRejectItem: (orderId: string, itemId: string) => void;
    onProductCreated: (product: Product) => void;
    onProductUpdated: (product: Product) => void;
}

const getRentalDuration = (item: OrderItem): number | undefined => {
    const duration = Number(item.duration);
    if (Number.isFinite(duration) && duration > 0) return duration;
    if (!item.startDate || !item.endDate) return undefined;

    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) return undefined;

    const startDay = Date.UTC(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
    const endDay = Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    const days = Math.round((endDay - startDay) / 86400000);
    return days > 0 ? days : undefined;
};

const getOrderItemPrice = (item: OrderItem, rentalDuration?: number): number | undefined => {
    const savedPrice = Number(item.price);
    if (item.price !== null && item.price !== undefined && Number.isFinite(savedPrice)) return savedPrice;

    if (item.type === 'buy') {
        const buyPrice = Number(item.product.buyPrice);
        return Number.isFinite(buyPrice) ? buyPrice : undefined;
    }

    const rentalPrice = Number(item.product.rentalPrice);
    if (!Number.isFinite(rentalPrice)) return undefined;
    if (rentalDuration === 8) return Math.round(rentalPrice * 1.75);
    if (rentalDuration === 12) return Math.round(rentalPrice * 2.4);
    return rentalPrice;
};

export const PartnerDashboardPage: React.FC<PartnerDashboardPageProps> = ({
    currentUser,
    currentView,
    listings,
    orders,
    transactions,
    onViewChange,
    onRequestWithdrawal,
    onRequestVerification,
    onRemoveItem,
    onAcceptItem,
    onRejectItem,
    onProductCreated,
    onProductUpdated,
}) => {
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const partnerOrders = orders.filter(order => order.items.some(item => item.product.ownerId === Number(currentUser.id)));

    if (currentView === 'overview') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div className="bg-white/5 p-6 border border-white/10">
                    <h3 className="text-cream/50 uppercase text-xs">Total Earnings</h3>
                    <p className="text-3xl text-golden-orange font-serif">₦{currentUser.walletBalance}</p>
                </div>
                <div className="bg-white/5 p-6 border border-white/10">
                    <h3 className="text-cream/50 uppercase text-xs">Active Listings</h3>
                    <p className="text-3xl text-cream font-serif">{listings.length}</p>
                </div>
                <div className="bg-white/5 p-6 border border-white/10">
                    <h3 className="text-cream/50 uppercase text-xs">Verification</h3>
                    <p className={`text-xl font-serif ${currentUser.verificationStatus === 'Verified' ? 'text-green-400' : 'text-red-400'}`}>{currentUser.verificationStatus}</p>
                </div>
            </div>
        );
    }

    if (currentView === 'finances') {
        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-serif text-2xl text-cream">Financial History</h3>
                    <Button onClick={onRequestWithdrawal} variant="secondary" className="text-xs">
                        <Banknote size={16} className="mr-2" /> Withdraw Funds
                    </Button>
                </div>
                <div className="bg-[#1f0c05] border border-white/10 rounded-sm overflow-hidden">
                    <table className="w-full text-left text-sm text-cream/70">
                        <thead className="bg-white/5 uppercase text-xs tracking-wider text-golden-orange">
                            <tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Type</th><th className="p-4">Amount</th><th className="p-4">Status</th></tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {transactions.map(transaction => (
                                <tr key={transaction.id} className="hover:bg-white/5 transition-colors">
                                    <td className="p-4 text-xs text-cream/50">{transaction.date}</td>
                                    <td className="p-4 font-medium text-cream">{transaction.description}</td>
                                    <td className="p-4">
                                        <span className={`flex items-center gap-1 text-xs uppercase font-bold ${transaction.type === 'Credit' ? 'text-green-400' : transaction.type === 'Debit' ? 'text-red-400' : transaction.type === 'Withdrawal' ? 'text-blue-400' : 'text-yellow-500'}`}>
                                            {transaction.type === 'Credit' && <ArrowDownLeft size={12} />}
                                            {transaction.type === 'Withdrawal' && <ArrowUpRight size={12} />}
                                            {transaction.type}
                                        </span>
                                    </td>
                                    <td className="p-4 font-serif text-cream">₦{transaction.amount.toLocaleString()}</td>
                                    <td className="p-4"><span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${transaction.status === 'Completed' ? 'bg-green-500/10 text-green-400' : transaction.status === 'Pending' ? 'bg-yellow-500/10 text-yellow-500' : 'bg-red-500/10 text-red-400'}`}>{transaction.status}</span></td>
                                </tr>
                            ))}
                            {transactions.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-cream/50 italic">No transactions found.</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    }

    if (currentView === 'add-item') {
        return currentUser.verificationStatus !== 'Verified' ? (
            <div className="bg-red-500/10 border border-red-500/50 p-4 text-red-400 flex items-center gap-3">
                <Ban /> <span>You must complete business verification to list items.</span>
                <button onClick={onRequestVerification} className="underline font-bold">Verify Now</button>
            </div>
        ) : <ProductForm onSuccess={product => { onProductCreated(product); onViewChange('listings'); }} />;
    }

    if (currentView === 'listings') {
        if (editingProduct) {
            return (
                <ProductForm
                    product={editingProduct}
                    onCancel={() => setEditingProduct(null)}
                    onSuccess={updatedProduct => {
                        onProductUpdated(updatedProduct);
                        setEditingProduct(null);
                    }}
                />
            );
        }

        return (
            <div className="space-y-4">
                <h3 className="font-serif text-2xl text-cream mb-6">My Inventory</h3>
                {listings.length === 0 ? <p className="text-cream/50">No items listed.</p> : listings.map(item => (
                    <div key={item.id} className="bg-white/5 p-4 flex gap-4 border border-white/10 rounded-sm">
                        <img src={item.images[0]} alt={item.name} className="w-24 h-32 object-cover rounded-sm" />
                        <div className="flex-grow">
                            <h4 className="text-cream font-bold text-lg">{item.name}</h4>
                            <div className="flex flex-wrap gap-4 text-sm text-cream/70 mt-1"><span>Rent: ₦{item.rentalPrice}</span>{item.isForSale && <span>Buy: ₦{item.buyPrice}</span>}</div>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-xs text-cream/50 bg-black/20 px-2 py-1 rounded">Rentals: {item.rentalCount || 0}/5</span>
                                {item.rentalCount >= 5 && <span className="text-xs text-red-400 bg-red-900/10 px-2 py-1 rounded border border-red-500/30">Max Rentals Reached - Sell Only</span>}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setEditingProduct(item)} className="text-xs border border-white/20 px-3 py-1 text-cream hover:border-golden-orange rounded-sm">Edit</button>
                                <button onClick={() => onRemoveItem(item.id)} className="text-xs border border-red-500/20 px-3 py-1 text-red-400 hover:bg-red-500/10 flex items-center gap-1 rounded-sm"><Trash2 size={12} /> Remove</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <h3 className="font-serif text-2xl text-cream mb-6">Incoming Requests</h3>
            {partnerOrders.length === 0 ? <p className="text-cream/50">No requests yet.</p> : partnerOrders.map(order => {
                const items = order.items.filter(item => item.product.ownerId === Number(currentUser.id));
                if (items.length === 0) return null;
                return (
                    <div key={order.id} className="bg-white/5 p-6 border border-white/10 mb-6 rounded-sm">
                        <div className="flex justify-between items-start mb-4 border-b border-white/5 pb-2">
                            <div><p className="text-xs text-cream/40 uppercase">Order ID: {order.id}</p><p className="text-cream font-bold">Renter: {order.userName}</p></div>
                            <span className="text-xs text-cream/50">{order.date}</span>
                        </div>
                        {items.map(item => {
                            const rentalDuration = item.type === 'rent' ? getRentalDuration(item) : undefined;
                            const itemPrice = getOrderItemPrice(item, rentalDuration);
                            return (
                                <div key={item.id} className="flex flex-col md:flex-row gap-4 mb-4 bg-black/20 p-4 border border-white/5 rounded-sm">
                                    <img src={item.product.images[0]} alt={item.product.name} className="w-20 h-24 shrink-0 object-contain bg-black/20 rounded-sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="text-cream font-bold">{item.product.name}</p>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-cream/60 mt-1"><span>Size: {item.selectedSize}</span><span>Type: <span className="text-golden-orange uppercase">{item.type}</span></span>{rentalDuration && <span>Duration: {rentalDuration} Days</span>}</div>
                                        <p className="text-lg font-serif text-golden-orange mt-2">₦{itemPrice?.toLocaleString() ?? '—'}</p>
                                    </div>
                                    <div className="flex flex-col items-end justify-center md:min-w-[150px]">
                                        <div className="mb-2"><span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${item.status === 'Pending Approval' ? 'bg-yellow-500/10 text-yellow-500' : item.status === 'Accepted' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{item.status}</span></div>
                                        {item.status === 'Pending Approval' && <div className="flex flex-wrap justify-end gap-2"><button onClick={() => onAcceptItem(order.id, item.id, item.product.id, itemPrice ?? 0)} className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 text-xs rounded transition-colors">Accept &amp; Credit</button><button onClick={() => onRejectItem(order.id, item.id)} className="bg-red-600 hover:bg-red-500 text-white px-3 py-1 text-xs rounded transition-colors">Decline</button></div>}
                                        {item.type === 'rent' && item.endDate && <p className="text-[10px] text-cream/50 flex items-center gap-1 mt-2"><Clock size={10} /> Return by: {item.endDate}</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                );
            })}
        </div>
    );
};
