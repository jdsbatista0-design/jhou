DROP POLICY IF EXISTS "Authenticated users can receive realtime" ON realtime.messages;
DROP POLICY IF EXISTS "Authenticated users can send realtime" ON realtime.messages;

CREATE POLICY "Deny realtime broadcast reads"
  ON realtime.messages
  FOR SELECT
  TO authenticated
  USING (false);

CREATE POLICY "Deny realtime broadcast writes"
  ON realtime.messages
  FOR INSERT
  TO authenticated
  WITH CHECK (false);