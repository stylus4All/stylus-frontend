import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Catalog } from './pages/Catalog';
import { ProductDetail } from './pages/ProductDetail';
import { Dashboard } from './pages/Dashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { AIStylistPage } from './pages/AIStylistPage';
import { InfoPage } from './pages/InfoPage';
import { About } from './pages/About';
import { Contact } from './pages/Contact';
import { Login } from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { ProductProvider } from './context/ProductContext';
import { CartProvider } from './context/CartContext';
import { WishlistProvider } from './context/WishlistContext';
import { OrderProvider } from './context/OrderContext';
import { ProtectedRoute } from './components/ProtectedRoute';




function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <WishlistProvider>
            <OrderProvider>
              <Router>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/about" element={<About />} />
                    {/* <Route path="/admin" element={<AdminDashboard />} /> */}
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/catalog" element={<Catalog />} />
                    
                    {/* Protected Routes */}
                    <Route 
                      path="/product/:id" 
                      element={
                        <ProtectedRoute>
                          <ProductDetail />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/dashboard" 
                      element={
                        <ProtectedRoute>
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    {/* <Route 
                      path="/admin" 
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      } 
                    /> */}
                    
                    <Route path="/ai-stylist" element={<AIStylistPage />} />
                    
                    {/* Footer / Info / Utility Routes */}
                    <Route path="/the-edit" element={<InfoPage type="edit" />} />
                    <Route path="/privacy" element={<InfoPage type="privacy" />} />
                    <Route path="/terms" element={<InfoPage type="terms" />} />
                    <Route path="/authenticity" element={<InfoPage type="authenticity" />} />
                    <Route path="/bag" element={<InfoPage type="bag" />} />
                    
                    <Route
                      path="/admin"
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                    <Route
                      path="/admin/dashboard"
                      element={
                        <ProtectedRoute requireAdmin={true}>
                          <AdminDashboard />
                        </ProtectedRoute>
                      }
                    />
                  </Routes>
                </Layout>
              </Router>
            </OrderProvider>
          </WishlistProvider>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  
  );
}

export default App;