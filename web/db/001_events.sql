CREATE TABLE IF NOT EXISTS sensors (
  sensor_id text PRIMARY KEY,
  public_key text NOT NULL CHECK (length(public_key) = 64)
);

CREATE TABLE IF NOT EXISTS events (
  block_id text PRIMARY KEY CHECK (block_id ~ '^0x[0-9a-f]{64}$'),
  tag text NOT NULL,
  inserted_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  data jsonb NOT NULL
);

CREATE INDEX IF NOT EXISTS events_time ON events ((data->>'ts'));
CREATE INDEX IF NOT EXISTS events_sensor ON events ((data->>'sensorId'));
CREATE INDEX IF NOT EXISTS events_shipment ON events ((data->>'shipmentId'));
CREATE INDEX IF NOT EXISTS events_tag ON events (tag);
