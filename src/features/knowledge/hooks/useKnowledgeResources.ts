import { useEffectEvent } from 'react';
import { contentApi } from '@/features/content/api/contentApi';
import { reportError } from '@/shared/lib/logger';
import { Audience, ClinicalResource, CurrentUser } from '@/types';
import React, { useEffect, useState } from 'react';

export interface KnowledgeBaseExplorerProps {
  initialResourceId?: string | null;
  onClearInitialResource?: () => void;
  currentUser?: CurrentUser;
}

export function useKnowledgeResources({
  initialResourceId,
  currentUser,
}: KnowledgeBaseExplorerProps) {
  const [resources, setResources] = useState<ClinicalResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeResource, setActiveResource] = useState<ClinicalResource | null>(
    null,
  );
  const [newAudience, setNewAudience] = useState<Audience | ''>('');
  const [pendingDelete, setPendingDelete] = useState<ClinicalResource | null>(
    null,
  );

  // Add Source Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ClinicalResource['category']>(
    'BEHAVIORAL_AGITATION',
  );
  const [newSummary, setNewSummary] = useState('');
  const [newContentBody, setNewContentBody] = useState('');
  const [newKeyTakeaways, setNewKeyTakeaways] = useState('');
  const [newExternalUrl, setNewExternalUrl] = useState('');
  const [newAdditionalLinks, setNewAdditionalLinks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [newPdfFile, setNewPdfFile] = useState<File | null>(null);

  const isClinician =
    currentUser?.role === 'CLINICIAN_MODERATOR' ||
    currentUser?.role === 'SYSTEM_ADMIN';

  const loadResources = async () => {
    try {
      const data = await contentApi.getResources();
      setResources(data);
      if (initialResourceId) {
        const match = data.find((r) => r.id === initialResourceId);
        if (match) setActiveResource(match);
      }
    } catch (err) {
      reportError('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadResourcesEffect = useEffectEvent(() => loadResources());
  useEffect(() => {
    loadResourcesEffect();
  }, [initialResourceId, currentUser?.id]);

  const categories = [
    { key: 'ALL', label: 'All Topics' },
    { key: 'BEHAVIORAL_AGITATION', label: 'Behavior and Agitation' },
    { key: 'INCONTINENCE', label: 'Daily Care and Hygiene' },
    { key: 'SAFETY_WANDERING', label: 'Safety and Wandering' },
    { key: 'LEGAL_MEDICAID', label: 'Legal and Financial' },
    { key: 'COMMUNICATION_PPA', label: 'Speech and Communication' },
    { key: 'NUTRITION_DIET', label: 'Eating and Nutrition' },
    { key: 'CAREGIVER_SUPPORT', label: 'Caregiver Support & Wellbeing' },
    { key: 'DAILY_CARE', label: 'Daily Care & Routines' },
    { key: 'GENERAL_EDUCATION', label: 'General Dementia Education' },
  ];

  const filtered = resources.filter((res) => {
    const matchesCategory =
      selectedCategory === 'ALL' || res.category === selectedCategory;
    const matchesSearch =
      res.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (res.contentBody ?? '').toLowerCase().includes(searchQuery.toLowerCase());

    const matchesAudience =
      isClinician ||
      res.diseaseDomain === 'BOTH' ||
      res.diseaseDomain === currentUser?.condition;

    return matchesCategory && matchesSearch && matchesAudience;
  });

  const handleCreateGuide = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !newTitle.trim() ||
      !newSummary.trim() ||
      !newContentBody.trim() ||
      !newAudience ||
      isSubmitting
    )
      return;

    if (!newExternalUrl.trim() && !newPdfFile) {
      setSuccessToast('Please provide an external URL or a PDF resource.');
      return;
    }

    if (!newAudience) {
      setSuccessToast('Please select FTD, Alzheimer’s, or Both.');
      return;
    }

    setIsSubmitting(true);
    try {
      const takeawaysList = newKeyTakeaways
        .split('\n')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);

      const additionalLinks = newAdditionalLinks
        .split('\n')
        .map((line) => {
          const [label, ...urlParts] = line.split('|');
          return {
            label: label.trim(),
            url: urlParts.join('|').trim(),
          };
        })
        .filter((link) => link.label && link.url);

      const created = await contentApi.createResource({
        title: newTitle.trim(),
        category: newCategory,
        summary: newSummary.trim() || newTitle.trim(),
        contentBody: newContentBody.trim(),
        keyTakeaways:
          takeawaysList.length > 0
            ? takeawaysList
            : [newSummary.trim() || newTitle.trim()],
        externalUrl: newExternalUrl.trim() || undefined,
        additionalLinks,
        diseaseDomain: newAudience,
      });

      setResources((prev) => [created, ...prev]);
      setShowAddModal(false);
      setNewTitle('');
      setNewSummary('');
      setNewContentBody('');
      setNewKeyTakeaways('');
      setNewExternalUrl('');
      setSuccessToast(`Guide "${created.title}" successfully published.`);
      setNewAudience('');
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      reportError('Failed to create guide:', err);
      setSuccessToast(
        'Could not save guide. Please verify all fields and try again.',
      );
      setTimeout(() => setSuccessToast(null), 4000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGuide = async (resource: ClinicalResource) => {
    try {
      await contentApi.deleteResource(resource.id);
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      setActiveResource((prev) => (prev?.id === resource.id ? null : prev));
      setPendingDelete(null);
      setSuccessToast(`Guide "${resource.title}" deleted.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      reportError('Failed to delete guide:', err);
      setSuccessToast('Could not delete guide. Please try again.');
      setTimeout(() => setSuccessToast(null), 4000);
    }
  };

  return {
    resources,
    setResources,
    loading,
    setLoading,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    activeResource,
    setActiveResource,
    newAudience,
    setNewAudience,
    pendingDelete,
    setPendingDelete,
    showAddModal,
    setShowAddModal,
    newTitle,
    setNewTitle,
    newCategory,
    setNewCategory,
    newSummary,
    setNewSummary,
    newContentBody,
    setNewContentBody,
    newKeyTakeaways,
    setNewKeyTakeaways,
    newExternalUrl,
    setNewExternalUrl,
    newAdditionalLinks,
    setNewAdditionalLinks,
    isSubmitting,
    setIsSubmitting,
    successToast,
    setSuccessToast,
    newPdfFile,
    setNewPdfFile,
    isClinician,
    loadResources,
    categories,
    filtered,
    handleCreateGuide,
    handleDeleteGuide,
  };
}
