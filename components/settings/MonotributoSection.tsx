import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { Plus, Pencil, Check, X } from 'lucide-react';

const formatARS = (n: number) => Math.abs(Math.round(n)).toLocaleString('es-AR');

const MonotributoSection: React.FC = () => {
  const monotributoCats = useQuery(api.queries.monotributo.listCategories) ?? [];
  const currentMonoLetter = useQuery(api.queries.monotributo.getCurrentCategory);
  const seedMonoCategories = useMutation(api.mutations.monotributo.seedDefaultCategories);
  const updateMonoCategory = useMutation(api.mutations.monotributo.updateCategory);
  const setCurrentMonoCategory = useMutation(api.mutations.monotributo.setCurrentCategory);
  const [editingMonoId, setEditingMonoId] = useState<Id<"monotributoCategories"> | null>(null);
  const [monoEditMaxBilling, setMonoEditMaxBilling] = useState('');
  const [monoEditTotalGoods, setMonoEditTotalGoods] = useState('');
  const [monoSeeding, setMonoSeeding] = useState(false);

  const handleSeedMono = async () => {
    if (!window.confirm('¿Cargar la escala ARCA por defecto (categorías A a K)?')) return;
    setMonoSeeding(true);
    try {
      await seedMonoCategories();
    } catch (e: any) {
      alert(e.message || 'Error al inicializar');
    } finally {
      setMonoSeeding(false);
    }
  };

  const startEditMono = (cat: typeof monotributoCats[0]) => {
    setEditingMonoId(cat._id);
    setMonoEditMaxBilling(String(Math.round(cat.maxBilling)));
    setMonoEditTotalGoods(String(cat.totalGoods.toFixed(2)));
  };

  const cancelEditMono = () => {
    setEditingMonoId(null);
    setMonoEditMaxBilling('');
    setMonoEditTotalGoods('');
  };

  const saveEditMono = async () => {
    if (!editingMonoId) return;
    const parseAR = (s: string) => {
      const clean = s.replace(/[^\d.,\-]/g, '').replace(/\./g, '').replace(',', '.');
      return parseFloat(clean) || 0;
    };
    try {
      await updateMonoCategory({
        id: editingMonoId,
        maxBilling: parseAR(monoEditMaxBilling),
        totalGoods: parseAR(monoEditTotalGoods),
      });
      cancelEditMono();
    } catch (e: any) {
      alert(e.message || 'Error al guardar');
    }
  };

  const handleSetCurrentMono = async (letter: string) => {
    try {
      await setCurrentMonoCategory({ letter });
    } catch (e: any) {
      alert(e.message || 'Error al cambiar la categoría');
    }
  };

  return (
    <div className="p-4 space-y-4">
      {monotributoCats.length === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-xs font-bold text-emerald-700 mb-3">
            Todavía no cargaste la escala. Inicializala con los valores actuales de ARCA (vas a poder editar cada fila después).
          </p>
          <button
            onClick={handleSeedMono}
            disabled={monoSeeding}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-xl text-xs flex items-center gap-2 mx-auto disabled:opacity-50"
          >
            {monoSeeding ? '...' : <><Plus className="w-3.5 h-3.5" /> Inicializar valores ARCA</>}
          </button>
        </div>
      ) : (
        <>
          {/* Selector de categoría actual */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Tu categoría actual
            </label>
            <div className="flex flex-wrap gap-2">
              {monotributoCats.map((c) => {
                const isActive = c.letter === currentMonoLetter;
                return (
                  <button
                    key={c._id}
                    type="button"
                    onClick={() => handleSetCurrentMono(c.letter)}
                    className={`w-10 h-10 rounded-xl font-black text-sm border-2 transition-all active:scale-90 ${
                      isActive
                        ? 'bg-emerald-500 text-white border-emerald-500 shadow-md'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-emerald-300'
                    }`}
                  >
                    {c.letter}
                  </button>
                );
              })}
            </div>
            {currentMonoLetter && (
              <p className="text-[10px] text-slate-500 mt-2">
                La contadora va a usar la categoría <span className="font-black text-emerald-600">{currentMonoLetter}</span> como referencia para los cálculos.
              </p>
            )}
          </div>

          {/* Tabla editable de categorías */}
          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-2">
              Escala completa
            </label>
            <p className="text-[10px] text-slate-500 mb-3">
              Tocá el lápiz para editar el tope anual o el monto mensual de cualquier categoría. Actualizala cuando ARCA cambie los valores.
            </p>
            <div className="space-y-1.5">
              {monotributoCats.map((c) => {
                const isEditing = editingMonoId === c._id;
                const isCurrent = c.letter === currentMonoLetter;
                return (
                  <div
                    key={c._id}
                    className={`rounded-xl border-2 p-3 transition-colors ${
                      isCurrent
                        ? 'border-emerald-300 bg-emerald-50/40'
                        : 'border-slate-100 bg-slate-50/30'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-lg flex items-center justify-center font-black text-sm shrink-0 ${
                          isCurrent ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {c.letter}
                      </div>
                      {isEditing ? (
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                              Tope anual
                            </label>
                            <input
                              type="text"
                              value={monoEditMaxBilling}
                              onChange={(e) => setMonoEditMaxBilling(e.target.value)}
                              placeholder="0"
                              className="w-full h-9 px-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">
                              Monto mensual
                            </label>
                            <input
                              type="text"
                              value={monoEditTotalGoods}
                              onChange={(e) => setMonoEditTotalGoods(e.target.value)}
                              placeholder="0"
                              className="w-full h-9 px-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-slate-700 outline-none focus:border-emerald-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              Tope anual
                            </p>
                            <p className="text-xs font-black text-slate-700 tracking-tighter">
                              ${formatARS(c.maxBilling)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                              Monto mensual
                            </p>
                            <p className="text-xs font-black text-emerald-700 tracking-tighter">
                              ${formatARS(c.totalGoods)}
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        {isEditing ? (
                          <>
                            <button
                              type="button"
                              onClick={saveEditMono}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
                              aria-label="Guardar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditMono}
                              className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors"
                              aria-label="Cancelar"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditMono(c)}
                            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors"
                            aria-label={`Editar categoría ${c.letter}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonotributoSection;
