'use client';

import { useState, useEffect } from 'react';
import { useFirestore } from '@/firebase';
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { useUserProfile } from '@/hooks/use-user-profile';
import type { TenantNotice } from '@/lib/types';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, AlertTriangle, Info, AlertCircle, Check } from 'lucide-react';

export function NotificationBell() {
  const firestore = useFirestore();
  const { tenantId, userEmail, profile } = {
    ...useUserProfile(),
    userEmail: useUserProfile().profile?.email,
  };

  const [notices, setNotices] = useState<TenantNotice[]>([]);
  const [readNoticeIds, setReadNoticeIds] = useState<string[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  // Load read status from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(`read_notices_${tenantId}`);
      if (stored) {
        setReadNoticeIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, [tenantId]);

  // Subscribe to notices in real-time
  useEffect(() => {
    if (!firestore || !tenantId) return;

    try {
      const noticesRef = collection(firestore, 'notices');
      const q = query(noticesRef, orderBy('createdAt', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const loaded: TenantNotice[] = [];
          snapshot.forEach((docSnap) => {
            const data = { id: docSnap.id, ...docSnap.data() } as TenantNotice;
            // Filter: broadcast to 'all' or matches specific tenantId
            if (data.tenantId === 'all' || data.tenantId === tenantId) {
              loaded.push(data);
            }
          });
          setNotices(loaded);
        },
        (err) => {
          console.warn('Notice subscription note:', err);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('Could not initialize notices listener:', err);
    }
  }, [firestore, tenantId]);

  const unreadCount = notices.filter((n) => !readNoticeIds.includes(n.id)).length;

  const handleMarkAllRead = () => {
    const allIds = notices.map((n) => n.id);
    setReadNoticeIds(allIds);
    try {
      localStorage.setItem(`read_notices_${tenantId}`, JSON.stringify(allIds));
    } catch {
      // Ignore
    }
  };

  const markSingleAsRead = (id: string) => {
    if (!readNoticeIds.includes(id)) {
      const updated = [...readNoticeIds, id];
      setReadNoticeIds(updated);
      try {
        localStorage.setItem(`read_notices_${tenantId}`, JSON.stringify(updated));
      } catch {
        // Ignore
      }
    }
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <Badge variant="destructive" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> Urgent
          </Badge>
        );
      case 'warning':
        return (
          <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" /> Notice
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 flex items-center gap-1">
            <Info className="h-3 w-3" /> Update
          </Badge>
        );
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full h-9 w-9">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-2xl">
        <div className="flex items-center justify-between p-3.5 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            <h4 className="font-semibold text-xs text-foreground">Announcements & Notices</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                {unreadCount} unread
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleMarkAllRead}
              className="text-[11px] h-7 px-2 text-muted-foreground hover:text-foreground"
            >
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="max-h-80">
          {notices.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                <Check className="h-4 w-4" />
              </div>
              <p className="text-xs font-medium">All caught up!</p>
              <p className="text-[11px] text-muted-foreground">
                No active announcements from platform administration.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notices.map((notice) => {
                const isRead = readNoticeIds.includes(notice.id);
                return (
                  <div
                    key={notice.id}
                    onClick={() => markSingleAsRead(notice.id)}
                    className={`p-3.5 space-y-1.5 transition-colors cursor-pointer hover:bg-muted/40 ${
                      !isRead ? 'bg-primary/5 dark:bg-primary/10' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {!isRead && (
                          <span className="h-2 w-2 rounded-full bg-primary shrink-0" />
                        )}
                        <h5 className="text-xs font-semibold text-foreground line-clamp-1">
                          {notice.title}
                        </h5>
                      </div>
                      {getPriorityBadge(notice.priority)}
                    </div>

                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {notice.message}
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[10px] text-muted-foreground">
                      <span>
                        {notice.createdAt
                          ? new Date(notice.createdAt).toLocaleString([], {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Recent'}
                      </span>
                      {notice.tenantId === 'all' && (
                        <span className="font-mono text-[9px] bg-muted px-1.5 py-0.5 rounded">
                          Broadcast
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
