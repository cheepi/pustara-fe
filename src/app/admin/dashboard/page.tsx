'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Users, BookOpen, LogOut, Shield } from 'lucide-react';
import ComboLogo from '@/components/icons/ComboLogo';

interface User {
  id: number;
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'reader';
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      setLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch('/api/users', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUsers(data.data || []);
      } else {
        setError('Failed to fetch users');
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Error loading users');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  }

  async function updateUserRole(uid: string, newRole: 'admin' | 'reader') {
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`/api/users/${uid}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        // Refresh users list
        fetchUsers();
      }
    } catch (err) {
      console.error('Error updating role:', err);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navbar */}
      <nav className="bg-slate-800/50 border-b border-slate-700 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-purple-400" />
            <span className="text-white font-bold">Admin Dashboard</span>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl font-bold text-white mb-2">Platform Management</h1>
          <p className="text-slate-400">Manage users and system settings</p>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
        >
          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Users className="w-6 h-6 text-blue-400" />
              <span className="text-slate-400">Total Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{users.length}</p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <Shield className="w-6 h-6 text-purple-400" />
              <span className="text-slate-400">Admins</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {users.filter((u) => u.role === 'admin').length}
            </p>
          </div>

          <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-3">
              <BookOpen className="w-6 h-6 text-cyan-400" />
              <span className="text-slate-400">Readers</span>
            </div>
            <p className="text-3xl font-bold text-white">
              {users.filter((u) => u.role === 'reader').length}
            </p>
          </div>
        </motion.div>

        {/* Users Table */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-800/50 border border-slate-700 rounded-lg overflow-hidden"
        >
          <div className="p-6 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5" />
              All Users
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-400">Loading users...</div>
          ) : error ? (
            <div className="p-8 text-center text-red-400">{error}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr className="border-b border-slate-700">
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Joined
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-semibold text-slate-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4 text-sm text-slate-200">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-slate-200">{user.displayName}</td>
                      <td className="px-6 py-4 text-sm">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            user.role === 'admin'
                              ? 'bg-purple-500/20 text-purple-300'
                              : 'bg-blue-500/20 text-blue-300'
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-400">
                        {new Date(user.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        <select
                          value={user.role}
                          onChange={(e) =>
                            updateUserRole(user.uid, e.target.value as 'admin' | 'reader')
                          }
                          className="bg-slate-700 text-white border border-slate-600 rounded px-2 py-1 text-xs hover:border-slate-500 transition"
                        >
                          <option value="reader">Reader</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
