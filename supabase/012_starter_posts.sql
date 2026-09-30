-- User-requested starter content: five posts per existing profile. Safe to rerun.
-- Does not alter profiles, accounts, existing posts, or permissions.
begin;
with ideas(topic,caption) as (values
('Cooking','For crisp roasted vegetables, leave space between pieces. A crowded tray traps steam; a single layer helps the edges brown.'),
('Cooking','Pasta water can help bring a sauce together. Add a small splash at a time and toss until the sauce coats the pasta.'),
('Cooking','A useful prep habit: read the whole recipe, measure ingredients, and put tools within reach before turning on the heat.'),
('Cooking','Cut vegetables into similar sizes when cooking them together. Smaller pieces cook faster, so even sizes make timing easier.'),
('Cleaning','A simple cleaning order: work from high surfaces down to the floor. That way, dust lands somewhere you have not cleaned yet.'),
('Cleaning','Microfiber cloths have many tiny fibers that pick up dust. Use a clean section as you go instead of spreading the same dirt around.'),
('Cleaning','Try a five-minute reset: put away five things, clear one surface, and take out the rubbish. A small target is easier to start.'),
('Cleaning','For a more organized desk, give frequently used items a fixed home. You spend less time searching and more time doing the task.'),
('Biology','Plants use light energy to build sugars from carbon dioxide and water. Photosynthesis also releases oxygen. A leaf is a tiny chemical workshop.'),
('Biology','Fungi are not plants. They absorb nutrients from their surroundings and play a major role in breaking down organic material.'),
('Biology','A food web shows how feeding relationships connect many species. Unlike a simple food chain, it includes several possible paths.'),
('Biology','DNA carries inherited information, while proteins do much of the work in cells. The sequence of DNA bases helps specify how proteins are made.'),
('Sports','In basketball, a successful shot beyond the three-point line earns three points; most other field goals earn two. Free throws earn one.'),
('Sports','A relay race is a team event, but the handover matters as much as running speed. Smooth coordination can save precious time.'),
('Sports','In tennis, a tiebreak usually counts points as 1, 2, 3 rather than 15, 30, 40. Different competitions can use different tiebreak formats.'),
('Sports','A good practice log can be simple: write the skill you worked on, one thing that improved, and one thing to try next time.'),
('Astronomy','The Moon does not make its own visible light. Moonlight is sunlight reflected from its surface, and its phases depend on our viewing angle.'),
('Astronomy','A light-year measures distance, not time: it is the distance light travels in one year.'),
('Programming','A variable gives a name to a value. Good names describe what the value means, making code easier to read later.'),
('Programming','When debugging, change one thing at a time and check the result. It becomes much easier to see which change actually helped.'),
('Mathematics','Percent means out of one hundred. To find 15% of 200, multiply 200 by 0.15: the answer is 30.'),
('Mathematics','A triangle has three sides, and its interior angles add to 180 degrees in ordinary flat geometry.'),
('Art','Negative space is the area around and between objects. Looking at those shapes can help you draw proportions more accurately.'),
('Art','A quick sketch exercise: draw the same object three times, using one minute for each sketch. Look for the biggest shapes first.'),
('Languages','Learning a word inside a short sentence gives you context. Save the sentence as well as the translation so you can practice using it.'),
('Languages','Try describing your room using only words you already know. When a word is missing, write it down and learn it after you finish.'),
('Geography','Lines of latitude run parallel to the equator. Longitude measures how far east or west a location is from the prime meridian.'),
('Geography','Weather describes short-term conditions. Climate describes patterns over much longer periods.'),
('Music','Rhythm is a pattern of durations and accents. You can practice it away from an instrument by clapping and counting steadily.'),
('Music','A melody is a sequence of notes heard as a phrase. Repeating a short phrase can make a piece easier to recognize.'),
('Gardening','Before watering a houseplant, check its soil and learn the needs of that species. Different plants prefer different watering patterns.'),
('Gardening','Drainage holes let extra water leave a pot. The potting mix, container, and plant all affect how quickly soil dries.'),
('Physics','Friction opposes relative motion between surfaces. It helps your shoes grip the floor and your brakes slow a bicycle.'),
('Physics','Sound travels as vibrations through a medium such as air, water, or a solid. It cannot travel through an empty vacuum.'),
('Writing','A useful editing pass: find one long sentence and split it into two. Keep each sentence focused on one clear idea.'),
('Writing','An outline can be just three lines: the question, the main point, and the example. Start small and expand once the direction feels clear.'),
('Photography','Changing your viewpoint changes the picture. Try photographing the same subject from eye level, low down, and slightly above.'),
('Photography','Soft light makes gentler shadows. A bright window with indirect light can be a useful place to practice taking portraits.'),
('Study skills','After reading a section, close it and explain the main idea in your own words. Then check what you missed.'),
('Study skills','Turn a notebook heading into a question. Answering the question makes a useful self-test when you return to your notes.')
), selected as (
 select p.id author_id,i.topic,i.caption,row_number() over(partition by p.id order by md5(p.id::text||i.caption)) n
 from public.profiles p cross join ideas i
), seeded as (
 select md5('btb-starter-20260930-'||author_id::text||'-'||n)::uuid id,author_id,topic,
 caption || case (n % 5) when 0 then E'\n\nWhat would you add to this?' when 1 then E'\n\nA small idea worth keeping in your notes.' when 2 then E'\n\nTry explaining this in your own words.' when 3 then E'\n\nWhat is your favorite example of this?' else E'\n\nOne topic, one useful takeaway.' end caption
 from selected where n<=5
)
insert into public.posts(id,author_id,topic,caption,kind,created_at)
select id,author_id,topic,caption,'post',now() from seeded
on conflict(id) do nothing;
commit;
