export interface SubmitFeedbackRequest {
  text: string;
  rating?: number | null;
  contactEmail?: string | null;
}

export interface SubmitFeedbackResponse {
  message: string;
  feedback: {
    id: string;
    createdAt: string;
    rating: number | null;
    contactEmail: string | null;
  };
}

export interface FeedbackEntry {
  id: string;
  text: string;
  rating: number | null;
  contactEmail: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  userId: string;
  user: {
    inAppName: string;
    email: string;
  };
}

export interface AdminFeedbackListResponse {
  items: FeedbackEntry[];
  total: number;
  page: number;
  pageSize: number;
  unreadCount: number;
}

