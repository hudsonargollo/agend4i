import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, providerInfo } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from provider info
    const serviceList = providerInfo.services
      .map((s: any) => `- ${s.name} (${s.duration} min, R$ ${s.price}): ${s.description}`)
      .join('\n');

    const professionals = providerInfo.professionals
      .map((p: any) => `- ${p.name} (${p.role})`)
      .join('\n');

    const policies = providerInfo.policies?.join('\n- ') || "Regras padrão aplicadas.";
    
    const loyaltyInfo = providerInfo.loyaltyProgram?.enabled
      ? `PROGRAMA DE FIDELIDADE: Oferecemos ${providerInfo.loyaltyProgram.rewardDescription} a cada ${providerInfo.loyaltyProgram.threshold} visitas.`
      : "Sem programa de fidelidade ativo no momento.";

    const systemPrompt = `Você é o Recepcionista Virtual da ${providerInfo.name}.
Seu objetivo é ajudar clientes a escolher serviços, entender as regras e tirar dúvidas.

Informações do Negócio:
- Nome: ${providerInfo.name}
- Localização: ${providerInfo.location}
- Avaliação: ${providerInfo.rating}/5 estrelas

Profissionais:
${professionals}

Serviços Disponíveis:
${serviceList}

Regras:
- ${policies}

${loyaltyInfo}

Diretrizes:
- Seja breve, amigável e prestativo (fale em Português).
- Se perguntarem sobre profissionais, liste quem trabalha aqui.
- Recomende serviços com base no que o cliente quer.
- Não invente horários; diga apenas que você pode verificar a agenda.
- Use emojis ocasionalmente.
- Se perguntarem como agendar, encoraje-os a selecionar os serviços e clicar em "Continuar".`;

    console.log("Calling Lovable AI Gateway with message:", messages[messages.length - 1]);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Tente novamente em alguns segundos." }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos esgotados. Entre em contato com o suporte." }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      return new Response(JSON.stringify({ error: "Erro ao conectar com a IA" }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || "Desculpe, não consegui processar sua mensagem.";
    
    console.log("AI response received:", aiResponse.substring(0, 100));

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error("chat-ai error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
