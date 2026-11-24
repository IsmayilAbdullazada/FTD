-- Ages are whole years at enrollment, not dates of birth. Existing details are unknown.
CREATE TABLE IF NOT EXISTS care_partner_profiles (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    patient_age SMALLINT NOT NULL CHECK (patient_age BETWEEN 0 AND 130),
    care_partner_age SMALLINT NOT NULL CHECK (care_partner_age BETWEEN 0 AND 130),
    relationship_to_patient TEXT NOT NULL CHECK (
        char_length(btrim(relationship_to_patient)) BETWEEN 1 AND 100
        AND relationship_to_patient !~ '[[:cntrl:]]'
    ),
    county TEXT NOT NULL CHECK (
        char_length(btrim(county)) BETWEEN 1 AND 100 AND county !~ '[[:cntrl:]]'
    ),
    state TEXT NOT NULL CHECK (
        char_length(btrim(state)) BETWEEN 1 AND 100 AND state !~ '[[:cntrl:]]'
    ),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
