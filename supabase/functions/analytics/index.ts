import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsEvent {
  event: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  userId?: string;
  timestamp: number;
  page: string;
  userAgent: string;
  sessionId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    if (req.method === 'POST') {
      const eventData: AnalyticsEvent = await req.json()

      // Validate required fields
      if (!eventData.event || !eventData.category || !eventData.action) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: event, category, action' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Store analytics event in database
      const { error } = await supabase
        .from('analytics_events')
        .insert({
          event_type: eventData.event,
          category: eventData.category,
          action: eventData.action,
          label: eventData.label,
          value: eventData.value,
          user_id: eventData.userId,
          session_id: eventData.sessionId,
          page: eventData.page,
          user_agent: eventData.userAgent,
          timestamp: new Date(eventData.timestamp).toISOString(),
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Database error:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to store analytics event' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Process conversion events for real-time insights
      if (eventData.event === 'cta_interaction') {
        await processConversionEvent(supabase, eventData)
      }

      return new Response(
        JSON.stringify({ success: true, message: 'Event tracked successfully' }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // GET request - return analytics summary
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const timeframe = url.searchParams.get('timeframe') || '24h'
      
      const timeframeHours = timeframe === '7d' ? 168 : timeframe === '30d' ? 720 : 24
      const startTime = new Date(Date.now() - timeframeHours * 60 * 60 * 1000).toISOString()

      // Get conversion metrics
      const { data: events, error } = await supabase
        .from('analytics_events')
        .select('*')
        .gte('timestamp', startTime)
        .order('timestamp', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch analytics data' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Process metrics
      const metrics = processAnalyticsMetrics(events || [])

      return new Response(
        JSON.stringify(metrics),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Function error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function processConversionEvent(supabase: any, eventData: AnalyticsEvent) {
  try {
    // Update conversion funnel metrics
    const { error } = await supabase
      .from('conversion_metrics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        event_type: eventData.event,
        category: eventData.category,
        action: eventData.action,
        count: 1
      }, {
        onConflict: 'date,event_type,category,action',
        ignoreDuplicates: false
      })

    if (error) {
      console.error('Conversion metrics error:', error)
    }
  } catch (error) {
    console.error('Process conversion event error:', error)
  }
}

function processAnalyticsMetrics(events: any[]) {
  const ctaEvents = events.filter(e => e.event_type === 'cta_interaction')
  const pageViews = events.filter(e => e.event_type === 'page_view')
  const funnelEvents = events.filter(e => e.event_type === 'funnel_progression')

  // Calculate conversion rates
  const uniqueSessions = new Set(events.map(e => e.session_id)).size
  const ctaClicks = ctaEvents.length
  const conversionRate = uniqueSessions > 0 ? (ctaClicks / uniqueSessions) * 100 : 0

  // Top CTAs
  const ctaCounts = ctaEvents.reduce((acc: any, event: any) => {
    const key = event.label || 'unknown'
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  const topCTAs = Object.entries(ctaCounts)
    .map(([label, count]) => ({ label, count }))
    .sort((a: any, b: any) => b.count - a.count)
    .slice(0, 5)

  // Funnel analysis
  const funnelSteps = funnelEvents.reduce((acc: any, event: any) => {
    const key = `${event.label}_${event.action}`
    acc[key] = (acc[key] || 0) + 1
    return acc
  }, {})

  // Page performance
  const pageMetrics = pageViews.reduce((acc: any, event: any) => {
    const page = event.page || 'unknown'
    if (!acc[page]) {
      acc[page] = { views: 0, uniqueSessions: new Set() }
    }
    acc[page].views++
    acc[page].uniqueSessions.add(event.session_id)
    return acc
  }, {})

  const topPages = Object.entries(pageMetrics)
    .map(([page, data]: [string, any]) => ({
      page,
      views: data.views,
      uniqueViews: data.uniqueSessions.size
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10)

  return {
    summary: {
      totalEvents: events.length,
      uniqueSessions,
      ctaClicks,
      conversionRate: Math.round(conversionRate * 100) / 100,
      pageViews: pageViews.length
    },
    topCTAs,
    funnelSteps,
    topPages,
    timeframe: events.length > 0 ? {
      start: events[events.length - 1]?.timestamp,
      end: events[0]?.timestamp
    } : null
  }
}