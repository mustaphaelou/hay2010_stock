# Rule Categories Summary

This document provides a high-level overview of the performance optimization categories used in the Vercel React Best Practices guide.

## 1. Eliminating Waterfalls (CRITICAL)
Waterfalls occur when asynchronous operations are awaited sequentially when they could be performed in parallel. This is the single largest source of latency in modern web applications.

## 2. Bundle Size Optimization (CRITICAL)
Reducing the amount of JavaScript sent to the browser directly improves Time to Interactive (TTI) and Largest Contentful Paint (LCP).

## 3. Server-Side Performance (HIGH)
Optimizing how data is fetched and rendered on the server reduces the time it takes for the browser to receive the first byte of HTML.

## 4. Client-Side Data Fetching (MEDIUM-HIGH)
Efficient patterns for fetching data in the browser, including deduplication and optimistic updates.

## 5. Re-render Optimization (MEDIUM)
Minimizing unnecessary component re-renders to maintain a responsive UI even during complex state changes.

## 6. Rendering Performance (MEDIUM)
Optimizing the browser's rendering process, including DOM updates and SVG animations.

## 7. JavaScript Performance (LOW-MEDIUM)
Fine-tuning the execution speed of JavaScript logic, particularly in performance-critical loops or deep object lookups.

## 8. Advanced Patterns (LOW)
Specific React-internal optimizations for highly specialized use cases.
