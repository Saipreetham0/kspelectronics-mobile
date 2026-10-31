# UI / UX audit

Audit of every screen's code plus phone-width (390 px) screenshots of the web build. The store API was unreachable from the audit
environment, so product, cart and checkout were not seen with real data: check those parts on a device.

Already good: one brand palette in `src/theme.ts`, skeleton loaders, a sticky checkout bar, undo after removing a cart line,
out-of-stock and price-change warnings, an offline banner, accessibility labels on most controls, and a font-scale cap so text doesn't clip.

## Fix first (these cost orders)
1. **Log out wipes everything with one tap.** No confirmation, and it clears the cart, wishlist, saved addresses and recent searches
   (`src/store.tsx` `logout`, `app/(tabs)/account.tsx`). Ask first; consider keeping the wishlist.
2. **Phone-number login is hidden.** OTP is a small link under the email form, behind the `otp` flag (`app/login.tsx`). Indian shoppers expect
   phone first. The password field has no show/hide toggle, and registration doesn't check the email or password before sending.
3. **Guests tap "Log in" twice.** The Log in buttons in Order Again, My orders and Profile open the Account screen, which shows another
   "Log in or register" button. Call `showLogin()` directly.
4. **"Remove unavailable items" is a disabled button** (`app/(tabs)/cart.tsx`, footer). It reads as an action but does nothing; make it remove them.
5. **A product opened from a link can leave no way back.** The close button is set only after the product loads (`app/product/[slug].tsx`);
   while it loads or if it fails there is no back button, which strands the shopper on iPhone.
6. **Slow or offline: placeholders for up to 35 seconds.** `src/useFetch.ts` retries after 5, 10 and 20 s before showing any error.
   Show "Still trying…" or an error with retry after about 8 s.
7. **Tab labels clipped at the bottom** when the bottom safe-area inset is 0 (seen in the web render; Android with 3-button navigation too).

## Should fix
- **Onboarding:** up to 3 slides plus login before shopping, and guest mode is offered twice (last slide and login screen).
  The first slide's "Next" is a small pill; the last slide's buttons are full width.
- **Home:** "New arrivals → see all" opens an unsorted list (no `sort=date`); the Bambu Lab row is hard-coded and ignores the Quick toggle;
  about 8 API requests on open.
- **Cart:** the delivery location shows twice (top card and sticky footer); "Grand total" can exclude delivery while it says
  "Calculated at checkout".
- **Product page:** no delivery date or pincode check (needs a store endpoint); "Add to cart" shows a spinner whenever any cart action runs
  (global `busy`); pinch-zoom on photos works on iPhone only; an empty "Customer reviews" heading when there are none.
- **Account:** "Need help?", "Help and support" and "Terms, privacy and policies" all open `/help`; guests see a "?" avatar.
- **Track order** needs the order number and an email, which phone-only (OTP) customers may not have.
- **Touch targets:** the −/+ on product cards (`src/components/AddButton.tsx`) are 30×34–36 px, below 44–48 px.
- **Screen readers:** the card −/+ have no `accessibilityRole="button"`; the price-and-name area of each product card has no label,
  so all of its text is read out after the product name.

## Polish
- Two icon sets (Ionicons and Phosphor) plus emoji as icons in checkout (📍 🗺️ 🛵).
- Diwali dates are written into the code (`src/components/Diwali.tsx`); moving them to `/api/app-config` avoids a release every year.
- The Order Again tab is renamed "Reorder" on narrow phones.
