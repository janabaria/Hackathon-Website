# Quiz-gated maze and compact layouts

- Maze players choose an existing quiz. Every command, including a turn, waits for a correct answer. Incorrect answers keep the robot still. Repeated commands each require their own answer. Questions cycle when a program has more commands than questions. No quiz means Run is disabled.
- Removed the reel index/count; kept accessible previous/up and next/down arrows.
- Added three educational lessons under matching existing accounts: Lara Bakes (gluten/windowpane), Nesha (container watering), Olivia Sews (threading troubleshooting). Each includes a real reference photograph, image credit/license, and a primary learning-source link. Applied migration 019_educational_posts.sql. No fabricated engagement.
- Post media capped at 560px wide and 340px high (280px high on phones), preserving the full image/video. Reel player capped at 440px wide, with a smaller phone layout and contained video.
- Pod timer is a 290px vertical panel on the right on wide screens; it stacks below the session on narrower screens. Start, pause and leaving were verified.
- Removed only the Home header Create post button; the composer and navigation Create menu remain.

Verification: production build, formatting and 47 app tests passed. Browser checks verified wrong-answer/no movement, one movement per correct answer, all four required answers to complete the first maze, arrow-only reel navigation, 440px desktop reel width, 340px post image height, new posts/source links, and right-hand pod timer positioning. Existing large-bundle build advisory remains. Source updated locally; not pushed to GitHub.

Learning sources: https://www.kingarthurbaking.com/blog/2022/10/14/what-is-the-windowpane-test-for-bread-dough ; https://www.rhs.org.uk/container-gardening/how-to-water-containers ; https://help.singer.com/en-US/troubleshooting-tips-389058
