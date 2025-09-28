import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Bot, User, Send, Loader2, Camera, BarChart3, Info, Lightbulb, CheckCircle, AlertCircle } from 'lucide-react';
import { AIMessage } from '@/types/urban-indices';
import { geminiService } from '@/services/gemini-service';
import { API_CONFIG, FALLBACK_MESSAGES, checkServiceStatus } from '@/config/api';
import { cn } from '@/lib/utils';

interface AIChatbotProps {
  latitude?: number;
  longitude?: number;
}

export function AIChatbot({ latitude = 23.8103, longitude = 90.4125 }: AIChatbotProps) {
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'online' | 'offline' | 'checking' | 'unknown'>('unknown');
  const [retryCount, setRetryCount] = useState(0);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const serviceStatus = checkServiceStatus();

  useEffect(() => {
    // Initialize with welcome messages
    const welcomeMessages: AIMessage[] = [
      {
        id: 'welcome-1',
        content: "🏛️ Hello! I'm Lupus Cortex AI, powered by Gemini 1.5 Flash for urban planning and policy-making!",
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Lupus Cortex AI (Gemini 1.5 Flash)' }
      },
      {
        id: 'welcome-2',
        content: `I specialize in evidence-based policy development for urban planners and residents:
• 🏛️ Policy recommendations and urban governance frameworks
• 🤝 Community engagement and participatory planning strategies
• 📊 Data-driven analysis with actionable policy insights
• 📈 Implementation roadmaps for sustainable city policies
• 🌍 Collaborative approaches between planners & residents
• 💡 Climate resilience and inclusive urban development`,
        type: 'assistant',
        timestamp: new Date()
      },
      {
        id: 'welcome-3',
        content: `✨ Try asking about:
• 'Policy frameworks for community engagement'
• 'How can we implement resident-centered planning?'
• 'Best practices for sustainable urban governance'
• 'Climate adaptation strategies for cities'`,
        type: 'assistant',
        timestamp: new Date()
      }
    ];

    setMessages(welcomeMessages);
    checkWebhookHealth();
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages are added
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const checkWebhookHealth = async () => {
    setWebhookStatus('checking');
    try {
      const health = await geminiService.checkWebhookHealth();
      setWebhookStatus(health.status);
    } catch (error) {
      setWebhookStatus('offline');
    }
  };

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
    setRetryCount(0);

    try {
      const response = await geminiService.generateUrbanInsights(
        userMessage.content,
        { latitude, longitude }
      );

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        content: response,
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Lupus Cortex AI (Gemini 1.5 Flash)' }
      };

      setMessages(prev => [...prev, assistantMessage]);
      setWebhookStatus('online');

    } catch (error: any) {
      console.error('Error with Lupus Cortex AI service:', error);
      setWebhookStatus('offline');
      
      let errorContent = "I'm experiencing technical difficulties. ";
      
      if (error.message.includes('timeout')) {
        errorContent += "The AI request timed out. Please try a shorter message or try again.";
      } else if (error.message.includes('not found')) {
        errorContent += "AI service endpoint not found. Please check configuration.";
      } else if (error.message.includes('temporarily unavailable')) {
        errorContent += "AI service is temporarily unavailable. Please try again in a moment.";
      } else {
        errorContent += `AI service error: ${error.message}`;
      }

      const errorMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        content: errorContent,
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Lupus Cortex AI - Error' }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const retryLastMessage = () => {
    const lastUserMessage = messages.filter(m => m.type === 'user').pop();
    if (lastUserMessage && retryCount < 3) {
      setInputMessage(lastUserMessage.content);
      setRetryCount(prev => prev + 1);
      checkWebhookHealth();
    }
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
              Lupus Cortex AI
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge 
                variant={webhookStatus === 'online' ? 'default' : webhookStatus === 'offline' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {webhookStatus === 'online' && '🟢 Online'}
                {webhookStatus === 'offline' && '🔴 Offline'}
                {webhookStatus === 'checking' && '🟡 Checking...'}
                {webhookStatus === 'unknown' && '⚪ Unknown'}
              </Badge>
              {webhookStatus === 'offline' && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={checkWebhookHealth}
                  className="text-xs"
                >
                  Retry
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo Notice */}
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>Demo Mode</AlertTitle>
            <AlertDescription>
              AI responses powered by Lupus Cortex webhook with Gemini 1.5 Flash. Using demonstration data for urban planning insights.
            </AlertDescription>
          </Alert>

          {/* Status Alerts */}
          {serviceStatus.n8n && webhookStatus === 'online' && (
            <Alert className="mb-4">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>AI Service Ready</AlertTitle>
              <AlertDescription>
                Lupus Cortex AI is connected and ready for urban intelligence queries.
              </AlertDescription>
            </Alert>
          )}

          {webhookStatus === 'offline' && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Connection Issue</AlertTitle>
              <AlertDescription>
                AI service is currently unavailable. Please check connection and try again.
              </AlertDescription>
            </Alert>
          )}

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
              disabled={!inputMessage.trim() || isLoading || webhookStatus === 'offline'}
              size="sm"
              title={webhookStatus === 'offline' ? 'AI service offline' : 'Send message'}
            >
              {isLoading ? <LoadingSpinner className="h-4 w-4" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3 mb-4">
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What are the key urban health indicators for this location?")}
                className="text-xs"
                disabled={webhookStatus === 'offline' || isLoading}
              >
                Urban Health Indicators
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("How can we improve air quality in dense urban areas?")}
                className="text-xs"
                disabled={webhookStatus === 'offline' || isLoading}
              >
                Air Quality Solutions
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What sustainable transportation policies should cities implement?")}
                className="text-xs"
                disabled={webhookStatus === 'offline' || isLoading}
              >
                Transportation Policy
              </Button>
            </div>
            
            {webhookStatus === 'offline' && retryCount < 3 && (
              <Button
                variant="secondary"
                size="sm"
                onClick={retryLastMessage}
                className="w-full"
              >
                Retry Last Message ({retryCount}/3)
              </Button>
            )}
          </div>

          {/* Clear Chat */}
          <div className="pt-2 border-t border-border">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={clearChat}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear Chat History
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}