"use client";

import React, { useState, useRef, useEffect } from 'react';
import { type CoreMessage } from 'ai';
import { continueConversation } from './actions';
import { readStreamableValue } from 'ai/rsc';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from 'react-markdown';
import { Loader2 } from 'lucide-react';

export const maxDuration = 30;

export default function Chat() {
  const [messages, setMessages] = useState<CoreMessage[]>([]);
  const [input, setInput] = useState('');
  const [data, setData] = useState<any>();
  const [isLoading, setIsLoading] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current && buttonRef.current) {
      const buttonHeight = buttonRef.current.offsetHeight;
      textareaRef.current.style.height = `${buttonHeight}px`;
    }
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.max(textareaRef.current.scrollHeight, buttonRef.current?.offsetHeight || 0)}px`;
    }
  }, [input]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    setIsLoading(true);
    const newMessages: CoreMessage[] = [
      ...messages,
      { content: input, role: 'user' },
    ];
    setMessages(newMessages);
    setInput('');
    try {
      const result = await continueConversation(newMessages) as any;
      setData(result.data);
      for await (const content of readStreamableValue(result.message)) {
        setMessages([
          ...newMessages,
          {
            role: 'assistant',
            content: content as string + 
            `\n\n---\n\n` +
            `The issue is most likely ${JSON.parse(result.ml_response).predicted_topic} ` +
            `with a probability of ${(JSON.parse(result.ml_response).likelihood as number * 100).toFixed(2)}%.`,
          },
        ]);
      }
    } catch (error) {
      console.error('Error in conversation:', error);
      setMessages([
        ...newMessages,
        {
          role: 'assistant',
          content: "I'm sorry, there was an error processing your request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  const renderMessageContent = (content: string) => {
    const paragraphs = content.split('\n\n');
    return paragraphs.map((paragraph, index) => (
      <ReactMarkdown key={index} className="text-sm prose max-w-none break-words mb-4">
        {paragraph}
      </ReactMarkdown>
    ));
  };

  return (
    <div className="flex flex-col h-[calc(100dvh)]">
      <Card className="flex flex-col h-full w-full max-w-2xl mx-auto shadow-none sm:shadow sm:my-4 sm:rounded-lg">
        <CardHeader className="p-3 sm:p-4 border-b">
          <CardTitle className="text-lg sm:text-xl">Therapist Assistant Chatbot</CardTitle>
        </CardHeader>
        <CardContent className="flex-grow overflow-hidden p-2 sm:p-4">
          <div 
            ref={messagesContainerRef}
            className="h-full overflow-y-auto pr-2 sm:pr-4 pb-4"
            style={{
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {data && <pre className="text-xs overflow-x-auto">{JSON.stringify(data, null, 2)}</pre>}
            {messages.map((m, i) => (
              <div key={i} className={`mb-3 ${m.role === 'user' ? 'text-right' : 'text-left'}`}>
                <Card className={`inline-block max-w-[85%] ${m.role === 'user' ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  <CardContent className="p-2">
                    <p className="text-xs font-semibold mb-1">{m.role === 'user' ? 'You' : 'AI'}</p>
                    {renderMessageContent(m.content as string)}
                  </CardContent>
                </Card>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-center items-center mt-4">
                <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                <span className="ml-2 text-sm text-gray-500">AI is thinking...</span>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="sticky bottom-0 p-2 sm:p-4 border-t bg-white">
          <form 
            onSubmit={handleSubmit} 
            className="flex w-full space-x-2 items-end"
          >
            <Textarea
              ref={textareaRef}
              className="flex-grow text-sm resize-none overflow-hidden min-h-[40px]"
              value={input}
              placeholder="Type your message..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              disabled={isLoading}
              rows={1}
              style={{ fontSize: '16px', lineHeight: '1.5' }}
            />
            <Button 
              ref={buttonRef}
              type="submit" 
              disabled={isLoading} 
              className="text-sm px-3 sm:px-4 h-10"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send'
              )}
            </Button>
          </form>
        </CardFooter>
      </Card>
    </div>
  );
}