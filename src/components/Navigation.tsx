import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  icon: string;
  label: string;
  permission?: 'projects' | 'backers' | 'monitoring' | 'reports' | 'ai' | 'admin';
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard',  icon: '◈', label: 'Dashboard'       },
  { to: '/projects',   icon: '⬡', label: 'Projects'        },
  { to: '/backers',    icon: '◎', label: 'Backers',         permission: 'backers'    },
  { to: '/monitoring', icon: '◉', label: 'Monitoring',      permission: 'monitoring' },
  { to: '/competitor', icon: '◇', label: 'Competitor'       },
  { to: '/email',      icon: '◻', label: 'Email Campaigns'  },
  { to: '/leads',      icon: '🎯', label: 'Lead Dashboard'    },
  { to: '/kol',        icon: '🎬', label: 'YouTube KOL'      },
  { to: '/kol-auto',   icon: '🤖', label: 'Auto KOL'         },
  { to: '/snapvital',  icon: '💊', label: 'SnapVital KOL'    },
  { to: '/reports',    icon: '▦', label: 'Reports',         permission: 'reports'    },
];

const ADMIN_ITEM: NavItem = { to: '/admin', icon: '⚙', label: 'Admin', permission: 'admin' };

export default function Navigation() {
  const { user, logout, canAccess } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const w = collapsed ? 64 : 220;

  return (
    <nav style={{
      width: w, minHeight: '100vh', flexShrink: 0,
      background: 'rgba(255,255,255,0.6)',
      backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
      borderRight: '1px solid rgba(255,255,255,0.85)',
      boxShadow: '4px 0 32px rgba(124,58,237,0.06)',
      display: 'flex', flexDirection: 'column',
      padding: '20px 0', transition: 'width 0.22s cubic-bezier(0.4,0,0.2,1)',
      position: 'sticky', top: 0, height: '100vh', zIndex: 50,
    }}>

      {/* Logo */}
      <div style={{ padding: collapsed ? '0 0 20px' : '0 20px 20px', borderBottom: '1px solid rgba(139,92,246,0.1)', marginBottom: 8, display:'flex', alignItems:'center', justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && (
          <img
            src="/logo.png"
            alt="KIP"
            style={{ height: 32, width: 'auto', objectFit: 'contain' }}
          />
        )}
        <button onClick={() => setCollapsed(c => !c)} style={{
          width: 28, height: 28, borderRadius: 8, border: '1px solid rgba(139,92,246,0.15)',
          background: 'rgba(139,92,246,0.06)', color: '#7c3aed', fontSize: 12,
          display:'flex', alignItems:'center', justifyContent:'center', flexShrink: 0,
        }}>
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {/* Nav items */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '4px 8px' }}>
        {NAV_ITEMS.filter(item => !item.permission || canAccess(item.permission)).map(item => (
          <NavItem key={item.to} item={item} collapsed={collapsed} />
        ))}

        {/* Divider before admin */}
        {canAccess('admin') && (
          <>
            <div style={{ margin: '8px 8px', borderTop: '1px solid rgba(139,92,246,0.08)' }} />
            <NavItem item={{ to: '/apollo', icon: '⚡', label: 'Apollo 邮箱富化', permission: 'admin' }} collapsed={collapsed} />
            <NavItem item={ADMIN_ITEM} collapsed={collapsed} />
          </>
        )}
      </div>

      {/* User footer */}
      <div style={{
        padding: collapsed ? '12px 8px' : '12px 12px',
        borderTop: '1px solid rgba(139,92,246,0.1)',
        marginTop: 8,
      }}>
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
            padding: '8px 10px', borderRadius: 10,
            background: 'rgba(139,92,246,0.06)',
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
            }}>
              {(user?.email?.[0] ?? 'U').toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.email}
              </div>
              <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'capitalize', marginTop: 1 }}>
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        )}
        <button onClick={() => { logout(); navigate('/login'); }} style={{
          width: '100%', padding: collapsed ? '8px' : '8px 12px',
          background: 'rgba(239,68,68,0.06)',
          color: '#ef4444', border: '1px solid rgba(239,68,68,0.15)',
          borderRadius: 10, fontSize: 12, fontWeight: 600,
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          transition: 'all 0.18s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.06)'; }}
        >
          <span>⎋</span>
          {!collapsed && <span>Sign out</span>}
        </button>
      </div>
    </nav>
  );
}

function NavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  return (
    <NavLink
      to={item.to}
      style={({ isActive }) => ({
        display: 'flex', alignItems: 'center', gap: 10,
        padding: collapsed ? '10px 0' : '9px 12px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        borderRadius: 10, marginBottom: 2,
        color: isActive ? '#7c3aed' : '#64748b',
        fontWeight: isActive ? 600 : 400,
        fontSize: 13,
        background: isActive ? 'rgba(124,58,237,0.09)' : 'transparent',
        border: isActive ? '1px solid rgba(124,58,237,0.12)' : '1px solid transparent',
        transition: 'all 0.15s',
        textDecoration: 'none',
        whiteSpace: 'nowrap', overflow: 'hidden',
      })}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.classList.contains('active')) {
          el.style.background = 'rgba(124,58,237,0.05)';
          el.style.color = '#7c3aed';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement;
        if (!el.classList.contains('active')) {
          el.style.background = 'transparent';
          el.style.color = '#64748b';
        }
      }}
    >
      <span style={{ fontSize: 15, flexShrink: 0, width: 18, textAlign: 'center' }}>{item.icon}</span>
      {!collapsed && <span>{item.label}</span>}
    </NavLink>
  );
}
