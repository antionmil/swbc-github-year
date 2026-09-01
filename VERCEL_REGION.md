# Why dub1

Supabase is in Ireland (eu-west-1). Vercel functions default to `iad1`
(Washington), so every database round trip was crossing the Atlantic — and the
poster page makes several. `dub1` is Vercel's Dublin region, the closest match.

Verify after deploy: `curl -sD- -o /dev/null <url> | grep x-vercel-id`
The second segment is where the function ran. It should read `dub1`.

If the Hobby plan refuses to move off `iad1`, this file is the record of why it
was tried; delete `vercel.json` and nothing else changes.
