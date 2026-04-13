CREATE TABLE task_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  embedding halfvec(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE task_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only access their own embeddings"
  ON task_embeddings
  FOR ALL
  USING ((SELECT auth.uid()) = user_id);

CREATE INDEX ON task_embeddings USING hnsw (embedding halfvec_cosine_ops);
