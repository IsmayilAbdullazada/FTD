import fs from 'fs';
import path from 'path';

const API_BASE = 'http://localhost:3000/api/v1/chatbot';
const RESOURCES_DIR = path.join(process.cwd(), 'public', 'resources');

function formatTitle(str: string): string {
  return str
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      if (['FTD', 'AD', 'PPA', 'BVFTD', 'AFTD', 'LTC', 'ALF'].includes(upper)) {
        return upper;
      }
      if (['in', 'and', 'for', 'of', 'the', 'a', 'an', 'to', 'at', '&'].includes(word.toLowerCase())) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
}

export function extractDynamicTitle(fileName: string, fullText: string): string {
  const lowerFile = fileName.toLowerCase();

  // If filename specifically describes the clinical topic, format cleanly
  if (lowerFile.includes('aggressive-behavior') || lowerFile.includes('aggressive_behavior')) {
    return 'Managing Aggressive Behavior in FTD';
  }
  if (lowerFile.includes('sleepissues') || lowerFile.includes('sleep-issues')) {
    return 'Sleep Issues in FTD';
  }

  // Scan text for the clinical guide focus (ordered from most specific topic to broader terms)
  const lowerText = fullText.slice(0, 3000).toLowerCase();

  if (lowerText.includes('incontinence management in ftd') || lowerText.includes('incontinence management') || lowerText.includes('incontinence')) {
    return 'Incontinence Management in FTD';
  }
  if (lowerText.includes('resistant behavior')) {
    return 'Managing Resistant Behaviors in FTD';
  }
  if (lowerText.includes('comfort care and hospice')) {
    return 'Comfort Care and Hospice in Advanced FTD';
  }
  if (lowerText.includes('sexual behavior in ftd') || lowerText.includes('sexual feelings')) {
    return 'Sexual Behavior in FTD';
  }
  if (lowerText.includes('compulsive behavior in frontotemporal') || lowerText.includes('compulsive behavior')) {
    return 'Compulsive Behavior in Frontotemporal Degeneration';
  }
  if (lowerText.includes('loss of emotional warmth') || lowerText.includes('loss of social behaviors')) {
    return 'Managing Loss of Empathy and Social Behaviors in FTD';
  }
  if (lowerText.includes('apathy is one of the most common') || (lowerText.includes('apathy') && lowerText.includes('goal-directed'))) {
    return 'Managing Apathy in FTD';
  }
  if (lowerText.includes('caring for people with ftd presents challenges no matter') || lowerText.includes('anosognosia is the inability') || lowerText.includes('anosognosia')) {
    return 'Anosognosia and Lack of Insight in FTD';
  }

  // Fallback to formatted filename
  return formatTitle(fileName.replace(/\.[^/.]+$/, '').replace(/[_-]+/g, ' '));
}

async function main() {
  console.log('=== Ingesting and Harmonizing PDF Guides via API ===');

  if (!fs.existsSync(RESOURCES_DIR)) {
    console.error(`Directory ${RESOURCES_DIR} not found.`);
    process.exit(1);
  }

  // 1. Fetch current guides from the API
  const listRes = await fetch(`${API_BASE}/guides`);
  const data = await listRes.json();
  const existingGuides = data.guides || [];
  const existingByFile = new Map<string, any>();
  existingGuides.forEach((g: any) => {
    if (g.fileName) existingByFile.set(g.fileName.toLowerCase(), g);
  });

  const pdfFiles = fs.readdirSync(RESOURCES_DIR).filter((f) => f.toLowerCase().endsWith('.pdf'));
  console.log(`Discovered ${pdfFiles.length} PDF files in resources directory.`);

  for (const file of pdfFiles) {
    const existing = existingByFile.get(file.toLowerCase());
    const filePath = path.join(RESOURCES_DIR, file);
    const fileBuffer = fs.readFileSync(filePath);
    const base64 = fileBuffer.toString('base64');

    if (!existing) {
      console.log(`\n[NEW] Extracting & Registering "${file}"...`);
      // Call extract-pdf API
      const extractRes = await fetch(`${API_BASE}/extract-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file, fileBase64: base64 }),
      });
      const extracted = await extractRes.json();
      const dynamicTitle = extractDynamicTitle(file, extracted.text || '');

      // Create guide via API
      const createRes = await fetch(`${API_BASE}/guides`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dynamicTitle,
          condition: 'FTD',
          fileName: file,
          fileSize: fileBuffer.length,
          mimeType: 'application/pdf',
          content: extracted.text,
          pages: extracted.pages,
          totalChunks: extracted.totalChunks,
          status: 'APPROVED',
          pdfUrl: `/resources/${file}`,
          uploadedBy: 'user-clinician-1',
          uploadedByName: 'Dr. Seema Gulyani',
        }),
      });
      const created = await createRes.json();
      console.log(`  -> Created guide ${created.id}: "${created.title}" [${created.condition}]`);
    } else {
      // Existing guide: harmonize title, condition (FTD), status (APPROVED)
      const refinedTitle = extractDynamicTitle(file, existing.content || '');
      if (existing.title !== refinedTitle || existing.condition !== 'FTD' || existing.status !== 'APPROVED') {
        console.log(`\n[UPDATE] Harmonizing "${file}" -> Title: "${refinedTitle}" (was: "${existing.title}")`);
        const updateRes = await fetch(`${API_BASE}/guides/${existing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: refinedTitle,
            condition: 'FTD',
            status: 'APPROVED',
            pdfUrl: `/resources/${file}`,
          }),
        });
        const updated = await updateRes.json();
        console.log(`  -> Updated guide ${existing.id}: "${updated.guide.title}"`);
      } else {
        console.log(`[OK] "${file}" already registered and verified: "${existing.title}" [${existing.condition}]`);
      }
    }
  }

  // Final verification
  const finalRes = await fetch(`${API_BASE}/guides`);
  const finalData = await finalRes.json();
  const guides: any[] = finalData.guides || [];

  console.log('\n=============================================');
  console.log(`FINAL GUIDES IN MODERATOR DASHBOARD (${guides.length} total):`);
  console.log('=============================================');
  guides.forEach((g) => {
    console.log(`• [${g.condition}] "${g.title}" | File: ${g.fileName} | Words: ${g.wordCount} | Pages: ${g.pages?.length || 1} | Status: ${g.status}`);
  });
}

main().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
