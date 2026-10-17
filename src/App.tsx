import React, { useState, useEffect } from 'react';
import { CameraScanner } from './components/CameraScanner';
import { VaultPage } from './pages/VaultPage';

export default function App() {
  // Detect current route from pathname or query param
  const getIsVaultRoute = () => {
    const path = window.location.pathname.toLowerCase();
    const search = window.location.search.toLowerCase();
    return (
      path.includes('/vault') ||
      path.includes('/storage') ||
      path.includes('/admin') ||
      search.includes('vault=') ||
      search.includes('storage=') ||
      search.includes('admin=')
    );
  };

  const [currentView, setCurrentView] = useState<'scanner' | 'vault'>(() => {
    return getIsVaultRoute() ? 'vault' : 'scanner';
  });

  // Listen to popstate (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getIsVaultRoute() ? 'vault' : 'scanner');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Listen to keyboard shortcut Ctrl+Shift+V for owner quick access anywhere
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        navigateToVault();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const navigateToVault = () => {
    window.history.pushState(null, '', '/vault');
    setCurrentView('vault');
  };

  const navigateToScanner = () => {
    window.history.pushState(null, '', '/');
    setCurrentView('scanner');
  };

  if (currentView === 'vault') {
    return <VaultPage onGoToScanner={navigateToScanner} />;
  }

  // The visitor only sees this clean scanner web with NO vault button
  return (
    <div className="w-full h-screen bg-black text-white overflow-hidden flex flex-col font-sans">
      <CameraScanner
        onOpenVault={navigateToVault}
        vaultCount={0}
      />
    </div>
  );
}
