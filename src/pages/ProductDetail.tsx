import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../components/Button';
import { Shield, Clock, Calendar as CalendarIcon, Check, ArrowLeft, Ruler, Star, Truck, AlertTriangle, X, Heart, ShoppingBag, Lock, DollarSign, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Info, ZoomIn, Maximize2 } from 'lucide-react';
import { useProduct } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { getDeliveryEstimate } from '../services/geminiService';

export const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const { products } = useProduct();
    const { addToCart } = useCart();
    const { isInWishlist, toggleWishlist } = useWishlist();
    const { currentUser, isAuthenticated } = useAuth();
    const toast = useToast();

    const product = products.find(p => p.id === id);

    const [selectedDuration, setSelectedDuration] = useState<4 | 8 | 12>(4);
    const [selectedSize, setSelectedSize] = useState<string>('');
    const [activeImageIndex, setActiveImageIndex] = useState(0);
    const [deliveryEstimate, setDeliveryEstimate] = useState<string>('Calculating...');
    const [isLightboxOpen, setIsLightboxOpen] = useState(false);
    const [isImageLoading, setIsImageLoading] = useState(false);

    // Calendar State
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [viewDate, setViewDate] = useState(new Date());

    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [openPolicy, setOpenPolicy] = useState<string | null>('shipping');

    useEffect(() => {
        // Get AI Delivery Estimate
        const fetchDelivery = async () => {
            if (currentUser?.location) {
                const estimate = await getDeliveryEstimate(currentUser.location, "London, UK"); // Mock origin
                setDeliveryEstimate(estimate);
            } else {
                setDeliveryEstimate("2-4 Business Days");
            }
        };
        fetchDelivery();
    }, [currentUser]);

    // Keyboard navigation for lightbox
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (!product) return;
        if (e.key === 'ArrowRight') {
            setActiveImageIndex((prev) => (prev + 1) % product.images.length);
        }
        if (e.key === 'ArrowLeft') {
            setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
        }
        if (isLightboxOpen && e.key === 'Escape') setIsLightboxOpen(false);
    }, [isLightboxOpen, product]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    if (!product) return <div className="text-cream text-center py-20">Product Not Found</div>;

    const isWishlisted = isInWishlist(product.id);
    const currentRentalPrice = selectedDuration === 4 ? product.rentalPrice : selectedDuration === 8 ? Math.round(product.rentalPrice * 1.75) : Math.round(product.rentalPrice * 2.4);
    const isRentable = !product.rentalCount || product.rentalCount < 5;
    const productReviewAverage = product.reviews && product.reviews.length > 0
        ? product.reviews.reduce((acc, r) => acc + (r.rating ?? 0), 0) / product.reviews.length
        : 0;

    // --- Calendar Helpers ---
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const handlePrevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
    const handleNextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));

    const isDateDisabled = (date: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date < today;
    };

    const isDateSelected = (date: Date) => {
        if (!startDate) return false;
        return date.getTime() === startDate.getTime();
    };

    const isDateInRentalRange = (date: Date) => {
        if (!startDate) return false;
        const endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + selectedDuration - 1); // Inclusive
        return date > startDate && date <= endDate;
    };

    const getEndDate = () => {
        if (!startDate) return null;
        const end = new Date(startDate);
        end.setDate(startDate.getDate() + selectedDuration);
        return end;
    };

    const handleDateClick = (day: number) => {
        const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
        if (!isDateDisabled(newDate)) {
            setStartDate(newDate);
        }
    };

    const renderCalendar = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);
        const days = [];

        // Empty cells
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>);
        }

        // Actual days
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            const disabled = isDateDisabled(date);
            const selected = isDateSelected(date);
            const inRange = isDateInRentalRange(date);

            days.push(
                <button
                    key={day}
                    onClick={(e) => { e.preventDefault(); handleDateClick(day); }}
                    disabled={disabled}
                    className={`
                    h-10 w-10 text-xs font-medium rounded-full flex items-center justify-center transition-all relative
                    ${disabled ? 'text-cream/20 cursor-not-allowed' : 'text-cream hover:bg-white/10'}
                    ${selected ? 'bg-golden-orange text-espresso font-bold shadow-[0_0_10px_rgba(225,175,77,0.5)] z-10' : ''}
                    ${inRange ? 'bg-golden-orange/20 text-golden-orange rounded-none' : ''}
                    ${inRange && day === daysInMonth ? 'rounded-r-full' : ''} 
                    ${inRange && day === 1 ? 'rounded-l-full' : ''}
                `}
                >
                    {day}
                </button>
            );
        }

        return days;
    };

    const checkAccess = () => {
        if (!isAuthenticated) {
            navigate('/login', { state: { from: location.pathname } });
            return false;
        }
        if (currentUser?.status === 'Suspended') {
            toast("Account Suspended: You cannot perform transactions.", 'error');
            return false;
        }
        if (currentUser?.verificationStatus !== 'Verified') {
            toast("Action Restricted: Please complete your identity verification in the Dashboard to Rent or Buy.", 'warning');
            return false;
        }
        return true;
    };

    const handleTransaction = (type: 'rent' | 'buy') => {
        if (!checkAccess()) return;
        if (!selectedSize) { toast("Please select a size.", 'error'); return; }
        if (type === 'rent' && (!startDate || !agreedToTerms)) { toast("Please select dates and agree to terms.", 'error'); return; }

        addToCart({
            id: `${product.id}-${Date.now()}`,
            product,
            selectedSize,
            type,
            price: type === 'rent' ? currentRentalPrice : (product.buyPrice || 0),
            duration: type === 'rent' ? selectedDuration : undefined,
            startDate: type === 'rent' && startDate ? startDate.toLocaleDateString() : undefined,
            endDate: type === 'rent' && startDate ? getEndDate()?.toLocaleDateString() : undefined
        });
        toast(`${type === 'rent' ? 'Rental' : 'Purchase'} added to bag.`, 'success');
    };

    const togglePolicy = (policy: string) => {
        setOpenPolicy(openPolicy === policy ? null : policy);
    };

    // Lightbox & Main Gallery Navigation Controls
    const nextImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsImageLoading(true);
        setActiveImageIndex((prev) => (prev + 1) % product.images.length);
    };
    const prevImage = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsImageLoading(true);
        setActiveImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    };

    const handleImageLoad = () => {
        setIsImageLoading(false);
    };

    return (
        <div className="min-h-screen bg-espresso pt-8 pb-20 animate-fade-in relative">

            {/* Full Screen Lightbox Gallery */}
            {isLightboxOpen && (
                <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col justify-center items-center animate-fade-in" onClick={() => setIsLightboxOpen(false)}>
                    <button className="absolute top-6 right-6 text-cream/70 hover:text-white p-2 z-50" onClick={() => setIsLightboxOpen(false)}>
                        <X size={32} />
                    </button>

                    <div className="relative w-full h-[80vh] flex items-center justify-center px-4 sm:px-12">
                        <button onClick={prevImage} className="absolute left-2 sm:left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm z-50">
                            <ChevronLeft size={32} />
                        </button>

                        <img
                            src={product.images[activeImageIndex]}
                            alt={`View ${activeImageIndex + 1}`}
                            className={`max-h-full max-w-full object-contain shadow-2xl transition-opacity duration-300 ${isImageLoading ? 'opacity-50' : 'opacity-100'}`}
                            onLoad={handleImageLoad}
                            onClick={(e) => e.stopPropagation()}
                        />

                        <button onClick={nextImage} className="absolute right-2 sm:right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm z-50">
                            <ChevronRight size={32} />
                        </button>
                    </div>

                    {/* Lightbox Thumbnails */}
                    <div className="mt-6 flex gap-3 overflow-x-auto px-4 w-full justify-center max-w-4xl mx-auto custom-scrollbar" onClick={(e) => e.stopPropagation()}>
                        {product.images.map((img, idx) => (
                            <button
                                key={idx}
                                onClick={() => { setIsImageLoading(true); setActiveImageIndex(idx); }}
                                className={`w-16 h-16 border-2 rounded-sm overflow-hidden transition-all flex-shrink-0 ${activeImageIndex === idx ? 'border-golden-orange opacity-100 scale-110' : 'border-transparent opacity-50 hover:opacity-80'}`}
                            >
                                <img src={img} className="w-full h-full object-cover" alt="" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <Link to="/catalog" className="text-golden-orange mb-8 inline-flex items-center gap-2 hover:text-white transition-colors">&larr; Back to Collection</Link>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                    {/* Image Gallery - Multiple Views */}
                    <div>
                        <div
                            className="mb-4 relative h-[600px] w-full bg-black/20 rounded-sm overflow-hidden group"
                        >
                            <img
                                src={product.images[activeImageIndex] || product.images[0]}
                                className={`w-full h-full object-cover shadow-2xl transition-all duration-700 ${isImageLoading ? 'blur-sm grayscale' : ''}`}
                                alt={product.name}
                                onLoad={handleImageLoad}
                                onClick={() => setIsLightboxOpen(true)}
                            />

                            {/* Hover Navigation for Main Image */}
                            {product.images.length > 1 && (
                                <>
                                    <button
                                        onClick={prevImage}
                                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-md hover:scale-110 z-10"
                                    >
                                        <ChevronLeft size={24} />
                                    </button>
                                    <button
                                        onClick={nextImage}
                                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 backdrop-blur-md hover:scale-110 z-10"
                                    >
                                        <ChevronRight size={24} />
                                    </button>

                                    {/* Indicators */}
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
                                        {product.images.map((_, idx) => (
                                            <div
                                                key={idx}
                                                className={`w-2 h-2 rounded-full transition-all shadow-md ${activeImageIndex === idx ? 'bg-golden-orange scale-125' : 'bg-white/50'}`}
                                            />
                                        ))}
                                    </div>
                                </>
                            )}

                            <div className="absolute inset-x-0 bottom-0 top-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-12 pointer-events-none">
                                <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-full text-white text-xs flex items-center gap-2 border border-white/10 pointer-events-auto cursor-pointer hover:bg-black/80 transition-colors" onClick={() => setIsLightboxOpen(true)}>
                                    <Maximize2 size={12} /> View Full Screen
                                </div>
                            </div>

                            <div className="absolute top-4 right-4 flex gap-2 pointer-events-auto" onClick={e => e.stopPropagation()}>
                                <button onClick={() => toggleWishlist(product)} className={`p-3 rounded-full backdrop-blur-md transition-all ${isWishlisted ? 'bg-golden-orange text-espresso shadow-[0_0_15px_rgba(225,175,77,0.5)]' : 'bg-black/30 text-cream hover:bg-white/20'}`}>
                                    <Heart size={20} className={isWishlisted ? 'fill-current' : ''} />
                                </button>
                            </div>
                        </div>

                        {/* Thumbnail Filmstrip */}
                        {product.images.length > 1 && (
                            <div className="flex gap-3 overflow-x-auto pb-2 custom-scrollbar">
                                {product.images.map((img, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => { setIsImageLoading(true); setActiveImageIndex(idx); }}
                                        className={`relative w-20 h-24 flex-shrink-0 rounded-sm overflow-hidden transition-all duration-300 ${activeImageIndex === idx ? 'ring-2 ring-golden-orange ring-offset-2 ring-offset-espresso opacity-100' : 'opacity-60 hover:opacity-100 grayscale hover:grayscale-0'}`}
                                    >
                                        <img src={img} className="w-full h-full object-cover" alt="" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Product Details & Booking */}
                    <div>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-golden-orange uppercase tracking-widest text-sm font-bold mb-1">{product.brand}</p>
                                <h1 className="font-serif text-4xl text-cream mb-2 leading-tight">{product.name}</h1>
                            </div>
                            {productReviewAverage > 0 && (
                                <div className="flex items-center gap-1 bg-white/5 px-3 py-1 rounded-full border border-white/5">
                                    <Star size={14} className="fill-golden-orange text-golden-orange" />
                                    <span className="text-sm font-bold text-cream">
                                        {productReviewAverage.toFixed(1)}
                                    </span>
                                    <span className="text-xs text-cream/50 underline cursor-pointer ml-1">View Reviews</span>
                                </div>
                            )}
                        </div>

                        {/* Prices */}
                        <div className="flex flex-wrap items-end gap-8 mb-8 border-b border-white/10 pb-6">
                            <div className={`bg-[#2a1208] px-6 py-4 rounded border border-golden-orange/20 relative overflow-hidden ${!isRentable ? 'opacity-50 grayscale' : ''}`}>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-golden-orange/10 rounded-bl-full"></div>
                                <p className="text-xs text-cream/50 uppercase tracking-widest mb-1">Rent from</p>
                                <div className="flex items-baseline gap-1">
                                    <p className="text-3xl font-serif text-cream">₦{product.rentalPrice}</p>
                                    <p className="text-sm text-cream/50">/ 4 Days</p>
                                </div>
                                {!isRentable && <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-xs uppercase font-bold text-red-500">Sell Only</div>}
                            </div>
                            {(product.isForSale || !isRentable) && (
                                <div>
                                    <p className="text-3xl font-serif text-golden-orange">₦{product.buyPrice}</p>
                                    <p className="text-xs text-cream/50 uppercase tracking-widest mt-1">Buy Price</p>
                                </div>
                            )}
                        </div>

                        {/* Main Booking Interface */}
                        <div className="bg-[#1f0c05] p-8 border border-white/10 mb-8 shadow-xl rounded-sm">
                            <div className="mb-6">
                                <div className="flex justify-between items-center mb-3">
                                    <p className="text-xs uppercase text-cream/60 tracking-widest font-bold">Select Size</p>
                                    <button className="text-xs text-golden-orange underline flex items-center gap-1"><Ruler size={12} /> Size Guide</button>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    {product.availableSizes.map(s => (
                                        <button key={s} onClick={() => setSelectedSize(s)} className={`min-w-[50px] px-4 py-3 border transition-all text-sm font-medium rounded-sm ${selectedSize === s ? 'bg-golden-orange text-espresso border-golden-orange font-bold shadow-lg scale-105' : 'border-white/20 text-cream hover:border-white hover:bg-white/5'}`}>{s}</button>
                                    ))}
                                </div>
                            </div>

                            {isRentable ? (
                                <>
                                    {/* CALENDAR & DURATION */}
                                    <div className="mb-6 p-6 bg-black/20 border border-white/5 rounded-sm">
                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-center gap-2">
                                                <CalendarIcon size={16} className="text-golden-orange" />
                                                <span className="text-xs uppercase text-cream/80 tracking-widest font-bold">Availability</span>
                                            </div>

                                            {/* Duration Selector */}
                                            <div className="flex bg-white/5 rounded p-1">
                                                {[4, 8, 12].map(d => (
                                                    <button
                                                        key={d}
                                                        onClick={() => setSelectedDuration(d as any)}
                                                        className={`px-3 py-1 text-[10px] uppercase font-bold rounded transition-colors ${selectedDuration === d ? 'bg-golden-orange text-espresso' : 'text-cream/50 hover:text-white'}`}
                                                    >
                                                        {d} Days
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Calendar UI */}
                                        <div className="mb-4">
                                            <div className="flex justify-between items-center mb-4">
                                                <button onClick={handlePrevMonth} className="text-cream/50 hover:text-golden-orange"><ChevronLeft size={16} /></button>
                                                <span className="text-sm font-serif text-cream font-bold">
                                                    {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                                                </span>
                                                <button onClick={handleNextMonth} className="text-cream/50 hover:text-golden-orange"><ChevronRight size={16} /></button>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center mb-2">
                                                {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
                                                    <span key={d} className="text-[10px] uppercase text-cream/30">{d}</span>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 place-items-center">
                                                {renderCalendar()}
                                            </div>
                                        </div>

                                        {/* Selection Summary */}
                                        <div className="border-t border-white/10 pt-4 flex justify-between items-center">
                                            <div>
                                                <p className="text-[10px] text-cream/40 uppercase mb-1">Check-in</p>
                                                <p className="text-sm text-cream font-bold">{startDate ? startDate.toLocaleDateString() : 'Select Date'}</p>
                                            </div>
                                            <div className="h-8 w-px bg-white/10"></div>
                                            <div>
                                                <p className="text-[10px] text-cream/40 uppercase mb-1">Check-out</p>
                                                <p className="text-sm text-cream font-bold">{startDate ? getEndDate()?.toLocaleDateString() : '-'}</p>
                                            </div>
                                            <div className="h-8 w-px bg-white/10"></div>
                                            <div className="text-right">
                                                <p className="text-[10px] text-cream/40 uppercase mb-1">Total</p>
                                                <p className="text-lg font-serif text-golden-orange font-bold">${currentRentalPrice}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2 mb-6">
                                        <input type="checkbox" checked={agreedToTerms} onChange={e => setAgreedToTerms(e.target.checked)} className="accent-golden-orange w-4 h-4 cursor-pointer" />
                                        <span className="text-xs text-cream/70">I agree to the <span className="underline cursor-pointer hover:text-white">Rental Policy</span> & coverage terms.</span>
                                    </div>
                                </>
                            ) : (
                                <div className="mb-6 p-4 bg-red-900/10 border border-red-500/20 text-center rounded-sm">
                                    <p className="text-red-400 font-bold uppercase text-xs">Rental Limit Reached</p>
                                    <p className="text-cream/60 text-sm mt-1">This item has reached its rental lifecycle limit and is now available for purchase only.</p>
                                </div>
                            )}

                            {/* Action Buttons - Side by Side */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Button
                                    fullWidth
                                    onClick={() => handleTransaction('rent')}
                                    disabled={!isRentable || !isAuthenticated || currentUser?.verificationStatus !== 'Verified'}
                                    className="flex-1 py-4 text-base font-bold tracking-widest shadow-[0_0_20px_rgba(225,175,77,0.2)] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    RENT NOW
                                </Button>
                                {(product.isForSale || !isRentable) && (
                                    <Button
                                        fullWidth
                                        variant="secondary"
                                        onClick={() => handleTransaction('buy')}
                                        disabled={!isAuthenticated || currentUser?.verificationStatus !== 'Verified'}
                                        className="flex-1 py-4 text-base font-bold tracking-widest"
                                    >
                                        BUY NOW (${product.buyPrice})
                                    </Button>
                                )}
                            </div>

                            {(!isAuthenticated || currentUser?.verificationStatus !== 'Verified') && (
                                <div className="mt-6 bg-red-900/10 border border-red-500/20 p-4 flex items-start gap-3 rounded-sm">
                                    <Lock size={16} className="text-red-400 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="text-red-300 text-sm font-bold">Account Verification Required</p>
                                        <p className="text-red-400/70 text-xs mt-1">Complete verification in dashboard to unlock rentals and purchases.</p>
                                        <Link to="/dashboard" className="text-xs text-red-300 underline mt-2 inline-block hover:text-white">Go to Verification</Link>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-6">
                            <div className="border-t border-white/10 pt-6">
                                <h3 className="font-serif text-xl text-cream mb-4">Description</h3>
                                <p className="text-cream/70 leading-relaxed font-light text-sm">{product.description}</p>
                                <div className="mt-4 flex flex-wrap gap-4 text-xs text-cream/60">
                                    <span className="bg-white/5 px-3 py-1 rounded border border-white/5 uppercase tracking-wider">Color: {product.color}</span>
                                    <span className="bg-white/5 px-3 py-1 rounded border border-white/5 uppercase tracking-wider">Occasion: {product.occasion}</span>
                                    <span className="bg-white/5 px-3 py-1 rounded border border-white/5 flex items-center gap-1 uppercase tracking-wider text-green-400"><Shield size={10} /> Verified Authentic</span>
                                </div>
                            </div>

                            {/* Rental Policies Accordion */}
                            <div className="border-t border-white/10 pt-4">
                                <h3 className="text-xs uppercase text-cream/40 font-bold tracking-widest mb-4">Rental Policies & Guarantees</h3>
                                {[
                                    { id: 'shipping', title: `Estimated Delivery: ${deliveryEstimate}`, icon: <Truck size={16} />, content: "We offer secure, insured delivery via premium courier services. Orders placed before 2 PM EST are dispatched the same day. A pre-paid return label is included in the box for your convenience." },
                                    { id: 'cleaning', title: 'Cleaning & Care', icon: <Clock size={16} />, content: "Professional dry cleaning is included in your rental fee. Please do not attempt to clean the item yourself. Simply place the item back in the reusable Stylus garment bag." },
                                    { id: 'insurance', title: 'Damage & Insurance', icon: <Shield size={16} />, content: "Minor wear and tear (e.g., loose threads, missing buttons) is covered. Significant damage or stains may incur a repair fee. Optional full insurance is available at checkout for $15." }
                                ].map((item) => (
                                    <div key={item.id} className="border-b border-white/5">
                                        <button
                                            onClick={() => togglePolicy(item.id)}
                                            className="w-full py-4 flex items-center justify-between text-left hover:text-golden-orange transition-colors"
                                        >
                                            <div className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-cream/80">
                                                {item.icon} {item.title}
                                            </div>
                                            {openPolicy === item.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                        </button>
                                        {openPolicy === item.id && (
                                            <div className="pb-4 pl-7 pr-4 text-sm text-cream/60 leading-relaxed animate-fade-in">
                                                {item.content}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};