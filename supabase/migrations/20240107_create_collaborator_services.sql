-- Tabela de vínculo colaborador x serviço com comissão específica
create table if not exists public.collaborator_services (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid not null references public.companies(id) on delete cascade,
  collaborator_id uuid not null references public.collaborators(id) on delete cascade,
  service_id uuid not null references public.services(id) on delete cascade,
  commission_type text not null check (commission_type in ('PERCENT','FIXED')),
  commission_value numeric(10,2) not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(collaborator_id, service_id)
);

create index if not exists idx_collaborator_services_company on public.collaborator_services(company_id);
create index if not exists idx_collaborator_services_collaborator on public.collaborator_services(collaborator_id);
create index if not exists idx_collaborator_services_service on public.collaborator_services(service_id);

-- Snapshot de comissão no agendamento/serviço
alter table public.appointment_services
  add column if not exists commission_type text check (commission_type in ('PERCENT','FIXED')),
  add column if not exists commission_value numeric(10,2);

-- Trigger simples para updated_at
create or replace function public.set_collaborator_services_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_collaborator_services_updated_at on public.collaborator_services;
create trigger trg_collaborator_services_updated_at
before update on public.collaborator_services
for each row
execute function public.set_collaborator_services_updated_at();

