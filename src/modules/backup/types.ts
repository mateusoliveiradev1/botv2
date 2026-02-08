export interface BackupData {
  timestamp: string;
  guild: {
    name: string;
    id: string;
    icon: string | null;
  };
  roles: RoleBackup[];
  channels: ChannelBackup[];
}

export interface RoleBackup {
  id: string;
  name: string;
  color: number;
  hoist: boolean;
  position: number;
  permissions: string; // Bitfield as string
}

export interface ChannelBackup {
  id: string;
  name: string;
  type: number;
  parentId: string | null;
  position: number;
  topic?: string | null;
  permissionOverwrites: OverwriteBackup[];
}

export interface OverwriteBackup {
  id: string; // Role or User ID
  type: number; // 0 = Role, 1 = Member
  allow: string;
  deny: string;
}
