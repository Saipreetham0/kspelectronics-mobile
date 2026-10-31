# Account deletion page (draft for the website)

Google Play needs a public web page that explains how to delete an account and its data. Create a WordPress page at
**https://kspelectronics.in/delete-account/** with the text below, then paste that URL into Play Console under
App content > Data safety > "Delete account URL". Fill in the three `[...]` placeholders first.

---

# Delete your KSP Electronics account

You can delete your account and personal data at any time.

## In the app (fastest)
1. Open the KSP Electronics app and sign in.
2. Go to **Account > Profile and security**.
3. Under **Delete account**, tap **Delete my account**, enter your password and confirm. If you log in with your mobile number, tap
   **No password? Confirm with a code to your mobile** and enter the code we send by SMS.

Your account is deleted straight away and you are signed out.

## Without the app
Email us from the address on your account at **[support email]**, or message us on WhatsApp at **[WhatsApp number]**, with the subject
"Delete my account". We will confirm your identity and delete the account within **[number] days**.

## What is deleted
- Your login (name, email, mobile number and password)
- Your saved delivery and billing details
- Your wishlist
- Notification settings linked to your account

## What we keep
Orders you placed stay in our records, because Indian tax and accounting rules require us to keep invoices. They are no longer linked to a login,
and we do not use them for marketing.

## Questions
Write to **[support email]**.

---

## Notes for you (not part of the page)
- Behaviour described here matches the app: `POST /api/auth/delete` asks for the password again (or an SMS code for mobile-number accounts, see docs/SERVER_API.md), deletes the WooCommerce customer, signs the person out,
  and emails the shop. Past orders stay for tax records but are no longer linked to a login.
- Saved addresses, recent searches and the cart token live on the phone only and are removed when the app is uninstalled or the user signs out.
- Only the account's own customer role can be deleted this way. Admin or shop-manager accounts are refused and must be handled by you.
