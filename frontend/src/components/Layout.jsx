import React from 'react';
import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import ChatBot from './ChatBot';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-content">
        <Header onMenuClick={() => setSidebarOpen(true)} />
        <div className="page-body">
          <Outlet />
        </div>
      </div>
      <ChatBot />
    </div>
  );
}
