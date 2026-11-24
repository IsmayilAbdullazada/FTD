-- One taxonomy: merge duplicate daily-living topics while preserving existing content and audience choices.
UPDATE resources SET category='DAILY_CARE' WHERE category='INCONTINENCE';
UPDATE chatbot_guides SET category='DAILY_CARE' WHERE category='INCONTINENCE';
UPDATE chatbot_guides SET topic_tag='DAILY_CARE' WHERE topic_tag='INCONTINENCE';

-- Improve only known default titles and previously generic/missing topics for bundled PDFs.
-- Staff-authored custom titles and specific topic selections are retained.
UPDATE resources SET category='BEHAVIORAL_AGITATION' WHERE file_attachment_url='/resources/Managing-Aggressive-Behavior.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='BEHAVIORAL_AGITATION',topic_tag='BEHAVIORAL_AGITATION' WHERE (file_name='Managing-Aggressive-Behavior.pdf' OR pdf_url='/resources/Managing-Aggressive-Behavior.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Managing Aggressive Behavior in FTD' WHERE file_attachment_url='/resources/Managing-Aggressive-Behavior.pdf' AND title IN ('Managing Aggressive Behavior','Managing-Aggressive-Behavior.pdf');
UPDATE chatbot_guides SET title='Managing Aggressive Behavior in FTD' WHERE (file_name='Managing-Aggressive-Behavior.pdf' OR pdf_url='/resources/Managing-Aggressive-Behavior.pdf') AND title IN ('Managing Aggressive Behavior','Managing-Aggressive-Behavior.pdf');
UPDATE resources SET category='SLEEP' WHERE file_attachment_url='/resources/SleepIssuesFTD-090623.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='SLEEP',topic_tag='SLEEP' WHERE (file_name='SleepIssuesFTD-090623.pdf' OR pdf_url='/resources/SleepIssuesFTD-090623.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Sleep Issues in FTD' WHERE file_attachment_url='/resources/SleepIssuesFTD-090623.pdf' AND title IN ('Sleep Issues in FTD','SleepIssuesFTD-090623.pdf');
UPDATE chatbot_guides SET title='Sleep Issues in FTD' WHERE (file_name='SleepIssuesFTD-090623.pdf' OR pdf_url='/resources/SleepIssuesFTD-090623.pdf') AND title IN ('Sleep Issues in FTD','SleepIssuesFTD-090623.pdf');
UPDATE resources SET category='ADVANCED_DEMENTIA' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Fall_2016.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='ADVANCED_DEMENTIA',topic_tag='ADVANCED_DEMENTIA' WHERE (file_name='PinFTDcare_Newsletter_Fall_2016.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Fall_2016.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Comfort and Hospice in Advanced FTD (Fall 2016)' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Fall_2016.pdf' AND title IN ('Partners in FTD Care - Fall 2016','PinFTDcare_Newsletter_Fall_2016.pdf');
UPDATE chatbot_guides SET title='Comfort and Hospice in Advanced FTD (Fall 2016)' WHERE (file_name='PinFTDcare_Newsletter_Fall_2016.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Fall_2016.pdf') AND title IN ('Partners in FTD Care - Fall 2016','PinFTDcare_Newsletter_Fall_2016.pdf');
UPDATE resources SET category='BEHAVIORAL_AGITATION' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Winter_2018.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='BEHAVIORAL_AGITATION',topic_tag='BEHAVIORAL_AGITATION' WHERE (file_name='PinFTDcare_Newsletter_Winter_2018.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Winter_2018.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Understanding and Managing Apathy in FTD (Winter 2018)' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Winter_2018.pdf' AND title IN ('Partners in FTD Care - Winter 2018','PinFTDcare_Newsletter_Winter_2018.pdf');
UPDATE chatbot_guides SET title='Understanding and Managing Apathy in FTD (Winter 2018)' WHERE (file_name='PinFTDcare_Newsletter_Winter_2018.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Winter_2018.pdf') AND title IN ('Partners in FTD Care - Winter 2018','PinFTDcare_Newsletter_Winter_2018.pdf');
UPDATE resources SET category='BEHAVIORAL_AGITATION' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Winter_2019.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='BEHAVIORAL_AGITATION',topic_tag='BEHAVIORAL_AGITATION' WHERE (file_name='PinFTDcare_Newsletter_Winter_2019.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Winter_2019.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Understanding Anosognosia in FTD (Winter 2019)' WHERE file_attachment_url='/resources/PinFTDcare_Newsletter_Winter_2019.pdf' AND title IN ('Partners in FTD Care - Winter 2019','PinFTDcare_Newsletter_Winter_2019.pdf');
UPDATE chatbot_guides SET title='Understanding Anosognosia in FTD (Winter 2019)' WHERE (file_name='PinFTDcare_Newsletter_Winter_2019.pdf' OR pdf_url='/resources/PinFTDcare_Newsletter_Winter_2019.pdf') AND title IN ('Partners in FTD Care - Winter 2019','PinFTDcare_Newsletter_Winter_2019.pdf');
UPDATE resources SET category='DAILY_CARE' WHERE file_attachment_url='/resources/PinFTDcare_sprng_2020.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='DAILY_CARE',topic_tag='DAILY_CARE' WHERE (file_name='PinFTDcare_sprng_2020.pdf' OR pdf_url='/resources/PinFTDcare_sprng_2020.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Responding to Resistance to Help in FTD (Spring 2020)' WHERE file_attachment_url='/resources/PinFTDcare_sprng_2020.pdf' AND title IN ('Partners in FTD Care - Spring 2020','PinFTDcare_sprng_2020.pdf');
UPDATE chatbot_guides SET title='Responding to Resistance to Help in FTD (Spring 2020)' WHERE (file_name='PinFTDcare_sprng_2020.pdf' OR pdf_url='/resources/PinFTDcare_sprng_2020.pdf') AND title IN ('Partners in FTD Care - Spring 2020','PinFTDcare_sprng_2020.pdf');
UPDATE resources SET category='DAILY_CARE' WHERE file_attachment_url='/resources/January-2014.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='DAILY_CARE',topic_tag='DAILY_CARE' WHERE (file_name='January-2014.pdf' OR pdf_url='/resources/January-2014.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Managing Incontinence in FTD (Winter 2014)' WHERE file_attachment_url='/resources/January-2014.pdf' AND title IN ('Partners in FTD Care - January 2014','January-2014.pdf');
UPDATE chatbot_guides SET title='Managing Incontinence in FTD (Winter 2014)' WHERE (file_name='January-2014.pdf' OR pdf_url='/resources/January-2014.pdf') AND title IN ('Partners in FTD Care - January 2014','January-2014.pdf');
UPDATE resources SET category='BEHAVIORAL_AGITATION' WHERE file_attachment_url='/resources/July-2012.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='BEHAVIORAL_AGITATION',topic_tag='BEHAVIORAL_AGITATION' WHERE (file_name='July-2012.pdf' OR pdf_url='/resources/July-2012.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Compulsive Behaviors in FTD (Summer 2012)' WHERE file_attachment_url='/resources/July-2012.pdf' AND title IN ('Partners in FTD Care - July 2012','July-2012.pdf');
UPDATE chatbot_guides SET title='Compulsive Behaviors in FTD (Summer 2012)' WHERE (file_name='July-2012.pdf' OR pdf_url='/resources/July-2012.pdf') AND title IN ('Partners in FTD Care - July 2012','July-2012.pdf');
UPDATE resources SET category='COMMUNICATION_PPA' WHERE file_attachment_url='/resources/PiC-fall-2014-WTDA.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='COMMUNICATION_PPA',topic_tag='COMMUNICATION_PPA' WHERE (file_name='PiC-fall-2014-WTDA.pdf' OR pdf_url='/resources/PiC-fall-2014-WTDA.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Loss of Empathy and Connection in FTD (Fall 2014)' WHERE file_attachment_url='/resources/PiC-fall-2014-WTDA.pdf' AND title IN ('Partners in FTD Care - Fall 2014','PiC-fall-2014-WTDA.pdf');
UPDATE chatbot_guides SET title='Loss of Empathy and Connection in FTD (Fall 2014)' WHERE (file_name='PiC-fall-2014-WTDA.pdf' OR pdf_url='/resources/PiC-fall-2014-WTDA.pdf') AND title IN ('Partners in FTD Care - Fall 2014','PiC-fall-2014-WTDA.pdf');
UPDATE resources SET category='BEHAVIORAL_AGITATION' WHERE file_attachment_url='/resources/Summer-2014-Newsletter_Final.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='BEHAVIORAL_AGITATION',topic_tag='BEHAVIORAL_AGITATION' WHERE (file_name='Summer-2014-Newsletter_Final.pdf' OR pdf_url='/resources/Summer-2014-Newsletter_Final.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET title='Changes in Sexual Behavior in FTD (Summer 2014)' WHERE file_attachment_url='/resources/Summer-2014-Newsletter_Final.pdf' AND title IN ('Partners in FTD Care - Summer 2014','Summer-2014-Newsletter_Final.pdf');
UPDATE chatbot_guides SET title='Changes in Sexual Behavior in FTD (Summer 2014)' WHERE (file_name='Summer-2014-Newsletter_Final.pdf' OR pdf_url='/resources/Summer-2014-Newsletter_Final.pdf') AND title IN ('Partners in FTD Care - Summer 2014','Summer-2014-Newsletter_Final.pdf');
UPDATE resources SET category='SAFETY_WANDERING' WHERE file_attachment_url='/resources/Spring-2013.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='SAFETY_WANDERING',topic_tag='SAFETY_WANDERING' WHERE (file_name='Spring-2013.pdf' OR pdf_url='/resources/Spring-2013.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE resources SET category='GRIEF_LOSS' WHERE file_attachment_url='/resources/AFTDGriefBookletForWeb.pdf' AND category IN ('GUIDE','','GENERAL_EDUCATION');
UPDATE chatbot_guides SET category='GRIEF_LOSS',topic_tag='GRIEF_LOSS' WHERE (file_name='AFTDGriefBookletForWeb.pdf' OR pdf_url='/resources/AFTDGriefBookletForWeb.pdf') AND COALESCE(category,'') IN ('GUIDE','','GENERAL_EDUCATION') AND COALESCE(topic_tag,'') IN ('GUIDE','','GENERAL_EDUCATION');

-- Publish the eight requested sources through the unified Guides library.
-- PDFs are referenced by URL; PDF bytes are never inserted into PostgreSQL.
-- Preserve matching sources already added manually and do not recreate them.
WITH catalog(id,title,summary,disease_domain,category,source_url,pdf_url) AS (
  VALUES
    ('resource-aftd-compulsive-behaviors','Managing Compulsive Behaviors in FTD','Practical information from AFTD about repetitive and compulsive behaviors in FTD.','FTD','BEHAVIORAL_AGITATION','https://www.theaftd.org/help-and-hope/ta-compulsive-behaviors/',NULL),
    ('resource-aftd-driving-decision','Driving and FTD: Making a Difficult Decision','AFTD information about driving changes, safety concerns and deciding when to stop driving.','FTD','SAFETY_WANDERING','https://www.theaftd.org/help-and-hope/hs-driving-and-ftd/',NULL),
    ('resource-aftd-driving-tips','Driving and FTD: Tips for Care Partners','AFTD tips for discussing driving concerns and supporting a transition away from driving.','FTD','SAFETY_WANDERING','https://www.theaftd.org/help-and-hope/caregiver-tips-driving-and-ftd/',NULL),
    ('resource-aftd-roaming-spring-2013','Roaming Is Not Wandering in FTD (Spring 2013)','An AFTD article explaining how roaming in FTD can differ from wandering, with examples of safety planning.','FTD','SAFETY_WANDERING','https://www.theaftd.org/wp-content/uploads/2018/01/Spring-2013.pdf','/resources/Spring-2013.pdf'),
    ('resource-aftd-grief-journey','Grief and the FTD Journey','AFTD information about grief and loss throughout the FTD journey, with links to additional support.','FTD','GRIEF_LOSS','https://www.theaftd.org/help-and-hope/hs-grief-and-the-ftd-journey/',NULL),
    ('resource-aftd-grief-booklet','Walking with Grief: Loss and the FTD Journey','An AFTD booklet sharing perspectives on loss and grief from diagnosis through later stages and bereavement.','FTD','GRIEF_LOSS','https://www.theaftd.org/wp-content/uploads/2020/02/AFTDGriefBookletForWeb.pdf','/resources/AFTDGriefBookletForWeb.pdf'),
    ('resource-yes-young-onset','YES!: Young-Onset Dementia Education and Support','Education, support groups and programs for people and families affected by dementia diagnosed before age 65.','BOTH','CARE_PARTNER_SUPPORT','https://yessupport.org',NULL),
    ('resource-alz-association','Alzheimer’s Association: Dementia Information and Support','Information and support from the Alzheimer’s Association for people affected by Alzheimer’s disease and other dementias.','BOTH','GENERAL_EDUCATION','https://www.alz.org',NULL)
)
INSERT INTO resources(id,title,summary,content_body,disease_domain,category,external_url,file_attachment_url,additional_links,key_takeaways)
SELECT c.id,c.title,c.summary,c.summary,c.disease_domain,c.category,
       CASE WHEN c.pdf_url IS NULL THEN c.source_url ELSE NULL END,
       c.pdf_url,
       CASE WHEN c.pdf_url IS NULL THEN '[]'::jsonb ELSE jsonb_build_array(jsonb_build_object('label','Original PDF (AFTD)','url',c.source_url)) END,
       '[]'::jsonb
FROM catalog c
WHERE NOT EXISTS (
  SELECT 1 FROM resources r WHERE r.id=c.id OR rtrim(r.external_url,'/')=rtrim(c.source_url,'/') OR (c.pdf_url IS NOT NULL AND r.file_attachment_url=c.pdf_url)
)
AND NOT EXISTS (
  SELECT 1 FROM chatbot_guides g WHERE c.pdf_url IS NOT NULL AND g.pdf_url=c.pdf_url
)
ON CONFLICT(id) DO NOTHING;
