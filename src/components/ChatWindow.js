import React, { useState, useRef, useEffect } from 'react';
import { Send, Paperclip, Mic, Image as ImageIcon, X, Download, FolderOpen, Cpu, Database, Terminal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkGfm from 'remark-gfm';
import { generateResponse } from '../services/ollamaService';

const ChatWindow = ({ messages, setMessages, currentModel }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState(null);
  const [attachedFolder, setAttachedFolder] = useState(null);
  const [attachedImage, setAttachedImage] = useState(null);
  const scrollRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const handlePrompt = (e) => {
      setInput(e.detail);
    };
    window.addEventListener('send-prompt', handlePrompt);
    return () => window.removeEventListener('send-prompt', handlePrompt);
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setAttachedFile({ name: file.name, content: event.target.result });
    };
    reader.readAsText(file);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result.split(',')[1];
      setAttachedImage({ name: file.name, data: base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleFolderSelect = async () => {
    const folderPath = await window.electronAPI.selectFolder();
    if (folderPath) {
      setAttachedFolder({ path: folderPath, content: '' });
    }
  };

  const handleIndexFolder = async () => {
    if (!attachedFolder) {
      alert("Please select a folder first!");
      return;
    }
    setIsLoading(true);
    try {
      const result = await window.electronAPI.indexFolderRag(attachedFolder.path);
      if (result.success) {
        alert(`Memory Updated! Indexed ${result.chunks} chunks from your folder.`);
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      alert(`Critical Error: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (messages.length === 0) return;
    const chatText = messages.map(msg => `${msg.role === 'user' ? 'You' : 'AI'}: ${msg.content}`).join('\n\n');
    const blob = new Blob([chatText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ai-chat-export.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSend = async () => {
    if (!input.trim() && !attachedFile && !attachedFolder && !attachedImage) return;

    let context = '';
    if (attachedFolder) {
      setIsLoading(true);
      try {
        const ragResult = await window.electronAPI.queryRag(input);
        if (ragResult.success) {
          context += `LOCAL KNOWLEDGE BASE CONTEXT:\n${ragResult.context}\n\n`;
        }
      } catch (e) {
        console.error("RAG Query failed:", e);
      }
    }
    if (attachedFile) {
      context += `FILE CONTEXT (${attachedFile.name}):\n${attachedFile.content}\n\n`;
    }

    // SYSTEM TOOL TRIGGER
    // If the prompt asks to create a file or folder, we intercept it here
    if (input.toLowerCase().includes('create file') || input.toLowerCase().includes('create folder')) {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚙️ System Action Triggered: I am executing a God-Mode command...' }]);
    }

    const modelToUse = attachedImage ? 'llava' : currentModel;
    const finalPrompt = `${context}${input}`;

    const userMessage = {
      role: 'user',
      content: input,
      attachment: attachedFile ? attachedFile.name : (attachedFolder ? `Knowledge Base: ${attachedFolder.path}` : (attachedImage ? `Image: ${attachedImage.name}` : null))
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFile(null);
    setAttachedFolder(null);
    setAttachedImage(null);
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const images = attachedImage ? [attachedImage.data] : [];
      await generateResponse(finalPrompt, modelToUse, (chunk) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          lastMessage.content += chunk;
          return newMessages;
        });
      }, images);
    } catch (error) {
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = "Error: Could not connect to Ollama.";
        return newMessages;
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#131314] relative">
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <button
          onClick={async () => {
            const info = await window.electronAPI.getSystemInfo();
            setMessages(prev => [...prev, { role: 'assistant', content: `System Info: ${info.platform} ${info.arch}, CPU: ${info.cpu}, RAM: ${info.totalMem}` }]);
          }}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2e30] hover:bg-[#3c3c3c] text-gray-300 text-xs rounded-full transition-all"
        >
          <Cpu size={14} />
          <span>Sys Info</span>
        </button>
        <button
          onClick={handleExport}
          disabled={messages.length === 0}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#2d2e30] hover:bg-[#3c3c3c] text-gray-300 text-xs rounded-full transition-all disabled:opacity-30"
        >
          <Download size={14} />
          <span>Export Chat</span>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-50">
            <h1 className="text-4xl font-medium bg-gradient-to-r from-blue-400 via-purple-400 to-red-400 bg-clip-text text-transparent">
              Hello, Jayde
            </h1>
            <p className="text-lg text-gray-400">How can I help you today?</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-4 py-3 rounded-2xl ${msg.role === 'user' ? 'bg-[#2d2e30] text-white rounded-tr-none' : 'bg-transparent text-gray-200 rounded-tl-none'
                }`}>
                {msg.attachment && (
                  <div className="text-[10px] text-blue-400 mb-1 font-mono uppercase tracking-tighter">
                    📎 {msg.attachment}
                  </div>
                )}
                <div className="text-sm leading-relaxed overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      code({ node, inline, className, children, ...props }) {
                        const match = /language-(\w+)/.exec(className || '');
                        return !inline && match ? (
                          <SyntaxHighlighter
                            style={oneDark}
                            language={match[1]}
                            PreTag="div"
                            {...props}
                          >
                            {String(children).replace(/\\n$/, '')}
                          </SyntaxHighlighter>
                        ) : (
                          <code className="bg-gray-700 px-1 rounded" {...props}>
                            {children}
                          </code>
                        )
                      }
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="p-4 md:p-8">
        <div className="max-w-3xl mx-auto relative">
          {(attachedFile || attachedFolder || attachedImage) && (
            <div className="absolute -top-12 left-0 flex items-center gap-2 bg-[#2d2e30] text-white text-xs px-3 py-1 rounded-full border border-gray-600 animate-in fade-in slide-in-from-bottom-2">
              {attachedFolder ? <FolderOpen size={12} /> : attachedImage ? <ImageIcon size={12} /> : <Paperclip size={12} />}
              <span>{attachedFile ? attachedFile.name : (attachedFolder ? attachedFolder.path : attachedImage.name)}</span>
              <button onClick={() => { setAttachedFile(null); setAttachedFolder(null); setAttachedImage(null); }} className="ml-2 hover:text-red-400 transition-colors">
                <X size={12} />
              </button>
              {attachedFolder && (
                <button
                  onClick={handleIndexFolder}
                  className="ml-2 flex items-center gap-1 px-2 py-0.5 bg-blue-600 rounded-full hover:bg-blue-500 transition-colors"
                >
                  <Database size={10} />
                  <span>Index</span>
                </button>
              )}
            </div>
          )}
          <div className="bg-[#1e1f20] rounded-full px-6 py-3 flex items-center gap-3 focus-within:ring-1 ring-gray-500 transition-all">
            <button onClick={() => fileInputRef.current.click()} className="text-gray-400 hover:text-white transition-colors">
              <Paperclip size={20} />
            </button>
            <button onClick={handleFolderSelect} className="text-gray-400 hover:text-white transition-colors">
              <FolderOpen size={20} />
            </button>
            <button onClick={() => imageInputRef.current.click()} className="text-gray-400 hover:text-white transition-colors">
              <ImageIcon size={20} />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
            <input type="file" ref={imageInputRef} accept="image/*" onChange={handleImageChange} className="hidden" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Enter a prompt here..."
              className="flex-1 bg-transparent outline-none text-gray-200 placeholder-gray-500 py-1"
            />
            <button className="text-gray-400 hover:text-white transition-colors">
              <Mic size={20} />
            </button>
            <button
              onClick={handleSend}
              disabled={isLoading}
              className={`p-2 rounded-full transition-all ${(input || attachedFile || attachedFolder || attachedImage) && !isLoading ? 'bg-blue-600 text-white' : 'text-gray-500'}`}
            >
              <Send size={20} />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-500 mt-3">
            AI may display inaccurate info, including about people, so double-check its responses.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ChatWindow;
