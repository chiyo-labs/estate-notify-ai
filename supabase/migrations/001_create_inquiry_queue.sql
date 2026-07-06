-- inquiry_queue テーブル
CREATE TABLE inquiry_queue (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source        TEXT NOT NULL CHECK (source IN ('line', 'email')),
  external_id   TEXT NOT NULL,
  sender_id     TEXT,
  sender_name   TEXT,
  body          TEXT NOT NULL,
  category      TEXT CHECK (category IN ('賃貸', '売買', '内見', 'クレーム')),
  is_urgent     BOOLEAN NOT NULL DEFAULT false,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending', 'classified', 'notified', 'failed')),
  raw_payload   JSONB,
  classified_at TIMESTAMPTZ,
  notified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (source, external_id)
);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER inquiry_queue_updated_at
  BEFORE UPDATE ON inquiry_queue
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- インデックス
CREATE INDEX idx_inquiry_queue_status     ON inquiry_queue (status);
CREATE INDEX idx_inquiry_queue_created_at ON inquiry_queue (created_at DESC);
