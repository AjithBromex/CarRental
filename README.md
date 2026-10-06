🚗 CarRental — Fleet & Rental Management Dashboard

A modern, responsive car rental management dashboard built with React and Firebase. It helps rental owners manage vehicles, rentals, payments, drivers, and business analytics from a single interface.

✨ Features

📊 Dashboard

- Key business statistics
- Monthly revenue overview
- Collected vs outstanding payments
- Fleet availability overview
- Rental activity
- Top-performing vehicles
- Recent rentals

🚘 Vehicle Management

- Add, edit, and delete vehicles
- Vehicle status management
- Filter vehicles by status and type
- Sort by revenue, rentals, rental days, or balance
- Vehicle performance analytics
- Rental history for individual vehicles

📋 Rental Management

- View and manage all bookings
- Search by driver, phone number, vehicle, registration number, or destination
- Filter by vehicle, rental status, payment status, and date
- Update rental status
- Export rental records as CSV

💳 Payment Management

- Track collected and outstanding payments
- View outstanding balances
- Record payments
- Automatically calculate remaining balances

👤 Driver Management

- Driver records grouped by phone number
- Lifetime spending
- Outstanding balance
- Rental history

📈 Analytics

- Compare vehicle performance
- Daily, weekly, and monthly trends
- Revenue and rental statistics
- Vehicle comparison charts
- Performance tables

🔔 Notifications

The dashboard highlights items requiring attention, including:

- Overdue rentals
- Upcoming rental returns
- Outstanding payments
- Idle vehicles
- Vehicles under maintenance

🎨 UI & Design

- Modern responsive interface
- Mobile-first design
- Light and dark themes
- Responsive tables
- Accessible touch targets
- Smooth, lightweight interactions
- Reduced-motion support
- Consistent design system

🛠️ Technology Stack

- React
- JavaScript
- Firebase
  - Firebase Authentication
  - Cloud Firestore
  - Firebase Storage
- CSS
- Recharts
- Vite

📁 Project Structure

CarRental/
├── car-rental-dashboard/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── utils/
│   │   │   └── format.js
│   │   ├── DataContext.jsx
│   │   ├── analytics.js
│   │   ├── index.css
│   │   └── rentalService.js
│   ├── package.json
│   └── ...
│
├── firestore.rules
├── .gitignore
└── README.md

⚡ Performance

Pages are loaded using React lazy loading so that application code is loaded when required rather than loading every page at startup.

The application also uses responsive layouts and lightweight interactions to provide a smooth experience across desktop and mobile devices.

🔄 Rental & Vehicle Management

Rental and vehicle information is kept synchronized through Firestore operations.

When a rental status changes, the corresponding vehicle status is updated accordingly. Vehicle changes and related rental updates are handled together where required to help maintain consistent records.

🖼️ Vehicle Photos

Vehicle images can be added using image URLs.

For private deployments, images can also be hosted using Firebase Storage and their URLs can be used by the application.

🎨 Design System

The interface uses a custom design system with:

- CSS custom properties
- Light and dark themes
- Consistent typography
- Responsive spacing
- Registration-number style vehicle identifiers
- Mobile-friendly layouts

The design is inspired by modern fleet-management interfaces while maintaining a clean and simple user experience.

🔐 Security

This project uses Firebase Authentication and Firestore Security Rules for access control.

Important: Never commit the following files or information to the public repository:

.env
.env.local
serviceAccountKey.json
firebase-adminsdk-*.json

Never publish:

- Passwords
- Private API credentials
- Firebase Admin SDK credentials
- Database exports
- Customer personal information
- Private business data

Environment-specific configuration should be stored locally in environment files and excluded through ".gitignore".

⚙️ Installation

Clone the repository:

git clone https://github.com/AjithBromex/CarRental.git

Navigate to the project:

cd CarRental/car-rental-dashboard

Install dependencies:

npm install

Create your local environment file:

.env

Add the required Firebase configuration variables to the local environment file.

Then start the development server:

npm run dev

🌐 Deployment

The project can be deployed using platforms such as Vercel or other services that support Vite/React applications.

Make sure the required environment variables are configured in the deployment platform.

📱 Responsive Design

The dashboard is designed for:

- 📱 Mobile
- 💻 Laptop
- 🖥️ Desktop

Tables use their own horizontal scrolling areas on smaller screens, while navigation adapts to different screen sizes.

📌 Project Purpose

CarRental is designed as a management solution for rental businesses that need a centralized way to manage:

Vehicles → Rentals → Drivers → Payments → Analytics

The goal is to simplify day-to-day rental operations while providing useful business insights through a modern dashboard.

👨‍💻 Developer

AjithBromex

GitHub:
https://github.com/AjithBromex

---

⚠️ Note

This repository contains the application's source code. Production credentials, customer information, private business data, and other sensitive configuration should never be committed to the public repository.
