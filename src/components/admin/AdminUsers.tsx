import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { 
  Search, UserX, Shield, RefreshCw, Ban, Trash2, Eye, Download, 
  Clock, MapPin, Monitor, Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  nickname: string;
  email: string;
  created_at: string;
  last_active_at: string | null;
  total_trades: number | null;
  total_profit_loss: number | null;
  win_rate: number | null;
  usdt_balance: number;
  level: number;
  total_xp: number;
  is_admin: boolean;
  is_banned: boolean;
  role?: string;
}

interface UserSession {
  id: string;
  ip_address: string;
  user_agent: string;
  device_type: string;
  location: string;
  logged_in_at: string;
  is_active: boolean;
}

const PREMIUM_ROLES = ["FinoriPro", "FinoriAlpha", "FinoriUltra", "FinoriFamily"];

export const AdminUsers = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showUserDetail, setShowUserDetail] = useState(false);
  const [showBanDialog, setShowBanDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [userSessions, setUserSessions] = useState<UserSession[]>([]);
  const [banReason, setBanReason] = useState('');
  const [banType, setBanType] = useState<'temporary' | 'permanent'>('temporary');
  const [banDuration, setBanDuration] = useState('7');
  const [newRole, setNewRole] = useState<string>('User');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      // 1. Fetch profiles with related data
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          *,
          player_stats (
            level,
            total_xp,
            achievements
          ),
          user_balances (
            usdt_balance
          )
        `);

      if (profilesError) throw profilesError;

      // Transform profiles to User interface
      const realUsers: User[] = profiles.map((profile: any) => {
        // Handle potential array or single object response for joined tables
        const stats = Array.isArray(profile.player_stats) 
          ? profile.player_stats[0] 
          : profile.player_stats || {};
          
        const balances = Array.isArray(profile.user_balances)
          ? profile.user_balances[0]
          : profile.user_balances || {};
        
        const achievements = stats.achievements || {};
        const role = achievements.role || 'User';
        
        // Determine if admin
        const isAdmin = role === 'Admin' || profile.nickname === 'tester';

        return {
          id: profile.id,
          nickname: profile.nickname || 'Unknown',
          email: profile.email || 'No Email',
          created_at: profile.created_at,
          last_active_at: profile.last_active_at,
          total_trades: profile.total_trades || 0,
          total_profit_loss: profile.total_profit_loss || 0,
          win_rate: profile.win_rate || 0,
          usdt_balance: balances.usdt_balance || 0,
          level: stats.level || 1,
          total_xp: stats.total_xp || 0,
          is_admin: isAdmin,
          is_banned: false,
          role: role
        };
      });

      setUsers(realUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserSessions = async (userId: string) => {
    // Mock sessions for now as we don't have a sessions table
    setUserSessions([]);
  };

  const handleViewUser = async (user: User) => {
    setSelectedUser(user);
    await fetchUserSessions(user.id);
    setShowUserDetail(true);
  };

  const handleBanUser = async () => {
    if (!selectedUser || !banReason) return;

    try {
      toast.info('User banning is disabled (requires backend logic)');
      setShowBanDialog(false);
      setBanReason('');
    } catch (error) {
      console.error('Error banning user:', error);
      toast.error('Failed to ban user');
    }
  };

  const handleUnbanUser = async (userId: string) => {
    try {
      toast.info('User unban is disabled (requires backend logic)');
    } catch (error) {
      console.error('Error unbanning user:', error);
      toast.error('Failed to unban user');
    }
  };

  const handleResetAccount = async () => {
    if (!selectedUser) return;

    try {
      toast.info('Account reset is disabled (requires backend logic)');
      setShowResetDialog(false);
    } catch (error) {
      console.error('Error resetting account:', error);
      toast.error('Failed to reset account');
    }
  };

  const handleChangeRole = async () => {
    if (!selectedUser) return;

    try {
      // Fetch current achievements
      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select('achievements')
        .eq('user_id', selectedUser.id)
        .single();

      if (statsError) throw statsError;

      let currentAchievements = (stats.achievements as any) || {};
      
      // Update role in achievements
      if (newRole === 'User') {
        // Remove role property or set to User
        delete currentAchievements.role;
      } else {
        currentAchievements.role = newRole;
      }

      const { error: updateError } = await supabase
        .from('player_stats')
        .update({ achievements: currentAchievements })
        .eq('user_id', selectedUser.id);

      if (updateError) throw updateError;

      toast.success(`Role updated to ${newRole}`);
      setShowRoleDialog(false);
      fetchUsers(); // Refresh list
    } catch (error) {
      console.error('Error changing role:', error);
      toast.error('Failed to change role');
    }
  };

  const handleDeleteAccount = async () => {
    if (!selectedUser) return;

    try {
      toast.info('Account deletion is disabled in simulation mode');
      setShowDeleteDialog(false);
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    }
  };

  const handleExportUserData = async (user: User) => {
    try {
      toast.info('User data export is disabled in simulation mode');
    } catch (error) {
      console.error('Error exporting user data:', error);
      toast.error('Failed to export user data');
    }
  };

  const filteredUsers = users.filter(u =>
    u.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by nickname or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={fetchUsers} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Trades</TableHead>
                    <TableHead>P/L</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{user.nickname}</p>
                          <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono">
                        ${user.usdt_balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">Lvl {user.level}</Badge>
                      </TableCell>
                      <TableCell>{user.total_trades || 0}</TableCell>
                      <TableCell className={user.total_profit_loss && user.total_profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}>
                        ${(user.total_profit_loss || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap">
                          {user.is_admin && <Badge className="bg-purple-500">Admin</Badge>}
                          {user.is_banned && <Badge variant="destructive">Banned</Badge>}
                          {!user.is_admin && !user.is_banned && user.role === 'User' && <Badge variant="secondary">User</Badge>}
                          {PREMIUM_ROLES.includes(user.role || '') && (
                            <Badge className="bg-yellow-500/10 text-yellow-500 border-yellow-500/50 shadow-[0_0_10px_rgba(234,179,8,0.2)] animate-pulse">
                              <Crown className="w-3 h-3 mr-1" />
                              {user.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => handleViewUser(user)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); setNewRole(user.role || 'User'); setShowRoleDialog(true); }}>
                            <Shield className="h-4 w-4" />
                          </Button>
                          {user.is_banned ? (
                            <Button size="sm" variant="ghost" onClick={() => handleUnbanUser(user.id)}>
                              <UserX className="h-4 w-4 text-green-500" />
                            </Button>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); setShowBanDialog(true); }}>
                              <Ban className="h-4 w-4 text-red-500" />
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); setShowResetDialog(true); }}>
                            <RefreshCw className="h-4 w-4 text-yellow-500" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleExportUserData(user)}>
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setSelectedUser(user); setShowDeleteDialog(true); }}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* User Detail Dialog */}
      <Dialog open={showUserDetail} onOpenChange={setShowUserDetail}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>User Details: {selectedUser?.nickname}</DialogTitle>
            <DialogDescription>
              Detailed information about the selected user, including account status and history.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">{format(new Date(selectedUser.created_at), 'PPP')}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Balance</p>
                  <p className="font-medium font-mono">${selectedUser.usdt_balance.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">Level / XP</p>
                  <p className="font-medium">Level {selectedUser.level} ({selectedUser.total_xp} XP)</p>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Login History
                </h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {userSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-2 bg-muted/30 rounded text-sm">
                      <div className="flex items-center gap-4">
                        <span className="font-mono">{session.ip_address || 'Unknown IP'}</span>
                        <span className="text-muted-foreground">{session.device_type || 'Unknown device'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          {format(new Date(session.logged_in_at), 'PPp')}
                        </span>
                        {session.is_active && <Badge variant="outline" className="text-green-500">Active</Badge>}
                      </div>
                    </div>
                  ))}
                  {userSessions.length === 0 && (
                    <p className="text-muted-foreground text-center py-4">No login history</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Ban Dialog */}
      <Dialog open={showBanDialog} onOpenChange={setShowBanDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ban User: {selectedUser?.nickname}</DialogTitle>
            <DialogDescription>This will prevent the user from accessing the platform.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Ban Type</label>
              <Select value={banType} onValueChange={(v) => setBanType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="temporary">Temporary</SelectItem>
                  <SelectItem value="permanent">Permanent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {banType === 'temporary' && (
              <div>
                <label className="text-sm font-medium">Duration (days)</label>
                <Input 
                  type="number" 
                  value={banDuration} 
                  onChange={(e) => setBanDuration(e.target.value)}
                  min="1"
                />
              </div>
            )}
            <div>
              <label className="text-sm font-medium">Reason</label>
              <Textarea 
                value={banReason} 
                onChange={(e) => setBanReason(e.target.value)}
                placeholder="Enter ban reason..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBanDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBanUser} disabled={!banReason}>
              Ban User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Account: {selectedUser?.nickname}</DialogTitle>
            <DialogDescription>
              This will reset the user's balance to $100,000, clear all trades, portfolios, and stats.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowResetDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleResetAccount}>
              Reset Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Role: {selectedUser?.nickname}</DialogTitle>
            <DialogDescription>
              Select a new role for this user. This will affect their permissions and visual badge.
            </DialogDescription>
          </DialogHeader>
          <div>
            <label className="text-sm font-medium">New Role</label>
            <Select value={newRole} onValueChange={(v) => setNewRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="User">User</SelectItem>
                <SelectItem value="Admin">Admin</SelectItem>
                <SelectItem value="FinoriPro">FinoriPro</SelectItem>
                <SelectItem value="FinoriAlpha">FinoriAlpha</SelectItem>
                <SelectItem value="FinoriUltra">FinoriUltra</SelectItem>
                <SelectItem value="FinoriFamily">FinoriFamily</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRoleDialog(false)}>Cancel</Button>
            <Button onClick={handleChangeRole}>Save Role</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account: {selectedUser?.nickname}</DialogTitle>
            <DialogDescription>
              This will permanently delete the user's account and all associated data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteAccount}>
              Delete Account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
