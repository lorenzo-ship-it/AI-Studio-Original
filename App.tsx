import React, { useState, useCallback } from 'react';
import { Outfit, OutfitStatus } from './types';
import OutfitManager from './components/OutfitManager';
import { PlusIcon } from './components/Icons';

function App() {
  const [outfits, setOutfits] = useState<Outfit[]>([]);

  const addOutfit = () => {
    const newOutfit: Outfit = {
      id: new Date().toISOString(),
      name: `New Outfit ${outfits.length + 1}`,
      status: OutfitStatus.CONFIGURING,
      initialImage: null,
      detectedCategories: [],
      confirmedCategories: new Set(),
      slots: {},
      shotQueue: [],
      currentShotIndex: 0,
      generatedImages: [],
      correctivePrompts: [],
      errorMessage: null,
    };
    setOutfits(prev => [newOutfit, ...prev]);
  };
  
  const updateOutfit = useCallback((id: string, updater: Partial<Outfit> | ((prev: Outfit) => Partial<Outfit>)) => {
    setOutfits(prevOutfits =>
      prevOutfits.map(o => {
        if (o.id === id) {
          const updates = typeof updater === 'function' ? updater(o) : updater;
          return { ...o, ...updates };
        }
        return o;
      })
    );
  }, []);

  const removeOutfit = (id: string) => {
    setOutfits(prev => prev.filter(o => o.id !== id));
  };


  return (
    <div className="min-h-screen bg-stone-50 text-stone-800">
      <header className="bg-white/80 backdrop-blur-lg sticky top-0 z-10 border-b border-stone-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg"></div>
                 <h1 className="text-2xl font-bold text-stone-800 tracking-tight">AI Fashion Studio</h1>
              </div>
              <button
                onClick={addOutfit}
                className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
              >
                <PlusIcon className="w-5 h-5" />
                <span>New Outfit</span>
              </button>
          </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {outfits.length === 0 ? (
          <div className="text-center py-20">
            <h2 className="text-2xl font-semibold text-stone-600">Welcome to your studio!</h2>
            <p className="mt-2 text-stone-500">Click "New Outfit" to begin a new fashion photoshoot.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {outfits.map(outfit => (
              <OutfitManager key={outfit.id} outfit={outfit} updateOutfit={updateOutfit} removeOutfit={removeOutfit} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
