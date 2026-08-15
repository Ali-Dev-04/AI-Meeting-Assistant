import { Injectable } from '@nestjs/common';
import { NotFoundError } from '../../common/errors';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

interface NotificationPayload {
  title: string;
  meetingId?: string;
}

/** Read-side of the in-app notification bell (writes happen inline where events occur). */
@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.notification.count({ where: { userId, readAt: null } }),
    ]);
    return { items: rows.map((n) => this.toDto(n)), unreadCount };
  }

  async markRead(userId: string, notificationId: string) {
    const existing = await this.prisma.notification.findFirst({
      where: { id: notificationId, userId },
    });
    if (!existing) throw new NotFoundError('Notification');
    await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }

  private toDto(n: {
    id: string;
    userId: string;
    type: string;
    payload: unknown;
    readAt: Date | null;
    createdAt: Date;
  }) {
    const payload = (n.payload ?? {}) as NotificationPayload;
    return {
      id: n.id,
      type: n.type,
      title: payload.title ?? n.type,
      meetingId: payload.meetingId ?? null,
      createdAt: n.createdAt.toISOString(),
      readAt: n.readAt?.toISOString() ?? null,
    };
  }
}
