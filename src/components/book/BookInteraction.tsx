'use client';
import { useState } from 'react';
import { getAuth } from 'firebase/auth';

export default function BookInteraction({ bookId }: { bookId: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const handleInteract = async (action: string) => {
    setLoading(true);
    setMessage('');

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setMessage('Silakan login terlebih dahulu.');
        return;
      }
      const token = await user.getIdToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/books/${bookId}/interact`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setMessage('Interaksi berhasil dicatat!');
      } else {
        setMessage(data.message || 'Gagal mencatat interaksi.');
      }
    } catch (error) {
        console.error('Error interacting with book:', error);
        setMessage('Terjadi kesalahan saat mencatat interaksi.');
    } finally {
      setLoading(false);
    }
  };

return (
    <div className="flex flex-col gap-2 mt-6">
      <div className="flex gap-4">
        <button 
          onClick={() => handleInteract('like')}
          disabled={loading}
          className="px-4 py-2 bg-pink-500 text-white rounded-lg font-medium hover:bg-pink-600 disabled:opacity-50 transition-colors"
        >
          ❤️ Like (Score: 5)
        </button>
        
        <button 
          onClick={() => handleInteract('bookmark')}
          disabled={loading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 transition-colors"
        >
          🔖 Wishlist (Score: 4)
        </button>

        <button 
          onClick={() => handleInteract('read')}
          disabled={loading}
          className="px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 disabled:opacity-50 transition-colors"
        >
          📖 Read (Score: 3)
        </button>
      </div>
      
      {message && <p className="text-sm font-medium mt-2 text-gray-700">{message}</p>}
    </div>
  );
}