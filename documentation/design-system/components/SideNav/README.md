# SideNav

The persistent module navigation of the Web ERP.

**Provide:** `sections` (`{title, items:[{key, label, icon, badge?}]}`), `active`, `onChange`, `school`, optional `product`.

- Build `sections` from the user's permissions: modules they cannot open are left out, never shown disabled.
- Section order follows the ERP structure: Overview, Academics, People, HR, Finance, Communication, Transport, Operations, Reports, Administration.
