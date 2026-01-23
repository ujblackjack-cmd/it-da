import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate, NavLink } from 'react-router-dom';
import { checkAdminSession, adminLogout } from '../../api/admin.api';

const AdminLayout: React.FC = () => {
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [adminName, setAdminName] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await checkAdminSession();
            if (!response.isAuthenticated) {
                navigate('/login');
            } else {
                setAdminName(response.name || '관리자');
            }
        } catch (error) {
            navigate('/login');
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = async () => {
        try {
            await adminLogout();
            alert('로그아웃 되었습니다.');
            navigate('/login');
        } catch (error) {
            console.error('로그아웃 실패:', error);
            alert('로그아웃 실패');
        }
    };

    const menuItems = [
        { id: 'dashboard', name: '대시보드', icon: '📊', path: '/admin/dashboard' },
        { id: 'users', name: '회원 관리', icon: '👥', path: '/admin/users' },
        { id: 'meetings', name: '모임 관리', icon: '🎯', path: '/admin/meetings' },
        { id: 'reports', name: '신고 관리', icon: '⚠️', path: '/admin/reports' },
        { id: 'inquiries', name: '1:1 문의', icon: '💬', path: '/admin/inquiries' },
        { id: 'notices', name: '공지사항', icon: '📢', path: '/admin/notices' },
        { id: 'settings', name: '시스템 설정', icon: '⚙️', path: '/admin/settings' },
    ];

    if (loading) {
        return (
            <div style={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <div style={{ fontSize: '1.25rem' }}>로딩 중...</div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f3f4f6' }}>
            {/* Header */}
            <header style={{
                backgroundColor: 'white',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '1rem 1.5rem'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            style={{
                                padding: '0.5rem',
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                fontSize: '1.5rem',
                                display: window.innerWidth < 1024 ? 'block' : 'none'
                            }}
                        >
                            {sidebarOpen ? '✕' : '☰'}
                        </button>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#2563eb' }}>
                            IT-DA 관리자
                        </h1>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span style={{ fontSize: '0.875rem', color: '#4b5563' }}>{adminName}님</span>
                        <button
                            onClick={handleLogout}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                padding: '0.5rem 1rem',
                                backgroundColor: '#f3f4f6',
                                border: 'none',
                                borderRadius: '0.5rem',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                        >
                            <span>🚪</span>
                            <span>로그아웃</span>
                        </button>
                    </div>
                </div>
            </header>

            <div style={{ display: 'flex' }}>
                {/* Sidebar */}
                <aside style={{
                    width: '256px',
                    backgroundColor: 'white',
                    minHeight: 'calc(100vh - 73px)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    display: sidebarOpen ? 'block' : 'none'
                }}>
                    <nav style={{ padding: '1rem' }}>
                        {menuItems.map((item) => (
                            <NavLink
                                key={item.id}
                                to={item.path}
                                style={({ isActive }) => ({
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '0.75rem',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.5rem',
                                    marginBottom: '0.5rem',
                                    textDecoration: 'none',
                                    transition: 'background-color 0.2s',
                                    backgroundColor: isActive ? '#3b82f6' : 'transparent',
                                    color: isActive ? 'white' : '#374151'
                                })}
                            >
                                <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
                                <span>{item.name}</span>
                            </NavLink>
                        ))}
                    </nav>
                </aside>

                {/* Main Content */}
                <main style={{ flex: 1, padding: '2rem' }}>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;