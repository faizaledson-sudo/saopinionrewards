DO $$
DECLARE s uuid;
BEGIN
IF NOT EXISTS (SELECT 1 FROM public.surveys) THEN

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Mobile money habits in Kenya','Tell us how you use M-Pesa and other wallets every week.','Finance','regular',3,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','How often do you use mobile money in a week?','["Daily","2-3 times","Once","Rarely"]',true,0),
 (s,'multi_choice','Which services do you use most?','["Send money","Buy airtime","Pay bills","Savings","Loans"]',true,1),
 (s,'scale','How satisfied are you with transaction fees?','[]',true,2),
 (s,'text','What would you improve about mobile money?','[]',false,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Your daily commute in Nairobi','Matatus, boda bodas or walking? Help transport planners.','Transport','regular',3,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','What is your main means of transport?','["Matatu","Boda boda","Personal car","Walking","Train"]',true,0),
 (s,'number','How much do you spend on transport per day (KES)?','[]',true,1),
 (s,'scale','Rate the reliability of your usual route','[]',true,2);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Shopping and household basics','Where and how you buy food and household items.','Retail','regular',4,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Where do you buy most groceries?','["Local kiosk","Open market","Supermarket","Online"]',true,0),
 (s,'multi_choice','Which brands do you buy monthly?','["Unga","Cooking oil","Tea leaves","Soap","Milk"]',true,1),
 (s,'text','Which product is hardest to find near you?','[]',false,2);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Smartphone and data usage','A short study on phones, data bundles and apps.','Technology','vip1',4,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Which network do you use for data?','["Safaricom","Airtel","Telkom","Other"]',true,0),
 (s,'number','How much do you spend on bundles per month (KES)?','[]',true,1),
 (s,'multi_choice','Which apps do you open daily?','["WhatsApp","TikTok","Facebook","YouTube","Banking app"]',true,2),
 (s,'scale','Rate your network speed','[]',true,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Banking and savings behaviour','Deeper study on saving, borrowing and chamas.','Finance','vip2',5,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'single_choice','Do you belong to a chama or SACCO?','["Yes, chama","Yes, SACCO","Both","Neither"]',true,0),
 (s,'scale','How confident are you about your savings plan?','[]',true,1),
 (s,'multi_choice','Which loan sources have you used?','["Bank","Mobile loan app","Shylock","Family","None"]',true,2),
 (s,'text','What stops you from saving more?','[]',false,3);

INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
VALUES ('Premium brand and media panel','Top-paying study on advertising recall and media habits.','Media','vip3',6,'active') RETURNING id INTO s;
INSERT INTO public.questions (survey_id, type, text, options, required, position) VALUES
 (s,'multi_choice','Where do you see most adverts?','["TV","Radio","Billboards","Social media","Matatu screens"]',true,0),
 (s,'single_choice','Which advert do you remember best this month?','["Telco","Bank","Beverage","Betting","None"]',true,1),
 (s,'scale','How much do adverts influence your purchases?','[]',true,2),
 (s,'text','Describe an advert that stood out and why.','[]',false,3);

END IF;
END $$;