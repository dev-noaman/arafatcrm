# OfficeRnD — single source of truth

Everything below is self-contained. Use this file only; it mirrors what the Python app uses (`officernd/api/config.py` and routes).

---

## 1. Fixed URLs (hardcoded in code, not in `.env`)

| Name | Value |
|------|--------|
| OAuth token URL | `https://identity.officernd.com/oauth/token` |
| Live API base | `https://app.officernd.com/api/v2/organizations` |
| **Live API root for your org** | `https://app.officernd.com/api/v2/organizations/{OFFICERND_ORG_SLUG}` |

Path groups (all under the org root above):

- Community: `/community/companies`, `/community/members`, …
- Billing: `/billing/memberships`, `/billing/payments`, …
- Settings: `/settings/webhooks`, …

---

## 2. Credentials file: `officernd/config/.env`

The app loads **exactly** this path (no other `.env` for the FastAPI + sync code):

`officernd/config/.env`

### 2.1 All variables (names are the source of truth)

| Variable | Default if unset | Role |
|----------|------------------|------|
| `OFFICERND_ORG_SLUG` | `""` | Required for correct URLs. |
| `OFFICERND_CLIENT_ID` | `""` | OAuth `client_id`. |
| `OFFICERND_CLIENT_SECRET` | `""` | OAuth `client_secret`. |
| `OFFICERND_USERNAME` | `""` | Only for **password** grant. |
| `OFFICERND_PASSWORD` | `""` | Only for **password** grant. |
| `OFFICERND_GRANT_TYPE` | `password` | `password` or `client_credentials`. |
| `OFFICERND_SCOPE` | See note | Scopes for token request; if empty and grant is `password`, code may use `openid profile offline_access` internally when building defaults—still set this in `.env` for Flex APIs. If empty and **client_credentials**, scope can be empty string. |
| `OFFICERND_AUDIENCE` | `""` | Optional; add if your IdP requires it. |

### 2.2 Full `officernd/config/.env` (this project; hardcoded layout)

**Security:** keep real secrets only in the real `officernd/config/.env` on disk. Do not commit that file, and do not replace the placeholders below with live secrets in this markdown if the repo is shared or public.

The block below is the **exact** content of `officernd/config/.env` — hardcoded, no placeholders.

```env
# OfficeRnD API Tester - Environment Configuration
# Copy this to .env and fill in your values

# Required: Your organization slug from OfficeRnD
OFFICERND_ORG_SLUG=arafat-business-centers

# Required: OAuth credentials from OfficeRnD app settings
OFFICERND_CLIENT_ID=ZvJWSI3v6hBZyGnS
OFFICERND_CLIENT_SECRET=Be4GtOyNcl4BcWFZPiBQlwH71KO7QP3l

# Required for password grant (default):
OFFICERND_USERNAME=adel.noaman@arafatgroup.com
OFFICERND_PASSWORD=2203

# Optional: Change grant type if using client_credentials
OFFICERND_GRANT_TYPE=client_credentials

# Optional: Scope for client_credentials grant - using all flex.* scopes from OfficeRnD for full API access
OFFICERND_SCOPE=flex.billing.payments.read flex.billing.payments.create flex.billing.payments.methods.read flex.billing.payments.documents.read flex.billing.payments.update flex.billing.payments.allocations.update flex.billing.payments.allocations.create flex.billing.charges.read flex.billing.charges.create flex.billing.charges.update flex.billing.charges.delete flex.billing.taxRates.read flex.billing.revenueAccounts.read flex.billing.plans.read flex.billing.resourceRates.read flex.billing.paymentDetails.read flex.billing.paymentDetails.create flex.billing.paymentDetails.delete flex.collaboration.tickets.read flex.collaboration.tickets.create flex.collaboration.tickets.update flex.collaboration.ticketOptions.read flex.collaboration.ticketComments.create flex.collaboration.posts.read flex.collaboration.posts.create flex.collaboration.posts.delete flex.collaboration.events.read flex.collaboration.events.create flex.collaboration.events.update flex.collaboration.events.delete flex.collaboration.benefits.read flex.community.members.read flex.community.members.create flex.community.members.update flex.community.members.delete flex.community.companies.read flex.community.companies.create flex.community.companies.update flex.community.companies.delete flex.community.visits.read flex.community.visits.create flex.community.visits.delete flex.community.visitors.read flex.community.visitors.create flex.community.visitors.delete flex.community.opportunities.read flex.community.opportunities.create flex.community.opportunities.update flex.community.opportunities.delete flex.community.opportunityStatuses.read flex.community.contracts.read flex.community.contracts.create flex.community.contracts.delete flex.community.contracts.sign flex.community.contracts.terminate flex.community.checkins.read flex.community.checkins.create flex.community.checkins.update flex.community.fees.read flex.community.fees.create flex.community.fees.update flex.community.fees.delete flex.community.memberships.read flex.community.memberships.create flex.community.memberships.update flex.community.memberships.delete flex.community.receptionFlows.read flex.space.locations.read flex.space.floors.read flex.space.resources.read flex.space.resourceTypes.read flex.space.assignments.read flex.space.amenities.read flex.space.bookings.read flex.space.bookings.validate flex.space.bookings.create flex.space.bookings.update flex.space.bookings.delete flex.space.bookings.cancel flex.space.passes.read flex.space.passes.create flex.space.passes.update flex.space.passes.delete flex.space.credits.read flex.space.credits.create flex.space.credits.update flex.space.credits.delete flex.space.coins.read flex.settings.webhooks.read flex.settings.webhooks.create flex.settings.webhooks.update flex.settings.webhooks.delete flex.settings.customProperties.read flex.settings.secondaryCurrencies.read flex.settings.secondaryCurrencies.update flex.settings.billing.read flex.settings.integrations.read flex.settings.businessHours.read flex.settings.organization.read flex.user.auth.signup flex.user.auth.signin flex.user.auth.impersonate flex.user.auth.verify flex.user.password.update

# Optional: Audience for OAuth
# OFFICERND_AUDIENCE=https://app.officernd.com/api/v2
```

`OFFICERND_CLIENT_ID` and `OFFICERND_CLIENT_SECRET` are required to obtain an access token and call the **live** OfficeRnD API.

---

## 3. Get an access token (live API)

`POST` `https://identity.officernd.com/oauth/token`  
Header: `Content-Type: application/x-www-form-urlencoded`  
Body (form fields), depending on grant:

**Client credentials (common for integrations)**

- `grant_type=client_credentials`
- `client_id={OFFICERND_CLIENT_ID}`
- `client_secret={OFFICERND_CLIENT_SECRET}`
- `scope={OFFICERND_SCOPE}` if your app requires scopes (often space-separated `flex...` values)

**Password grant**

- `grant_type=password`
- `client_id`, `client_secret`, `username`, `password`, and `scope` / `audience` as required by your tenant

Response JSON includes `access_token`. Use:

`Authorization: Bearer {access_token}`

on all **live** API requests.

---

## 4. Fetch **active** companies (live API)

**Request**

`GET`  
`https://app.officernd.com/api/v2/organizations/{OFFICERND_ORG_SLUG}/community/companies?status=active&$limit=50`  
`Authorization: Bearer {access_token}`

**Pagination:** response JSON includes `cursorNext`. If not null, call again with `&$cursorNext={value}` until `cursorNext` is null or `results` is empty.

`$limit` and `$cursorNext` use the **dollar** prefix (OfficeRnD v2 style).

---

## 5. Memberships ending in the next 3 months

The list endpoints for memberships do **not** expose a server-side `end_date` range filter in this project. The portable approach is **only HTTP + your code**:

1. Obtain `access_token` (section 3).
2. Paginate **memberships** from the **live** API:  
   `GET`  
   `https://app.officernd.com/api/v2/organizations/{OFFICERND_ORG_SLUG}/billing/memberships`  
   with `Authorization: Bearer {access_token}` and pagination the API supports (`$limit` / `$cursorNext` the same as companies, or whatever the API returns in `results` + `cursorNext`).
3. For each object in `results`, read `endDate` (or `end_date` depending on raw JSON) and `company` (or `companyId` / company id field).
4. Keep rows where `endDate` parses to a date **≥ today** and **≤ today + 3 months** in your chosen timezone.
5. Resolve company name with **`GET /community/companies/{company_id}`** when needed, or from the embedded object if the membership payload includes it.

---

## 6. What requires which secret

| Action | Secret / header |
|--------|-----------------|
| Call **live** OfficeRnD API | Token from `OFFICERND_CLIENT_ID` + `OFFICERND_CLIENT_SECRET` (and grant-specific fields) |

This document is the **full** configuration and usage reference for the OfficeRnD live API; copy variable names exactly into your app's config.
