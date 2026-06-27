-- Original client text and AI department for client portal submissions
alter table tasks add column if not exists client_description text;
alter table tasks add column if not exists ai_department text;
