# ERP + Website Task List

## ERP Changes

- [x] 1. Navbar: center search bar, remove "Add New" button entirely
- [x] 2. AdminLayout: reorder nav — Sales (Orders, Customers), Catalog (Products, Inventory), Finance first; Operations (Workers, Users, Attendance) moved below
- [x] 3. Admin Users page (Managers.jsx): Admin cannot deactivate own account (warning modal); only other admins can deactivate another admin; activate/deactivate managers; reactivate button; full edit modal (name, email, password, phone)
- [x] 4. Inventory: Add Vendor GST No, Tax %, Tax Amount (auto-calculated) fields to material form
- [x] 5. Expenses: fix tax calculation — saved amount = amount_before_tax + tax_amount; form modal opens at top (no scroll required)
- [x] 6. Modal positioning fix: all forms open at top of viewport (align-items: flex-start, padding-top: 32px)

## Backend

- [x] 7. Create website database tables SQL (website_info, website_products, website_deals, website_speciality)
- [x] 8. Create website API routes (GET public, POST/PUT/DELETE admin protected)
- [x] 9. Register website routes in server.js

## Admin Website Info Page (/admin/website)

- [x] 10. Create WebsiteInfo.jsx with 4 tabs:
  - Company Info (name, tagline, address, phone, email, social links, hero text, stats, brand story)
  - Products (CRUD: title, description, price, original_price, category, tag, offers, images, etc.)
  - Deals (CRUD: title, subtitle, bg color, text color, CTA)
  - Speciality Showcase (pick and reorder featured products)

## Public Website (/website)

- [ ] 11. Create Website.jsx — multipage public website matching index.html design:
  - Navbar (logo from API, Products/About/Contact links, Favorites icon, Login button)
  - Home page (Hero slider, Stats bar, Speciality Collection, Categories grid, Deals/Offers, New Arrivals, Brand section, Testimonials, Footer)
  - Products page (search + filter by category)
  - Category page (filtered product grid)
  - Product Detail page (image gallery, specs, offers, similar products)
  - About page (hardcoded brand story)
  - Contact page (contact form + info)
  - Favorites page (localStorage based, no cart)
  - Login page (Sign In only — no Register tab; left panel shows company info from API)
  - Dynamic content loaded from /api/website/* endpoints
  - Fonts: Cormorant Garamond + Jost
  - Colors: cream #F8F4EF, warm-white #FDFAF7, charcoal #2C2420, gold #C4963A, gold-light #E8C97A

## App.jsx Routes

- [x] 12. Import AdminWebsite and Website components
- [x] 13. Wire /admin/website route → AdminWebsiteInfo
- [x] 14. index.html public website connected to ERP /api/website/public endpoint (products + deals load from API with hardcoded fallback)
