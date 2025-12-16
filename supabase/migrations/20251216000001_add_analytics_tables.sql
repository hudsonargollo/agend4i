-- Create analytics_events table for storing conversion tracking data
CREATE TABLE IF NOT EXISTS analytics_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    label VARCHAR(255),
    value INTEGER,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    session_id VARCHAR(255) NOT NULL,
    page VARCHAR(500) NOT NULL,
    user_agent TEXT,
    timestamp TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create conversion_metrics table for aggregated metrics
CREATE TABLE IF NOT EXISTS conversion_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    count INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, event_type, category, action)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_analytics_events_timestamp ON analytics_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_events_session ON analytics_events(session_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(category);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);

CREATE INDEX IF NOT EXISTS idx_conversion_metrics_date ON conversion_metrics(date);
CREATE INDEX IF NOT EXISTS idx_conversion_metrics_event_type ON conversion_metrics(event_type);

-- Create function to update conversion metrics count
CREATE OR REPLACE FUNCTION update_conversion_metrics_count()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO conversion_metrics (date, event_type, category, action, count)
    VALUES (
        NEW.date,
        NEW.event_type,
        NEW.category,
        NEW.action,
        NEW.count
    )
    ON CONFLICT (date, event_type, category, action)
    DO UPDATE SET
        count = conversion_metrics.count + NEW.count,
        updated_at = NOW();
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic metrics aggregation
CREATE TRIGGER trigger_update_conversion_metrics
    BEFORE INSERT ON conversion_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_conversion_metrics_count();

-- Enable Row Level Security
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies for analytics_events
CREATE POLICY "Allow anonymous insert on analytics_events" ON analytics_events
    FOR INSERT TO anon
    WITH CHECK (true);

CREATE POLICY "Allow authenticated users to view their own events" ON analytics_events
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY "Allow service role full access to analytics_events" ON analytics_events
    FOR ALL TO service_role
    USING (true);

-- Create policies for conversion_metrics
CREATE POLICY "Allow service role full access to conversion_metrics" ON conversion_metrics
    FOR ALL TO service_role
    USING (true);

CREATE POLICY "Allow authenticated users to view conversion_metrics" ON conversion_metrics
    FOR SELECT TO authenticated
    USING (true);

-- Create view for conversion funnel analysis
CREATE OR REPLACE VIEW conversion_funnel_analysis AS
SELECT 
    date,
    event_type,
    category,
    action,
    SUM(count) as total_count,
    LAG(SUM(count)) OVER (PARTITION BY event_type, category ORDER BY date) as previous_count,
    CASE 
        WHEN LAG(SUM(count)) OVER (PARTITION BY event_type, category ORDER BY date) > 0 
        THEN ROUND(
            ((SUM(count) - LAG(SUM(count)) OVER (PARTITION BY event_type, category ORDER BY date)) * 100.0) / 
            LAG(SUM(count)) OVER (PARTITION BY event_type, category ORDER BY date), 
            2
        )
        ELSE NULL 
    END as growth_rate
FROM conversion_metrics
GROUP BY date, event_type, category, action
ORDER BY date DESC, total_count DESC;

-- Create view for daily conversion summary
CREATE OR REPLACE VIEW daily_conversion_summary AS
SELECT 
    date,
    SUM(CASE WHEN event_type = 'cta_interaction' THEN count ELSE 0 END) as cta_clicks,
    SUM(CASE WHEN event_type = 'page_view' THEN count ELSE 0 END) as page_views,
    SUM(CASE WHEN event_type = 'funnel_progression' AND action = 'signup_completed' THEN count ELSE 0 END) as signups,
    CASE 
        WHEN SUM(CASE WHEN event_type = 'page_view' THEN count ELSE 0 END) > 0
        THEN ROUND(
            (SUM(CASE WHEN event_type = 'cta_interaction' THEN count ELSE 0 END) * 100.0) / 
            SUM(CASE WHEN event_type = 'page_view' THEN count ELSE 0 END), 
            2
        )
        ELSE 0 
    END as cta_conversion_rate,
    CASE 
        WHEN SUM(CASE WHEN event_type = 'cta_interaction' THEN count ELSE 0 END) > 0
        THEN ROUND(
            (SUM(CASE WHEN event_type = 'funnel_progression' AND action = 'signup_completed' THEN count ELSE 0 END) * 100.0) / 
            SUM(CASE WHEN event_type = 'cta_interaction' THEN count ELSE 0 END), 
            2
        )
        ELSE 0 
    END as signup_conversion_rate
FROM conversion_metrics
GROUP BY date
ORDER BY date DESC;