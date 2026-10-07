---
title: Vendor activation through product design
folder: bulqit
order: 2
summary: Joel rebuilt the vendor app's core workflows and added guided onboarding. About 75% of vendor signups submitted their compliance documents without staff follow-up.
cover: ../../../assets/screens/bulqit-vendor-calendar.webp
coverAlt: The vendor Calendar with overdue recurring jobs, each with Message, On My Way and Mark As Complete buttons. House photos and street addresses are blurred.
stats:
  - ~75% submitted documents
  - 31 approved vendors
  - 5 workflows rebuilt
---

## The problem

A marketplace for recurring home services only works if vendors sign up, get approved and then run their day in the app. Each vendor had to submit insurance and compliance documents before approval, and every one who stalled meant a staff follow-up.

The vendor app also had to be good enough for daily use, by both the business owner and their field staff.

## What Joel did

Joel treated activation as a product design problem. He rebuilt the core vendor workflows: the scheduling calendar, field-staff jobs, bidding, the inbox and homes.

The calendar (above) groups each vendor's jobs into Upcoming, To Schedule and Completed, and flags overdue visits. Field staff get a phone-first jobs list with the actions they need on site.

![The field-staff My Jobs screen on a phone, showing an overdue Seasonal Lawn Care job with Message, On My Way and Mark As Complete buttons.](../../../assets/screens/bulqit-field-jobs-mobile.webp)

*My Jobs for field staff. The house photo and address are blurred here for privacy.*

Bidding lets a vendor price a whole Bulqit Block at once: one unit rate applies to every current and future member in the block.

![The Bidding screen in the Figma design file: an open bid for a 25-home block, with a panel for entering a cost per unit and a table of homes and prices.](../../../assets/screens/bulqit-bidding-figma.webp)

*Bidding, as designed in Figma. The local seed data had no open bids, so this is the design frame.*

![The vendor Inbox in the Figma design file: a list of member conversations, with a Proposal panel open for entering the service, one-time or recurring type, frequency, cost, start and end dates and a description.](../../../assets/screens/bulqit-inbox-proposal-figma.webp)

*A recurring-service proposal in the inbox, from the lead designer's Figma file that Joel built in Next.js and React.*

![The vendor Homes screen in the Figma design file: a list of active homes with Message buttons, and a detail panel with Share, Message and Call, the number of windows, vendor instructions and scope of work.](../../../assets/screens/bulqit-homes-figma.webp)

*Homes, from the same Figma file: each home's vendor instructions and scope of work in one panel. House photos and the address are blurred.*

## Guided onboarding

New vendors start with a short guided flow that explains what Bulqit offers them, then land on a dashboard with action items: set up banking, add an EIN, upload a business license. Each item has its own Setup button, so the next step is always visible.

![The vendor dashboard: today's jobs, earnings and homes, followed by Action Items for banking, EIN and business license.](../../../assets/screens/bulqit-vendor-dashboard.webp)

*Dashboard action items point each vendor to what's left to set up.*

## Result

About 75% of roughly 45 vendor signups submitted their insurance and compliance documents with no staff follow-up. That produced 31 approved vendors.
