# TODO

- [x] Implement sites CRUD API and admin save flow for the existing `sites` table.
- [x] Add real logo upload endpoint and admin save flow for site logos.
- [x] Fix logo display CSS so uploaded logos render fully inside logo boxes.
- [x] Add categories DB table/API and migrate category management to DB CRUD.
- [x] Add category drag reorder backed by `categories.sort_order`.
- [x] Add normal/secure mode support to `sites`.
- [x] Add category editing and category filtering to the admin site list.
- [x] Add ads DB table/API and migrate banner ad management to DB CRUD.
- [x] Add infeed ads DB CRUD using `ads.placement = 'infeed'`.
- [x] Add real ad image upload endpoint for `/uploads/ads`.
- [ ] Harden admin authentication and persist admin account settings on the server.
- [ ] Add deployment automation.
- [ ] Add backup automation.
- [ ] Define and document ad script security policy.
