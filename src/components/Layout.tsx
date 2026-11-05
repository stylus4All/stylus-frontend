import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ShoppingBag, User, Menu, X, Diamond, Instagram, Twitter, Facebook, Mail, MapPin, Phone, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, isAdmin, logout, registeredUsers = [] } = useAuth();
  const { cartCount } = useCart();

  const isActive = (path: string) => location.pathname === path ? "text-golden-orange border-b border-golden-orange" : "text-cream hover:text-golden-orange transition-colors";

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const handleLogout = () => {
    logout();
    closeMobileMenu();
    navigate('/login');
  };

  // Calculate pending verifications for the notification badge
  const pendingVerificationsCount = isAdmin ? registeredUsers.filter(u => u.verificationStatus === 'Pending').length : 0;

  return (
    <div className="min-h-screen flex flex-col font-sans text-cream bg-espresso selection:bg-golden-orange selection:text-espresso">

      {/* Navigation */}
      <nav className="fixed w-full z-50 bg-espresso/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">

            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <Diamond className="h-8 w-8 text-golden-orange group-hover:rotate-45 transition-transform duration-500" />
              <span className="font-serif text-3xl font-bold tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-golden-orange to-golden-light">
                STYLUS
              </span>
            </Link>

            {/* Desktop Links (Main Navigation) */}
            <div className="hidden md:flex space-x-12 items-center">
              <Link to="/" className={`font-serif uppercase tracking-wider text-xs ${isActive('/')}`}>Home</Link>
              <Link to="/about" className={`font-serif uppercase tracking-wider text-xs ${isActive('/about')}`}>About Us</Link>
              <Link to="/contact" className={`font-serif uppercase tracking-wider text-xs ${isActive('/contact')}`}>Contact</Link>
              <Link to="/catalog" className={`font-serif uppercase tracking-wider text-xs ${isActive('/catalog')}`}>Collection</Link>

              {/* Admin link intentionally left unprotected for now (visible to all) per request */}
              {/* <Link to="/admin" className={`font-serif uppercase tracking-wider text-xs relative ${isActive('/admin')}`}>
                Admin Dashboard
                {pendingVerificationsCount > 0 && (
                  <span className="absolute -top-2 -right-3 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full animate-pulse">
                    {pendingVerificationsCount}
                  </span>
                )}
              </Link> */}
              {/* {isAuthenticated && !isAdmin && (
                <Link to="/dashboard" className={`font-serif uppercase tracking-wider text-xs ${isActive('/dashboard')}`}>My Dashboard</Link>
              )} */}
            </div>

            {/* Icons & Login */}
            <div className="hidden md:flex items-center space-x-6">
              <Link to="/ai-stylist" className="text-cream hover:text-golden-orange transition-colors" title="AI Stylist">
                <span className="text-[10px] uppercase border border-golden-orange px-2 py-1 rounded text-golden-orange hover:bg-golden-orange hover:text-espresso transition-colors">AI Stylist</span>
              </Link>

              <details className="relative group">
                <summary className="cursor-pointer list-none text-xs uppercase tracking-widest text-cream/80 hover:text-golden-orange">Social</summary>
                <div className="absolute right-0 top-8 flex min-w-36 flex-col gap-2 border border-white/10 bg-[#1f0c05] p-3 shadow-xl">
                  <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs uppercase text-cream/70 hover:text-golden-orange"><Instagram size={16} /> Instagram</a>
                  <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs uppercase text-cream/70 hover:text-golden-orange"><Twitter size={16} /> Twitter</a>
                  <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs uppercase text-cream/70 hover:text-golden-orange"><Facebook size={16} /> Facebook</a>
                </div>
              </details>

              <Link to="/bag" className="text-cream hover:text-golden-orange transition-colors relative" title="Shopping Bag">
                <ShoppingBag size={20} />
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-golden-orange text-espresso text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </Link>
              <details className="relative group">
                <summary className="flex cursor-pointer list-none items-center gap-2 text-xs uppercase tracking-widest text-cream/80 hover:text-golden-orange"><User size={18} /> Account</summary>
                <div className="absolute right-0 top-8 flex min-w-36 flex-col gap-2 border border-white/10 bg-[#1f0c05] p-3 shadow-xl">
                  {isAuthenticated ? (
                    <>
                      <Link to="/dashboard" className="flex items-center gap-2 text-xs uppercase text-cream/70 hover:text-golden-orange"><User size={16} /> Dashboard</Link>
                      <button onClick={handleLogout} className="flex items-center gap-2 text-left text-xs uppercase text-cream/70 hover:text-golden-orange"><LogOut size={16} /> Sign Out</button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" className="text-xs uppercase text-cream/70 hover:text-golden-orange">Log In</Link>
                      <Link to="/login" state={{ mode: 'signup' }} className="text-xs uppercase text-golden-orange hover:text-golden-light">Sign Up</Link>
                    </>
                  )}
                </div>
              </details>
            </div>

            {/* WAITLIST BUTTON */}
            <a
              href="#waitlist-form"
              className="hidden items-center space-x-2 border border-golden-orange/50 px-4 py-2 text-golden-orange transition-all hover:bg-golden-orange hover:text-espresso md:flex"
            >
              Join Waitlist
            </a>

            {/* Mobile Menu Button */}
            <div className="md:hidden flex items-center">
              <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-cream hover:text-golden-orange transition-colors">
                {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#1f0c05] border-b border-golden-orange/20 shadow-2xl animate-fade-in">
            <div className="flex flex-col px-6 py-8 space-y-6">
              <Link to="/" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2">Home</Link>
              <Link to="/about" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2">About Us</Link>
              <Link to="/catalog" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2">Collection</Link>
              <Link to="/ai-stylist" onClick={closeMobileMenu} className="text-golden-orange font-serif text-lg border-b border-white/5 pb-2 flex items-center gap-2"><Diamond size={16} /> AI Concierge</Link>
              <Link to="/contact" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2">Contact</Link>

              {/* Mobile Social Links */}
              <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-cream/70 hover:text-golden-orange transition-colors" title="Follow us on Instagram">
                  <Instagram size={20} />
                </a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-cream/70 hover:text-golden-orange transition-colors" title="Follow us on Twitter">
                  <Twitter size={20} />
                </a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-cream/70 hover:text-golden-orange transition-colors" title="Follow us on Facebook">
                  <Facebook size={20} />
                </a>
              </div>

              {isAuthenticated ? (
                <>
                  {!isAdmin && (
                    <Link to="/dashboard" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2">My Dashboard</Link>
                  )}
                  <Link to="/bag" onClick={closeMobileMenu} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2 flex items-center justify-between">
                    Shopping Bag
                    {cartCount > 0 && <span className="bg-golden-orange text-espresso text-xs font-bold px-2 py-0.5 rounded-full">{cartCount}</span>}
                  </Link>
                  <button onClick={handleLogout} className="text-cream hover:text-golden-orange font-serif text-lg border-b border-white/5 pb-2 flex items-center gap-2 w-full text-left">
                    Sign Out <LogOut size={16} />
                  </button>
                </>
              ) : (
                <div className="flex flex-col gap-4 mt-4">
                  <Link to="/login" onClick={closeMobileMenu} className="text-center py-3 border border-white/20 text-cream uppercase tracking-widest text-xs">Log In</Link>
                  <Link to="/login" state={{ mode: 'signup' }} onClick={closeMobileMenu} className="text-center py-3 bg-golden-orange text-espresso font-bold uppercase tracking-widest text-xs">Sign Up</Link>

                </div>
              )}

            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="flex-grow pt-20">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-[#1a0a04] border-t border-white/5 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">

            {/* Brand */}
            <div className="col-span-1 md:col-span-1">
              <Link to="/" className="flex items-center space-x-2 group mb-6">
                <Diamond className="h-6 w-6 text-golden-orange" />
                <span className="font-serif text-2xl font-bold tracking-widest text-cream">STYLUS</span>
              </Link>
              <p className="text-cream/50 text-sm leading-relaxed mb-6">
                Redefining luxury through access, not ownership. Curated for the modern connoisseur.
              </p>
              <div className="flex space-x-4">
                <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="text-cream/60 hover:text-golden-orange transition-colors hover:scale-110 transform duration-300"><Instagram size={20} /></a>
                <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="text-cream/60 hover:text-golden-orange transition-colors hover:scale-110 transform duration-300"><Twitter size={20} /></a>
                <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="text-cream/60 hover:text-golden-orange transition-colors hover:scale-110 transform duration-300"><Facebook size={20} /></a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h4 className="text-golden-orange text-xs uppercase tracking-widest font-bold mb-6">Discover</h4>
              <ul className="space-y-4 text-sm text-cream/70">
                <li><Link to="/catalog" className="hover:text-golden-orange transition-colors">The Collection</Link></li>
                <li><Link to="/ai-stylist" className="hover:text-golden-orange transition-colors">AI Stylus</Link></li>
                <li><Link to="/the-edit" className="hover:text-golden-orange transition-colors">The Edit</Link></li>
                <li><Link to="/about" className="hover:text-golden-orange transition-colors">Our Story</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-golden-orange text-xs uppercase tracking-widest font-bold mb-6">Support</h4>
              <ul className="space-y-4 text-sm text-cream/70">
                <li><Link to="/contact" className="hover:text-golden-orange transition-colors">Contact Us</Link></li>
                <li><Link to="/authenticity" className="hover:text-golden-orange transition-colors">Authenticity Guarantee</Link></li>
                <li><Link to="/terms" className="hover:text-golden-orange transition-colors">Rental Agreement</Link></li>
                <li><Link to="/privacy" className="hover:text-golden-orange transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>

            {/* Contact Mini */}
            <div>
              <h4 className="text-golden-orange text-xs uppercase tracking-widest font-bold mb-6">Contact</h4>
              <ul className="space-y-4 text-sm text-cream/70">
                <li className="flex items-center gap-2"><MapPin size={16} className="text-golden-orange" /> Abuja, Nigeria</li>
                <li className="flex items-center gap-2"><Phone size={16} className="text-golden-orange" /> +234 903 304 4460</li>
                <li className="flex items-center gap-2"><Mail size={16} className="text-golden-orange" /> Stylus@gmail.com</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center text-xs text-cream/30">
            <p>&copy; {new Date().getFullYear()} Stylus Luxury Rentals. All rights reserved.</p>
            <div className="flex space-x-6 mt-4 md:mt-0">
              {!isAdmin && <Link to="/login" className="hover:text-golden-orange transition-colors">Admin Access</Link>}
              <span>Designed with Excellence</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};