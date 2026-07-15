export type AuthUser = {
  id: number;
  username: string;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
};

export type ConversationMember = {
  id: number;
  joinedAt: string;
  user: AuthUser;
};

export type Attachment = {
  id: number;
  originalName: string;
  fileName: string;
  mimeType: string;
  size: number;
  relativePath: string;
  publicUrl: string;
  createdAt: string;
};

export type Message = {
  id: number;
  type: 'text' | 'image' | 'video';
  text: string | null;
  sender: AuthUser;
  attachment?: Attachment | null;
  createdAt: string;
};

export type Conversation = {
  id: number;
  createdAt: string;
  members: ConversationMember[];
};
