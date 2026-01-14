import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { 
  FileText, Shield, Search, RefreshCw, Ban, Eye, Download
} from 'lucide-react';
import { format } from 'date-fns';

interface AuditLog {
  id: string;
  user_id: string;
  user_nickname?: string;
  action_type: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
}

interface BlockedIP {
  id: string;
  ip_address: string;
  reason: string | null;
  blocked_by_nickname?: string;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export const AdminAudit = () => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [blockedIPs, setBlockedIPs] = useState<BlockedIP[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [newBlockIP, setNewBlockIP] = useState('');
  const [newBlockReason, setNewBlockReason] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Mock data for audit logs
      const mockLogs: AuditLog[] = [
        {
          id: '1',
          user_id: 'user-1',
          user_nickname: 'TraderJohn',
          action_type: 'place_order',
          entity_type: 'order',
          entity_id: 'ord-123',
          details: { symbol: 'BTC', side: 'buy', amount: 0.1 },
          ip_address: '192.168.1.1',
          created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
        },
        {
          id: '2',
          user_id: 'user-2',
          user_nickname: 'CryptoKing',
          action_type: 'login',
          entity_type: 'auth',
          entity_id: null,
          details: { method: 'email' },
          ip_address: '10.0.0.1',
          created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        },
        {
          id: '3',
          user_id: 'system',
          user_nickname: 'System',
          action_type: 'market_update',
          entity_type: 'market',
          entity_id: null,
          details: { event: 'volatility_spike' },
          ip_address: null,
          created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        }
      ];
      setAuditLogs(mockLogs);

      // Mock data for blocked IPs
      const mockBlockedIPs: BlockedIP[] = [
        {
          id: '1',
          ip_address: '1.2.3.4',
          reason: 'Suspicious activity',
          blocked_by_nickname: 'AdminUser',
          expires_at: null,
          is_active: true,
          created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
        }
      ];
      setBlockedIPs(mockBlockedIPs);

    } catch (error) {
      console.error('Error fetching audit data:', error);
      toast.error('Failed to fetch audit data');
    } finally {
      setLoading(false);
    }
  };

  const handleBlockIP = async () => {
    if (!newBlockIP) return;

    try {
      const newBlock: BlockedIP = {
        id: Math.random().toString(36).substr(2, 9),
        ip_address: newBlockIP,
        reason: newBlockReason || null,
        blocked_by_nickname: 'You',
        expires_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      
      setBlockedIPs(prev => [newBlock, ...prev]);

      // Add audit log for this action
      const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: 'local',
        user_nickname: 'You',
        action_type: 'block_ip',
        entity_type: 'ip',
        entity_id: newBlockIP,
        details: { reason: newBlockReason },
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      };
      setAuditLogs(prev => [newLog, ...prev]);

      toast.success(`IP ${newBlockIP} blocked`);
      setNewBlockIP('');
      setNewBlockReason('');
    } catch (error) {
      console.error('Error blocking IP:', error);
      toast.error('Failed to block IP');
    }
  };

  const handleUnblockIP = async (ip: BlockedIP) => {
    try {
      setBlockedIPs(prev => prev.map(item => 
        item.id === ip.id ? { ...item, is_active: false } : item
      ));

      // Add audit log
      const newLog: AuditLog = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: 'local',
        user_nickname: 'You',
        action_type: 'unblock_ip',
        entity_type: 'ip',
        entity_id: ip.ip_address,
        details: {},
        ip_address: '127.0.0.1',
        created_at: new Date().toISOString(),
      };
      setAuditLogs(prev => [newLog, ...prev]);

      toast.success(`IP ${ip.ip_address} unblocked`);
    } catch (error) {
      console.error('Error unblocking IP:', error);
      toast.error('Failed to unblock IP');
    }
  };

  const handleExportLogs = () => {
    const exportData = auditLogs.map(log => ({
      ...log,
      details: JSON.stringify(log.details),
    }));

    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Details', 'IP Address'].join(','),
      ...exportData.map(log => [
        log.created_at,
        log.user_nickname,
        log.action_type,
        log.entity_type,
        log.entity_id || '',
        `"${log.details}"`,
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();

    toast.success('Audit logs exported');
  };

  const uniqueActions = [...new Set(auditLogs.map(l => l.action_type))];

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.user_nickname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || log.action_type === actionFilter;

    return matchesSearch && matchesAction;
  });

  const getActionBadgeColor = (action: string) => {
    if (action.includes('delete') || action.includes('ban') || action.includes('block')) return 'destructive';
    if (action.includes('create') || action.includes('add')) return 'default';
    if (action.includes('update') || action.includes('modify')) return 'secondary';
    return 'outline';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="logs" className="w-full">
        <TabsList>
          <TabsTrigger value="logs">Audit Logs</TabsTrigger>
          <TabsTrigger value="ips">IP Blocklist</TabsTrigger>
        </TabsList>

        <TabsContent value="logs" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search logs..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {uniqueActions.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={fetchData}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
                <Button variant="outline" onClick={handleExportLogs}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Logs Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Audit Logs ({filteredLogs.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Timestamp</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Action</TableHead>
                        <TableHead>Entity</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>IP</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLogs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), 'MMM d, HH:mm:ss')}
                          </TableCell>
                          <TableCell className="font-medium">{log.user_nickname}</TableCell>
                          <TableCell>
                            <Badge variant={getActionBadgeColor(log.action_type) as any}>
                              {log.action_type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {log.entity_type}
                              {log.entity_id && (
                                <span className="text-muted-foreground ml-1">
                                  ({log.entity_id.substring(0, 8)}...)
                                </span>
                              )}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[200px]">
                            <span className="text-xs text-muted-foreground font-mono truncate block">
                              {JSON.stringify(log.details)}
                            </span>
                          </TableCell>
                          <TableCell className="font-mono text-sm">
                            {log.ip_address || '-'}
                          </TableCell>
                        </TableRow>
                      ))}
                      {filteredLogs.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                            No audit logs found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ips" className="space-y-4">
          {/* Block IP Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="h-5 w-5" />
                Block IP Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <Input
                  placeholder="IP Address (e.g., 192.168.1.1)"
                  value={newBlockIP}
                  onChange={(e) => setNewBlockIP(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Reason (optional)"
                  value={newBlockReason}
                  onChange={(e) => setNewBlockReason(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleBlockIP} disabled={!newBlockIP}>
                  <Ban className="h-4 w-4 mr-2" />
                  Block
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blocked IPs List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Blocked IP Addresses ({blockedIPs.filter(ip => ip.is_active).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>IP Address</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Blocked By</TableHead>
                    <TableHead>Blocked At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {blockedIPs.map((ip) => (
                    <TableRow key={ip.id}>
                      <TableCell className="font-mono">{ip.ip_address}</TableCell>
                      <TableCell>{ip.reason || '-'}</TableCell>
                      <TableCell>{ip.blocked_by_nickname || 'System'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(ip.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ip.is_active ? 'destructive' : 'secondary'}>
                          {ip.is_active ? 'Blocked' : 'Unblocked'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {ip.is_active && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleUnblockIP(ip)}
                          >
                            Unblock
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {blockedIPs.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No blocked IP addresses
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
