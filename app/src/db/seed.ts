import bcrypt from 'bcryptjs';
import { pool } from '../config/db.js';

async function seed() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Seed Clinician (Dr. Seema Gulyani)
    const pwHash = await bcrypt.hash('DrSeemaGulyani2026!', 12);
    await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, specialty, bio, is_verified)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO NOTHING`,
      [
        'sgulyani@hopkinsmedicine.org',
        pwHash,
        'Dr. Seema Gulyani',
        'clinician',
        'Frontotemporal Dementia Specialist',
        'Lead clinician and research investigator at Hopkins Care Partner Connect.',
        true,
      ]
    );

    // 2. Seed Standard Support Cohorts
    await client.query(`
      INSERT INTO cohorts (name, description, region, ftd_subtype) VALUES
      ('bvFTD Behavioral Support Circle', 'Peer cohort for families navigating behavioral and personality changes.', 'National', 'bvFTD'),
      ('PPA Communication & Speech Guild', 'Strategies for primary progressive aphasia care partners.', 'National', 'PPA-Nonfluent'),
      ('Mid-Atlantic Regional Care Alliance', 'Hopkins regional local meetup and caregiver respite network.', 'Mid-Atlantic', 'General')
      ON CONFLICT DO NOTHING;
    `);

    // 3. Seed Clinical Care Guides & Resources
    await client.query(`
      INSERT INTO resources (title, summary, category, file_or_external_url) VALUES
      ('Managing Aggressive Behavior in FTD', 'Clinical behavioral intervention de-escalation protocols for care partners.', 'Behavioral Strategies', '/resources/Managing-Aggressive-Behavior.pdf'),
      ('Sleep Issues in Frontotemporal Dementia', 'Circadian disruption and nighttime safety guidelines.', 'Daily Care', '/resources/SleepIssuesFTD-090623.pdf'),
      ('Communication Strategies for Primary Progressive Aphasia', 'Alternative communication boards and non-verbal speech tools.', 'Speech & Language', '/resources/PiC-fall-2014-WTDA.pdf')
      ON CONFLICT DO NOTHING;
    `);

    await client.query('COMMIT');
    console.log('[Seed] Default clinician, support cohorts, and institutional guides created successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[Seed Error]', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
