'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { Settings, CheckCircle2, Sliders, Database, Save, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

export default function RulesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [activeVersion, setActiveVersion] = useState<any | null>(null);
  const [values, setValues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const res = await api.get('/rules/categories');
      setCategories(res.data || []);
      if (res.data?.length > 0) {
        setSelectedCat(res.data[0].id);
        fetchDefinitionsAndVersion(res.data[0].id);
      }
    } catch (e) {
      console.error('Failed fetching categories', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDefinitionsAndVersion = async (categoryId: number) => {
    try {
      setLoading(true);
      const defRes = await api.get('/rules/definitions', { params: { categoryId } });
      setDefinitions(defRes.data || []);

      if (defRes.data?.length > 0) {
        const firstDef = defRes.data[0];
        const verRes = await api.get('/rules/versions', { params: { definitionId: firstDef.id } });
        if (verRes.data?.length > 0) {
          const ver = verRes.data[0];
          setActiveVersion(ver);
          const valRes = await api.get(`/rules/versions/${ver.id}/values`);
          setValues(valRes.data || ver.values || []);
        } else {
          setActiveVersion(null);
          setValues([]);
        }
      } else {
        setDefinitions([]);
        setActiveVersion(null);
        setValues([]);
      }
    } catch (e) {
      console.error('Failed fetching rules data', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (id: number) => {
    setSelectedCat(id);
    setMessage(null);
    fetchDefinitionsAndVersion(id);
  };

  const handleValueChange = (index: number, newVal: string) => {
    const updated = [...values];
    updated[index].value = newVal;
    setValues(updated);
  };

  const handleSavePolicy = async () => {
    if (!activeVersion) return;
    try {
      setSaving(true);
      setMessage(null);
      await api.put(`/rules/versions/${activeVersion.id}/values`, { values });
      setMessage(`Successfully updated and version-locked parameters for ${activeVersion.definition?.name || 'Policy 2026'}`);
    } catch (e: any) {
      setMessage(`Error saving rules: ${e.response?.data?.message || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
            <Settings className="text-indigo-400" /> Dynamic Rule Engine & Policy Vault
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Modify enterprise thresholds, late grace allowances, meal rates, and OT multipliers in real-time without code deployments.
          </p>
        </div>

        {activeVersion && (
          <button
            onClick={handleSavePolicy}
            disabled={saving || loading}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 self-start md:self-auto"
          >
            {saving ? <RefreshCw size={16} className="animate-spin" /> : <Save size={16} />}
            <span>Save & Activate Rule Changes</span>
          </button>
        )}
      </div>

      {message && (
        <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-3.5 text-xs text-emerald-300 flex items-center gap-2">
          <CheckCircle2 size={16} />
          <span>{message}</span>
        </div>
      )}

      {/* Categories Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-neutral-800 pb-4">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryChange(cat.id)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              selectedCat === cat.id
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-500/20 border border-indigo-400/30'
                : 'bg-neutral-900/60 text-neutral-400 border border-neutral-800 hover:text-white hover:bg-neutral-800'
            }`}
          >
            <Sliders size={14} />
            <span>{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Rule Definition & Policy Editor */}
      {loading ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center text-neutral-500">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 text-indigo-400" />
          <span>Fetching dynamic schema and active version values...</span>
        </div>
      ) : !activeVersion ? (
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/40 p-12 text-center text-neutral-500">
          <Database size={24} className="mx-auto mb-3 text-neutral-600" />
          <span>No rule definitions found for this category. Run `npx prisma db seed` to initialize the 2026 policy.</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Version Info Card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between">
              <Badge variant="info">Active Version #{activeVersion.versionNumber}</Badge>
              <span className="text-[11px] font-mono text-indigo-400">Locked in DB</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {definitions[0]?.name || activeVersion.definition?.name || 'Policy Version 1'}
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                {definitions[0]?.description || 'Enterprise configuration parameters affecting attendance calculators and payroll.'}
              </p>
            </div>
            <div className="pt-4 border-t border-neutral-800 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-400">
                <span>Effective Date:</span>
                <span className="text-neutral-200 font-mono">2026-01-01</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>Department Overrides:</span>
                <span className="text-emerald-400 font-semibold">Enabled (dept_id_key)</span>
              </div>
              <div className="flex justify-between text-neutral-400">
                <span>In-Memory TTL Cache:</span>
                <span className="text-indigo-400 font-mono">300,000 ms (5 mins)</span>
              </div>
            </div>
          </div>

          {/* Rule Values Form */}
          <div className="lg:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 backdrop-blur-md space-y-5">
            <h3 className="text-base font-bold text-white border-b border-neutral-800 pb-3 flex items-center justify-between">
              <span>Configurable Policy Parameters ({values.length})</span>
              <span className="text-xs font-normal text-neutral-400">Type-Safe Key/Value Store</span>
            </h3>

            {values.length === 0 ? (
              <p className="text-xs text-neutral-500 text-center py-6">No individual key values found for this version.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {values.map((val, idx) => (
                  <div key={val.key || idx} className="rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">
                        {val.key}
                      </label>
                      <Badge variant="outline" className="text-[10px] py-0">
                        {val.valueType}
                      </Badge>
                    </div>
                    <input
                      type="text"
                      value={val.value}
                      onChange={(e) => handleValueChange(idx, e.target.value)}
                      className="w-full rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 font-mono focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
