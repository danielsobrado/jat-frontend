import React, { useMemo } from 'react';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { useLocation, Link } from 'react-router-dom';

/**
 * Map of paths to their display names
 */
const PATH_LABELS: Record<string, string> = {
  '/': 'Home',
  '/test': 'Test',
  '/batch': 'Batch',
  '/history': 'History',
  '/settings': 'Settings'
};

/**
 * Breadcrumb component that shows the current location in the application
 */
const Breadcrumb: React.FC = () => {
  const location = useLocation();

  const breadcrumbItems = useMemo(() => {
    // Split the path into segments
    const pathSegments = location.pathname.split('/').filter(Boolean);
    
    // Start with home
    const items = [{
      title: <Link to="/">Home</Link>,
    }];

    // Build up the path progressively
    let currentPath = '';
    pathSegments.forEach(segment => {
      currentPath += `/${segment}`;
      const label = PATH_LABELS[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1);
      
      items.push({
        title: currentPath === location.pathname ? 
          <span>{label}</span> : 
          <Link to={currentPath}>{label}</Link>,
      });
    });

    return items;
  }, [location.pathname]);

  return (
    <AntBreadcrumb 
      className="px-4 py-2 bg-white shadow-sm"
      items={breadcrumbItems}
    />
  );
};

export default Breadcrumb;