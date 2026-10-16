# FTD content ingestion and RAG audit

2026-10-16, Asia/Baku. Baseline application: commit `6ff0fad`.

The real-file audit found import bugs, excessive draft/topic creation, and poor answers despite relevant text being available. Reader fixes resolve the observed import failures. Natural-question retrieval remains weak: the expected phrase check stays at 4/8, and manual inspection still finds a symptoms question answered with an unrelated research abstract.

## Corpus and scope

Downloaded **172 public files**, identified **88 SHA-256-unique files containing FTD-related material**, and selected **50 originals from 16 public GitHub repositories** with seed `20261016`. All 34 eligible non-Markdown documents were retained; 16 substantive Markdown reports were sampled, preferring reports over project landing-page READMEs. This is a constrained, format-stratified sample, not a uniform random sample of the internet.

AFTD, NIH, Alzheimer's charities and search engines returned proxy `403` errors under the live environment policy. Required domain additions were saved to the environment draft; they have not unlocked those sites in this runtime. The sample therefore contains research papers, software/project reports, a caregiver application page, bibliographies and incomplete notes. It is **not a vetted clinical guidance collection**. Several different presentations describe the same study, so file counts do not imply independent clinical evidence.

Every selected original has its public URL, pinned Git commit and SHA-256 in [the manifest](../tests/benchmarks/ftd/manifest.json). All 50 pinned source downloads were checked against their recorded hashes. Downloaded binaries, full extracted text, full quoted answers and temporary stores stay outside Git under `/workspace/ftd-evaluation/`.

| Original extension | Files | Read before | Read after |
| --- | ---: | ---: | ---: |
| `.pdf` | 14 | 14 | 14 |
| `.docx` | 4 | 4 | 4 |
| `.pptx` | 7 | 1 | 7 |
| `.html` | 3 | 3 | 3 |
| `.csv` | 4 | 4 | 4 |
| `.txt` | 2 | 2 | 2 |
| `.md` | 16 | 16 | 16 |

The 50 originals cover **seven native extensions**. A **separate 27-file controlled conversion matrix** uses a verbatim public FTD excerpt to cover 25 extensions plus scanned-only and mixed typed/scanned PDF layouts:

`.bmp`, `.csv`, `.doc`, `.docx`, `.gif`, `.heic`, `.heif`, `.htm`, `.html`, `.jpeg`, `.jpg`, `.markdown`, `.md`, `.odt`, `.pdf`, `.png`, `.pptx`, `.rtf`, `.tif`, `.tiff`, `.tsv`, `.txt`, `.webp`, `.xls`, `.xlsx`.

These conversions are real encoded documents/images, including binary DOC/XLS and encoded HEIC/HEIF. They are **not original files discovered in those formats** and are not counted among the 50 originals. See [the format matrix](../tests/benchmarks/ftd/formats.csv). Broader original clinical-format coverage remains untested because of network restrictions.

## Method

The benchmark runs the production reader, draft normalizer, topic inference, ranking, local quoted-answer function and selected model-context construction. It simulates batch approval only in a separate temporary store, never the clinic's durable knowledge store. It does not make live Gemini calls or publish downloaded documents to the application.

Reference text was independently read with PyMuPDF, python-docx, python-pptx, Python's HTMLParser, or the source text itself. The rendered first page of `ftd-06` was also visually checked: both PDF text readers reproduced broken font mappings, so its reference probes were corrected against the visible page. HTML reference probes use visible text, excluding JavaScript and CSS.

There are 110 fixed reference-derived keyword probes, eight manually inspected natural questions, and six unrelated questions. Each file is also indexed alone to prevent another format or near-duplicate document from hiding a failure. OCR workers are limited to one thread per benchmark process. Interrupted exploratory runs are excluded from these final results.

“Reference evidence coverage” means at least 90% of the reference excerpt's unique normalized words appear in the answer. This diagnostic does not establish correct meaning, negation, numerical relationships or clinical validity. Reference keywords are easier than natural paraphrases. First-file recall can penalize a relevant duplicate; conversely a bibliography can match keywords without containing an answer. The manually inspected failures below are essential to interpreting the numbers.

## Measured results

| Measure | Before | After |
| --- | ---: | ---: |
| Internet originals imported | 44/50 | 50/50 |
| Native PowerPoint imports | 1/7 | 7/7 |
| Converted format/layout imports | 26/27 | 27/27 |
| Draft review items | 1688 | 665 |
| Distinct topics assigned | 284 | 37 |
| Files containing a section over 1,000 words | 7 | 0 |
| Reference file ranked first | 75/110 | 82/110 |
| Reference file present in first three matches | 87/110 | 103/110 |
| Reference evidence word coverage in quoted answer | 86/110 | 102/110 |
| Reference evidence coverage with each original indexed alone | 86/110 | 106/110 |
| Reference evidence coverage with each converted file indexed alone | 100/108 | 108/108 |
| Expected phrase present in eight natural-question probes | 4/8 | 4/8 |
| Unrelated questions correctly declined | 6/6 | 6/6 |

The largest section after the changes is **800 words**. Full measurements and per-query outcomes are in [results.json](../tests/benchmarks/ftd/results.json); [files.csv](../tests/benchmarks/ftd/files.csv) records each original's source, hash, draft counts, topics and flags.

## Demonstrated defects and fixes

| Defect observed | Effect on RAG | Change made |
| --- | --- | --- |
| Six native PPTX files failed on BOM-prefixed XML relationship files. | Entire documents were absent from retrieval. | Remove the BOM before parsing Office XML. All seven decks import. |
| A converted DOC contained a `Book Title` style. Raw-byte detection interpreted “Book” as an Excel stream. | The Word document was rejected as an unreadable spreadsheet. | Inspect compound-file root directory entries and distinguish WordDocument from Workbook/Book. |
| TSV answers contained commas; the detected tab delimiter was discarded before spreadsheet parsing. | Columns were reassigned and answer content was lost. | Pass the detected delimiter through to the reader. |
| Two research CSVs created 1,142 false Q&A drafts. | DOIs/metadata became questions and unrelated columns became answers. | Require recognized Q&A headers for automatic Q&A import. Preserve generic tables as labeled document content. |
| Long paragraphs and lists could exceed the intended chunk size; continuation labels accumulated. | Oversized context, excessive review burden, poor focus. | Bound chunks at 800 words and keep normal-sized numbered lists together. |
| Every subheading could create a topic; the sample generated 284 topics. | Fragmented navigation and suggestions unrelated to a coherent document. | Share a suggested topic across a file's sections, preserve that context during edits, and respect manual topic choices. |
| HTML imported controls, hidden text and footer/interface labels. | Interface words competed with guidance for retrieval. | Prefer the main region, and exclude controls, hidden content and footer text. |
| `ftd-06` extracted “quantifier” as “quantiWer”, alongside many similar ligature errors. | Correct clinical/research terms could not match their corrupted spellings. | Detect this observed PDF font-map pattern and OCR affected pages. The suspicious-word count falls from 257 to 4; review is still required. |
| The symptoms query returned an unfinished “list symptoms here” note. | A citation made a placeholder appear to be guidance. | Exclude obvious placeholder-only answers from ranking. This does not solve broader source quality or answer relevance. |

Code review also found that optional model input always used the first 12,000 source characters. It now uses the exact approved context passage selected for the local answer, preserving surrounding protocol steps when possible. The 110 probes did not isolate a prefix-only failure, and no live model call was tested.

## Answers inspected manually

| Natural question | Before | After | Assessment |
| --- | --- | --- | --- |
| What are the symptoms of frontotemporal dementia? | `ftd-45`: “list symptoms here …” | `ftd-01`: EEG research abstract mentioning symptoms | Still an inadequate answer. Removing a placeholder did not make keyword ranking understand the question. |
| How does FTD affect personality and behavior? | `ftd-26`, broad dementia overview | `ftd-26`, broad dementia overview | A relevant statement is present, but it is verbose and the source is an unvetted public application page. |
| At what ages is frontotemporal dementia more common? | `ftd-33`, whole dementia overview | `ftd-33`, whole dementia overview | The FTD age range is present but buried among information about other conditions. |
| Which conditions can FTD be mistaken for? | No content | No content | Misses available text saying FTD can be confused with depression, stress, anxiety, psychosis or OCD. |
| Can an EEG pattern diagnose dementia by itself? | No content | No content | Misses the explicit caveat in `ftd-03` that an EEG pattern is not a diagnosis on its own. |
| How many people with FTD were included in the EEG dataset? | `ftd-03` | `ftd-03` | The 23-person count is present; the response still includes substantial surrounding text. |
| Does cutting EEG into more windows create more independent patients? | `ftd-03` | `ftd-03` | The relevant caveat is present. |
| Are the reported model results clinical diagnostic performance? | `ftd-11` | `ftd-11` | The explicit limitation is present. |

No live generated-model answer was evaluated. The results above describe deterministic retrieval and quotation. An exact quote and citation establish where words came from; they do not establish that those words answer the question.

## Work still needed

The remaining failure is primarily retrieval and source selection. The matcher rewards word overlap and often ties multiple documents at the same score. It does not reliably distinguish a clinical explanation from a paper that merely mentions the condition, nor a bibliography from an article containing evidence. Natural paraphrases such as “mistaken for” versus “confused with” are missed. A small experimental lexical expansion caused wrong matches and was removed rather than reported as an improvement.

The format matrix also exposes a remaining topic inconsistency: the same excerpt is assigned to `ftd`, `Frontotemporal dementia`, or `General guidance` depending on its container and metadata. Sharing a topic across one file's sections reduces fragmentation, but topic inference still needs to become consistent across file formats.

The next retrieval changes should be evaluated against a separate, clinician-reviewed question/answer set: semantic retrieval combined with lexical retrieval, passage reranking, and an answerability check that declines a source which does not answer the question. Clinical guidance, research and bibliographic metadata also need a deliberate publishing policy. The current public-source simulation deliberately shows what happens when everything is treated as approved.

OCR remains imperfect, title inference still depends on available metadata/filenames, and image-only content embedded inside Office files is not OCRed by this reader. The conversion matrix validates one controlled excerpt per extension; it does not establish compatibility with every real layout, language, chart, encrypted document or legacy exporter. The real-file run still produces 665 review items, so ingestion of entire research collections remains burdensome for a doctor.

## Reproduce

From the repository with Node 24, installed npm dependencies, Poppler, English Tesseract, ImageMagick and curl:

```bash
node --import tsx scripts/benchmark-ftd.ts \
  tests/benchmarks/ftd/manifest.json data/benchmarks/ftd-after
```

The runner downloads pinned originals, verifies SHA-256, writes per-file text/CSV/JSON and uses a temporary knowledge store. It records failed imports instead of treating a completed script as proof every file passed.

For the controlled conversions, install the optional analysis packages `PyMuPDF`, `python-docx`, `python-pptx`, `Pillow`, `reportlab`, and `pillow-heif` in a separate Python environment. LibreOffice and DejaVu Sans are also required. These are audit dependencies, not application runtime dependencies.

```bash
python3 scripts/build-ftd-format-fixtures.py \
  tests/benchmarks/ftd/manifest.json data/benchmarks/ftd-formats
node --import tsx scripts/benchmark-ftd.ts \
  data/benchmarks/ftd-formats/manifest.json data/benchmarks/ftd-formats-after
```

The runner's optional third argument points to an alternate application source directory. Baseline files were exported from commit `6ff0fad` (server, src/types and src/data), with the current dependency directory linked for execution. No worktree or production database reset is required.

Project validation: **37 tests passed**, TypeScript passed, the production build passed, and browser checks passed at seven widths in both themes, including upload, review, publish, edit, remove, restore and staff-role visibility. Existing Vite configuration/bundle warnings remain nonblocking.

## All 50 originals

| Source | File | Extension | Import before → after | Drafts after | Topics after |
| --- | --- | --- | --- | ---: | ---: |
| [ftd-01](https://raw.githubusercontent.com/FatimaHussain11/AI_Powered-EEG_Dementia-Detection-System/19a03e7343ff59bf8e9c6792f7ba449707c77acc/EEG%20Research%20paper.pdf) | EEG Research paper.pdf | pdf | read → read | 8 | 1 |
| [ftd-02](https://raw.githubusercontent.com/Aquinf03/Neuro/d275e438472c4f65c147d146bdfad644fcb58240/Frontotemporal/ftd_RESULTS.md.pdf) | ftd_RESULTS.md.pdf | pdf | read → read | 2 | 1 |
| [ftd-03](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/Literature_Review_EEG_Dementia.pdf) | Literature_Review_EEG_Dementia.pdf | pdf | read → read | 2 | 1 |
| [ftd-04](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/Topoi%202007%20Clark.pdf) | Topoi 2007 Clark.pdf | pdf | read → read | 15 | 1 |
| [ftd-05](https://raw.githubusercontent.com/amberbiology/scribl/4884094acb8f4b39f2777a1c8dff9b626492d4a2/scribl.pdf) | scribl.pdf | pdf | read → read | 17 | 1 |
| [ftd-06](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/Brain%20and%20Cognition%202006%20McMillan.pdf) | Brain and Cognition 2006 McMillan.pdf | pdf | read → read | 13 | 1 |
| [ftd-07](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/NeuroImage%202016%20Heim.pdf) | NeuroImage 2016 Heim.pdf | pdf | read → read | 12 | 1 |
| [ftd-08](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/Neuropsychologia%202005%20McMillan.pdf) | Neuropsychologia 2005 McMillan.pdf | pdf | read → read | 12 | 1 |
| [ftd-09](https://raw.githubusercontent.com/mayar1mousa/tdp43-rnaseq-analysis/d84d08c48c3aae5f005e6cb7664c9eccc36d5957/docs/Chr5_project_report.pdf) | Chr5_project_report.pdf | pdf | read → read | 7 | 1 |
| [ftd-10](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/generalizedQuantifiersandNumberSense.pdf) | generalizedQuantifiersandNumberSense.pdf | pdf | read → read | 10 | 1 |
| [ftd-11](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/technical_report/main.pdf) | main.pdf | pdf | read → read | 23 | 1 |
| [ftd-12](https://raw.githubusercontent.com/francesshei/BLASN_essay_2023/a329a25aef22a781e4f4e35052b3765d11452aaa/essay.pdf) | essay.pdf | pdf | read → read | 5 | 1 |
| [ftd-13](https://raw.githubusercontent.com/mayar1mousa/tdp43-rnaseq-analysis/d84d08c48c3aae5f005e6cb7664c9eccc36d5957/docs/chr5_presentation.pdf) | chr5_presentation.pdf | pdf | read → read | 1 | 1 |
| [ftd-14](https://raw.githubusercontent.com/robinlclark/rlc-papers/f25fef71163ed542b5c770e74de9cbf0120e9b6d/Front.%20Hum.%20Neurosci.%202015%20Spotorno.pdf) | Front. Hum. Neurosci. 2015 Spotorno.pdf | pdf | read → read | 12 | 1 |
| [ftd-15](https://raw.githubusercontent.com/ashmawiremass-lgtm/KAUST-RNA-Seq-Analysis-of-Chromosome-17-in-a-TDP-43-Knockout-Model/85985e629655eb1b504dda683ed25b138117d015/KAUST_Chr17Report.docx) | KAUST_Chr17Report.docx | docx | read → read | 1 | 1 |
| [ftd-16](https://raw.githubusercontent.com/mkrishna793/Alzheimer-s-Preclinical-Biomarker-Discovery/80eb6a037f1d6a43e78dd64b046b3a04224883dd/Neuro_Bridge_Research_Paper_Mohan_Krishna.docx) | Neuro_Bridge_Research_Paper_Mohan_Krishna.docx | docx | read → read | 30 | 1 |
| [ftd-17](https://raw.githubusercontent.com/AbdulMalik1287/MiniProject-I/6c8e02c4eeb4a2bff6562a3f4c2eebf9920972da/docs/MiniProject_Results.docx) | MiniProject_Results.docx | docx | read → read | 17 | 1 |
| [ftd-18](https://raw.githubusercontent.com/deepanmpc/Anaavi_Neurodott/1cc1547715756b96ecaada56ce32fd845eae38d2/UPDATED-JOURNEL-IEEE.docx) | UPDATED-JOURNEL-IEEE.docx | docx | read → read | 4 | 1 |
| [ftd-19](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Status_Presentation_10_Slides_Focused.pptx) | NeuroTensor_Status_Presentation_10_Slides_Focused.pptx | pptx | failed → read | 10 | 1 |
| [ftd-20](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Project_Progress_Illustrated_Final.pptx) | NeuroTensor_Project_Progress_Illustrated_Final.pptx | pptx | failed → read | 20 | 1 |
| [ftd-21](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Project_Progress_Final.pptx) | NeuroTensor_Project_Progress_Final.pptx | pptx | failed → read | 20 | 1 |
| [ftd-22](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Status_Presentation_10_Slides.pptx) | NeuroTensor_Status_Presentation_10_Slides.pptx | pptx | failed → read | 10 | 1 |
| [ftd-23](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Status_Presentation_10_Slides_CPD_Tucker.pptx) | NeuroTensor_Status_Presentation_10_Slides_CPD_Tucker.pptx | pptx | failed → read | 10 | 1 |
| [ftd-24](https://raw.githubusercontent.com/ashmawiremass-lgtm/KAUST-RNA-Seq-Analysis-of-Chromosome-17-in-a-TDP-43-Knockout-Model/85985e629655eb1b504dda683ed25b138117d015/Chr17_Presentation.pptx) | Chr17_Presentation.pptx | pptx | read → read | 13 | 1 |
| [ftd-25](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/output/NeuroTensor_Status_Presentation_10_Slides_EEG_Pipeline.pptx) | NeuroTensor_Status_Presentation_10_Slides_EEG_Pipeline.pptx | pptx | failed → read | 10 | 1 |
| [ftd-26](https://raw.githubusercontent.com/rkbemory/caregiver-village/14d273ce2d75124ed3600c479c845ea6e92b28f6/index.html) | index.html | html | read → read | 31 | 1 |
| [ftd-27](https://raw.githubusercontent.com/FatimaHussain11/AI_Powered-EEG_Dementia-Detection-System/19a03e7343ff59bf8e9c6792f7ba449707c77acc/index.html) | index.html | html | read → read | 12 | 1 |
| [ftd-28](https://raw.githubusercontent.com/AbdulMalik1287/MiniProject-I/6c8e02c4eeb4a2bff6562a3f4c2eebf9920972da/docs/eeg_readout.html) | eeg_readout.html | html | read → read | 6 | 1 |
| [ftd-29](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/papers_seen_full.csv) | papers_seen_full.csv | csv | read → read | 57 | 1 |
| [ftd-30](https://raw.githubusercontent.com/FaizeAI/bci-digital-twin-validation/468354d5a7ee5cb0730df5b2ea3c05158dd7d64e/supplementary_table_s1.csv) | supplementary_table_s1.csv | csv | read → read | 2 | 1 |
| [ftd-31](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/doi_tracking.csv) | doi_tracking.csv | csv | read → read | 3 | 1 |
| [ftd-32](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/paywalled_papers.csv) | paywalled_papers.csv | csv | read → read | 1 | 1 |
| [ftd-33](https://raw.githubusercontent.com/alros/AI-Diagnosis/38c9dd0de75d575ea98397646d1aaa06eee82ee7/kb/diagnosis/Dementia.txt) | Dementia.txt | txt | read → read | 1 | 1 |
| [ftd-34](https://raw.githubusercontent.com/alros/AI-Diagnosis/38c9dd0de75d575ea98397646d1aaa06eee82ee7/kb/diagnosis/dementia/Dementia.txt) | Dementia.txt | txt | read → read | 1 | 1 |
| [ftd-35](https://raw.githubusercontent.com/mimikowsky/rag-ablation-dementia/1184a9b99100c3358bab137728bb7a1c93e2b531/data/experiments/mini_ablation_4x3/summary.md) | summary.md | md | read → read | 7 | 1 |
| [ftd-36](https://raw.githubusercontent.com/Aquinf03/Neuro/d275e438472c4f65c147d146bdfad644fcb58240/reference.md) | reference.md | md | read → read | 20 | 1 |
| [ftd-37](https://raw.githubusercontent.com/mkrishna793/Alzheimer-s-Preclinical-Biomarker-Discovery/80eb6a037f1d6a43e78dd64b046b3a04224883dd/MASTER_RESEARCH_GUIDE.md) | MASTER_RESEARCH_GUIDE.md | md | read → read | 4 | 1 |
| [ftd-38](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/paper_structure.md) | paper_structure.md | md | read → read | 46 | 1 |
| [ftd-39](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/final_decision.md) | final_decision.md | md | read → read | 10 | 1 |
| [ftd-40](https://raw.githubusercontent.com/mimikowsky/rag-ablation-dementia/1184a9b99100c3358bab137728bb7a1c93e2b531/data/final/data_validation_report.md) | data_validation_report.md | md | read → read | 7 | 1 |
| [ftd-41](https://raw.githubusercontent.com/mkrishna793/Alzheimer-s-Preclinical-Biomarker-Discovery/80eb6a037f1d6a43e78dd64b046b3a04224883dd/RESEARCH_PAPER.md) | RESEARCH_PAPER.md | md | read → read | 32 | 1 |
| [ftd-42](https://raw.githubusercontent.com/mimikowsky/rag-ablation-dementia/1184a9b99100c3358bab137728bb7a1c93e2b531/data/experiments/mini_ablation_4x3_gemini/summary.md) | summary.md | md | read → read | 10 | 1 |
| [ftd-43](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/presentation_progress/SVM_COMPARISON.md) | SVM_COMPARISON.md | md | read → read | 1 | 1 |
| [ftd-44](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/LITERATURE_REVIEW_REPORT.md) | LITERATURE_REVIEW_REPORT.md | md | read → read | 57 | 1 |
| [ftd-45](https://raw.githubusercontent.com/Aquinf03/Neuro/d275e438472c4f65c147d146bdfad644fcb58240/Frontotemporal/SYMPTOMS.md) | SYMPTOMS.md | md | read → read | 2 | 1 |
| [ftd-46](https://raw.githubusercontent.com/abhiram-v1/AIBSI/aa9719beaed0b2e5796368038e346ce89b193cb0/PROJECT_MASTER_REPORT.md) | PROJECT_MASTER_REPORT.md | md | read → read | 14 | 1 |
| [ftd-47](https://raw.githubusercontent.com/Aquinf03/Neuro/d275e438472c4f65c147d146bdfad644fcb58240/one-pager.md) | one-pager.md | md | read → read | 15 | 1 |
| [ftd-48](https://raw.githubusercontent.com/Aquinf03/Neuro/d275e438472c4f65c147d146bdfad644fcb58240/Frontotemporal/results.md) | results.md | md | read → read | 4 | 1 |
| [ftd-49](https://raw.githubusercontent.com/mimikowsky/rag-ablation-dementia/1184a9b99100c3358bab137728bb7a1c93e2b531/experiment_log.md) | experiment_log.md | md | read → read | 33 | 1 |
| [ftd-50](https://raw.githubusercontent.com/Devguru-codes/Major_project_IIITN/f573fa0ea2ad67b3184c97585ea80c77c535807a/paywalled_papers.md) | paywalled_papers.md | md | read → read | 5 | 1 |
