import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, KanbanSquare, Briefcase, Shield, LogOut, UserX, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Sidebar({ user, onLogout, activePage }) {
  const navigate = useNavigate();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { id: 'kanban', label: 'Kanban Board', icon: KanbanSquare, path: '/kanban' },
    { id: 'jobs', label: 'Jobs', icon: Briefcase, path: '/jobs' },
    { id: 'withdrawals', label: 'Withdrawals', icon: UserX, path: '/withdrawals' },
    { id: 'compliance', label: 'Compliance', icon: Shield, path: '/compliance' },
  ];

  return (
    <div 
      className={`bg-[#1e1b4b] text-white flex flex-col transition-all duration-300 relative ${
        isCollapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Toggle Button */}
      <button
        data-testid="sidebar-toggle-btn"
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-6 z-50 w-6 h-6 bg-[#1e1b4b] border-2 border-indigo-300 rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow-lg"
        aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {isCollapsed ? (
          <ChevronRight className="w-4 h-4 text-white" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white" />
        )}
      </button>

      {/* Header */}
      <div className="p-6 border-b border-indigo-800">
        {!isCollapsed ? (
          <>
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Manrope, sans-serif' }}>Talent Cockpit</h2>
            <p className="text-xs text-indigo-300 mt-1">{user.role.toUpperCase()}</p>
          </>
        ) : (
          <div className="flex justify-center">
            <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center font-bold text-lg">
              TC
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all group ${
                    isActive 
                      ? 'bg-indigo-700 text-white' 
                      : 'text-indigo-200 hover:bg-indigo-800/50 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="text-sm font-medium">{item.label}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-indigo-800">
        {!isCollapsed ? (
          <>
            <div className="mb-3 px-2">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-indigo-300 truncate">{user.email}</p>
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
          </>
        ) : (
          <button
            data-testid="logout-btn-collapsed"
            onClick={onLogout}
            className="w-full flex justify-center p-3 rounded-lg text-indigo-200 hover:bg-indigo-800/50 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
}
