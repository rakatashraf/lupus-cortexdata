import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bot, User, Send, Loader2, Camera, BarChart3, Info, Lightbulb } from 'lucide-react';
import { AIMessage } from '@/types/urban-indices';
import { geminiService } from '@/services/gemini-service';
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
    gemini: true
  });
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Initialize with welcome messages
    const welcomeMessages: AIMessage[] = [
      {
        id: 'welcome-1',
        content: "🏛️ Hello! I'm your AI assistant powered by Gemini 1.5 Flash via n8n for urban planning and policy-making!",
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Gemini 1.5 Flash (via n8n)' }
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
      // Use Gemini 2.5 Flash directly
      const response = await geminiService.generateUrbanInsights(
        userMessage.content,
        { latitude, longitude }
      );

      const assistantMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        content: response,
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Gemini 1.5 Flash (via n8n)' }
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error with Gemini service:', error);
      
      // Show error message - only use Gemini 2.5 Flash
      const errorMessage: AIMessage = {
        id: `assistant-${Date.now()}`,
        content: "🤖 I apologize, but I'm currently unable to connect to the n8n webhook for Gemini 1.5 Flash. Please check the n8n workflow and try again. I only provide responses through n8n → Gemini 1.5 Flash for the best urban planning insights.",
        type: 'assistant',
        timestamp: new Date(),
        metadata: { model: 'Gemini 1.5 Flash (via n8n) - Error' }
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
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
              AI Urban Policy Assistant - Gemini 1.5 Flash (via n8n)
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={serviceStatus.gemini ? "default" : "secondary"}>
                {serviceStatus.gemini ? "🤖 Gemini Active" : "🤖 Limited"}
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
              Connected to Gemini 1.5 Flash via n8n webhook for urban planning and policy-making assistance
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
              <Camera className="h-3 w-3 mr-1" />
              Planning Framework
            </Button>
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