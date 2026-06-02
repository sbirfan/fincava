-- FIN retail Sprint 1: starter shipping zone rates — all 32 Colombian departments
-- Rates in COP centavos. SMALL ≤500g | MEDIUM ≤2kg | LARGE >2kg
-- Admin UI allows quarterly updates without a migration.
-- Carrier: Servientrega (default). Override per-zone with carrier_hint.

-- National fallback rates (origin = destination = 'NACIONAL' sentinel)
INSERT INTO retail_shipping_zones (origin_department, destination_department, weight_class, rate_cents, carrier_hint) VALUES
('NACIONAL', 'NACIONAL', 'SMALL',  1200000, 'Servientrega'),
('NACIONAL', 'NACIONAL', 'MEDIUM', 1800000, 'Servientrega'),
('NACIONAL', 'NACIONAL', 'LARGE',  2800000, 'Servientrega')
ON CONFLICT DO NOTHING;

-- Huila (major coffee origin) → all departments, SMALL weight class sample
-- Full zone matrix to be populated by operations team via admin UI before launch.
INSERT INTO retail_shipping_zones (origin_department, destination_department, weight_class, rate_cents, carrier_hint) VALUES
('Huila', 'Cundinamarca',     'SMALL',  1000000, 'Servientrega'),
('Huila', 'Cundinamarca',     'MEDIUM', 1500000, 'Servientrega'),
('Huila', 'Cundinamarca',     'LARGE',  2400000, 'Servientrega'),
('Huila', 'Antioquia',        'SMALL',  1100000, 'Servientrega'),
('Huila', 'Antioquia',        'MEDIUM', 1600000, 'Servientrega'),
('Huila', 'Antioquia',        'LARGE',  2500000, 'Servientrega'),
('Huila', 'Valle del Cauca',  'SMALL',  1000000, 'Servientrega'),
('Huila', 'Valle del Cauca',  'MEDIUM', 1500000, 'Servientrega'),
('Huila', 'Valle del Cauca',  'LARGE',  2400000, 'Servientrega'),
('Huila', 'Atlántico',        'SMALL',  1300000, 'Servientrega'),
('Huila', 'Atlántico',        'MEDIUM', 1900000, 'Servientrega'),
('Huila', 'Atlántico',        'LARGE',  2900000, 'Servientrega'),
('Huila', 'Bolívar',          'SMALL',  1300000, 'Servientrega'),
('Huila', 'Bolívar',          'MEDIUM', 1900000, 'Servientrega'),
('Huila', 'Bolívar',          'LARGE',  2900000, 'Servientrega'),
('Huila', 'Huila',            'SMALL',   600000, 'Servientrega'),
('Huila', 'Huila',            'MEDIUM',  900000, 'Servientrega'),
('Huila', 'Huila',            'LARGE',  1400000, 'Servientrega'),
('Huila', 'Nariño',           'SMALL',  1100000, 'Servientrega'),
('Huila', 'Nariño',           'MEDIUM', 1600000, 'Servientrega'),
('Huila', 'Nariño',           'LARGE',  2500000, 'Servientrega'),
('Huila', 'Tolima',           'SMALL',   800000, 'Servientrega'),
('Huila', 'Tolima',           'MEDIUM', 1200000, 'Servientrega'),
('Huila', 'Tolima',           'LARGE',  1900000, 'Servientrega')
ON CONFLICT DO NOTHING;
