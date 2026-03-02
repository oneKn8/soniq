-- Add custom_instructions field to tenants for user-defined AI prompts
-- Run this in Supabase SQL Editor

-- Add custom_instructions column for user-defined instructions
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS custom_instructions TEXT;

-- Add questionnaire_answers column to store onboarding responses
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS questionnaire_answers JSONB;

-- Comment for documentation
COMMENT ON COLUMN tenants.custom_instructions IS 'User-defined instructions that are added to the AI system prompt';
COMMENT ON COLUMN tenants.questionnaire_answers IS 'Answers from the onboarding questionnaire used to generate custom instructions';
