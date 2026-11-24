// Content-only shared contract: this module has no server, environment or database dependencies.
export {
  MIN_GUIDE_DESCRIPTION_LENGTH,
  MAX_GUIDE_DESCRIPTION_LENGTH,
  isGuideDescriptionValid,
  suggestGuideDescription,
  guideCardDescription,
  editableGuideDescription,
} from '../../../../app/src/contracts/guideDescription';
