import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Briefcase, Shield, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Sidebar({ user, onLogout, activePage }) {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare, path: '/kanban' },
    { id: 'jobs', label: 'Jobs', icon: Briefcase, path: '/jobs' },
    { id: 'compliance', label: 'Compliance', icon: Shield, path: '/compliance' },
  ];

  return (
    <div className="w-64 bg-[#1e1b4b] text-white flex flex-col">
      <div className="p-6 border-b border-indigo-800">
        <h2 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Talent Cockpit</h2>
        <p className="text-xs text-indigo-300 mt-1">{user.role.toUpperCase()}</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            return (
              <li key={item.id}>
                <button
                  data-testid={`nav-${item.id}`}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive 
                      ? 'bg-indigo-700 text-white' 
                      : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{item.label}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-4 border-t border-indigo-800">
        <div className="mb-3 px-2">
          <p className="text-sm font-medium text-white">{user.name}</p>
          <p className="text-xs text-indigo-300">{user.email}</p>
        </div>
        <Button
          data-testid="logout-btn"
          onClick={onLogout}
          variant="ghost"
          className="w-full justify-start text-indigo-200 hover:bg-indigo-800/50 hover:text-white"
        >
          <LogOut className="w-5 h-5 mr-3" />
          Logout
        </Button>
      </div>
    </div>
  );
}
