-- These organization resources are AD-only in this platform's curated catalog.
-- Correct both catalog records and copies previously added under the same source URL.
UPDATE resources
SET disease_domain='AD'
WHERE id IN ('resource-yes-young-onset','resource-alz-association')
   OR rtrim(external_url,'/') IN ('https://yessupport.org','https://www.alz.org');
