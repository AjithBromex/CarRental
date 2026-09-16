# Fleetline — car rental management & vehicle analytics

A React + Firebase dashboard for a small car rental business. One owner account, live
Firestore data, and a separate analytics page for every vehicle.

---

## Run it

```bash
npm install
cp .env.example .env     # fill in your Firebase keys
npm run dev
```

Build for production with `npm run build`, preview with `npm run preview`.

---

## Firebase setup (about ten minutes)

**1. Create the project**

Go to the [Firebase console](https://console.firebase.google.com), create a project, then add a
**Web app**. Copy the config values into `.env`:

```
VITE_FIREBASE_API_KEY=AIza…
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234:web:abcd
VITE_ADMIN_DOMAIN=fleetline.local
```

**2. Create the owner account**

Authentication → Sign-in method → enable **Email/Password**. Then Users → **Add user**:

| Field | Value |
| --- | --- |
| Email | `admin@fleetline.local` (or username `admin`) |
| Password | `admin123` |

On the login screen, you can log in directly with:
- **Username**: `admin`
- **Password**: `admin123`

**3. Lock down the database**

Firestore Database → Create database → **Production mode**. Then open the Rules tab, paste the
contents of `firestore.rules`, and replace `ADMIN_UID` with the UID shown next to your user in
Authentication → Users.

Those rules do two jobs: only that one UID can touch anything, and every write is shape-checked
server-side — a negative amount, a paid amount larger than the total, or an unknown status is
rejected even if someone bypasses the form.

**4. Indexes**

The dashboard orders vehicles by `createdAt` and rentals by `startDate`. Firestore builds these
single-field indexes automatically. If a console warning ever asks for a composite index, follow
its link and click create.

---

## Data model

```
vehicles/{vehicleId}
  name, model, registrationNumber, image, type, year,
  status: available | rented | maintenance,
  notes, createdAt, updatedAt

rentals/{rentalId}
  vehicleId          ← the relationship; everything else is derived from it
  vehicleName, registrationNumber   ← copied so history survives a vehicle rename
  driverName, phoneNumber, location,
  startDate, endDate, days,
  totalAmount, amountPaid, balance,
  status: active | completed | cancelled,
  notes, createdAt, updatedAt
```

Totals, day counts, revenue, per-vehicle stats and driver records are **never stored** — they're
computed from the two collections in `src/utils/analytics.js`. That means numbers can't drift out
of sync, and editing one rental instantly corrects every chart.

`balance` is written alongside each rental purely so Firestore can query and sort on it; the UI
always recalculates `total − paid`.

---

## How the pieces fit

| Concern | Where |
| --- | --- |
| Live data for the whole app | `context/DataContext.jsx` — one pair of `onSnapshot` listeners, shared by every page |
| Sign in / sign out | `context/AuthContext.jsx` |
| Writes | `services/vehicleService.js`, `services/rentalService.js` |
| All maths | `utils/analytics.js` |
| Money and date formatting | `utils/format.js` |
| Design tokens, every style | `index.css` |

Pages are `React.lazy`-loaded, so only the route in view is downloaded.

### Rental status keeps the fleet honest

A rental and its vehicle always move together in a single Firestore `writeBatch`:

- rental set to **active** → vehicle becomes **rented**
- rental set to **completed** or **cancelled** → vehicle becomes **available**
- moving a rental to a different vehicle frees the old one in the same batch

Deleting a vehicle removes its rentals too, atomically, so no orphan records are left behind.

---

## What's on each page

- **Dashboard** — eight headline numbers, revenue by month split into collected against
  outstanding, fleet status donut, rentals per day, top earners, recent rentals.
- **Vehicles** — cards or table, filter by status and type, sort by revenue, rentals, days or
  balance. Add, edit, delete with confirmation.
- **Vehicle analytics** (click any vehicle) — overview, times rented, days out, revenue,
  collected, outstanding, average value and duration, share of fleet revenue, a combined
  revenue/rentals/days chart, paid-against-pending donut, most common destinations, and the full
  rental history with inline status changes.
- **Rentals** — every booking with search across driver, phone, vehicle, plate and place; filters
  for vehicle, rental status, payment status and date range; CSV export.
- **Payments** — collection rate, who owes the most by vehicle, and a **record payment** dialog
  that tops up `amountPaid` and recalculates the balance.
- **Drivers** — one row per phone number with lifetime spend, balance and expandable history.
- **Analytics** — league table by any metric, daily/weekly/monthly trends, and a comparison of up
  to four vehicles on a radar chart plus table.
- **Settings** — theme, account, JSON backup, security notes.

The bell in the top bar collects what needs action: overdue returns, rentals ending within two
days, outstanding money, idle vehicles, vehicles in maintenance.

---

## Vehicle photos

The form takes an image URL, which keeps the app free of upload plumbing. To host your own
photos, upload them in Firebase console → Storage, copy the download URL, and paste it in.

---

## Design notes

The palette is built around an Indian number plate — signal amber on graphite — and registration
numbers are set as plate chips throughout, so a vehicle is recognisable at a glance in any table.
Headings and all figures use Space Grotesk with tabular numerals so money columns line up; body
text and table content use Inter. Both themes are defined as CSS custom properties on
`:root[data-theme]`, so the switcher is a single attribute change with no flash.

Layout is mobile-first: the sidebar collapses to an icon rail on laptops and slides in from the
left on phones, tables scroll horizontally inside their own container rather than pushing the
page sideways, and buttons grow to 44px touch targets on small screens. Motion is limited to
things you triggered — opening a dialog, switching a toggle — and is disabled entirely under
`prefers-reduced-motion`.
