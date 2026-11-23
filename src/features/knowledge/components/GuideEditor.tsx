import { useEffect, useEffectEvent, useState } from 'react';
import type { CurrentUser } from '@/types';
import type { ChatbotGuideFile } from '../types';
import { useGuideManagement } from '../hooks/useGuideManagement';
import { GuideUploadDialog } from './GuideUploadDialog';
export function GuideEditor({
  currentUser,
  guide,
  onClose,
  onSaved,
}: {
  currentUser: CurrentUser;
  guide?: ChatbotGuideFile;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [notice, setNotice] = useState<string | null>(null);
  const g = useGuideManagement({
    currentUser,
    onQueueUpdated: () => {},
    setActionSuccessNotice: setNotice,
  });
  const open = useEffectEvent(() => {
    if (guide) g.handleOpenReviewModal(guide);
    else g.setShowUploadGuideModal(true);
  });
  useEffect(() => {
    open();
  }, [guide]);
  return (
    <>
      {notice && (
        <p
          role="status"
          className="fixed bottom-4 left-4 right-4 z-[100] rounded-lg bg-white p-4 text-slate-900 shadow-xl"
        >
          {notice}
        </p>
      )}
      <GuideUploadDialog
        open={g.showUploadGuideModal}
        onClose={onClose}
        title={g.uploadTitle}
        onTitleChange={g.setUploadTitle}
        condition={g.uploadCondition}
        onConditionChange={g.setUploadCondition}
        topicTag={g.uploadTopicTag}
        onTopicTagChange={g.setUploadTopicTag}
        fileName={g.uploadFileName}
        pages={g.uploadPages}
        showExtractedInspector={g.showExtractedInspector}
        onShowExtractedInspectorChange={g.setShowExtractedInspector}
        selectedInspectPage={g.selectedInspectPage}
        onSelectedInspectPageChange={g.setSelectedInspectPage}
        showMoreOptions={g.showMoreOptions}
        onShowMoreOptionsChange={g.setShowMoreOptions}
        showTechDetails={g.showTechDetails}
        onShowTechDetailsChange={g.setShowTechDetails}
        pdfPreviewUrl={g.uploadPdfPreviewUrl}
        editingGuideId={g.editingGuideId}
        uploading={g.isUploadingGuide}
        extractingPdf={g.isExtractingPdf}
        extractedPdfStats={g.extractedPdfStats}
        dragActive={g.dragActive}
        fileInputRef={g.fileInputRef}
        onDrag={g.handleDrag}
        onDrop={g.handleDrop}
        onLoadResourceFile={g.handleLoadResourceFile}
        onProcessFile={g.handleProcessFile}
        onSave={(status) => {
          void g.handleSaveGuide(status).then((saved) => {
            if (saved) onSaved();
          });
        }}
      />
    </>
  );
}
