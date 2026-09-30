-- Apply after 010. Only owners may edit content; IDs, authors, timestamps and moderation remain protected.
begin;
grant update(caption,topic,title,image,video_url,thumbnail) on public.posts to authenticated;
grant update(text) on public.comments to authenticated;
grant update(title,goal,minutes,vibe,visibility) on public.pods to authenticated;
grant update(title,topic,difficulty,questions,game) on public.quizzes to authenticated;
create policy owner_edit on public.posts for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy owner_edit on public.comments for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy owner_edit on public.pods for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
create policy owner_edit on public.quizzes for update to authenticated using(author_id=auth.uid()) with check(author_id=auth.uid());
-- Quiz scores are tied to the question set; remove obsolete personal bests after a revision.
create function public.clear_revised_quiz_results() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if old.questions is distinct from new.questions then delete from public.private_items where kind='result' and id=new.id::text; end if;
 return new;
end; $$;
create trigger clear_revised_quiz_results after update of questions on public.quizzes for each row execute function public.clear_revised_quiz_results();
commit;
