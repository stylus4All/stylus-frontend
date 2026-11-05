import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Category, Product, ProductFilter, SortOption } from '../types';
import { Filter, Search, X, Eye, ArrowUpDown, Heart, ShoppingBag, SlidersHorizontal, ChevronDown, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import CustomSelect from '../components/CustomSelect';
import { useToast } from '../components/ToastProvider';
import { useProduct } from '../context/ProductContext';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/Button';
import { getRecommendations } from '../services/geminiService';

export const Catalog: React.FC = () => {
  const { products } = useProduct();
  const { addToSearchHistory, currentUser } = useAuth();
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);
  const [quickViewIndex, setQuickViewIndex] = useState(0);

  // AI Recommendations
  const [aiRecs, setAiRecs] = useState<string>('');
  const toast = useToast();

  // Consolidated Filter State
  const [filters, setFilters] = useState<ProductFilter>({
    category: 'All',
    searchQuery: '',
    color: 'All',
    size: 'All',
    occasion: 'All',
    maxPrice: 1000000,
    sortBy: 'newest'
  });

  useEffect(() => {
    // Reset index when product changes
    setQuickViewIndex(0);
  }, [quickViewProduct]);

  useEffect(() => {
    // Fetch AI recommendations if user has history
    const fetchRecs = async () => {
      if (currentUser?.searchHistory && currentUser.searchHistory.length > 0) {
        const recs = await getRecommendations(currentUser.searchHistory, "Browsing Full Catalog");
        setAiRecs(recs);
      }
    };
    fetchRecs();
  }, [currentUser]);

  // Debounced Search Tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.searchQuery.length > 3) {
        addToSearchHistory(filters.searchQuery);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  const colors = ['All', ...Array.from(new Set(products.map(p => p.color).filter((value): value is string => Boolean(value))))];
  const occasions = ['All', ...Array.from(new Set(products.map(p => p.occasion).filter((value): value is string => Boolean(value))))];
  const sizes = ['All', ...Array.from(new Set(products.flatMap(p => p.availableSizes ?? []).filter((value): value is string => Boolean(value)))).sort()];

  const safeColor = colors.includes(filters.color) ? filters.color : 'All';
  const safeOccasion = occasions.includes(filters.occasion) ? filters.occasion : 'All';
  const safeSize = sizes.includes(filters.size) ? filters.size : 'All';

  const filteredProducts = products.filter(p => {
    const productColor = p.color ?? 'All';
    const productOccasion = p.occasion ?? 'All';
    const productSizes = p.availableSizes ?? [];
    const matchCategory = filters.category === 'All' || p.category === filters.category;
    const matchSearch = (p.name ?? '').toLowerCase().includes((filters.searchQuery ?? '').toLowerCase()) ||
      (p.brand ?? '').toLowerCase().includes((filters.searchQuery ?? '').toLowerCase());
    const matchColor = safeColor === 'All' || productColor === safeColor;
    const matchOccasion = safeOccasion === 'All' || productOccasion === safeOccasion;
    const matchSize = safeSize === 'All' || productSizes.includes(safeSize);
    const matchPrice = (p.rentalPrice ?? 0) <= filters.maxPrice;

    return matchCategory && matchSearch && matchColor && matchOccasion && matchSize && matchPrice;
  }).sort((a, b) => {
    if (filters.sortBy === 'price_asc') {
      return a.rentalPrice - b.rentalPrice;
    } else if (filters.sortBy === 'price_desc') {
      return b.rentalPrice - a.rentalPrice;
    }
    return 0;
  });

  const clearFilters = () => {
    setFilters({
      category: 'All',
      searchQuery: '',
      color: 'All',
      size: 'All',
      occasion: 'All',
      maxPrice: 1000000,
      sortBy: 'newest'
    });
  };

  const updateFilter = (key: keyof ProductFilter, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const nextQuickViewImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quickViewProduct) return;
    const images = quickViewProduct.images ?? [];
    if (!images.length) return;
    setQuickViewIndex((prev) => (prev + 1) % images.length);
  };

  const prevQuickViewImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!quickViewProduct) return;
    const images = quickViewProduct.images ?? [];
    if (!images.length) return;
    setQuickViewIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="min-h-screen bg-espresso pb-20 animate-fade-in">
      {/* Quick View Modal */}
      {quickViewProduct && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in" onClick={() => setQuickViewProduct(null)}>
          <div className="bg-[#1f0c05] border border-golden-orange w-full max-w-4xl rounded-sm relative shadow-[0_0_50px_rgba(0,0,0,0.8)] flex flex-col md:flex-row overflow-hidden" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setQuickViewProduct(null)}
              className="absolute top-4 right-4 text-cream/50 hover:text-golden-orange z-20 p-2 bg-black/20 rounded-full transition-colors"
            >
              <X size={24} />
            </button>
            <div className="w-full md:w-1/2 h-64 md:h-[500px] bg-white/5 relative group">
              <img src={(quickViewProduct.images ?? [])[quickViewIndex] ?? (quickViewProduct.images ?? [])[0]} alt={quickViewProduct.name} className="w-full h-full object-cover" />

              {/* Navigation Arrows for Quick View */}
              {(quickViewProduct.images ?? []).length > 1 && (
                <>
                  <button
                    onClick={prevQuickViewImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextQuickViewImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/30 hover:bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>
                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {(quickViewProduct.images ?? []).map((_, idx) => (
                      <div key={idx} className={`w-1.5 h-1.5 rounded-full transition-all ${quickViewIndex === idx ? 'bg-golden-orange scale-125' : 'bg-white/50'}`} />
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="p-8 w-full md:w-1/2 flex flex-col justify-center bg-[#1f0c05]">
              <span className="text-golden-orange text-xs uppercase tracking-widest mb-2 font-bold">{quickViewProduct.brand}</span>
              <h2 className="font-serif text-3xl md:text-4xl text-cream mb-4">{quickViewProduct.name}</h2>
              <p className="text-cream/70 mb-6 leading-relaxed line-clamp-4 font-light">{quickViewProduct.description}</p>

              <div className="flex flex-col gap-6 mb-8 border-t border-white/10 pt-6">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-serif text-3xl text-cream animate-pulse">₦{quickViewProduct.rentalPrice}</p>
                    <p className="text-xs text-cream/40 uppercase tracking-wide">Rental / 4 Days</p>
                  </div>
                  {quickViewProduct.isForSale && (
                    <div className="text-right">
                      <p className="font-serif text-3xl text-golden-orange">₦{quickViewProduct.buyPrice}</p>
                      <p className="text-xs text-cream/40 uppercase tracking-wide">Buy Price</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                  <Link to={`/product/${quickViewProduct.id}`} className="flex-1">
                    <Button fullWidth>Rent Now</Button>
                  </Link>
                  {quickViewProduct.isForSale && (
                    <Link to={`/product/${quickViewProduct.id}`} className="flex-1">
                      <Button fullWidth variant="secondary">Buy Now</Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hero & Prominent Search */}
      <div className="bg-[#1a0a04] pt-12 pb-12 px-4 border-b border-white/5 shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#e1af4d 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <p className="text-golden-orange text-xs uppercase tracking-[0.3em] mb-2 font-bold">The Vault</p>
          <h1 className="font-serif text-4xl md:text-6xl text-cream mb-8">Curated Collection</h1>

          <div className="max-w-3xl mx-auto relative">
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => updateFilter('searchQuery', e.target.value)}
              placeholder="Search designers, styles, or specific items..."
              className="w-full bg-[#1f0c05] border border-golden-orange/50 text-cream pl-14 pr-4 py-5 rounded-sm focus:outline-none focus:border-golden-orange focus:shadow-[0_0_25px_rgba(225,175,77,0.15)] transition-all placeholder:text-cream/30 text-lg"
            />
            <Search className="absolute left-5 top-5 text-golden-orange" size={24} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">

        {/* AI Recommendations */}
        {currentUser && aiRecs && (
          <div className="mb-10 bg-gradient-to-r from-[#1f0c05] to-[#2a1208] border border-golden-orange/30 p-6 rounded-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 text-golden-orange/10"><Sparkles size={80} /></div>
            <h3 className="text-golden-orange font-serif text-xl mb-2 flex items-center gap-2"><Sparkles size={18} /> Curated For You</h3>
            <p className="text-cream/80 italic font-light">{aiRecs}</p>
          </div>
        )}

        {/* Filter Panel */}
        <div className="bg-[#1f0c05] border border-white/10 p-6 mb-10 rounded-sm shadow-xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-golden-orange"></div>
          <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
            <div className="flex items-center gap-2">
              <SlidersHorizontal size={20} className="text-golden-orange" />
              <h3 className="text-sm font-bold uppercase tracking-widest text-cream">Filter & Sort</h3>
            </div>
            <button onClick={clearFilters} className="text-[10px] text-cream/40 hover:text-golden-orange uppercase tracking-widest flex items-center gap-1 transition-colors">
              <X size={12} /> Clear All
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            <div className="w-full">
              <label className="text-[10px] text-cream/50 uppercase tracking-widest mb-2 block font-bold">Category</label>
              <div className="relative">
                <CustomSelect
                  options={['All', ...Object.values(Category)]}
                  value={filters.category}
                  onChange={(v) => updateFilter('category', v)}
                />
              </div>
            </div>
            {/* ... other filters ... */}
            <div className="w-full">
              <label className="text-[10px] text-cream/50 uppercase tracking-widest mb-2 block font-bold">Size</label>
              <div className="relative">
                <CustomSelect
                  options={sizes}
                  value={safeSize}
                  onChange={(v) => updateFilter('size', v)}
                />
              </div>
            </div>

            <div className="w-full">
              <label className="text-[10px] text-cream/50 uppercase tracking-widest mb-2 block font-bold">Color</label>
              <div className="relative">
                <CustomSelect
                  options={colors}
                  value={safeColor}
                  onChange={(v) => updateFilter('color', v)}
                />
              </div>
            </div>

            <div className="w-full">
              <label className="text-[10px] text-cream/50 uppercase tracking-widest mb-2 block font-bold">Occasion</label>
              <div className="relative">
                <CustomSelect
                  options={occasions}
                  value={safeOccasion}
                  onChange={(v) => updateFilter('occasion', v)}
                />
              </div>
            </div>

            <div className="w-full">
              <div className="flex justify-between mb-2">
                <label className="text-[10px] text-cream/50 uppercase tracking-widest font-bold">Max Price</label>
                <span className="text-xs text-golden-orange font-bold">₦{filters.maxPrice}</span>
              </div>
              <input
                type="range" min="50" max="1000000" step="50"
                value={filters.maxPrice}
                onChange={(e) => updateFilter('maxPrice', Number(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-golden-orange"
              />
            </div>
          </div>
        </div>

        {/* Sorting & Count */}
        <div className="mb-8 flex flex-col sm:flex-row justify-between items-center text-cream/60 text-sm gap-4 border-b border-white/5 pb-4">
          <span className="font-serif italic text-cream text-lg">{filteredProducts.length} <span className="text-sm font-sans text-cream/50 not-italic">Items Found</span></span>
          <div className="flex items-center space-x-3">
            <label className="text-[10px] uppercase tracking-widest font-bold">Sort By:</label>
            <div className="relative">
              <CustomSelect
                options={['newest', 'price_asc', 'price_desc']}
                value={filters.sortBy}
                onChange={(v) => updateFilter('sortBy', v as SortOption)}
              />
            </div>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} onQuickView={setQuickViewProduct} />
          ))}
          {filteredProducts.length === 0 && (
            <div className="col-span-full text-center py-20 text-cream/50 bg-white/5 rounded-sm border border-white/5 border-dashed">
              <Search size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-serif text-xl mb-2">No items match your criteria.</p>
              <button onClick={clearFilters} className="text-golden-orange mt-4 underline hover:text-white transition-colors">Clear all filters</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ProductCard: React.FC<{ product: Product; onQuickView: (p: Product) => void }> = ({ product, onQuickView }) => {
  const { isInWishlist, toggleWishlist } = useWishlist();
  const { addToCart } = useCart();
  const toast = useToast();
  const isWishlisted = isInWishlist(product.id);

  const handleQuickAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    addToCart({
      id: `${product.id}-${Date.now()}`,
      product: product,
      selectedSize: product.availableSizes?.[0] || 'One Size',
      duration: 4,
      price: product.rentalPrice,
      startDate: new Date().toLocaleDateString(),
      endDate: new Date(Date.now() + 4 * 86400000).toLocaleDateString(),
      type: 'rent'
    });
    toast("Added to bag!", 'success');
  };

  return (
    <div className="group relative flex flex-col h-full hover:-translate-y-2 transition-transform duration-500">
      <div className="relative h-[450px] w-full overflow-hidden bg-cream/5 mb-4 shadow-xl">
        <img
          src={product.images?.[0] ?? ''}
          alt={product.name}
          className="h-full w-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
        />
        {product.images?.[1] && (
          <img src={product.images[1]} alt={product.name} className="absolute inset-0 h-full w-full object-cover object-center opacity-0 group-hover:opacity-100 transition-opacity duration-700 ease-in-out" />
        )}

        {/* Hover Actions */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2 translate-x-12 group-hover:translate-x-0 transition-transform duration-300">
          <button onClick={handleQuickAdd} className="p-3 rounded-full bg-espresso/80 text-cream hover:bg-golden-orange hover:text-espresso transition-all shadow-lg border border-white/10" title="Quick Add">
            <ShoppingBag size={18} />
          </button>
          <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(product) }} className="p-3 rounded-full bg-espresso/80 text-cream hover:bg-white hover:text-red-500 transition-all shadow-lg border border-white/10" title="Wishlist">
            <Heart size={18} className={isWishlisted ? "fill-red-500 text-red-500" : ""} />
          </button>
        </div>

        <div className="absolute bottom-6 left-6 right-6 translate-y-8 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 delay-100 flex flex-col gap-3">
          <Link to={`/product/${product.id}`}>
            <Button fullWidth variant="primary" className="shadow-2xl border-none font-bold tracking-widest">Rent Now</Button>
          </Link>
          <button onClick={(e) => { e.preventDefault(); onQuickView(product); }} className="w-full bg-black/40 backdrop-blur-md text-white border border-white/30 py-3 uppercase tracking-widest text-xs font-bold hover:bg-white hover:text-espresso transition-all duration-300 flex items-center justify-center gap-2">
            <Eye size={14} /> Quick View
          </button>
        </div>
      </div>

      <div className="flex justify-between items-start flex-grow px-1">
        <div>
          <p className="text-golden-orange text-[10px] uppercase tracking-widest mb-1 font-bold">{product.brand}</p>
          <h3 className="font-serif text-xl text-cream mb-1 group-hover:text-golden-light transition-colors">{product.name}</h3>
        </div>
      </div>
      <div className="flex items-baseline justify-between mt-2 pt-3 border-t border-white/5 px-1">
        <span className="text-cream font-medium font-serif text-lg">₦{product.rentalPrice} <span className="text-xs text-cream/50 font-sans font-light">/ 4 days</span></span>
        {product.rentalCount && product.rentalCount >= 5 && <span className="text-[10px] text-red-400 border border-red-500/50 px-2 py-0.5 rounded uppercase font-bold">Sell Only</span>}
      </div>
    </div>
  );
};