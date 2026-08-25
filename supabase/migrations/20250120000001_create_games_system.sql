-- Create game_stats table for tracking user game performance
CREATE TABLE game_stats (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    unicoins_balance INTEGER DEFAULT 0,
    games_played INTEGER DEFAULT 0,
    total_score INTEGER DEFAULT 0,
    best_streak INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id)
);

-- Create game_sessions table for individual game records
CREATE TABLE game_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL CHECK (game_type IN ('tap', 'quiz', 'memory')),
    score INTEGER NOT NULL DEFAULT 0,
    unicoins_earned INTEGER NOT NULL DEFAULT 0,
    duration_seconds INTEGER,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create unicoin_transactions table for tracking UniCoin movements
CREATE TABLE unicoin_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    amount INTEGER NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earned', 'spent', 'bonus')),
    description TEXT NOT NULL,
    game_session_id UUID REFERENCES game_sessions(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add indexes for performance
CREATE INDEX idx_game_stats_user_id ON game_stats(user_id);
CREATE INDEX idx_game_sessions_user_id ON game_sessions(user_id);
CREATE INDEX idx_game_sessions_game_type ON game_sessions(game_type);
CREATE INDEX idx_unicoin_transactions_user_id ON unicoin_transactions(user_id);
CREATE INDEX idx_unicoin_transactions_type ON unicoin_transactions(transaction_type);

-- Enable RLS
ALTER TABLE game_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE unicoin_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for game_stats
CREATE POLICY "Users can view their own game stats" ON game_stats
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own game stats" ON game_stats
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all game stats" ON game_stats
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for game_sessions
CREATE POLICY "Users can view their own game sessions" ON game_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own game sessions" ON game_sessions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all game sessions" ON game_sessions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- RLS Policies for unicoin_transactions
CREATE POLICY "Users can view their own unicoin transactions" ON unicoin_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all unicoin transactions" ON unicoin_transactions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles 
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Function to create game stats for new users
CREATE OR REPLACE FUNCTION create_user_game_stats()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO game_stats (user_id)
    VALUES (NEW.user_id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create game stats when profile is created
CREATE TRIGGER create_game_stats_on_profile_creation
    AFTER INSERT ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION create_user_game_stats();

-- Function to award UniCoins
CREATE OR REPLACE FUNCTION award_unicoins(
    p_user_id UUID,
    p_amount INTEGER,
    p_game_type TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    session_id UUID;
BEGIN
    -- Insert game session
    INSERT INTO game_sessions (user_id, game_type, score, unicoins_earned)
    VALUES (p_user_id, p_game_type, p_amount * 10, p_amount)
    RETURNING id INTO session_id;
    
    -- Update game stats
    INSERT INTO game_stats (user_id, unicoins_balance, games_played, total_score)
    VALUES (p_user_id, p_amount, 1, p_amount * 10)
    ON CONFLICT (user_id) 
    DO UPDATE SET
        unicoins_balance = game_stats.unicoins_balance + p_amount,
        games_played = game_stats.games_played + 1,
        total_score = game_stats.total_score + (p_amount * 10),
        updated_at = NOW();
    
    -- Record UniCoin transaction
    INSERT INTO unicoin_transactions (user_id, amount, transaction_type, description, game_session_id)
    VALUES (p_user_id, p_amount, 'earned', 'Earned from ' || p_game_type || ' game', session_id);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to spend UniCoins
CREATE OR REPLACE FUNCTION spend_unicoins(
    p_user_id UUID,
    p_amount INTEGER,
    p_description TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Check current balance
    SELECT unicoins_balance INTO current_balance
    FROM game_stats
    WHERE user_id = p_user_id;
    
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct UniCoins
    UPDATE game_stats
    SET unicoins_balance = unicoins_balance - p_amount,
        updated_at = NOW()
    WHERE user_id = p_user_id;
    
    -- Record transaction
    INSERT INTO unicoin_transactions (user_id, amount, transaction_type, description)
    VALUES (p_user_id, -p_amount, 'spent', p_description);
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for new tables
ALTER TABLE game_stats REPLICA IDENTITY FULL;
ALTER TABLE game_sessions REPLICA IDENTITY FULL;
ALTER TABLE unicoin_transactions REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE game_stats;
ALTER PUBLICATION supabase_realtime ADD TABLE game_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE unicoin_transactions;