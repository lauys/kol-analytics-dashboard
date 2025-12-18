-- Update KOLs table policies for admin-only write access
DROP POLICY IF EXISTS "kols_select_all" ON public.kols;

-- Everyone can read KOLs data
CREATE POLICY "Anyone can view KOLs"
  ON public.kols
  FOR SELECT
  USING (true);

-- Only admins can insert KOLs
CREATE POLICY "Admins can insert KOLs"
  ON public.kols
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update KOLs
CREATE POLICY "Admins can update KOLs"
  ON public.kols
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete KOLs
CREATE POLICY "Admins can delete KOLs"
  ON public.kols
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Update snapshots policies
DROP POLICY IF EXISTS "snapshots_select_all" ON public.snapshots;

-- Everyone can read snapshots
CREATE POLICY "Anyone can view snapshots"
  ON public.snapshots
  FOR SELECT
  USING (true);

-- Only admins (or system) can insert snapshots
CREATE POLICY "Admins can insert snapshots"
  ON public.snapshots
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
