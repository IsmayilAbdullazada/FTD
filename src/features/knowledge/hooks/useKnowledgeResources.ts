import { GUIDE_TOPICS, normalizeGuideTopic } from '../lib/guideTopics';
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
  onResourcesChanged?: (resources: ClinicalResource[]) => void;
}

export function useKnowledgeResources({
  initialResourceId,
  currentUser,
  onResourcesChanged,
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
  const [editingResource, setEditingResource] =
    useState<ClinicalResource | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] =
    useState<ClinicalResource['category']>('');
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

  useEffect(() => {
    if (!loading) onResourcesChanged?.(resources);
  }, [loading, resources, onResourcesChanged]);

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
    ...GUIDE_TOPICS,
    { key: 'UNCATEGORIZED', label: 'Without a Topic' },
  ];

  const filtered = resources.filter((res) => {
    const matchesCategory =
      selectedCategory === 'ALL' ||
      (selectedCategory === 'UNCATEGORIZED'
        ? !normalizeGuideTopic(res.category)
        : normalizeGuideTopic(res.category) === selectedCategory);
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

    if (!newTitle.trim() || !newSummary.trim()) {
      setFormError('Please fill in the title and summary.');
      return;
    }

    if (!newAudience) {
      setFormError('Please select FTD, Alzheimer’s, or Both.');
      return;
    }

    if (
      !newExternalUrl.trim() &&
      !newPdfFile &&
      !editingResource?.fileAttachmentUrl
    ) {
      setFormError('Please provide an external URL or upload a PDF resource.');
      return;
    }

    setIsSubmitting(true);
    try {
      let fileAttachmentUrl: string | undefined =
        editingResource?.fileAttachmentUrl;
      if (newPdfFile) {
        if (!newPdfFile.name.toLowerCase().endsWith('.pdf')) {
          setFormError('Only PDF files (.pdf) can be attached.');
          return;
        }
        const extracted = await guideApi.extractPdfText(newPdfFile);
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

      const payload = {
        title: newTitle.trim(),
        category: normalizeGuideTopic(newCategory) || newCategory || 'GUIDE',
        summary: newSummary.trim() || newTitle.trim(),
        contentBody: newContentBody.trim() || newSummary.trim(),
        keyTakeaways:
          takeawaysList.length > 0
            ? takeawaysList
            : [newSummary.trim() || newTitle.trim()],
        externalUrl: newExternalUrl.trim() || undefined,
        fileAttachmentUrl,
        additionalLinks,
        diseaseDomain: newAudience,
      };
      const created = editingResource
        ? await contentApi.updateResource(editingResource.id, payload)
        : await contentApi.createResource(payload);

      setResources((prev) => [
        { ...created, source: 'resource', status: 'APPROVED', isActive: true },
        ...prev.filter((item) => item.id !== created.id),
      ]);
      setEditingResource(null);
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

  const openResourceForm = (resource?: ClinicalResource) => {
    setEditingResource(resource || null);
    setNewTitle(resource?.title || '');
    setNewSummary(resource?.summary || '');
    setNewContentBody(resource?.contentBody || '');
    setNewCategory(
      normalizeGuideTopic(resource?.category) || resource?.category || '',
    );
    setNewAudience(resource?.diseaseDomain || '');
    setNewExternalUrl(resource?.externalUrl || '');
    setNewKeyTakeaways(resource?.keyTakeaways.join('\n') || '');
    setNewAdditionalLinks(
      resource?.additionalLinks
        ?.map((link) => `${link.label}|${link.url}`)
        .join('\n') || '',
    );
    setNewPdfFile(null);
    setFormError(null);
    setShowAddModal(true);
  };
  const handleDeleteGuide = async (resource: ClinicalResource) => {
    try {
      if (resource.source === 'guide')
        await guideApi.deleteChatbotGuide(resource.id);
      else await contentApi.deleteResource(resource.id);
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
    openResourceForm,
    resources,
    loadResources,
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
    categories,
    filtered,
    handleCreateGuide,
    handleDeleteGuide,
  };
}
