import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, User, Send, Loader2, Camera, BarChart3, Info, Lightbulb } from 'lucide-react';
import { AIMessage } from '@/types/urban-indices';
import { n8nService } from '@/services/n8n-service';
import { API_CONFIG, FALLBACK_MESSAGES } from '@/config/api';
import { cn } from '@/lib/utils';

interface AIChatbotProps {
  latitude?: number;
  longitude?: number;
}

export function AIChatbot({ latitude = 23.8103, longitude = 90.4125 }: AIChatbotProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [serviceStatus, setServiceStatus] = useState({
    gemini: true,
    n8n: true
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize with welcome messages
    const welcomeMessages: AIMessage[] = [
      {
        id: 'welcome-1',
        content: "🏛️ Hello! I'm your AI assistant powered by Gemini 2.5 Flash for urban planning and policy-making!",
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Gemini 2.5 Flash' }
      },
      {
        id: 'welcome-2',
        content: `I specialize in policy-making for urban planners and residents working together:
• 🏛️ Policy recommendations and urban governance
• 🤝 Community engagement strategies for residents
• 📊 Data analysis with policy insights
• 📈 Generate policy-focused charts and visualizations
• 🌍 Collaborative planning between planners & residents
• 💡 Urban sustainability and resident-centered policies`,
        type: 'assistant',
        timestamp: new Date()
      },
      {
        id: 'welcome-3',
        content: `✨ Try asking about:
• 'Policy recommendations for community engagement'
• 'How can residents participate in urban planning?'
• 'Best practices for collaborative policy-making'
• 'Generate a policy framework for sustainable cities'`,
        type: 'assistant',
        timestamp: new Date()
      }
    ];

    setMessages(welcomeMessages);
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: AIMessage = {
      id: `user-${Date.now()}`,
      content: inputMessage.trim(),
      type: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Send to n8n chatbot endpoint
      const response = await n8nService.getChatbotResponse(
        userMessage.content,
        latitude,
        longitude
      );

      let assistantContent = '';
      let metadata = {};

      if (response && response.success !== false) {
          if (response.data && response.data.message) {
            assistantContent = response.data.message;
            metadata = {
              model: response.data.ai_model || 'Gemini 2.5 Flash',
              timestamp: response.data.timestamp
            };
        } else if (response.message) {
          assistantContent = response.message;
        } else {
          assistantContent = JSON.stringify(response, null, 2);
        }
      } else {
        // Fallback to local AI processing
        assistantContent = await processMessageLocally(userMessage.content);
        metadata = { model: 'Local Processing' };
      }

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        content: assistantContent,
        type: 'assistant',
        timestamp: new Date(),
        metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      
      const errorMessage: AIMessage = {
        id: `error-${Date.now()}`,
        content: "I'm having some technical difficulties. Let me try to help you with a general response about urban intelligence and sustainability.",
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Fallback' }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const processMessageLocally = async (message: string): Promise<string> => {
    const lowerMessage = message.toLowerCase();

    // Detect different types of requests
    if (lowerMessage.includes('generate') && (lowerMessage.includes('image') || lowerMessage.includes('photo') || lowerMessage.includes('picture'))) {
      return "🖼️ I can help generate images, but this requires connecting to the image generation service. Please make sure your AI services are properly configured.";
    }

    if (lowerMessage.includes('chart') || lowerMessage.includes('graph') || lowerMessage.includes('visualization')) {
      return `📊 I can help you create data visualizations! Based on your current location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}), I can generate charts showing:

• Climate Resilience Index trends
• Air Quality Health Impact over time
• Urban Heat Vulnerability patterns
• Water Security indicators
• Green Equity Assessment data

Would you like me to create a specific type of chart for your area?`;
    }

    if (lowerMessage.includes('air quality') || lowerMessage.includes('pollution')) {
      return `🌬️ Air Quality Analysis for your area:

Based on typical urban patterns, here are key recommendations:
• Monitor PM2.5 and NO2 levels regularly
• Increase green infrastructure to filter air pollutants
• Promote electric vehicle adoption
• Implement clean energy sources
• Create car-free zones in city centers

The Air Quality Health Impact (AQHI) index considers NO2, PM2.5, PM10, O3, and SO2 concentrations. Lower scores indicate better air quality.`;
    }

    if (lowerMessage.includes('climate') || lowerMessage.includes('temperature') || lowerMessage.includes('heat')) {
      return `🌡️ Climate Resilience Insights:

For your location (${latitude.toFixed(4)}, ${longitude.toFixed(4)}):
• Focus on heat adaptation strategies
• Implement urban cooling solutions
• Enhance green infrastructure coverage
• Prepare for extreme weather events
• Improve flood risk management

The Climate Resilience Index (CRI) measures temperature adaptation, heat wave preparedness, flood management, air quality resilience, and green infrastructure.`;
    }

    if (lowerMessage.includes('sustainability') || lowerMessage.includes('urban planning') || lowerMessage.includes('policy')) {
      return `🏛️ Urban Policy & Sustainability Best Practices for Planners & Residents:

**Policy Development Framework:**
1. **Community Engagement Policies**: Resident participation in planning decisions
2. **Green Infrastructure Policies**: Parks, green roofs, urban forest regulations
3. **Transportation Policies**: Public transit, cycling networks, walkability standards
4. **Energy Transition Policies**: Renewable energy mandates, efficiency standards
5. **Water Management Policies**: Conservation, rainwater harvesting, quality protection
6. **Waste Reduction Policies**: Circular economy, recycling mandates, producer responsibility
7. **Social Equity Policies**: Affordable housing, equal access to green spaces
8. **Smart City Governance**: Data privacy, digital inclusion, transparent technology use

**Collaborative Implementation:**
• Resident advisory councils for policy development
• Community-led sustainability initiatives
• Transparent policy implementation tracking
• Regular feedback mechanisms between planners and residents

*Note: Analysis based on mock data for demonstration purposes.*`;
    }

    if (lowerMessage.includes('data') || lowerMessage.includes('analysis') || lowerMessage.includes('indices')) {
      return `📈 Urban Health Data Analysis:

I can analyze data from 9 key indices:
1. **Climate Resilience Index (CRI)** - Climate adaptation capacity
2. **Urban Heat Vulnerability Index (UHVI)** - Heat risk assessment  
3. **Air Quality Health Impact (AQHI)** - Pollution health effects
4. **Water Security Indicator (WSI)** - Water resource availability
5. **Green Equity Assessment (GEA)** - Green space access
6. **Social Cohesion Metrics (SCM)** - Community connectivity
7. **Environmental Justice Tracker (EJT)** - Equity in environmental burden
8. **Transportation Accessibility Score (TAS)** - Mobility options
9. **Disaster Preparedness Index (DPI)** - Emergency readiness

Each index uses satellite data and ground measurements for comprehensive urban health assessment.`;
    }

    // Default helpful response
    return `🏛️ I'm here to help with urban planning policy-making for planners and residents! 

I can assist with:
• Policy recommendations for urban planners
• Community engagement strategies for residents
• Collaborative policy development frameworks
• Urban health indices analysis and policy implications
• Environmental data interpretation for policy-making
• Sustainability policy recommendations
• Climate adaptation policy strategies
• Resident-centered urban development insights

*All analysis is based on mock data for demonstration purposes.*

What specific aspect of urban policy or collaborative planning would you like to explore?`;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const getMessageIcon = (type: 'user' | 'assistant') => {
    return type === 'user' ? User : Bot;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Urban Policy Assistant - Gemini 2.5 Flash
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={serviceStatus.gemini ? "default" : "secondary"}>
                {serviceStatus.gemini ? "🤖 AI Active" : "🤖 Limited"}
              </Badge>
              <Badge variant={serviceStatus.n8n ? "default" : "secondary"}>
                {serviceStatus.n8n ? "📊 Data Active" : "📊 Offline"}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mock Data Disclaimer */}
          <Alert className="bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-amber-800 dark:text-amber-200">
              <strong>Notice:</strong> All chats are generated/analyzed using mock data for demonstration purposes.
            </AlertDescription>
          </Alert>

          {/* Service Status */}
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Location: {latitude.toFixed(4)}°, {longitude.toFixed(4)}° • 
              Connected to Gemini 2.5 Flash AI for urban planning and policy-making assistance
            </AlertDescription>
          </Alert>

          {/* Chat Messages */}
          <div className="h-96 border border-border rounded-lg bg-muted/20">
            <ScrollArea className="h-full p-4" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((message) => {
                  const Icon = getMessageIcon(message.type);
                  const isUser = message.type === 'user';
                  
                  return (
                    <div
                      key={message.id}
                      className={cn(
                        "flex gap-3 max-w-[80%]",
                        isUser ? "ml-auto flex-row-reverse" : ""
                      )}
                    >
                      <div className={cn(
                        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                        isUser ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                      )}>
                        <Icon className="h-4 w-4" />
                      </div>
                      
                      <div className={cn(
                        "rounded-lg p-3 shadow-sm",
                        isUser ? "bg-primary text-primary-foreground" : "bg-background border border-border"
                      )}>
                        <div className="whitespace-pre-wrap text-sm">
                          {message.content}
                        </div>
                        
                        <div className={cn(
                          "flex items-center gap-2 mt-2 text-xs",
                          isUser ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span>{message.timestamp.toLocaleTimeString()}</span>
                          {message.metadata?.model && (
                            <>
                              <span>•</span>
                              <span>{message.metadata.model}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {isLoading && (
                  <div className="flex gap-3 max-w-[80%]">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center">
                      <Bot className="h-4 w-4" />
                    </div>
                    <div className="rounded-lg p-3 bg-background border border-border">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about urban policy, community engagement, or collaborative planning..."
              className="flex-1"
              disabled={isLoading}
            />
            <Button 
              onClick={sendMessage} 
              disabled={!inputMessage.trim() || isLoading}
              className="bg-gradient-primary hover:shadow-glow"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("What are the best policy recommendations for collaborative urban planning?")}
              disabled={isLoading}
            >
              <Lightbulb className="h-3 w-3 mr-1" />
              Policy Recommendations
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("How can residents participate in urban planning decisions?")}
              disabled={isLoading}
            >
              <Info className="h-3 w-3 mr-1" />
              Resident Engagement
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Show me urban health policy data for this location")}
              disabled={isLoading}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Policy Data
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Generate a collaborative planning framework for this city")}
              disabled={isLoading}
            >
              <BarChart3 className="h-3 w-3 mr-1" />
              Planning Framework
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInputMessage("Generate an image of residents collaborating with urban planners")}
              disabled={isLoading}
            >
              <Camera className="h-3 w-3 mr-1" />
              Generate Image
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearChat}
              disabled={isLoading}
            >
              Clear Chat
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}