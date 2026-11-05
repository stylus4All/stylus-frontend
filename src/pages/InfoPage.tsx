import React, { useState } from 'react';
import { ShieldCheck, FileText, Sparkles, Lock, ShoppingBag, Trash2, ArrowRight, Wallet, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../components/Button';
import { useCart } from '../context/CartContext';
import { useOrders } from '../context/OrderContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import ConfirmModal from '../components/ConfirmModal';
import Modal from '../components/Modal';

interface InfoPageProps {
  type: 'privacy' | 'terms' | 'authenticity' | 'edit' | 'bag';
}

export const InfoPage: React.FC<InfoPageProps> = ({ type }) => {
  const { cart, removeFromCart, cartTotal, clearCart } = useCart();
  const { addOrder } = useOrders();
  const { currentUser, updateWallet, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmPayload, setConfirmPayload] = useState<any | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);

  const handleCheckout = () => {
    if (!isAuthenticated || !currentUser) {
      navigate('/login', { state: { from: { pathname: '/bag' } } });
      return;
    }

    if (currentUser.status === 'Suspended') {
      toast("Transaction Declined: Your account is currently suspended.", 'error');
      return;
    }

    if (currentUser.walletBalance < cartTotal) {
      setConfirmPayload({
        title: 'Insufficient Funds',
        message: `Insufficient funds in your wallet (₦${currentUser.walletBalance.toFixed(2)}). Total needed: ₦${cartTotal.toFixed(2)}.\n\nGo to your dashboard to fund your wallet?`,
        onConfirm: () => { navigate('/dashboard'); setConfirmOpen(false); }
      });
      setConfirmOpen(true);
      return;
    }

    setConfirmPayload({
      title: 'Confirm Payment',
      message: `Confirm payment of ₦${cartTotal.toFixed(2)} from your wallet?`,
      onConfirm: async () => {
        if (isProcessingCheckout) return;
        setIsProcessingCheckout(true);
        let paymentCompleted = false;
        try {
          await updateWallet(currentUser.id, -cartTotal, `Order payment (${cart.length} item${cart.length === 1 ? '' : 's'})`, 'Debit');
          paymentCompleted = true;
          await addOrder(cart, cartTotal, currentUser.id, currentUser.name);
          toast("Payment processed. Your order has been sent to the partner for approval.", 'success');
          clearCart();
          navigate('/dashboard');
          setConfirmOpen(false);
        } catch (error) {
          if (paymentCompleted) {
            try {
              await updateWallet(currentUser.id, cartTotal, 'Refund: Order could not be submitted', 'Credit');
            } catch (refundError) {
              console.error('Failed to refund checkout payment.', refundError);
            }
          }
          toast(error instanceof Error ? error.message : 'Checkout failed. Please try again.', 'error');
        } finally {
          setIsProcessingCheckout(false);
        }
      }
    });
    setConfirmOpen(true);
  };

  // Content definitions...
  const content = {
    privacy: {
      title: 'Privacy Policy',
      icon: <Lock className="w-12 h-12 text-golden-orange mb-6" />,
      text: (
        <>
          <p className="mb-6">At Stylus, we believe privacy is the ultimate luxury. We are committed to protecting your personal information with the same rigor we apply to authentication.</p>
          <h3 className="text-xl font-serif text-cream mb-4">1. Information Collection</h3>
          <p className="mb-6">We collect only the necessary data to facilitate your premium rental experience, including identity verification documents and secure payment tokens.</p>
          <h3 className="text-xl font-serif text-cream mb-4">2. Data Security</h3>
          <p className="mb-6">Your data is encrypted using banking-grade security protocols. We never sell your personal information to third parties.</p>
        </>
      )
    },
    terms: {
      title: 'Terms of Service',
      icon: <FileText className="w-12 h-12 text-golden-orange mb-6" />,
      text: (
        <>
          <p className="mb-6">Welcome to the Stylus inner circle. By accessing our platform, you agree to uphold the standards of our community.</p>
          <h3 className="text-xl font-serif text-cream mb-4">1. Rental Agreement</h3>
          <p className="mb-6">All items remain the property of Stylus or our partners. You agree to return items in the condition they were received, accounting for minor wear and tear.</p>
          <h3 className="text-xl font-serif text-cream mb-4">2. Late Fees</h3>
          <p className="mb-6">To ensure availability for all members, late returns incur a daily fee equivalent to 20% of the rental price.</p>
        </>
      )
    },
    authenticity: {
      title: 'Authenticity Guarantee',
      icon: <ShieldCheck className="w-12 h-12 text-golden-orange mb-6" />,
      text: (
        <>
          <p className="mb-6">True luxury allows for no compromises. Every item in the Stylus collection undergoes a rigorous multi-point inspection process.</p>
          <h3 className="text-xl font-serif text-cream mb-4">The Verification Process</h3>
          <p className="mb-6">Our expert authenticators verify provenance, materials, stitching, and hardware. We also utilize AI-driven analysis to compare items against a global database of luxury goods.</p>
          <p className="mb-6">We guarantee the authenticity of every item, or 100% of your money back plus a complimentary month of Diamond membership.</p>
        </>
      )
    },
    edit: {
      title: 'The Edit',
      icon: <Sparkles className="w-12 h-12 text-golden-orange mb-6" />,
      text: (
        <>
          <p className="text-xl text-golden-orange font-serif italic mb-8">Curated insights for the modern connoisseur.</p>

          <div className="grid gap-8">
            <div className="bg-white/5 p-8 border-l-2 border-golden-orange">
              <h3 className="text-2xl font-serif text-cream mb-2">Trend Report: Velvet Revival</h3>
              <p className="text-cream/70 mb-4">Why the fabric of royalty is dominating this season's gala circuit.</p>
              <Link to="/catalog" className="text-xs uppercase tracking-widest text-golden-orange hover:text-white">Shop Velvet &rarr;</Link>
            </div>

            <div className="bg-white/5 p-8 border-l-2 border-golden-orange">
              <h3 className="text-2xl font-serif text-cream mb-2">Styling Guide: Black Tie Optional</h3>
              <p className="text-cream/70 mb-4">Navigating the nuances of modern formal wear with effortless sophistication.</p>
              <Link to="/ai-stylist" className="text-xs uppercase tracking-widest text-golden-orange hover:text-white">Ask the Stylist &rarr;</Link>
            </div>
          </div>
        </>
      )
    },
    bag: {
      title: 'Shopping Bag',
      icon: <ShoppingBag className="w-12 h-12 text-golden-orange mb-6" />,
      text: (
        <>
          {cart.length === 0 ? (
            <div className="text-center">
              <p className="mb-6 text-xl font-light">Your shopping bag is currently empty.</p>
              <p className="mb-8 text-cream/60">Explore our curated collection to find your next statement piece.</p>
              <Link to="/catalog">
                <Button>Explore Collection</Button>
              </Link>
            </div>
          ) : (
            <div className="w-full text-left">
              <div className="divide-y divide-white/10 mb-8">
                {cart.map((item) => (
                  <div key={item.id} className="py-6 flex flex-col sm:flex-row gap-6">
                    <div className="w-24 h-32 flex-shrink-0 bg-white/5">
                      <img src={item.product.images[0]} alt={item.product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs text-golden-orange uppercase tracking-wide mb-1">{item.product.brand}</p>
                          <h4 className="font-serif text-xl text-cream">{item.product.name}</h4>
                          <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded ${item.type === 'buy' ? 'bg-blue-500/10 text-blue-400' : 'bg-golden-orange/10 text-golden-orange'}`}>
                            {item.type === 'buy' ? 'Purchasing' : 'Renting'}
                          </span>
                        </div>
                        <p className="font-serif text-lg text-cream">₦{item.price}</p>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-cream/60">
                        <div>
                          <span className="block text-xs uppercase text-cream/40">Size</span>
                          {item.selectedSize}
                        </div>
                        <div>
                          <span className="block text-xs uppercase text-cream/40">Dates</span>
                          {item.startDate ? `${item.startDate} - ${item.endDate} (${item.duration} days)` : 'Standard Shipping'}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="text-xs uppercase text-cream/40 hover:text-red-400 flex items-center transition-colors"
                        >
                          <Trash2 size={14} className="mr-1" /> Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t-2 border-golden-orange pt-6 mb-8">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-serif text-xl text-cream">Subtotal</span>
                  <span className="font-serif text-3xl text-golden-orange">₦{cartTotal}</span>
                </div>

                {isAuthenticated && currentUser && (
                  <div className={`flex justify-between items-center mb-6 p-4 rounded-sm border ${currentUser.walletBalance >= cartTotal ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="flex items-center gap-2">
                      <Wallet size={16} className={currentUser.walletBalance >= cartTotal ? 'text-green-400' : 'text-red-400'} />
                      <span className="text-sm text-cream">Wallet Balance: <span className="font-bold">₦{currentUser.walletBalance.toFixed(2)}</span></span>
                    </div>
                    {currentUser.walletBalance < cartTotal && (
                      <Link to="/dashboard" className="text-xs underline text-golden-orange hover:text-white">Fund Wallet</Link>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  <Button fullWidth onClick={handleCheckout} className="flex justify-center items-center">
                    Secure Checkout <ArrowRight size={16} className="ml-2" />
                  </Button>
                  <Link to="/catalog">
                    <Button fullWidth variant="outline">Continue Shopping</Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </>
      )
    }
  };

  const current = content[type];

  return (
    <div className="min-h-screen bg-espresso pt-20 pb-20 animate-fade-in">
      {confirmPayload && (
        <ConfirmModal open={confirmOpen} title={confirmPayload.title} message={confirmPayload.message} danger={confirmPayload.danger} onConfirm={confirmPayload.onConfirm} onCancel={() => setConfirmOpen(false)} />
      )}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="flex justify-center">
          {current.icon}
        </div>
        <h1 className="font-serif text-5xl text-cream mb-12">{current.title}</h1>

        <div className=" bg-[#1f0c05] p-10 border border-white/5 shadow-2xl rounded-sm flex flex-col items-center text-center">
          <div className="text-cream/80 leading-relaxed text-lg font-light w-full">
            {current.text}
          </div>
        </div>

        {type !== 'bag' && (
          <div className="mt-12">
            <Link to="/">
              <Button variant="outline">Return Home</Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};