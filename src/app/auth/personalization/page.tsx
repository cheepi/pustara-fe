'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';

const GENRES = [
  'Fiksi', 'Fiksi Ilmiah', 'Misteri', 'Self-Help',
  'Sejarah', 'Nonfiksi', 'Romansa', 'Teenlit',
  'Biografi', 'Sains', 'Filsafat', 'Anak',
];

type Gender = 'Laki-Laki' | 'Perempuan' | 'Tidak ingin diketahui' | '';
type AgeRange = '< 20 Tahun' | '21 - 30 Tahun' | '31 - 40 Tahun' | '> 40 Tahun' | '';

export default function PersonalizationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [gender, setGender]     = useState<Gender>('');
  const [age, setAge]           = useState<AgeRange>('');
  const [genres, setGenres]     = useState<string[]>([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');

  function toggleGenre(g: string) {
    setGenres(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]);
  }

  async function handleNext() {
    if (!user) {
      setError('User tidak valid');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Get Firebase token
      const token = await user.getIdToken();

      // POST survey ke backend
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/survey/save`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          favoriteGenre: genres.join(',') || null,
          age: age || null,
          gender: gender || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Gagal menyimpan preferensi');
      }

      // Also save locally for immediate use
      localStorage.setItem('pustara_personalized', 'true');
      localStorage.setItem('pustara_prefs', JSON.stringify({ gender, age, genres }));

      router.replace('/catalog');
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Terjadi kesalahan';
      setError(errorMsg);
      console.error('Error saving preferences:', err);
    } finally {
      setLoading(false);
    }
  }

  function handleSkip() {
    localStorage.setItem('pustara_personalized', 'true');
    router.replace('/catalog');
  }

  const canProceed = gender !== '' || age !== '' || genres.length > 0;

  return (
    <main className="min-h-screen bg-white max-w-sm mx-auto flex flex-col">
      {/* Header */}
      <div className="px-6 pt-12 pb-4">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="font-serif text-gold font-black text-xs">P</span>
          </div>
          <span className="font-serif text-navy-800 font-bold tracking-wider">PUSTARA</span>
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-xl font-bold text-white">Personalisasi PustarAI</h1>
          <p className="text-slate-500 text-sm mt-1 leading-relaxed">
            Bantu sistem rekomendasi AI kami memberikan rekomendasi yang tepat untukmu
          </p>
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm"
          >
            {error}
          </motion.div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32">
        <motion.div
          className="space-y-7"
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {/* Gender */}
          <section>
            <h2 className="font-semibold text-white text-sm mb-3">Jenis Kelamin</h2>
            <div className="flex flex-col gap-2">
              {(['Laki-Laki', 'Perempuan', 'Tidak ingin diketahui'] as Gender[]).map(g => (
                <RadioOption key={g} label={g} selected={gender === g} onSelect={() => setGender(g)}
                  icon={g === 'Laki-Laki' ? '👨' : g === 'Perempuan' ? '👩' : '🤐'} />
              ))}
            </div>
          </section>

          {/* Age */}
          <section>
            <h2 className="font-semibold text-white text-sm mb-3">Umur</h2>
            <div className="flex flex-col gap-2">
              {(['< 20 Tahun', '21 - 30 Tahun', '31 - 40 Tahun', '> 40 Tahun'] as AgeRange[]).map(a => (
                <RadioOption key={a} label={a} selected={age === a} onSelect={() => setAge(a)} />
              ))}
            </div>
          </section>

          {/* Genres */}
          <section>
            <h2 className="font-semibold text-white text-sm mb-3">Genre Favorit</h2>
            <div className="grid grid-cols-2 gap-2">
              {GENRES.map(g => (
                <GenreChip key={g} label={g}
                  selected={genres.includes(g)} onToggle={() => toggleGenre(g)} />
              ))}
            </div>
          </section>
        </motion.div>
      </div>

      {/* Fixed bottom actions */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-sm
                      bg-white border-t border-slate-100 px-6 py-4 flex gap-3">
        <button onClick={handleSkip} disabled={loading}
          className="flex-1 py-3.5 border border-slate-200 rounded-xl text-sm font-medium
                     text-slate-600 hover:bg-slate-50 active:scale-[0.98] transition-all
                     disabled:opacity-50 disabled:cursor-not-allowed">
          Lewati
        </button>
        <button onClick={handleNext} disabled={!canProceed || loading}
          className="flex-1 py-3.5 bg-navy-700 text-white rounded-xl text-sm font-semibold
                     hover:bg-navy-600 active:scale-[0.98] transition-all disabled:opacity-40
                     disabled:cursor-not-allowed flex items-center justify-center gap-1">
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              Lanjutkan <span>›</span>
            </>
          )}
        </button>
      </div>
    </main>
  );
}

function RadioOption({ label, selected, onSelect, icon }: {
  label: string; selected: boolean; onSelect: () => void; icon?: string;
}) {
  return (
    <button onClick={onSelect}
      className={cn(
        'w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
        selected
          ? 'border-navy-700 bg-navy-50 text-navy-800'
          : 'border-slate-200 bg-white text-slate-700 hover:border-navy-300'
      )}>
      {/* Radio circle */}
      <div className={cn(
        'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
        selected ? 'border-navy-700 bg-navy-700' : 'border-slate-300'
      )}>
        {selected && <div className="w-2 h-2 rounded-full bg-white" />}
      </div>
      {icon && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
}

function GenreChip({ label, selected, onToggle }: {
  label: string; selected: boolean; onToggle: () => void;
}) {
  return (
    <button onClick={onToggle}
      className={cn(
        'flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-all',
        selected
          ? 'border-navy-700 bg-navy-700 text-white'
          : 'border-slate-200 bg-white text-slate-700 hover:border-navy-300'
      )}>
      <div className={cn(
        'w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-all',
        selected ? 'border-white bg-white' : 'border-slate-300'
      )}>
        {selected && <Check className="w-3 h-3 text-navy-700" />}
      </div>
      {label}
    </button>
  );
}
