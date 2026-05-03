import { Bell, Search } from 'lucide-react';
import { useState } from 'react';
import useAuthStore from '../../store/authStore';

export default function Header({ title, actions }) {
  const { user } = useAuthStore();

  return (
    <header className="h-14 flex items-center justify-between px-6 border-b border-gray-800 bg-gray-950/80 backdrop-blur shrink-0">
      <h2 className="text-base font-semibold text-gray-100">{title}</h2>
      <div className="flex items-center gap-2">
        {actions}
      </div>
    </header>
  );
}
