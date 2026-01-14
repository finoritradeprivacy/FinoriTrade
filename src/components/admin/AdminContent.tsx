import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  Megaphone, Gift, Plus, Edit, Trash2, RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Announcement {
  id: string;
  title: string;
  content: string;
  announcement_type: string;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
}

interface PromoCode {
  id: string;
  code: string;
  description: string | null;
  reward_type: string;
  reward_usdt: number;
  reward_xp: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const AdminContent = () => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAnnouncementDialog, setShowAnnouncementDialog] = useState(false);
  const [showPromoDialog, setShowPromoDialog] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [editingPromo, setEditingPromo] = useState<PromoCode | null>(null);

  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    announcement_type: 'info',
    is_active: true,
  });

  const [promoForm, setPromoForm] = useState({
    code: '',
    description: '',
    reward_type: 'usdt',
    reward_usdt: 0,
    reward_xp: 0,
    max_uses: '',
    is_active: true,
  });

  useEffect(() => {
    setLoading(false);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      setAnnouncements([]);
      setPromoCodes([]);
    } catch (error) {
      console.error('Error fetching content data:', error);
      toast.error('Failed to fetch content data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAnnouncement = async () => {
    try {
      toast.info('Announcements are disabled in simulation mode');
      setShowAnnouncementDialog(false);
      resetAnnouncementForm();
    } catch (error) {
      console.error('Error saving announcement:', error);
      toast.error('Failed to save announcement');
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    try {
      toast.info('Announcements are disabled in simulation mode');
      toast.success('Announcement deleted');
    } catch (error) {
      console.error('Error deleting announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleSavePromo = async () => {
    try {
      toast.info('Promo codes are disabled in simulation mode');
      setShowPromoDialog(false);
      resetPromoForm();
    } catch (error) {
      console.error('Error saving promo code:', error);
      toast.error('Failed to save promo code');
    }
  };

  const handleDeletePromo = async (id: string) => {
    try {
      toast.info('Promo codes are disabled in simulation mode');
      toast.success('Promo code deleted');
    } catch (error) {
      console.error('Error deleting promo code:', error);
      toast.error('Failed to delete promo code');
    }
  };

  const resetAnnouncementForm = () => {
    setAnnouncementForm({ title: '', content: '', announcement_type: 'info', is_active: true });
    setEditingAnnouncement(null);
  };

  const resetPromoForm = () => {
    setPromoForm({ code: '', description: '', reward_type: 'usdt', reward_usdt: 0, reward_xp: 0, max_uses: '', is_active: true });
    setEditingPromo(null);
  };

  const openEditAnnouncement = (announcement: Announcement) => {
    setEditingAnnouncement(announcement);
    setAnnouncementForm({
      title: announcement.title,
      content: announcement.content,
      announcement_type: announcement.announcement_type,
      is_active: announcement.is_active,
    });
    setShowAnnouncementDialog(true);
  };

  const openEditPromo = (promo: PromoCode) => {
    setEditingPromo(promo);
    setPromoForm({
      code: promo.code,
      description: promo.description || '',
      reward_type: promo.reward_type,
      reward_usdt: promo.reward_usdt,
      reward_xp: promo.reward_xp,
      max_uses: promo.max_uses?.toString() || '',
      is_active: promo.is_active,
    });
    setShowPromoDialog(true);
  };

  const getAnnouncementTypeBadge = (type: string) => {
    switch (type) {
      case 'info': return <Badge variant="default">Info</Badge>;
      case 'warning': return <Badge variant="secondary" className="bg-yellow-500">Warning</Badge>;
      case 'maintenance': return <Badge variant="destructive">Maintenance</Badge>;
      case 'promotion': return <Badge className="bg-green-500">Promotion</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="announcements" className="w-full">
        <TabsList>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
        </TabsList>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  System Announcements
                </div>
                <Button onClick={() => { resetAnnouncementForm(); setShowAnnouncementDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Announcement
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {announcements.map((announcement) => (
                    <TableRow key={announcement.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{announcement.title}</p>
                          <p className="text-sm text-muted-foreground truncate max-w-[300px]">
                            {announcement.content}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{getAnnouncementTypeBadge(announcement.announcement_type)}</TableCell>
                      <TableCell>
                        <Badge variant={announcement.is_active ? 'default' : 'secondary'}>
                          {announcement.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(announcement.created_at), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditAnnouncement(announcement)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeleteAnnouncement(announcement.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {announcements.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No announcements yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promos" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5" />
                  Promo Codes
                </div>
                <Button onClick={() => { resetPromoForm(); setShowPromoDialog(true); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Promo Code
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Reward</TableHead>
                    <TableHead>Usage</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {promoCodes.map((promo) => (
                    <TableRow key={promo.id}>
                      <TableCell>
                        <div>
                          <p className="font-mono font-bold">{promo.code}</p>
                          <p className="text-sm text-muted-foreground">{promo.description}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          {promo.reward_usdt > 0 && (
                            <Badge variant="outline">${promo.reward_usdt} USDT</Badge>
                          )}
                          {promo.reward_xp > 0 && (
                            <Badge variant="outline">{promo.reward_xp} XP</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {promo.current_uses} / {promo.max_uses || '∞'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={promo.is_active ? 'default' : 'secondary'}>
                          {promo.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditPromo(promo)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDeletePromo(promo.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {promoCodes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No promo codes yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Announcement Dialog */}
      <Dialog open={showAnnouncementDialog} onOpenChange={setShowAnnouncementDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAnnouncement ? 'Edit' : 'New'} Announcement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input 
                value={announcementForm.title}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Content</label>
              <Textarea 
                value={announcementForm.content}
                onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Type</label>
              <Select 
                value={announcementForm.announcement_type}
                onValueChange={(v) => setAnnouncementForm({ ...announcementForm, announcement_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">Info</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="promotion">Promotion</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={announcementForm.is_active}
                onCheckedChange={(v) => setAnnouncementForm({ ...announcementForm, is_active: v })}
              />
              <label className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAnnouncementDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveAnnouncement}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Promo Dialog */}
      <Dialog open={showPromoDialog} onOpenChange={setShowPromoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPromo ? 'Edit' : 'New'} Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Code</label>
              <Input 
                value={promoForm.code}
                onChange={(e) => setPromoForm({ ...promoForm, code: e.target.value.toUpperCase() })}
                placeholder="WELCOME2024"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Input 
                value={promoForm.description}
                onChange={(e) => setPromoForm({ ...promoForm, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">USDT Reward</label>
                <Input 
                  type="number"
                  value={promoForm.reward_usdt}
                  onChange={(e) => setPromoForm({ ...promoForm, reward_usdt: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <label className="text-sm font-medium">XP Reward</label>
                <Input 
                  type="number"
                  value={promoForm.reward_xp}
                  onChange={(e) => setPromoForm({ ...promoForm, reward_xp: parseInt(e.target.value) || 0 })}
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Max Uses (empty = unlimited)</label>
              <Input 
                type="number"
                value={promoForm.max_uses}
                onChange={(e) => setPromoForm({ ...promoForm, max_uses: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch 
                checked={promoForm.is_active}
                onCheckedChange={(v) => setPromoForm({ ...promoForm, is_active: v })}
              />
              <label className="text-sm">Active</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPromoDialog(false)}>Cancel</Button>
            <Button onClick={handleSavePromo}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
