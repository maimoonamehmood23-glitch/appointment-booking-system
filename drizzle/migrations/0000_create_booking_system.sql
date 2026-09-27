CREATE TABLE public.services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  price_cents INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.services TO anon;
GRANT SELECT ON public.services TO authenticated;
GRANT ALL ON public.services TO service_role;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Services are publicly readable" ON public.services FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.time_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  slot_time TIME NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (day_of_week, slot_time)
);

GRANT SELECT ON public.time_slots TO anon;
GRANT SELECT ON public.time_slots TO authenticated;
GRANT ALL ON public.time_slots TO service_role;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Time slots are publicly readable" ON public.time_slots FOR SELECT TO anon, authenticated USING (true);

CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE RESTRICT,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  booking_date DATE NOT NULL,
  booking_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.bookings TO service_role;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX bookings_unique_active_slot
  ON public.bookings (booking_date, booking_time)
  WHERE status <> 'cancelled';

CREATE INDEX bookings_phone_idx ON public.bookings (phone);
CREATE INDEX bookings_date_idx ON public.bookings (booking_date);

INSERT INTO public.services (name, duration_minutes, price_cents, sort_order) VALUES
  ('Signature Cut & Style', 45, 6500, 1),
  ('Balayage & Toner', 120, 18000, 2),
  ('Deep Clean Facial', 60, 9500, 3),
  ('Blowout & Finish', 30, 4000, 4);

INSERT INTO public.time_slots (day_of_week, slot_time)
SELECT d, t::time
FROM generate_series(1, 6) AS d,
     unnest(ARRAY['09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30']) AS t;
