---
title: Security and billing correctness
folder: bulqit
order: 5
summary: Joel closed authorization flaws around vendor payouts, accounts and private conversations, and caught three billing defects before release. Production had zero billing errors.
cover: ../../../assets/screens/bulqit-member-history.webp
coverAlt: A member's service History with three completed jobs, each showing the vendor, the price charged and the visit date.
stats:
  - 3 billing defects caught
  - 0 billing errors in production
  - $5.8K in card payments
---

## The problem

Bulqit moves money between homeowners and vendors, and its users message each other about their homes. Mistakes in access control or in the charge path would cost real people real money, or expose private details.

## Authorization

Joel co-ran an AI-assisted security audit with the Director of Operations Engineering, and independently found and closed authorization flaws in three areas:

- authorization checks on vendor payouts
- account takeover via email change on vendor accounts
- unauthorized access to private conversations

Each fix shipped with a CI guard test that fails the build if the flaw returns, so the fix can't be undone by a later change.

## Billing

The charge path runs through Stripe and PostgreSQL. Before release, Joel caught three billing defects in it:

- **Duplicate charges.** Two job completions arriving at the same time could each charge the homeowner.
- **Coupons on the first visit only.** A coupon meant for a recurring service applied to the first visit and then fell off.
- **Unbilled units.** On services priced by count, such as a price per bin, some units went unbilled.

All three were fixed before customers saw them.

## Result

Production had zero billing errors across about 80 recurring services a month and $5.8K in card payments.
