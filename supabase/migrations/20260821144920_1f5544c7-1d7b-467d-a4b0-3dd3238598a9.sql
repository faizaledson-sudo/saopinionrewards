-- One survey per day
UPDATE public.app_settings SET value = '1'::jsonb, updated_at = now() WHERE key = 'surveys_per_day';

-- Secure integration credentials (service role only; no RLS policies on purpose)
CREATE TABLE IF NOT EXISTS public.secure_settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.secure_settings TO service_role;
ALTER TABLE public.secure_settings ENABLE ROW LEVEL SECURITY;

-- Retire the old starter bank and publish 7 daily surveys per plan, 5 questions each
UPDATE public.surveys SET status = 'closed', updated_at = now() WHERE status = 'active';

WITH cats(cat, mins, title, descr) AS (VALUES
  ('Mobile money', 3, 'Day 1 · Mobile money habits', 'Five quick questions about how you send and receive money.'),
  ('Transport', 3, 'Day 2 · Getting around town', 'Five quick questions about your daily travel.'),
  ('Shopping', 3, 'Day 3 · Where you shop', 'Five quick questions about groceries and household shopping.'),
  ('Technology', 4, 'Day 4 · Phones and data', 'Five quick questions about your phone, data and apps.'),
  ('Banking', 4, 'Day 5 · Saving and borrowing', 'Five quick questions about savings, loans and banks.'),
  ('Media', 3, 'Day 6 · What you watch and listen to', 'Five quick questions about TV, radio and social media.'),
  ('Food & drink', 3, 'Day 7 · Food and drinks', 'Five quick questions about eating out and favourite brands.')
), tiers(tier, label) AS (VALUES
  ('regular', 'Regular'), ('vip1', 'VIP1'), ('vip2', 'VIP2'), ('vip3', 'VIP3')
), new_surveys AS (
  INSERT INTO public.surveys (title, description, category, min_tier, estimated_minutes, status)
  SELECT cats.title || ' — ' || tiers.label, cats.descr, cats.cat, tiers.tier::plan_tier, cats.mins, 'active'
  FROM cats CROSS JOIN tiers
  RETURNING id, category
), q(cat, pos, qtype, qtext, opts) AS (VALUES
  ('Mobile money', 1, 'single_choice', 'Which mobile money service do you use most?', '["M-Pesa","Airtel Money","T-Kash","Bank app","None"]'),
  ('Mobile money', 2, 'single_choice', 'How often do you send money in a typical week?', '["Daily","2-3 times","Once","Rarely","Never"]'),
  ('Mobile money', 3, 'single_choice', 'What do you use it for most?', '["Family support","Paying bills","Business payments","Savings","Airtime"]'),
  ('Mobile money', 4, 'scale', 'How satisfied are you with the transaction fees? (1-5)', '[]'),
  ('Mobile money', 5, 'text', 'What would you improve about mobile money in Kenya?', '[]'),

  ('Transport', 1, 'single_choice', 'How do you usually travel to work or school?', '["Matatu","Boda boda","Walking","Own car","Bus"]'),
  ('Transport', 2, 'single_choice', 'How much do you spend on transport per day?', '["Under KSh 100","KSh 100-200","KSh 200-400","KSh 400-800","Over KSh 800"]'),
  ('Transport', 3, 'single_choice', 'Have you used a ride-hailing app in the last month?', '["Yes, often","Yes, once or twice","No","I do not know these apps"]'),
  ('Transport', 4, 'scale', 'Rate the reliability of public transport near you (1-5)', '[]'),
  ('Transport', 5, 'text', 'What is your biggest transport frustration?', '[]'),

  ('Shopping', 1, 'single_choice', 'Where do you buy most of your groceries?', '["Local kiosk","Open market","Supermarket","Wholesale shop","Online"]'),
  ('Shopping', 2, 'single_choice', 'How often do you shop for household items?', '["Daily","Weekly","Twice a month","Monthly"]'),
  ('Shopping', 3, 'multi_choice', 'Which of these do you buy every month?', '["Cooking oil","Maize flour","Soap","Milk","Sugar","Airtime"]'),
  ('Shopping', 4, 'scale', 'How important are discounts when you choose a shop? (1-5)', '[]'),
  ('Shopping', 5, 'text', 'Which shop gives you the best value and why?', '[]'),

  ('Technology', 1, 'single_choice', 'What kind of phone do you use?', '["Android smartphone","iPhone","Feature phone","Two or more phones"]'),
  ('Technology', 2, 'single_choice', 'How do you buy internet data?', '["Daily bundles","Weekly bundles","Monthly bundles","Home WiFi","Free WiFi"]'),
  ('Technology', 3, 'multi_choice', 'Which apps do you open every day?', '["WhatsApp","Facebook","TikTok","YouTube","X (Twitter)","Instagram"]'),
  ('Technology', 4, 'number', 'How many hours per day do you spend online?', '[]'),
  ('Technology', 5, 'text', 'What app do you wish existed in Kenya?', '[]'),

  ('Banking', 1, 'single_choice', 'Do you have a bank account?', '["Yes, one","Yes, more than one","No","Only a SACCO account"]'),
  ('Banking', 2, 'single_choice', 'How do you usually save money?', '["Mobile money","Bank account","SACCO","Chama group","At home"]'),
  ('Banking', 3, 'single_choice', 'Have you taken a digital loan in the last year?', '["Yes","No","I prefer not to say"]'),
  ('Banking', 4, 'scale', 'How confident do you feel about your savings? (1-5)', '[]'),
  ('Banking', 5, 'text', 'What would help you save more each month?', '[]'),

  ('Media', 1, 'single_choice', 'Where do you get most of your news?', '["Social media","TV","Radio","Online news sites","Friends and family"]'),
  ('Media', 2, 'multi_choice', 'Which platforms do you use for entertainment?', '["TikTok","YouTube","Netflix","Showmax","Local TV","Radio"]'),
  ('Media', 3, 'single_choice', 'How many hours of video do you watch per day?', '["Less than 1","1-2","2-4","More than 4"]'),
  ('Media', 4, 'scale', 'Rate how much you trust adverts you see online (1-5)', '[]'),
  ('Media', 5, 'text', 'Which Kenyan creator or show do you follow most?', '[]'),

  ('Food & drink', 1, 'single_choice', 'How often do you eat food prepared outside home?', '["Daily","A few times a week","Weekly","Rarely"]'),
  ('Food & drink', 2, 'single_choice', 'What is your usual lunch spend?', '["Under KSh 100","KSh 100-250","KSh 250-500","Over KSh 500"]'),
  ('Food & drink', 3, 'multi_choice', 'Which drinks do you buy most?', '["Soda","Bottled water","Juice","Tea or coffee","Energy drinks"]'),
  ('Food & drink', 4, 'scale', 'How important is brand when buying food? (1-5)', '[]'),
  ('Food & drink', 5, 'text', 'Which local food brand do you trust most?', '[]')
)
INSERT INTO public.questions (survey_id, type, text, options, required, position)
SELECT ns.id, q.qtype::question_type, q.qtext, q.opts::jsonb, true, q.pos
FROM new_surveys ns JOIN q ON q.cat = ns.category;