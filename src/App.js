import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import ChatWindow from './components/ChatWindow';
import './index.css';

function App() {
  const [messages, setMessages] = useState([]);

  // Load messages from localStorage on startup
  useEffect(() => {
    const savedMessages = localStorage.getItem('ai_chat_history');
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (e) {
        console.error("Failed to parse chat history", e);
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  const handleNewChat = () => {
    setMessages([]);
    localStorage.removeItem('ai_chat_history');
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar onNewChat={handleNewChat} />
      <ChatWindow messages={messages} setMessages={setMessages} />
    </div>
  );
}

export default App;
