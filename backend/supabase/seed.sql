-- Demo seed: campuses, approved email domains, chapters. Synthetic data only, no users.
-- Idempotent: safe to run more than once. Adding a school = one campus row + its domains + its chapters.

insert into public.campuses (slug, name, short_name, conference, theme) values
  ('ua', 'The University of Alabama', 'Alabama', 'SEC',
    '{"name": "crimson", "primary": "#9E1B32", "secondary": "#828A8F", "accent": "#FFFFFF"}'),
  ('olemiss', 'University of Mississippi', 'Ole Miss', 'SEC',
    '{"name": "red-blue", "primary": "#CE1126", "secondary": "#14213D", "accent": "#FFFFFF"}')
on conflict (slug) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      conference = excluded.conference,
      theme = excluded.theme;

insert into public.campus_email_domains (domain, campus_id)
select v.domain, c.id
from (values
  ('crimson.ua.edu', 'ua'),
  ('ua.edu',         'ua'),
  ('go.olemiss.edu', 'olemiss'),
  ('olemiss.edu',    'olemiss')
) as v (domain, campus_slug)
join public.campuses c on c.slug = v.campus_slug
on conflict (domain) do nothing;

insert into public.organizations (campus_id, slug, name, national_org, kind)
select c.id, v.slug, v.name, v.name, v.kind
from (values
  ('ua', 'alpha-chi-omega',     'Alpha Chi Omega',     'sorority'),
  ('ua', 'alpha-delta-pi',      'Alpha Delta Pi',      'sorority'),
  ('ua', 'alpha-gamma-delta',   'Alpha Gamma Delta',   'sorority'),
  ('ua', 'chi-omega',           'Chi Omega',           'sorority'),
  ('ua', 'delta-delta-delta',   'Delta Delta Delta',   'sorority'),
  ('ua', 'kappa-delta',         'Kappa Delta',         'sorority'),
  ('ua', 'sigma-alpha-epsilon', 'Sigma Alpha Epsilon', 'fraternity'),
  ('ua', 'sigma-chi',           'Sigma Chi',           'fraternity'),
  ('olemiss', 'chi-omega',           'Chi Omega',           'sorority'),
  ('olemiss', 'delta-gamma',         'Delta Gamma',         'sorority'),
  ('olemiss', 'kappa-delta',         'Kappa Delta',         'sorority'),
  ('olemiss', 'kappa-kappa-gamma',   'Kappa Kappa Gamma',   'sorority'),
  ('olemiss', 'phi-mu',              'Phi Mu',              'sorority'),
  ('olemiss', 'alpha-omicron-pi',    'Alpha Omicron Pi',    'sorority'),
  ('olemiss', 'sigma-alpha-epsilon', 'Sigma Alpha Epsilon', 'fraternity'),
  ('olemiss', 'phi-delta-theta',     'Phi Delta Theta',     'fraternity')
) as v (campus_slug, slug, name, kind)
join public.campuses c on c.slug = v.campus_slug
on conflict (campus_id, slug) do nothing;
