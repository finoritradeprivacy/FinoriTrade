import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, Check, Trash2, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface Notification {
  id: string;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  created_at: string;
}

interface AdminNotificationsProps {
  onClose: () => void;
  onRead: () => void;
}

export const AdminNotifications = ({ onClose, onRead }: AdminNotificationsProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_notifications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data?.map(n => ({
        ...n,
        is_read: n.is_read || false
      })) || []);
    } catch (error) {
      console.error('Error fetching admin notifications:', error);
      toast.error('Failed to fetch notifications');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'warning': return 'secondary'; // yellow-500 handled in className usually, or use secondary
      case 'info': return 'default';
      default: return 'outline';
    }
  };

  const handleMarkAsRead = async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true,
          read_by: user.id,
          read_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => 
        prev.map(n => n.id === id ? { ...n, is_read: true } : n)
      );
      onRead(); // Refresh count in parent
    } catch (error) {
      console.error('Error marking notification as read:', error);
      toast.error('Failed to update notification');
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    try {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length === 0) return;

      const { error } = await supabase
        .from('admin_notifications')
        .update({ 
          is_read: true,
          read_by: user.id,
          read_at: new Date().toISOString()
        })
        .in('id', unreadIds);

      if (error) throw error;

      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      onRead();
      toast.success('All notifications marked as read');
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error('Failed to update notifications');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('admin_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setNotifications(prev => prev.filter(n => n.id !== id));
      onRead();
      toast.success('Notification deleted');
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Failed to delete notification');
    }
  };

  return (
    <Card className="absolute right-4 top-16 w-96 z-50 shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5" />
            Notifications
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-80">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No notifications</p>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={`p-3 rounded-lg border ${notification.is_read ? 'bg-background' : 'bg-muted/50'}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant={getSeverityColor(notification.severity) as any} className="text-xs">
                          {notification.severity}
                        </Badge>
                        {!notification.is_read && (
                          <span className="h-2 w-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <p className="font-medium text-sm">{notification.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(notification.created_at), 'MMM d, HH:mm')}
                      </p>
                    </div>
                    <div className="flex flex-col gap-1">
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="h-3 w-3" />
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 w-6 p-0"
                        onClick={() => handleDelete(notification.id)}
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
