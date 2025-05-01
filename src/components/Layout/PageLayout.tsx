import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import LeftSidebar from '../Sidebar/LeftSidebar.component';

interface PageLayoutProps {
  ragEnabled: boolean;
  onLogout: () => void; // Add logout handler prop
}

const PageLayout: React.FC<PageLayoutProps> = ({ ragEnabled, onLogout }) => {
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  
  // Add debug logging for ragEnabled prop
  useEffect(() => {
    console.log('[PageLayout] ragEnabled prop value:', ragEnabled);
  }, [ragEnabled]);
  
  const handleMouseEnter = () => {
    setSidebarExpanded(true);
  };
  
  const handleMouseLeave = () => {
    setSidebarExpanded(false);
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">CDP Classifier</h1>
      </header>
      
      <div className="app-content">
        <div 
          className="sidebar-wrapper"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          <LeftSidebar 
            isSidebarCollapsed={!sidebarExpanded} 
            onLogout={onLogout} // Pass the logout handler down
            ragEnabled={ragEnabled}
          />
        </div>
        
        <main className={`main-content ${sidebarExpanded ? 'sidebar-expanded' : ''}`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default PageLayout;