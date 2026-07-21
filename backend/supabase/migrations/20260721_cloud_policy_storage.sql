-- Run this once in Supabase SQL Editor (or through your migration workflow).
create extension if not exists vector;

insert into storage.buckets (id, name, public)
values ('policy-documents', 'policy-documents', false)
on conflict (id) do nothing;

create table if not exists public.documents (
  id uuid primary key,
  policy_name text not null,
  department text not null,
  category text not null,
  description text not null,
  file_name text not null,
  storage_path text not null unique,
  chunk_count integer not null default 0,
  uploaded_by uuid null,
  uploaded_at timestamptz not null default now(),
  version integer not null default 1,
  status text not null default 'active'
);

create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  chunk_number integer not null,
  page_number integer null,
  chunk_text text not null,
  embedding vector(3072) not null,
  unique (document_id, chunk_number)
);

create index if not exists document_chunks_document_id_idx on public.document_chunks (document_id);

create or replace function public.match_document_chunks(
  query_embedding vector(3072),
  match_count integer default 5
)
returns table (
  document_id uuid,
  chunk_number integer,
  page_number integer,
  chunk_text text,
  policy_name text,
  department text,
  category text,
  file_name text,
  similarity double precision
)
language sql stable
as $$
  select c.document_id, c.chunk_number, c.page_number, c.chunk_text,
         d.policy_name, d.department, d.category, d.file_name,
         1 - (c.embedding <=> query_embedding) as similarity
  from public.document_chunks c
  join public.documents d on d.id = c.document_id
  where d.status = 'active'
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
