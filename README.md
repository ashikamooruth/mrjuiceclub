# Mr Juice Club — Vercel + Loyverse

This project provides:
- a mobile-friendly Mr Juice Club registration page;
- optional email and birthday;
- Mauritius phone normalization (+230);
- duplicate protection by scanning Loyverse customers for an existing phone number;
- automatic customer creation in Loyverse;
- outlet tracking via the URL, for example `?store=bagatelle`;
- a server-only Loyverse access token.

## 1. Deploy to Vercel

### Easiest method: GitHub
1. Create a new GitHub repository, e.g. `mr-juice-club`.
2. Upload the contents of this folder to the repository.
3. In Vercel choose **Add New → Project** and import that GitHub repository.
4. Leave the framework preset as **Other** if Vercel does not auto-detect one.
5. Deploy.

## 2. Add the secret Loyverse token

In Vercel:
**Project → Settings → Environment Variables**

Add:

- Name: `LOYVERSE_ACCESS_TOKEN`
- Value: your Loyverse token
- Environment: Production (and Preview if you want to test preview deployments)

Save it, then **redeploy** the project.

Do not put the token in `index.html`, GitHub, a QR code, or any public file.

## 3. Test

Open your Vercel production URL, e.g.
`https://your-project.vercel.app/?store=test`

Register with a phone number that is safe to use for testing.

Then check **Loyverse Back Office → Customers** and confirm that:
- the customer was created;
- the phone number appears as +230XXXXXXXX;
- the note contains the outlet and registration date.

Submit the same phone number again. The page should report that the customer is already a member instead of creating a duplicate.

## 4. Outlet URLs

Use one URL per outlet so the source is written into the customer's Loyverse note:

- `https://YOUR-DOMAIN/?store=bagatelle`
- `https://YOUR-DOMAIN/?store=lacroisette`
- `https://YOUR-DOMAIN/?store=flacq`
- `https://YOUR-DOMAIN/?store=grandbaie`

Generate a separate QR code for each URL.

## 5. Birthday and email

Loyverse's documented customer object supports name, email, phone number, country code, customer code, note and points, but it does not expose a dedicated birthday field. This starter therefore stores the optional birthday in the customer note.

## 6. Scaling note

This zero-database version checks Loyverse customers page-by-page because the documented list endpoint supports filtering by email but not directly by phone number. That is fine for an initial loyalty launch, but once the membership base becomes large, move the phone lookup to a small external datastore (for example Vercel Postgres/Supabase) or another indexed store.

## 7. Important privacy note

The consent wording here is a practical starter, not legal advice. Before launch, align it with Mr Juice's actual privacy/marketing practices and Mauritius data-protection requirements.
