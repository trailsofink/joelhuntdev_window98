---
title: Lighthouse performance push
folder: bulqit
order: 3
summary: Joel led a performance and accessibility push across Bulqit's 12 public pages. The vendor landing page went from 53 to 86 on mobile, and its Total Blocking Time fell from 17.2 s to 0.2 s.
cover: ../../../assets/screens/bulqit-vendors-landing.webp
coverAlt: Bulqit's vendor landing page, headed "Your next 25 customers live on the same street.", beside an illustrated route map connecting nearby homes.
stats:
  - Mobile 75 → 85
  - Desktop 94 → 99
  - TBT 17.2 s → 0.2 s
---

## The problem

Bulqit's 12 public pages are where homeowners and vendors first meet the product. On mobile, they averaged 75 for Lighthouse Performance, and the vendor landing page scored 53.

## What Joel did

Joel led a Lighthouse performance and accessibility push across the 12 public pages. To keep the numbers honest, every score is the median of three Lighthouse runs against production, taken the same way before and after.

## Results across 12 public pages

| Average score | Before | After |
| --- | --- | --- |
| Mobile Performance | 75 | 85 |
| Desktop Performance | 94 | 99 |

Every page scored 91 or higher for Accessibility and 100 for SEO.

## The vendor landing page

The vendor landing page (above) is the clearest example.

| Vendor landing page, mobile | Before | After |
| --- | --- | --- |
| Performance | 53 | 86 |
| Total Blocking Time | 17.2 s | 0.2 s |
| Page weight | 5.7 MB | 1.7 MB |

Total Blocking Time measures how long a page is too busy to respond to taps while it loads. On a phone, 17.2 seconds of it is most of the load; 0.2 seconds is barely noticeable.

## Why it mattered

The vendor landing page is where vendor signups start. The vendor activation case study covers what happened after signup.
