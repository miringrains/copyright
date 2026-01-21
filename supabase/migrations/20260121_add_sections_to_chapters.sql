-- Add sections column to book_chapters table
-- This stores user-defined subsections for each chapter

ALTER TABLE book_chapters
ADD COLUMN IF NOT EXISTS sections JSONB DEFAULT '[]'::jsonb;

-- Add content_blocks column for rich content (text + images)
ALTER TABLE book_chapters  
ADD COLUMN IF NOT EXISTS content_blocks JSONB DEFAULT NULL;

COMMENT ON COLUMN book_chapters.sections IS 'User-defined subsections for the chapter: [{id: string, title: string}]';
COMMENT ON COLUMN book_chapters.content_blocks IS 'Rich content blocks for the chapter: [{type: "text"|"image", content: string, ...}]';
