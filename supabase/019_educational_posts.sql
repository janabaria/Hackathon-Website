-- Sourced educational posts, matched to existing topic accounts. No invented engagement.
begin;
insert into public.posts(id,author_id,kind,caption,topic,image,created_at) select 'ab54574f-e178-5617-8edf-2aff78376f34','6b3620e1-a20f-4014-97b0-ea5406b7d984','post','Bread science: what does the windowpane test tell you?

Kneading develops a stretchy gluten network that holds gas from yeast. Rest a small piece of dough briefly, then stretch it gently: a thin, translucent centre shows more developed gluten than an immediate tear.

It is not a universal pass/fail test. Long fermentation also develops dough, and wholegrain bran changes how it stretches. Follow your recipe rather than kneading every dough to the same appearance.

Try explaining why a stronger elastic network helps a loaf hold its shape.','Baking','https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Kneading.jpg/500px-Kneading.jpg',now() - interval '0 minutes' where exists(select 1 from public.profiles where id='6b3620e1-a20f-4014-97b0-ea5406b7d984') on conflict(id) do nothing;
insert into public.posts(id,author_id,kind,caption,topic,image,created_at) select '64fd5f04-0053-557a-a761-4a97cf3f29bf','ef717f18-5802-4121-b4cd-d14d714302cc','post','Plant-care investigation: water by observation, not just a calendar.

Check the compost moisture before watering each container. The same schedule will not suit every pot: plant size, container size, weather and growing medium affect how quickly water is used.

For a one-week notebook exercise, record the moisture you observe, the weather and when you water. Compare two pots without assuming they need the same amount.

Discussion: what evidence would make you change a watering routine?','Gardening','https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d3/Francesco_Gallarotti_2016-03-09_%28Unsplash_Bfdia-aJOvI%29.jpg/1280px-Francesco_Gallarotti_2016-03-09_%28Unsplash_Bfdia-aJOvI%29.jpg',now() - interval '1 minutes' where exists(select 1 from public.profiles where id='ef717f18-5802-4121-b4cd-d14d714302cc') on conflict(id) do nothing;
insert into public.posts(id,author_id,kind,caption,topic,image,created_at) select '2e6275b5-bbfe-587e-b7c1-4750c319289a','947e6e09-83f2-4c0c-a194-fd4e7fa40f20','post','A sewing-machine debugging lesson: change one thing at a time.

Loops under the fabric can come from the upper thread being threaded incorrectly. Before changing every tension setting, rethread with the presser foot raised and the needle at its highest position, following your machine manual.

Then try a test seam on matching scrap fabric. Compare the top and underside, record what changed, and only then adjust another variable.

Why is changing several settings at once a poor way to find the cause?','Sewing','https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Sewing_Machine.JPG/960px-Sewing_Machine.JPG',now() - interval '2 minutes' where exists(select 1 from public.profiles where id='947e6e09-83f2-4c0c-a194-fd4e7fa40f20') on conflict(id) do nothing;
commit;