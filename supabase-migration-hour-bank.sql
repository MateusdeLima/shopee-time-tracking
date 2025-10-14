-- Migration: Create hour_bank_compensations table
-- Execute this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS hour_bank_compensations (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    holiday_id INTEGER NOT NULL REFERENCES holidays(id) ON DELETE CASCADE,
    declared_hours DECIMAL(4,2) NOT NULL CHECK (declared_hours > 0 AND declared_hours <= 12),
    detected_hours DECIMAL(4,2) NOT NULL CHECK (detected_hours >= 0 AND detected_hours <= 12),
    confidence INTEGER NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    proof_image TEXT NOT NULL, -- Base64 encoded image
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('approved', 'rejected', 'pending')),
    reason TEXT NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hour_bank_compensations_user_id ON hour_bank_compensations(user_id);
CREATE INDEX IF NOT EXISTS idx_hour_bank_compensations_holiday_id ON hour_bank_compensations(holiday_id);
CREATE INDEX IF NOT EXISTS idx_hour_bank_compensations_status ON hour_bank_compensations(status);
CREATE INDEX IF NOT EXISTS idx_hour_bank_compensations_created_at ON hour_bank_compensations(created_at DESC);

-- Enable Row Level Security
ALTER TABLE hour_bank_compensations ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own compensations
CREATE POLICY "Users can view own compensations" ON hour_bank_compensations
    FOR SELECT USING (auth.uid()::text = user_id::text);

-- Users can create their own compensations
CREATE POLICY "Users can create own compensations" ON hour_bank_compensations
    FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

-- Users can update their own compensations (only if pending)
CREATE POLICY "Users can update own pending compensations" ON hour_bank_compensations
    FOR UPDATE USING (auth.uid()::text = user_id::text AND status = 'pending');

-- Admins can view all compensations (you'll need to create admin role)
-- CREATE POLICY "Admins can view all compensations" ON hour_bank_compensations
--     FOR ALL USING (EXISTS (
--         SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
--     ));

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_hour_bank_compensations_updated_at 
    BEFORE UPDATE ON hour_bank_compensations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comment to table
COMMENT ON TABLE hour_bank_compensations IS 'Stores hour bank compensation requests with AI analysis results';
COMMENT ON COLUMN hour_bank_compensations.declared_hours IS 'Hours declared by the employee';
COMMENT ON COLUMN hour_bank_compensations.detected_hours IS 'Hours detected by AI analysis';
COMMENT ON COLUMN hour_bank_compensations.confidence IS 'AI confidence percentage (0-100)';
COMMENT ON COLUMN hour_bank_compensations.proof_image IS 'Base64 encoded proof image';
COMMENT ON COLUMN hour_bank_compensations.status IS 'Compensation status: pending, approved, or rejected';
COMMENT ON COLUMN hour_bank_compensations.reason IS 'AI analysis reason or admin decision reason';
