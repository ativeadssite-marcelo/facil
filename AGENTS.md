# Architecture rules
- AI catalogue matching runs in an authenticated Supabase Edge Function using server-only Gateway SDK helpers; this protects credentials and product costs.
- Catalogue recommendations are validated against retrieved product IDs and are added to quotes only through the existing manual item action; AI must never mutate inventory.
- A1 uploads use an authenticated admin-only Edge Function and AES-GCM encrypted private Storage with no browser policies; this keeps the certificate and password inaccessible to client reads and avoids management tokens in application code.