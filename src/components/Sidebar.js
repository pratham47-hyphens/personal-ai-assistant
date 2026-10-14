import React from 'react';
import { Plus, MessageSquare, Settings, User } from 'lucide-react';

const Sidebar = ({ onNewChat }) => {
  return (
    <div className="w-64 h-full bg-[#1e1f20] flex flex-col p-4 text-gray-300 transition-all duration-300">
      <button 
        onClick={onNewChat}
        className="flex items-center gap-3 px-4 py-3 bg-[#28292a] hover:bg-[#333537] rounded-full text-sm font-medium transition-colors mb-8 w-fit"
      >
        <Plus size={20} />
        <span>New Chat</span>
      </button>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="text-xs font-semibold text-gray-500 mb-4 px-2 uppercase tracking-wider">Recent</div>
        <div className="space-y-1">
          {/* Chat history would be mapped here */}
          <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[#2d2e30] cursor-pointer transition-colors text-gray-400">
            <MessageSquare size={16} />
            <span className="truncate">Previous Project...</span>
          </div>
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-[#333537] space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[#2d2e30] cursor-pointer transition-colors">
          <Settings size={18} />
          <span>Settings</span>
        </div>
        <div className="flex items-center gap-3 px-3 py-2 text-sm rounded-lg hover:bg-[#2d2e30] cursor-pointer transition-colors">
          <User size={18} />
          <span>Profile</span>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
