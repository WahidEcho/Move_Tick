-- Applied to production 2026-07-04 as handle_new_user_claims_and_oauth_names.
-- 1) OAuth-friendly profile creation: Google sends the display name as
--    raw_user_meta_data->>'name' (the old trigger only read 'full_name' and
--    produced blank-name profiles); also capture avatar_url.
-- 2) Guest-ticket claiming: tickets issued to an email before the account
--    existed (admin invitations) attach to the new account automatically.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      ''
    ),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE public.tickets
     SET user_id = NEW.id,
         updated_at = NOW()
   WHERE user_id IS NULL
     AND guest_email IS NOT NULL
     AND lower(guest_email) = lower(NEW.email);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;
