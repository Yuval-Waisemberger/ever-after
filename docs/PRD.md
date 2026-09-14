# Product Specification Document — Ever After

## 1. Executive Summary

Ever After is a responsive wedding-planning web application that gives couples one shared place to organize their wedding. Instead of dividing information among spreadsheets, notes, messages, vendor websites, and separate planning tools, the product connects wedding details, tasks, vendors, budget commitments, payments, guests, reviews, a timeline, and personalized guidance in one coherent workspace.

The platform also provides a public vendor marketplace. Visitors can explore published vendor profiles and reviews, registered couples can save and manage vendor relationships, and vendor owners can maintain their own business profiles. A Wedding Assistant helps couples understand their planning information and receive relevant wedding guidance in Hebrew or English without changing their data automatically.

The current product is an academic MVP intended to demonstrate a complete and useful planning experience rather than a commercial payment or subscription platform.

---

## 2. The Problem

Wedding planning requires couples to coordinate many related decisions over a long period. In practice, the information is often scattered across unrelated tools:

- **Fragmented information:** Tasks may be written in notes, budget figures in spreadsheets, vendor details in messages, and guest information in separate documents. Couples repeatedly search for and copy the same information.
- **Limited decision context:** Vendor listings and general advice are usually disconnected from the couple's actual date, location, style, guest count, budget, existing bookings, and completed tasks.
- **Unclear financial position:** Estimates, agreed prices, payment schedules, and completed payments are difficult to reconcile when managed separately.
- **Missed work and deadlines:** Without one planning view, important tasks, vendor follow-ups, and payment dates can be overlooked.
- **Inefficient vendor discovery:** Couples must move between many sources to search, compare, save, and evaluate wedding vendors.
- **Generic guidance:** Broad online advice does not necessarily reflect the couple's own wedding or current planning progress.
- **Vendor visibility:** Vendor owners need a clear public presence and a controlled way to maintain their business information.

Ever After solves these problems by centralizing the main planning activities and connecting information that belongs to the same wedding.

---

## 3. Target Audience

- **Couples planning a wedding:** The primary users. They need to coordinate wedding details, tasks, vendors, guests, expenses, and payments together.
- **Couples at different planning stages:** The product supports couples starting from the beginning and couples who already booked vendors or only want selected planning tools. Optional Wedding Setup information can be completed gradually.
- **Vendor owners:** Wedding businesses that need public discoverability and a self-service area for maintaining their own profile and gallery.
- **Public visitors:** People who want to understand the product and explore published vendor information before registering.

---

## 4. The Customer

The primary customer is the **couple planning the wedding**. Ever After follows a B2C model in which one Couple account represents one shared private wedding workspace.

One primary email is used for account access, email confirmation, and password recovery. Optional partner contact details do not create a second independent login, so both partners use the same Couple workspace rather than maintaining separate copies of the wedding plan.

Vendor owners are an important secondary user group because the marketplace depends on useful business profiles. However, the current MVP does not implement subscriptions, listing fees, marketplace commissions, or another paid vendor model.

---

## 5. Business Goals

- **Centralize wedding planning:** Keep wedding details, tasks, vendors, budget, payments, guests, reviews, timeline information, and guidance in one product.
- **Save time and reduce repeated work:** Minimize searching across different tools and entering the same information more than once.
- **Improve planning visibility:** Help couples understand what is complete, what remains open, and what is approaching.
- **Support better vendor decisions:** Connect vendor discovery and recommendations to relevant wedding information.
- **Improve financial awareness:** Give couples a clear view of commitments, payments, remaining obligations, and available budget.
- **Reduce missed obligations:** Make dated tasks and payment information visible throughout the planning process.
- **Improve vendor discoverability:** Give businesses a structured public presence while helping couples find relevant services.
- **Provide personalized guidance:** Answer wedding-related questions using the Couple's available planning context.
- **Build user trust:** Preserve clear boundaries between public marketplace content and private user information.

The academic MVP does not define revenue or transaction-volume goals. Its business success is measured by whether it delivers a useful, coherent, and trustworthy planning experience.

---

## 6. Required Software Capabilities

To support the business goals, Ever After requires the following product capabilities:

1. **Authentication and Account Management:** Couple and Vendor registration, login, email confirmation when required, password recovery, and logout.
2. **Wedding Setup and Details:** Entry and later editing of wedding information such as date, location, guest estimate, budget, style, preferences, and current planning status. Optional setup information can be skipped and completed later.
3. **Our Wedding Dashboard:** A central summary of the wedding date and countdown, tasks, vendors, budget, guests, and Wedding Assistant access.
4. **Task Management and Timeline:** Creation and management of tasks, including status, priority, category, notes, and dates. Dated tasks also appear chronologically in the Timeline, and the date area adapts as the wedding approaches.
5. **Vendor Marketplace and Recommendations:** Search and filtering of published vendors, access to public business profiles and reviews, and understandable personalized recommendations when sufficient wedding information exists.
6. **Vendor Relationship Management:** Saving vendors; recording contacted, considered, booked, or rejected status; storing private notes and agreed prices; and adding external vendors that are not listed in the marketplace.
7. **Budget and Payment Tracking:** Management of the total budget, manual expenses, booked-vendor commitments, payment schedules, completed payments, and calculated financial summaries. The product tracks payments but does not process real transactions.
8. **Guest and Review Management:** Management of guests or households and aggregate attendance information, together with Couple-authored vendor reviews and approved public review display.
9. **Vendor Self-Service:** A dedicated area in which Vendor owners can maintain their own public business information and gallery and review feedback relating to their business.
10. **Wedding Assistant:** Hebrew and English wedding guidance based on relevant permitted planning information, marketplace content, general wedding knowledge, and controlled current information when appropriate. The Assistant remains read-only.
11. **Responsive Experience:** Usable navigation, forms, marketplace pages, dashboards, and planning tools across desktop, tablet, and mobile screens.

---

## 7. Core User Flows

### Flow 1: Couple Registration and Wedding Setup

- The Couple creates one shared account using a primary email and password.
- The Couple confirms the email when confirmation is enabled and enters the private workspace.
- The Couple completes, partially completes, or skips the initial Wedding Setup.
- The saved Wedding Details can be updated later and are reused throughout the product.

### Flow 2: Wedding Planning and Progress

- The Couple updates Wedding Details as planning decisions change.
- The Couple creates and manages tasks with dates, status, priority, category, and notes.
- Our Wedding presents current summaries and upcoming information.
- Dated tasks appear in the Timeline without requiring duplicate entry.
- The countdown presentation changes during the final week, day before, wedding day, and post-wedding period.

### Flow 3: Vendor Discovery, Recommendation, and Booking

- A public visitor or authenticated user searches and filters published vendors.
- The user opens a vendor profile to view public information, services, images, and approved reviews.
- When enough Wedding Details exist, a Couple may receive a **Recommended for you** indication with understandable matching reasons.
- The Couple saves a vendor or records a contacted, considered, booked, or rejected status.
- A business outside the marketplace can be added as an external vendor.
- A booked vendor's agreed price is reflected as a budget commitment without duplicate manual entry.

The marketplace contains synthetic demonstration data and is not presented as a complete or current representation of the Israeli wedding market.

### Flow 4: Budget and Payment Tracking

- The Couple sets the total wedding budget and maintains expenses.
- Booked-vendor commitments appear together with manual expenses.
- The Couple schedules payments and marks them as paid after paying outside the platform.
- The product calculates committed, paid, remaining, projected, and available amounts.
- Relevant payment history remains available when a booking or agreed price changes.

Ever After records financial obligations and payment status; it does not transfer money or process credit-card payments.

### Flow 5: Guest and Review Management

- The Couple adds and updates guests or households and reviews aggregate attendance information.
- The Couple creates and maintains its own vendor reviews.
- Approved review information appears on public vendor profiles.
- Vendor owners can read feedback about their business but cannot edit Couple-authored reviews.

### Flow 6: Wedding Assistant

- The Couple asks a wedding-related question in Hebrew or English.
- The Assistant uses relevant permitted planning and marketplace context.
- Current procedures or market information may be researched when appropriate, with uncertainty communicated when evidence is incomplete.
- The Assistant returns guidance without automatically changing tasks, vendors, budget, guests, or Wedding Details.

### Flow 7: Vendor Registration and Profile Management

- A Vendor owner registers and enters the dedicated Vendor area.
- The Vendor completes or updates its own business information, services, attributes, and gallery.
- The Vendor reviews profile-completion information and feedback about its business.
- The Vendor may browse public marketplace profiles but cannot manage another Vendor's information.

### Flow 8: Password Recovery

- A Couple or Vendor requests recovery using the primary account email.
- The user opens the recovery link received by email.
- The user enters and confirms a new password and then uses it to log in.

---

## 8. Definition of Success

The Ever After MVP is successful when:

1. A Couple can move from registration and Wedding Setup to ongoing planning in one shared workspace.
2. Wedding Details, tasks, Timeline, dashboard summaries, vendor relationships, and budget information work together without unnecessary duplicate entry.
3. Users can discover vendors, receive understandable recommendations when enough context exists, and manage saved or booked vendors.
4. Couples can understand their financial position through connected commitments and payment tracking without the product claiming to process payments.
5. Guest information and Couple-authored reviews can be managed through their appropriate product areas.
6. The Wedding Assistant provides relevant Hebrew or English guidance while remaining read-only.
7. Vendor owners can maintain their own business presence without access to another user's private information.
8. The main product experience remains clear and usable on desktop and mobile devices.
