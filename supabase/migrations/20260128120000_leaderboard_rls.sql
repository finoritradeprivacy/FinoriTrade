
-- Enable read access to player_stats for authenticated users to view leaderboard
-- We use a DO block to avoid error if policy already exists, though standard CREATE POLICY might just fail if name conflicts.
-- Since we want to ensure access, we'll try to create a policy that allows reading all rows for authenticated users.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'player_stats'
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users"
        ON "public"."player_stats"
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;

-- Ensure profiles are readable too (usually they are, but just in case)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
        AND tablename = 'profiles'
        AND policyname = 'Enable read access for authenticated users'
    ) THEN
        CREATE POLICY "Enable read access for authenticated users"
        ON "public"."profiles"
        FOR SELECT
        TO authenticated
        USING (true);
    END IF;
END
$$;
