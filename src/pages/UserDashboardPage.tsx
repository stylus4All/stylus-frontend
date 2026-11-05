import React from 'react';
import { AlertCircle, Check, Clock, History, ShieldCheck, ShoppingBag, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../components/Button';
import { Order } from '../context/OrderContext';
import { RegisteredUser } from '../context/AuthContext';
import { Product, Transaction } from '../types';

interface UserDashboardPageProps {
    currentUser: RegisteredUser;
    currentView: string;
    activeOrders: Order[];
    pastOrders: Order[];
    transactions: Transaction[];
    wishlist: Product[];
    onRequestVerification: () => void;
}

export const UserDashboardPage: React.FC<UserDashboardPageProps> = ({
    currentUser,
    currentView,
    activeOrders,
    pastOrders,
    transactions,
    wishlist,
    onRequestVerification,
}) => {
    if (currentView === 'overview') {
        return (
            <div className="pt-2">
                <div className="flex justify-between items-end mb-6"><h3 className="font-serif text-2xl text-cream">Current Overview</h3><span className="text-xs text-cream/50 uppercase tracking-widest">{new Date().toLocaleDateString()}</span></div>
                {currentUser.verificationStatus === 'Verified' && <div className="bg-green-500/10 border border-green-500/30 p-6 mb-8 flex items-start md:items-center gap-4 rounded-sm shadow-lg relative overflow-hidden animate-fade-in"><div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><ShieldCheck size={64} /></div><div className="bg-green-500 text-espresso p-2 rounded-full shrink-0 relative z-10"><Check size={20} /></div><div className="relative z-10"><h4 className="text-green-400 font-bold text-base uppercase tracking-wide mb-1">Account Verified</h4><p className="text-cream/70 text-sm">Your identity has been confirmed. You now have unrestricted access to the Stylus Vault.</p></div></div>}
                {currentUser.verificationStatus === 'Rejected' && <div className="bg-red-500/10 border border-red-500/30 p-6 mb-8 flex items-start gap-4 rounded-sm shadow-lg relative overflow-hidden animate-fade-in"><div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><AlertCircle size={64} /></div><div className="bg-red-500 text-white p-2 rounded-full shrink-0 relative z-10"><X size={20} /></div><div className="relative z-10 w-full"><h4 className="text-red-400 font-bold text-base uppercase tracking-wide mb-1">Verification Rejected</h4><p className="text-cream/70 text-sm mb-3">Admin Note: "{currentUser.adminNotes || 'No specific reason provided'}"</p><button onClick={onRequestVerification} className="bg-red-500 text-white px-4 py-2 text-xs uppercase font-bold rounded-sm hover:bg-red-600 transition-colors">Resubmit Documents</button></div></div>}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-[#1f0c05] border border-white/10 p-6 relative overflow-hidden rounded-sm shadow-md group hover:border-golden-orange/30 transition-colors"><div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><ShoppingBag size={64} /></div><h4 className="text-cream font-bold text-lg mb-1">Active Requests</h4><p className="text-3xl font-serif text-golden-orange">{activeOrders.length}</p><p className="text-xs text-cream/50 mt-2">Items currently in processing or rented.</p></div>
                    <div className="bg-[#1f0c05] border border-white/10 p-6 relative overflow-hidden rounded-sm shadow-md group hover:border-golden-orange/30 transition-colors"><div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform"><History size={64} /></div><h4 className="text-cream font-bold text-lg mb-1">Total History</h4><p className="text-3xl font-serif text-cream">{pastOrders.length}</p><p className="text-xs text-cream/50 mt-2">Completed orders (Returned or Purchased).</p></div>
                </div>
                <h4 className="font-serif text-xl text-cream mb-4 border-b border-white/10 pb-2">Active Engagements</h4>
                {activeOrders.length === 0 ? <p className="text-cream/50 italic py-4">No active rentals or purchases pending.</p> : <div className="grid gap-4">{activeOrders.map(order => <div key={order.id} className="bg-white/5 p-4 border border-white/10 flex flex-col sm:flex-row gap-4 rounded-sm"><div className="flex-1"><div className="flex justify-between mb-2"><span className="text-golden-orange font-bold">Order {order.id}</span><span className="text-xs text-cream/40">{order.date}</span></div><div className="space-y-3">{order.items.map(item => <div key={item.id} className="flex gap-3 bg-black/20 p-2 rounded relative overflow-hidden"><div className={`absolute left-0 top-0 bottom-0 w-1 ${item.status === 'Accepted' || item.status === 'Shipped' ? 'bg-green-500' : item.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500'}`}></div><img src={item.product.images[0]} alt={item.product.name} className="w-12 h-16 object-cover ml-2 rounded-sm" /><div className="flex-grow"><div className="flex justify-between"><p className="text-sm text-cream font-bold">{item.product.name}</p><span className={`text-[10px] uppercase font-bold ${item.status === 'Accepted' || item.status === 'Shipped' ? 'text-green-400' : item.status === 'Rejected' ? 'text-red-400' : 'text-yellow-400'}`}>{item.status}</span></div><p className="text-xs text-golden-orange">{item.type === 'buy' ? 'Purchase' : `Rent (${item.duration} Days)`}</p>{item.type === 'rent' && item.endDate && <p className="text-[10px] text-cream/50 flex items-center gap-1 mt-1"><Clock size={10} /> Return by: {item.endDate}</p>}</div></div>)}</div></div></div>)}</div>}
            </div>
        );
    }

    if (currentView === 'history') {
        return <div><h3 className="font-serif text-2xl text-cream mb-6">Order History</h3>{pastOrders.length === 0 ? <div className="bg-white/5 p-8 text-center rounded-sm"><p className="text-cream/50">No historical data found.</p></div> : <div className="space-y-4">{pastOrders.map(order => <div key={order.id} className="bg-white/5 border border-white/5 rounded-sm p-6 hover:border-golden-orange/30 transition-colors"><div className="flex flex-col md:flex-row justify-between md:items-center mb-4 pb-4 border-b border-white/5 gap-4"><div><span className="text-lg font-bold text-cream">Order {order.id}</span><p className="text-xs text-cream/40">{order.date}</p></div><div className="text-right"><p className="text-2xl font-serif text-golden-orange">${order.total}</p><button className="text-xs text-cream underline hover:text-golden-orange">View Receipt</button></div></div><div className="grid gap-2">{order.items.map(item => <div key={item.id} className="flex items-center gap-4 py-2"><img src={item.product.images[0]} alt={item.product.name} className="w-10 h-10 object-cover rounded bg-white/10" /><div className="flex-grow"><p className="text-sm text-cream">{item.product.name}</p><p className="text-xs text-cream/50">{item.product.brand}</p></div><div className="text-right"><span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${item.type === 'buy' ? 'bg-blue-500/10 text-blue-400' : 'bg-golden-orange/10 text-golden-orange'}`}>{item.type === 'buy' ? 'Purchased' : 'Rented'}</span><p className="text-[10px] mt-1 text-cream/50">{item.status}</p></div><div className="w-20 text-right text-sm text-cream/70">${item.price}</div></div>)}</div></div>)}</div>}</div>;
    }

    if (currentView === 'finances') {
        return <div><h3 className="font-serif text-2xl text-cream mb-6">Transactions</h3><div className="bg-[#1f0c05] border border-white/10 rounded-sm overflow-hidden"><table className="w-full text-left text-sm text-cream/70"><thead className="bg-white/5 uppercase text-xs tracking-wider text-golden-orange"><tr><th className="p-4">Date</th><th className="p-4">Description</th><th className="p-4">Type</th><th className="p-4">Amount</th></tr></thead><tbody className="divide-y divide-white/5">{transactions.map(transaction => <tr key={transaction.id} className="hover:bg-white/5 transition-colors"><td className="p-4 text-xs text-cream/50">{transaction.date}</td><td className="p-4 font-medium text-cream">{transaction.description}</td><td className="p-4"><span className={`flex items-center gap-1 text-xs uppercase font-bold ${transaction.type === 'Credit' ? 'text-green-400' : 'text-red-400'}`}>{transaction.type}</span></td><td className="p-4 font-serif text-cream">${transaction.amount.toLocaleString()}</td></tr>)}{transactions.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-cream/50 italic">No transactions found.</td></tr>}</tbody></table></div></div>;
    }

    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{wishlist.length === 0 ? <p className="text-cream/50">Wishlist is empty.</p> : wishlist.map(product => <div key={product.id} className="bg-white/5 p-4 border border-white/10 rounded-sm"><img src={product.images[0]} alt={product.name} className="w-full h-40 object-cover mb-4 rounded-sm" /><p className="text-cream font-bold truncate">{product.name}</p><p className="text-golden-orange text-sm">${product.rentalPrice} / rent</p><Link to={`/product/${product.id}`}><Button fullWidth variant="secondary" className="mt-4 text-xs">View Details</Button></Link></div>)}</div>;
};
