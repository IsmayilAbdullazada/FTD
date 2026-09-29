import React, { useState } from 'react';
import {
  Layers,
  Plus,
  MapPin,
  Users,
  ShieldCheck,
  CheckCircle,
  Globe,
  Radio,
} from 'lucide-react';
import { CommunityGroup, CurrentUser } from '../types';
import { api } from '../services/api';

interface CohortManagementProps {
  cohorts: CommunityGroup[];
  currentUser: CurrentUser;
  onCohortCreated: () => void;
}

export const CohortManagement: React.FC<CohortManagementProps> = ({
  cohorts,
  currentUser,
  onCohortCreated,
}) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [geographicRegion, setGeographicRegion] = useState('');
  const [radiusMiles, setRadiusMiles] = useState('45');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const isClinicianOrAdmin =
    currentUser.role === 'CLINICIAN_MODERATOR' || currentUser.role === 'SYSTEM_ADMIN';

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createCohort({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        geographicRegion: geographicRegion.trim(),
        radiusMiles: Number(radiusMiles) || 45,
      });

      setShowCreateModal(false);
      setName('');
      setSlug('');
      setDescription('');
      setGeographicRegion('');
      setSuccessNotice(`New cohort "${name}" provisioned and immediately active in routing.`);
      setTimeout(() => setSuccessNotice(null), 4000);
      onCohortCreated();
    } catch (err) {
      console.error('Failed to create cohort:', err);
      alert('Failed to provision cohort');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 sm:py-6 space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-serif font-bold text-[#002D72]">
              Regional Cohorts
            </h1>
            <span className="text-[10px] bg-blue-100 text-blue-900 font-bold px-2 py-0.5 rounded-full shrink-0">
              Local Groups
            </span>
          </div>
          <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
            Connect with caregivers in your geographic corridor for local elder law, respite care, and regional resources.
          </p>
        </div>

        {isClinicianOrAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-3.5 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-2xs shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Spin Up New Cohort</span>
          </button>
        )}
      </div>


      {successNotice && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-semibold px-4 py-2.5 rounded-lg flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Cohort Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {cohorts.map((cohort) => (
          <div
            key={cohort.id}
            className="bg-white rounded-xl border border-slate-200 p-4 sm:p-5 space-y-2.5 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-sm sm:text-base text-slate-900 leading-snug">
                  {cohort.name}
                </h3>
                <div className="text-xs text-slate-500">
                  {cohort.isGeneralBoard ? 'Clinic-Wide Forum' : cohort.geographicRegion}
                </div>
              </div>

              <span className="text-xs text-slate-400">
                {cohort.memberCount} members
              </span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-sans">
              {cohort.description}
            </p>
          </div>
        ))}
      </div>

      {/* Dynamic Cohort Creation Modal (US-3.2) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="font-serif font-bold text-base text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#002D72]" />
                <span>Provision New Dynamic Cohort</span>
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cohort Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (!slug) setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
                  }}
                  placeholder="e.g. Western MD / West Virginia Cohort"
                  className="w-full p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#002D72]/20"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Cohort Slug
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. western-md-wv"
                  className="w-full p-2.5 rounded-lg border border-slate-300 font-mono text-[11px]"
                  required
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Geographic Region / Coverage
                </label>
                <input
                  type="text"
                  value={geographicRegion}
                  onChange={(e) => setGeographicRegion(e.target.value)}
                  placeholder="e.g. Hagerstown, Cumberland, Martinsburg"
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Catchment Radius (Miles)
                </label>
                <input
                  type="number"
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div>
                <label className="block font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description for care partners in this geographical cluster..."
                  className="w-full p-2.5 rounded-lg border border-slate-300"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-[#002D72] hover:bg-blue-900 text-white rounded-lg font-bold"
                >
                  {isSubmitting ? 'Creating...' : 'Provision Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
