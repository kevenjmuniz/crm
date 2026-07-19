export interface Contact {
  id: string;
  phone: string;
  name: string | null;
  pushName: string | null;
  avatarUrl: string | null;
  email: string | null;
  tags?: { tag: Tag }[];
}

export interface Tag {
  id: string;
  name: string;
  color: string | null;
}

export interface Instance {
  id: string;
  name: string;
  phone: string | null;
  status: 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED';
}

export interface UserT {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'AGENT';
  active: boolean;
  queues?: { queue: Queue }[];
}

export interface Queue {
  id: string;
  name: string;
  description: string | null;
  users?: { user: { id: string; name: string } }[];
}

export interface Conversation {
  id: string;
  status: 'PENDING' | 'OPEN' | 'CLOSED';
  unreadCount: number;
  lastMessageAt: string | null;
  contact: Contact;
  assignedTo: { id: string; name: string } | null;
  queue: Queue | null;
  instance: { id: string; name: string; status: string };
}

export interface Message {
  id: string;
  direction: 'INBOUND' | 'OUTBOUND';
  type: string;
  content: string | null;
  mediaUrl: string | null;
  status: string;
  timestamp: string;
}

export interface Stage {
  id: string;
  name: string;
  position: number;
  deals: Deal[];
}

export interface Deal {
  id: string;
  title: string;
  value: string | null;
  position: number;
  contact: Pick<Contact, 'id' | 'name' | 'pushName' | 'phone'>;
}

export interface Pipeline {
  id: string;
  name: string;
  stages: Stage[];
}

export interface Campaign {
  id: string;
  name: string;
  message: string;
  status: 'DRAFT' | 'SCHEDULED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'FAILED';
  ratePerMinute: number;
  instance?: { name: string; status: string };
  _count?: { recipients: number };
  stats?: { status: string; _count: number }[];
}

export function contactName(c: Pick<Contact, 'name' | 'pushName' | 'phone'>) {
  return c.name ?? c.pushName ?? c.phone;
}
