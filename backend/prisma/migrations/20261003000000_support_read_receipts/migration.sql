-- Track when an admin last read a support ticket so the console can show a
-- real unread badge and clear it the moment the conversation is opened.
ALTER TABLE "SupportTicket" ADD COLUMN "adminLastReadAt" TIMESTAMP(3);
