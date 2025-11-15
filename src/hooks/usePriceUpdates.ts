import { useEffect } from 'react';

export const usePriceUpdates = () => {
  useEffect(() => {
    // Price updates are now handled by a server-side cron job
    // This ensures proper authorization and prevents client-side manipulation
    // The cron job runs every 10 seconds via pg_cron
    
    // No client-side code needed - all price updates are server-driven
    return () => {};
  }, []);
};
