import { useEffectEvent } from 'react';
import { contentApi } from '@/features/content/api/contentApi';
import { guideApi } from '@/features/knowledge/api/guideApi';
import { reportError } from '@/shared/lib/logger';
import { Audience, ClinicalResource, CurrentUser } from '@/types';
import React, { useEffect, useState } from 'react';

export interface KnowledgeBaseExplorerProps {
  initialResourceId?: string | null;
  onClearInitialResource?: () => void;
  currentUser?: CurrentUser;
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      if (!base64) {
        reject(new Error('Could not read the selected PDF file.'));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () =>
      reject(new Error('Could not read the selected PDF file.'));
    reader.readAsDataURL(file);
  });
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
  const [toastTone, setToastTone] = useState<'success' | 'error'>('success');
  const [formError, setFormError] = useState<string | null>(null);
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
      setToastTone('error');
      setSuccessToast('Could not load care guides. Please refresh the page.');
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
    if (isSubmitting) return;
    setFormError(null);

    if (!newTitle.trim() || !newSummary.trim() || !newContentBody.trim()) {
      setFormError('Please fill in the title, summary, and protocol content.');
      return;
    }

    if (!newAudience) {
      setFormError('Please select FTD, Alzheimer’s, or Both.');
      return;
    }

    if (!newExternalUrl.trim() && !newPdfFile) {
      setFormError('Please provide an external URL or upload a PDF resource.');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileAttachmentUrl: string | undefined;
      if (newPdfFile) {
        if (!newPdfFile.name.toLowerCase().endsWith('.pdf')) {
          setFormError('Only PDF files (.pdf) can be attached.');
          return;
        }
        const fileBase64 = await readFileAsBase64(newPdfFile);
        const extracted = await guideApi.extractPdfText({
          fileName: newPdfFile.name,
          fileBase64,
        });
        if (!extracted.pdfUrl) {
          throw new Error('The uploaded PDF could not be stored.');
        }
        fileAttachmentUrl = extracted.pdfUrl;
      }

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
        fileAttachmentUrl,
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
      setNewAdditionalLinks('');
      setNewPdfFile(null);
      setNewAudience('');
      setFormError(null);
      setToastTone('success');
      setSuccessToast(`Guide "${created.title}" successfully published.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      reportError('Failed to create guide:', err);
      setFormError(
        err instanceof Error && err.message
          ? err.message
          : 'Could not save guide. Please verify all fields and try again.',
      );
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
      setToastTone('success');
      setSuccessToast(`Guide "${resource.title}" deleted.`);
      setTimeout(() => setSuccessToast(null), 3500);
    } catch (err) {
      reportError('Failed to delete guide:', err);
      setToastTone('error');
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
    toastTone,
    formError,
    setFormError,
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
