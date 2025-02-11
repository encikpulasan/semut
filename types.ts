export interface Pledge {
  id?: string;
  name: string;
  organization?: string;
  amount: number;
  phone: string;
  email: string;
  sessionId?: string;
  timestamp?: string;
  history?: PledgeHistory[];
}

export interface PledgeHistory {
  amount: number;
  timestamp: string;
}

export interface Session {
  email: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  action: "create" | "update" | "delete" | "bulk_delete";
  pledgeId?: string;
  previousData?: Partial<Pledge>;
  newData?: Partial<Pledge>;
  timestamp: string;
}
