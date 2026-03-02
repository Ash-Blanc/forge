-- Enable the vector extension for Agno pgvector operations
create extension if not exists vector;

-- The actual user_knowledge tables will be instantiated by Agno PgVector automatically
-- based on the embedder definitions. This file ensures the DB recognizes the type.
