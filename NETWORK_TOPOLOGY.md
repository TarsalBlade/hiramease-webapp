# HiramEase Platform - Network Topology Documentation

## Table of Contents
1. [Network Architecture Overview](#1-network-architecture-overview)
2. [System Components & Connectivity](#2-system-components--connectivity)
3. [Network Flow Diagrams](#3-network-flow-diagrams)
4. [Data Flow Patterns](#4-data-flow-patterns)
5. [Security & Access Control](#5-security--access-control)
6. [Deployment Architecture](#6-deployment-architecture)
7. [Network Performance & Optimization](#7-network-performance--optimization)
8. [Disaster Recovery & High Availability](#8-disaster-recovery--high-availability)

---

## 1. NETWORK ARCHITECTURE OVERVIEW

### 1.1 High-Level Network Topology

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           Internet / Global Users                                 │
└───────────────────────────────┬──────────────────────────────────────────────────┘
                                │
                                │ HTTPS / TLS 1.3
                                │
                ┌───────────────▼────────────────┐
                │   CloudFlare CDN               │
                │   (Optional Caching Layer)     │
                │   - DDoS Protection            │
                │   - DNS Resolution             │
                │   - Static Content Caching     │
                └───────────────┬────────────────┘
                                │
                                │ HTTPS / TLS 1.3
                                │
                ┌───────────────▼────────────────────────────────┐
                │   Frontend Hosting (Vercel / Netlify)          │
                │   - React SPA Distribution                     │
                │   - Build: dist/ (Vite output)                 │
                │   - CDN Edge Nodes (Global)                    │
                │   - Origin: Asia Pacific Region                │
                └───────────────┬────────────────────────────────┘
                                │
                    ┌───────────┼───────────┐
                    │           │           │
        ┌───────────▼──┐  ┌─────▼────┐  ┌──▼────────────┐
        │ Static Files │  │ API Calls │  │ WebSocket     │
        │ (HTML/CSS/JS)│  │ (REST)    │  │ Connections  │
        └──────────────┘  └─────┬────┘  └──┬────────────┘
                                │           │
                ┌───────────────┼───────────┘
                │               │
                │    ┌──────────▼────────────────┐
                │    │   Supabase Project        │
                │    │   Region: Asia Pacific    │
                │    │                            │
                │    │  ┌──────────────────────┐ │
                │    │  │  Auth & API Gateway  │ │
                │    │  │  - JWT Verification │ │
                │    │  │  - Request Routing   │ │
                │    │  └──────────┬───────────┘ │
                │    │             │             │
                │    │  ┌──────────▼──────────┐  │
                │    │  │  PostgreSQL DB     │  │
                │    │  │  - Primary: R/W    │  │
                │    │  │  - Replicas: Read  │  │
                │    │  │  - 20+ Tables      │  │
                │    │  │  - Row-Level RLS   │  │
                │    │  └────────────────────┘  │
                │    │                            │
                │    │  ┌──────────────────────┐ │
                │    │  │  Storage (S3)        │ │
                │    │  │  - Bucket: documents │ │
                │    │  │  - File uploads      │ │
                │    │  │  - Signed URLs       │ │
                │    │  └────────────────────┘  │
                │    │                            │
                │    │  ┌──────────────────────┐ │
                │    │  │  Edge Functions      │ │
                │    │  │  (Deno Runtime)      │ │
                │    │  │  - Global Deployment │ │
                │    │  │  - HTTP Triggers     │ │
                │    │  └────────────────────┘  │
                │    └──────────────────────────┘
                │
                └─────────────────────┐
                                      │
                    ┌─────────────────▼──────────────┐
                    │   External Services            │
                    │                                 │
                    │  PayMongo (Payment Gateway)    │
                    │  ├─ API: api.paymongo.com      │
                    │  ├─ Webhook: /paymongo-webhook │
                    │  └─ Payment Processing         │
                    │                                 │
                    └─────────────────────────────────┘
```

### 1.2 Network Zones & Security Boundaries

```
┌─────────────────────────────────────────────────────────────────────┐
│  ZONE 1: PUBLIC INTERNET                                            │
│  - Untrusted clients                                                │
│  - HTTPS/TLS required                                               │
│  - Rate limiting applied                                            │
│  - DDoS protection (CloudFlare)                                     │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ TLS 1.3 / HTTPS
                      │
┌─────────────────────▼───────────────────────────────────────────────┐
│  ZONE 2: CDN / EDGE (Cloudflare / Vercel Edge)                      │
│  - Content caching layer                                            │
│  - DDoS mitigation                                                  │
│  - Request inspection                                               │
│  - Static asset distribution                                        │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ TLS 1.3 / Encrypted tunnel
                      │
┌─────────────────────▼───────────────────────────────────────────────┐
│  ZONE 3: APPLICATION TIER (Frontend Hosting)                        │
│  - React SPA (Single Page Application)                              │
│  - JavaScript execution                                             │
│  - Client-side routing                                              │
│  - CORS headers for API calls                                       │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ HTTPS / REST API Calls
                      │ WebSocket connections
                      │ JWT Authorization
                      │
┌─────────────────────▼───────────────────────────────────────────────┐
│  ZONE 4: BACKEND SERVICES (Supabase)                                │
│  - Restricted to authenticated requests only                        │
│  - JWT token verification                                           │
│  - RLS policies enforcement                                         │
│  - Audit logging                                                    │
│  - Encryption at rest                                               │
│  - Network isolation (private endpoints optional)                   │
└─────────────────────┬───────────────────────────────────────────────┘
                      │
                      │ HTTPS / Service-to-Service
                      │ Private subnet communication
                      │ Encrypted connections
                      │
├─────────────────────▼─────────────────────────────────────────┐
│  Database Layer (PostgreSQL)                                  │
│  - Master-Replica replication                                 │
│  - Backup: encrypted, off-site                                │
│  - Connection pooling                                         │
│  - SSL/TLS for all connections                                │
├───────────────────────────────────────────────────────────────┤
│  Storage Layer (S3-compatible)                                │
│  - Server-side encryption                                     │
│  - CORS configuration                                         │
│  - Signed URL generation                                      │
├───────────────────────────────────────────────────────────────┤
│  Compute Layer (Edge Functions - Deno)                        │
│  - Global edge network                                        │
│  - HTTP triggers only                                         │
│  - Environment variable injection                             │
│  - Automatic scaling                                          │
└───────────────────────────────────────────────────────────────┘
                      │
                      │ HTTPS / REST API
                      │ API Keys (secret)
                      │
┌─────────────────────▼───────────────────────────────────────────────┐
│  ZONE 5: EXTERNAL SERVICES (Third-Party APIs)                       │
│  - PayMongo payment gateway                                         │
│  - Email services (SendGrid / etc.)                                 │
│  - SMS services (optional)                                          │
│  - Analytics services (optional)                                    │
│  - All connections: HTTPS, API keys, rate-limited                   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. SYSTEM COMPONENTS & CONNECTIVITY

### 2.1 Component Diagram with Network Endpoints

```
┌────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND APPLICATION                             │
│  (React SPA - src/App.tsx, src/pages/*, src/components/*)             │
│                                                                         │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────┐      │
│  │ Browser Storage │  │  AuthContext     │  │ React Router     │      │
│  │ (localStorage)  │  │  (Session State) │  │ (Client Routes)  │      │
│  └─────────────────┘  └────────┬─────────┘  └──────────────────┘      │
│                                │                                        │
│                    ┌───────────▼────────────┐                          │
│                    │  API Client Instance   │                          │
│                    │  (Supabase JS Client)  │                          │
│                    │  src/lib/supabase.ts   │                          │
│                    └───────────┬────────────┘                          │
└────────────────────────────────┼──────────────────────────────────────┘
                                 │
                    Network Interface (Browser)
                                 │
                ┌────────────────┼────────────────┐
                │                │                │
    ┌───────────▼──────┐  ┌──────▼────────┐  ┌───▼──────────────┐
    │ REST API Calls   │  │ WebSocket     │  │ Static Assets    │
    │ (JSON/HTTPS)     │  │ (Persistent)  │  │ (HTML/CSS/JS)    │
    └───────────┬──────┘  └──────┬────────┘  └───┬──────────────┘
                │                │                │
                │ Authentication │                │
                │ Header: JWT    │                │
                │                │                │
    ┌───────────▼────────────────▼────────────────▼──────────┐
    │         HTTP/2 + TLS 1.3 Encrypted Tunnel             │
    └───────────┬────────────────┬────────────────┬──────────┘
                │                │                │
        ┌───────▼────────────────▼────┐           │
        │   SUPABASE API GATEWAY       │           │
        │   (public.supabase.co)       │           │
        │                              │           │
        │  ┌────────────────────────┐  │           │
        │  │ Request Router & Auth  │  │           │
        │  │ - JWT Verification     │  │           │
        │  │ - RLS Policy Check     │  │           │
        │  │ - Rate Limiting        │  │           │
        │  │ - Request Logging      │  │           │
        │  └──────────┬─────────────┘  │           │
        └─────────────┼────────────────┘           │
                      │                             │
          ┌───────────┼───────────────┐            │
          │           │               │            │
    ┌─────▼───┐  ┌────▼──────┐  ┌────▼──────┐   │
    │ Database│  │ Storage   │  │ Functions │   │
    │ Layer   │  │ Layer     │  │ Trigger   │   │
    └─────────┘  └───────────┘  └───────────┘   │
                                                 │
                                        ┌────────▼────────┐
                                        │ CDN / Static    │
                                        │ Asset Delivery  │
                                        └─────────────────┘
```

### 2.2 Detailed Component Specifications

#### **Frontend Application**
```
Component: React SPA
├─ Framework: React 18.3.1
├─ Runtime: Browser JavaScript Engine
├─ Build: Vite (dist/ output)
├─ Entry Point: index.html (public/)
├─ Main App: src/App.tsx
├─ Pages:
│  ├─ src/pages/LandingPage.tsx (public)
│  ├─ src/pages/SubscribePage.tsx (public)
│  ├─ src/pages/auth/LoginPage.tsx (public)
│  ├─ src/pages/auth/SignUpPage.tsx (public)
│  ├─ src/pages/dashboard/BorrowerDashboard.tsx (protected)
│  ├─ src/pages/dashboard/LendingAdminDashboard.tsx (protected)
│  └─ src/pages/dashboard/SuperAdminDashboard.tsx (protected)
│
├─ Components:
│  ├─ Landing components (src/components/landing/)
│  ├─ Dashboard components (src/components/dashboard/)
│  ├─ Admin components (src/components/admin/)
│  ├─ Payment components (src/components/payment/)
│  └─ Common components (src/components/common/)
│
├─ State Management:
│  ├─ React Context (AuthContext - src/contexts/AuthContext.tsx)
│  ├─ React Hooks (useState, useEffect, useContext)
│  └─ Browser localStorage (JWT token, user preferences)
│
├─ Network Communication:
│  ├─ Supabase Client (src/lib/supabase.ts)
│  ├─ REST API calls via fetch() / supabase.from()
│  ├─ Real-time subscriptions via websocket (optional)
│  └─ Direct HTTP calls for PayMongo webhooks (Edge Function)
│
├─ Security:
│  ├─ HTTPS only
│  ├─ JWT token in Authorization header
│  ├─ CORS headers validation
│  ├─ XSS protection (React escaping)
│  └─ CSRF protection (SameSite cookies)
│
└─ Delivery:
   ├─ Static hosting (Vercel / Netlify / Firebase)
   ├─ CDN distribution globally
   ├─ Cache busting via asset hashing
   └─ Automatic deployments from git
```

#### **Supabase Backend**
```
Component: Supabase Project (Asia Pacific Region)
├─ Authentication Service
│  ├─ Endpoint: ${SUPABASE_URL}/auth/v1/
│  ├─ Handles: signup, login, logout, token refresh
│  ├─ JWT token generation (1-hour expiry)
│  ├─ Built-in auth.users table
│  └─ Password hashing: bcrypt
│
├─ PostgreSQL Database
│  ├─ Endpoint: ${SUPABASE_URL}/rest/v1/
│  ├─ Port: 5432 (direct connection available)
│  ├─ 20+ relational tables
│  ├─ Row-Level Security (RLS) policies
│  ├─ Automatic timestamp triggers
│  ├─ Connection pooling (max connections)
│  ├─ Backups: automated daily, encrypted, retained 30 days
│  └─ Replication: read replicas for scaling
│
├─ Storage Service
│  ├─ Endpoint: ${SUPABASE_URL}/storage/v1/
│  ├─ Backend: S3-compatible (AWS S3)
│  ├─ Bucket: "documents"
│  ├─ Signed URL generation (24-hour expiry)
│  ├─ CORS configured for browser uploads
│  ├─ File size limits enforced
│  └─ Server-side encryption (AES-256)
│
├─ Real-time Features
│  ├─ WebSocket endpoint (auto-used by client)
│  ├─ Channel subscriptions for live updates
│  ├─ Presence tracking (optional)
│  ├─ Broadcasting (optional, for notifications)
│  └─ Connection pooling
│
├─ Edge Functions (Deno Runtime)
│  ├─ Deployment: Global edge network
│  ├─ Endpoints:
│  │  ├─ /functions/v1/ai-credit-scoring (POST)
│  │  ├─ /functions/v1/create-payment-intent (POST)
│  │  ├─ /functions/v1/paymongo-webhook (POST)
│  │  ├─ /functions/v1/send-notification (POST)
│  │  └─ /functions/v1/admin-actions (POST)
│  │
│  ├─ Runtime: Deno 2.0+
│  ├─ Memory: Per-function limit
│  ├─ Timeout: 10 minutes max
│  ├─ Environment variables: Via Secrets Manager
│  ├─ Logging: Automatic to Edge Function logs
│  └─ Scaling: Automatic, based on invocations
│
├─ Vector Search (Optional)
│  ├─ pgvector extension (if enabled)
│  ├─ For semantic search / AI features
│  └─ Embedding storage
│
├─ Monitoring & Logging
│  ├─ Query performance logs
│  ├─ Error tracking
│  ├─ Audit logs (via custom table)
│  ├─ Edge Function execution logs
│  └─ Real-time events dashboard
│
└─ Security Features
   ├─ TLS 1.3 for all connections
   ├─ Encryption at rest (AES-256)
   ├─ DDoS protection
   ├─ IP whitelisting (optional, enterprise)
   ├─ VPC peering (optional, enterprise)
   ├─ Automatic backups & disaster recovery
   └─ SOC 2 / ISO 27001 compliance
```

#### **External Services - PayMongo**
```
Component: PayMongo API
├─ Endpoint: https://api.paymongo.com/v1/
├─ Authentication: API Key (Bearer token)
├─ Hosted Endpoint: /functions/v1/create-payment-intent
│
├─ API Operations:
│  ├─ POST /payment_intents (Create payment)
│  ├─ GET /payment_intents/{id} (Get status)
│  └─ POST /webhooks (Receive payment updates)
│
├─ Webhook Configuration:
│  ├─ Endpoint: ${APP_URL}/functions/v1/paymongo-webhook
│  ├─ Events: charge.paid, charge.failed, charge.updated
│  ├─ Signature: Verify using Webhook Secret
│  ├─ Retry: PayMongo retries failed webhooks
│  └─ Security: HTTPS only, signature verification
│
├─ Supported Payment Methods:
│  ├─ Credit/Debit cards (Visa, Mastercard, JCB)
│  ├─ GCash (e-wallet)
│  ├─ GrabPay (e-wallet)
│  ├─ PayMaya (digital payment)
│  ├─ QR Philippines (QR code)
│  ├─ InstaPay (bank transfer)
│  └─ PesoNet (bank transfer)
│
├─ Network Security:
│  ├─ TLS 1.2+ encryption
│  ├─ Rate limiting: 100 requests/min per API key
│  ├─ Request signing: Include X-Paymongo-Client-Id header
│  └─ Response validation: Check HTTP status codes
│
└─ Data Flow:
   ├─ Frontend → Edge Function (create-payment-intent)
   ├─ Edge Function → PayMongo API (POST payment_intent)
   ├─ PayMongo → Edge Function (webhook on status change)
   ├─ Edge Function → Database (update PaymongoPayment)
   └─ Database → Frontend (real-time or polling update)
```

---

## 3. NETWORK FLOW DIAGRAMS

### 3.1 User Registration Flow

```
┌──────────────┐
│   Borrower   │
│   (Browser)  │
└──────┬───────┘
       │
       │ 1. Enters email & password
       │ POST /auth/v1/signup (HTTPS)
       │
       ├─→ Firewall (DDoS check)
       │
       ├─→ CDN Edge (cache check, miss)
       │
       ├─→ Frontend Hosting
       │   └─→ index.html (cached)
       │
       ├─→ Browser runs React
       │   └─→ Calls Supabase Auth API
       │
       ├─→ HTTPS Tunnel (TLS 1.3)
       │
       ├─→ Supabase API Gateway
       │   ├─ Validate request
       │   ├─ Hash password (bcrypt)
       │   └─ Create auth.users row
       │
       ├─→ PostgreSQL
       │   ├─ INSERT INTO auth.users (email, encrypted_password)
       │   ├─ INSERT INTO public.user_profiles (user_id, role)
       │   └─ Triggers: create_user_profile()
       │
       ├─→ Supabase → Browser
       │   ├─ JWT token (access_token)
       │   ├─ Refresh token (refresh_token)
       │   └─ User data {id, email, role}
       │
       ├─→ Browser
       │   ├─ Store JWT in localStorage
       │   ├─ Store session in AuthContext
       │   └─ Redirect to /borrower-dashboard
       │
       └─→ 2. Confirmation email sent (optional)
           ├─ Edge Function: send-notification
           ├─ Email service: SendGrid (optional)
           └─ Borrower receives welcome email

Time: ~500ms (network latency + processing)
Data Transferred: ~2KB (JSON request/response)
```

### 3.2 Loan Application Submission Flow

```
┌──────────────────────┐
│   Borrower Dashboard │
│   (React Component)  │
└──────┬───────────────┘
       │
       │ 1. Clicks "Submit Application"
       │
       ├─→ Validate local form data (client-side)
       │
       ├─→ Construct JSON payload:
       │   {
       │     application_number: "APP-2024-001",
       │     loan_amount_php: 50000,
       │     term_months: 12,
       │     purpose: "business",
       │     status: "submitted",
       │     submitted_at: NOW()
       │   }
       │
       ├─→ Add JWT token to Authorization header
       │   Authorization: Bearer eyJhbGc...
       │
       ├─→ POST /rest/v1/credit_applications (HTTPS)
       │
       ├─→ Firewall / CDN (no cache hit)
       │
       ├─→ Supabase API Gateway
       │   ├─ Verify JWT token (valid, not expired)
       │   ├─ Extract user_id from JWT claims
       │   ├─ Validate request body (schema validation)
       │   └─ Check RLS policy: borrower owns application
       │
       ├─→ PostgreSQL Database
       │   ├─ INSERT INTO credit_applications (...)
       │   ├─ Triggers:
       │   │  ├─ Set created_at = NOW()
       │   │  ├─ Set updated_at = NOW()
       │   │  └─ Generate audit_log entry
       │   │
       │   └─ Constraints:
       │      ├─ Check subscription_active() = true
       │      ├─ Check monthly_application_limit
       │      └─ Check borrower not in blacklist
       │
       ├─→ Supabase → Frontend
       │   ├─ HTTP 201 Created
       │   ├─ Response body: {id, application_number, status, ...}
       │   └─ Headers: Content-Type: application/json
       │
       ├─→ Browser (React)
       │   ├─ Display success toast: "Application submitted"
       │   ├─ Update local state (applications list)
       │   └─ Redirect to /applications/{application_id}
       │
       ├─→ Edge Function: send-notification (async)
       │   ├─ Trigger: Application submitted
       │   ├─ Recipient: Lending admin
       │   ├─ Create Notification record
       │   └─ Send email (optional)
       │
       └─→ Database (audit trail)
           INSERT INTO audit_logs (
             user_id, action, entity_type, entity_id, changes
           )

Time: ~800ms
Data Transferred: ~3KB (JSON payload + response)
RLS Enforced: Yes (borrower can only submit for themselves)
```

### 3.3 Document Verification Workflow

```
┌─────────────────────┐
│  Lending Admin      │
│  (Admin Dashboard)  │
└──────┬──────────────┘
       │
       │ 1. Reviews uploaded documents
       │ GET /rest/v1/documents?application_id=xxx (HTTPS)
       │
       ├─→ API Gateway → Database
       │   ├─ Verify JWT (lending_admin role)
       │   ├─ Check RLS: admin owns tenant that owns application
       │   ├─ Query documents with verification_status = 'pending'
       │   └─ Fetch signed URLs for document preview
       │
       ├─→ Response: Document list
       │   [
       │     {
       │       id: "doc-123",
       │       file_path: "storage/documents/...",
       │       file_type: "valid_id",
       │       file_size_bytes: 2048576,
       │       verification_status: "pending",
       │       signed_url: "https://...(expires in 24h)"
       │     }
       │   ]
       │
       ├─→ Browser displays document preview (PDF viewer)
       │   └─ Fetches from signed_url (temporary access)
       │
       │ 2. Admin clicks "Approve Document"
       │
       ├─→ PATCH /rest/v1/documents/doc-123 (HTTPS)
       │   {
       │     verification_status: "verified",
       │     verified_by: "admin-user-id",
       │     verified_at: NOW()
       │   }
       │
       ├─→ API Gateway
       │   ├─ Verify JWT (admin)
       │   ├─ Validate RLS
       │   └─ Check only admin can verify
       │
       ├─→ PostgreSQL
       │   ├─ UPDATE documents SET verification_status = 'verified'
       │   ├─ INSERT INTO document_verifications (...)
       │   ├─ Audit log entry
       │   └─ Trigger: Check if all docs verified
       │
       ├─→ If all docs verified:
       │   ├─ UPDATE credit_applications SET status = 'verified'
       │   └─ Trigger: Edge Function (ai-credit-scoring)
       │
       ├─→ Edge Function: ai-credit-scoring
       │   ├─ Fetch application + borrower data
       │   ├─ Calculate credit score (proprietary algorithm)
       │   ├─ INSERT INTO ai_scoring_results
       │   ├─ UPDATE credit_applications SET status = 'scored'
       │   └─ Send notification to lending_admin
       │
       ├─→ Supabase → Browser
       │   ├─ HTTP 200 OK
       │   ├─ Updated document object
       │   └─ Real-time notification (WebSocket)
       │
       └─→ Browser
           ├─ Display success message
           ├─ Update document status UI
           └─ If all verified: Show next steps

Time: ~1-2 seconds
AI Scoring Time: ~5 seconds (async)
Data Transferred: ~5KB per document
```

### 3.4 Payment Processing Flow

```
┌──────────────┐
│   Borrower   │
│   (Browser)  │
└──────┬───────┘
       │
       │ 1. Clicks "Make Payment"
       │ Loan amount: 8,885 PHP
       │
       ├─→ POST /functions/v1/create-payment-intent (HTTPS)
       │   {
       │     loan_id: "loan-123",
       │     amount: 888500 (cents),
       │     currency: "PHP",
       │     payment_method_type: "gcash"
       │   }
       │
       ├─→ Frontend → Edge Function (Deno)
       │
       ├─→ Edge Function: create-payment-intent
       │   ├─ Verify JWT token
       │   ├─ Fetch loan details from database
       │   ├─ Calculate payment amount (with fees)
       │   ├─ Fetch PayMongo API key from secrets
       │   └─ Construct PayMongo API request
       │
       ├─→ HTTPS → PayMongo API (api.paymongo.com/v1)
       │   POST /payment_intents
       │   Authorization: Bearer paymongo_api_key
       │   {
       │     data: {
       │       attributes: {
       │         amount: 888500,
       │         currency: "PHP",
       │         statement_descriptor: "HiramEase Loan Payment",
       │         metadata: {
       │           loan_id: "loan-123",
       │           application_id: "app-456"
       │         }
       │       }
       │     }
       │   }
       │
       ├─→ PayMongo API Response (HTTP 201)
       │   {
       │     data: {
       │       id: "intent_xxx",
       │       attributes: {
       │         amount: 888500,
       │         checkout_url: "https://checkout.paymongo.com/..."
       │       }
       │     }
       │   }
       │
       ├─→ Edge Function → Database
       │   INSERT INTO paymongo_payments (
       │     paymongo_payment_intent_id: "intent_xxx",
       │     loan_id: "loan-123",
       │     amount_php: 8885,
       │     status: "pending",
       │     created_at: NOW()
       │   )
       │
       ├─→ Edge Function → Browser
       │   {
       │     checkout_url: "https://checkout.paymongo.com/...",
       │     payment_id: "payment-123"
       │   }
       │
       ├─→ Browser
       │   └─ Redirect to PayMongo checkout URL
       │
       │ 2. Borrower completes payment on PayMongo
       │    (User interacts with PayMongo, not our app)
       │
       ├─→ PayMongo processes payment
       │   ├─ User selects payment method (e.g., GCash)
       │   ├─ Payment gateway processes transaction
       │   ├─ Bank/e-wallet approves/denies
       │   └─ Payment settled
       │
       │ 3. PayMongo sends webhook to our app
       │
       ├─→ POST /functions/v1/paymongo-webhook (HTTPS)
       │   Headers:
       │   - X-Paymongo-Signature: signature_value
       │   Body:
       │   {
       │     data: {
       │       id: "charge_xxx",
       │       attributes: {
       │         status: "paid",
       │         payment_intent_id: "intent_xxx",
       │         amount: 888500,
       │         metadata: { loan_id: "loan-123" }
       │       }
       │     }
       │   }
       │
       ├─→ Edge Function: paymongo-webhook
       │   ├─ Verify webhook signature (HMAC-SHA256)
       │   ├─ Parse payment intent ID
       │   ├─ Fetch loan details from database
       │   ├─ Fetch PayMongo secret from secrets
       │   ├─ Validate signature
       │   └─ If valid:
       │      ├─ UPDATE paymongo_payments SET status = 'paid'
       │      ├─ UPDATE loan_payments SET paid_date = NOW(), status = 'paid'
       │      ├─ Increment borrower_credit_history.on_time_payments
       │      ├─ Create Notification for borrower: "Payment received"
       │      └─ Return HTTP 200 OK
       │
       ├─→ Database
       │   ├─ UPDATE loan_payments (mark as paid)
       │   ├─ INSERT Notification record
       │   └─ Audit log entry
       │
       ├─→ Browser (Polling or WebSocket)
       │   ├─ Query payment status (GET /rest/v1/loan_payments)
       │   ├─ Display success message
       │   └─ Update payment history

Time Breakdown:
- Create intent: ~300ms
- Borrower payment: ~2-5 minutes
- Webhook delivery: ~1-5 seconds
- Database update: ~100ms
- Total: 2-6 minutes

Data Transferred:
- Create intent request: ~1KB
- PayMongo API call: ~1KB
- Webhook: ~2KB
- Database: ~1KB

Security:
✓ JWT verification
✓ PayMongo signature verification
✓ RLS policy enforcement
✓ Idempotency (webhook can be retried)
```

### 3.5 AI Credit Scoring Workflow

```
┌──────────────────────┐
│  Application Status  │
│  Changed to VERIFIED │
└──────┬───────────────┘
       │
       │ (Automatic trigger via database trigger)
       │
       ├─→ PostgreSQL Trigger
       │   CREATE TRIGGER after_app_verified
       │   AFTER UPDATE ON credit_applications
       │   WHEN (status = 'verified')
       │
       ├─→ Invoke Edge Function (Deno)
       │   POST /functions/v1/ai-credit-scoring
       │   {
       │     application_id: "app-123",
       │     tenant_id: "tenant-456"
       │   }
       │
       ├─→ Edge Function: ai-credit-scoring
       │   ├─ Fetch application details
       │   ├─ Fetch borrower profile
       │   ├─ Fetch credit history
       │   ├─ Fetch scoring configuration (tenant-specific weights)
       │   │
       │   ├─ Calculate Income Stability Score
       │   │  ├─ Input: years_employed, employment_status, income_trend
       │   │  ├─ Calculation: (years_employed × 0.4) + (status × 0.3) + (trend × 0.3)
       │   │  └─ Output: 0-100 scale, weight × 0.30
       │   │
       │   ├─ Calculate DTI Score
       │   │  ├─ Input: monthly_debt, monthly_income
       │   │  ├─ Calculation: DTI = debt / income
       │   │  │  - DTI < 20%: 100 points
       │   │  │  - DTI 20-30%: 80 points
       │   │  │  - DTI 30-40%: 60 points
       │   │  │  - DTI 40-50%: 40 points
       │   │  │  - DTI > 50%: 20 points
       │   │  └─ Output: weight × 0.30
       │   │
       │   ├─ Calculate Credit History Score
       │   │  ├─ Input: on_time_payments, late_payments, defaults
       │   │  ├─ Calculation:
       │   │  │  - On-time %: 0-80 points
       │   │  │  - Late penalties: -10 per incident
       │   │  │  - Defaults: -50 per incident
       │   │  └─ Output: weight × 0.25
       │   │
       │   ├─ Calculate Loan Risk Score
       │   │  ├─ Input: loan_amount, annual_income, term_months, collateral
       │   │  ├─ Calculation:
       │   │  │  - Amount-to-income ratio: 0-50 points
       │   │  │  - Term length: 0-30 points
       │   │  │  - Collateral coverage: 0-20 points
       │   │  └─ Output: weight × 0.15
       │   │
       │   ├─ Aggregate Final Score
       │   │  └─ Overall = F1 + F2 + F3 + F4 (300-850 scale)
       │   │
       │   ├─ Classify Risk Level
       │   │  ├─ LOW: >= 720
       │   │  ├─ MEDIUM: 620-719
       │   │  └─ HIGH: < 620
       │   │
       │   ├─ Generate Recommendation
       │   │  ├─ LOW + docs verified + DTI ok → APPROVE
       │   │  ├─ HIGH or missing docs → REJECT
       │   │  └─ MEDIUM → REVIEW (human decision)
       │   │
       │   ├─ Generate Explanation
       │   │  ├─ Factor breakdown
       │   │  ├─ Weighted contributions
       │   │  ├─ Key drivers
       │   │  └─ Risk assessment details
       │   │
       │   └─ Insert to Database
       │      INSERT INTO ai_scoring_results (
       │        application_id,
       │        overall_score,
       │        risk_level,
       │        recommendation,
       │        factor_scores,
       │        factors_explanation,
       │        model_version,
       │        configuration_snapshot,
       │        created_at
       │      )
       │
       ├─→ Database
       │   ├─ UPDATE credit_applications SET status = 'scored'
       │   ├─ INSERT audit_logs entry
       │   └─ Trigger: send-notification to lending_admin
       │
       ├─→ Edge Function: send-notification
       │   ├─ Create Notification record
       │   ├─ Fetch admin email
       │   ├─ Send email: "Application ready for review"
       │   └─ Include link to application
       │
       ├─→ Browser (Admin Dashboard)
       │   ├─ Real-time notification appears (WebSocket)
       │   ├─ Admin sees application in review queue
       │   ├─ Admin clicks to view scoring details
       │   └─ API call: GET /rest/v1/ai_scoring_results?application_id=...
       │
       └─→ Lending Admin Reviews
           ├─ Views AI scoring breakdown
           ├─ Makes final decision (Approve/Reject/Override)
           └─ Updates application status

Time Breakdown:
- AI Scoring Execution: ~2-5 seconds
- Database Update: ~100ms
- Email Delivery: ~5 seconds (async)
- Admin Notification: <100ms (real-time)

Data Transferred:
- Scoring request: ~500 bytes
- Scoring result: ~3KB
- Notification: ~1KB

Accuracy:
- Historical accuracy: Monitor via confusion matrix
- Model version: Tracked for reproducibility
- Factor weights: Per-tenant customizable
```

---

## 4. DATA FLOW PATTERNS

### 4.1 Request/Response Cycle

```
CLIENT REQUEST CYCLE
│
├─ 1. Client Preparation
│  ├─ Construct HTTP request (method, URL, headers, body)
│  ├─ Add Authorization header: Bearer {JWT_TOKEN}
│  ├─ Add Content-Type: application/json
│  └─ Add CORS headers (automatically by browser)
│
├─ 2. DNS Resolution
│  ├─ Resolve domain → IP address
│  ├─ Query: api.supabase.co → 1.2.3.4
│  ├─ Cached at: DNS provider (CloudFlare)
│  └─ TTL: 300 seconds
│
├─ 3. TLS Handshake (HTTPS)
│  ├─ Client Hello (protocol version, cipher suites)
│  ├─ Server Hello (certificate, selected cipher)
│  ├─ Certificate Verification (chain validation)
│  ├─ Key Exchange (DH / ECDH)
│  ├─ Change Cipher Spec
│  └─ Encrypted tunnel established (TLS 1.3)
│
├─ 4. Request Transmission
│  ├─ Encrypted over TLS tunnel
│  ├─ Routed through ISP → Internet backbone
│  ├─ Possible routing through CloudFlare edge
│  ├─ Packet size: ~1KB (typical JSON)
│  └─ Latency: 50-200ms (depends on geography)
│
├─ 5. Server Reception (Supabase)
│  ├─ API Gateway receives request
│  ├─ TLS decryption
│  ├─ Request parsing (JSON deserialization)
│  └─ Route matching (map to service)
│
├─ 6. Request Processing
│  ├─ A. Authentication
│  │  ├─ Extract JWT token from Authorization header
│  │  ├─ Verify signature (HMAC-SHA256)
│  │  ├─ Check token expiry
│  │  ├─ Extract claims (user_id, role)
│  │  └─ Fail: Return 401 Unauthorized
│  │
│  ├─ B. Authorization
│  │  ├─ Check user role (borrower, lending_admin, super_admin)
│  │  ├─ Check resource ownership
│  │  └─ Fail: Return 403 Forbidden
│  │
│  ├─ C. Validation
│  │  ├─ Validate request schema (JSON schema)
│  │  ├─ Validate data types (string, number, etc.)
│  │  ├─ Validate constraints (min/max, regex)
│  │  └─ Fail: Return 400 Bad Request
│  │
│  ├─ D. Business Logic
│  │  ├─ Execute database query
│  │  ├─ Apply RLS policies
│  │  ├─ Trigger any side effects (notifications, etc.)
│  │  └─ Handle errors (transaction rollback)
│  │
│  └─ E. Response Preparation
│     ├─ Serialize response object (JSON)
│     ├─ Set HTTP status code (200, 201, 400, etc.)
│     ├─ Set response headers
│     └─ Compress (gzip if applicable)
│
├─ 7. Response Transmission
│  ├─ Encrypted over TLS tunnel
│  ├─ Typical size: 2-5KB
│  ├─ Latency: 50-200ms
│  └─ Checksum: TCP ensures integrity
│
├─ 8. Client Reception
│  ├─ Browser receives encrypted response
│  ├─ TLS decryption
│  ├─ Response parsing (JSON deserialization)
│  ├─ Status code check
│  └─ Body processing
│
└─ 9. Client Processing
   ├─ JavaScript execution
   ├─ React state update
   ├─ UI re-render
   ├─ Cache update (localStorage if applicable)
   └─ User feedback (success/error message)

TOTAL TIME: ~100-500ms (typical)
- Network: 100-400ms (geography dependent)
- Server processing: 10-100ms (query complexity)
- Client processing: 10-50ms (rendering)
```

### 4.2 Database Query Flow

```
APPLICATION LAYER
│
├─ Client constructs query
│  ├─ Using Supabase JS client
│  ├─ supabase.from("applications").select("*")
│  └─ Filter, sort, pagination applied
│
├─ Supabase JS Client Library
│  ├─ Constructs REST API request
│  ├─ Endpoint: GET /rest/v1/applications?select=*&filter=...
│  ├─ Adds Authorization header (JWT)
│  └─ Sends over HTTPS
│
API GATEWAY LAYER
│
├─ Request received by Supabase API Gateway
├─ Parse URL, query parameters, headers
├─ Extract JWT token
├─ Verify token signature & expiry
├─ Extract user_id, role from JWT claims
│
RLS POLICY ENFORCEMENT
│
├─ For each table access:
│  ├─ SELECT policy: Check USING clause
│  │  ├─ Borrower: Can only select own applications
│  │  ├─ Admin: Can select tenant's applications
│  │  └─ Super Admin: Can select all applications
│  │
│  ├─ INSERT policy: Check WITH CHECK clause
│  ├─ UPDATE policy: Check USING & WITH CHECK
│  ├─ DELETE policy: Check USING clause
│  │
│  └─ If policy fails → Return 0 rows (silent failure)
│     or HTTP 403 (if row-level error)
│
POSTGRESQL QUERY EXECUTION
│
├─ Query planner analyzes query
├─ Determines query plan (sequence scan, index scan, etc.)
├─ Estimates rows, cost
│
├─ Query execution:
│  ├─ FROM clause: Access table (using index if available)
│  ├─ WHERE clause: Filter rows (RLS + user-defined)
│  ├─ SELECT clause: Project columns
│  ├─ ORDER BY: Sort results
│  ├─ LIMIT/OFFSET: Pagination
│  └─ Return result set
│
CACHING LAYER (Optional)
│
├─ Check query cache
├─ If hit: Return cached result (milliseconds)
├─ If miss: Continue to database
├─ Cache key: Query + JWT + parameters
└─ TTL: 60 seconds (configurable)
│
RESULT SERIALIZATION
│
├─ PostgreSQL → JSON serialization
├─ Convert rows to JSON objects
├─ Handle NULL values
├─ Handle complex types (JSON, arrays)
│
API GATEWAY RESPONSE
│
├─ HTTP 200 OK
├─ Content-Type: application/json
├─ Content-Length header
├─ Response body: JSON array or object
├─ Optional: X-Total-Count header (for pagination)
└─ Optional: X-Page-Count header
│
NETWORK TRANSMISSION
│
├─ Response encrypted (TLS 1.3)
├─ Typical size: 2-10KB
├─ Compression: Gzip applied
├─ Network latency: 50-200ms
│
CLIENT PROCESSING
│
├─ Browser receives response
├─ JSON deserialization
├─ Validation (optional schema validation)
├─ React state update (setState)
├─ Component re-render
├─ DOM manipulation
└─ Display to user

TOTAL QUERY TIME: ~100-500ms
- Database execution: 10-100ms
- Network: 50-200ms
- Serialization: 5-20ms
- Client processing: 10-50ms

INDEX OPTIMIZATION
├─ Single-column index:
│  └─ SELECT * FROM applications WHERE borrower_id = x → ~1ms
│
├─ Composite index:
│  └─ SELECT * FROM applications WHERE tenant_id = x AND status = 'pending' → ~1ms
│
├─ Without index (full table scan):
│  └─ SELECT * FROM applications WHERE custom_field = x → 100ms+ (1M rows)
│
└─ Indexes on database: Check SYSTEM_DOCUMENTATION.md for details
```

### 4.3 Real-time Update Flow (WebSocket)

```
BROWSER (React Component)
│
├─ Import: import { useEffect } from 'react'
├─ Subscribe to updates:
│  supabase
│    .channel('applications')
│    .on('postgres_changes',
│      { event: 'UPDATE', schema: 'public', table: 'applications' },
│      (payload) => {
│        // Handle real-time update
│        setState(payload.new)
│      }
│    )
│    .subscribe()
│
├─ WebSocket connection initiated
│
NETWORK LAYER
│
├─ WebSocket handshake (HTTP → WS upgrade)
├─ URL: wss://... (secure WebSocket)
├─ Headers: Authorization: Bearer {JWT}
├─ Connection established
├─ Keep-alive: Ping/Pong frames every 30 seconds
│
SUPABASE REALTIME SERVER
│
├─ Accept WebSocket connection
├─ Verify JWT token
├─ Parse channel name: "applications"
├─ Parse subscription filter:
│  ├─ Event: UPDATE
│  ├─ Schema: public
│  └─ Table: applications
│
├─ Create subscription in-memory
├─ Store user_id → WebSocket connection mapping
├─ Store subscription filters
│
DATABASE LISTENER
│
├─ PostgreSQL LISTEN/NOTIFY
├─ PostgreSQL trigger on UPDATE credit_applications:
│  └─ PERFORM pg_notify('realtime:applications', json_build_object(...))
│
REALTIME BROADCAST
│
├─ PostgreSQL publishes event
├─ Realtime server receives notification
├─ Filter by subscription criteria
├─ For each subscribed WebSocket connection:
│  ├─ Check RLS policies (does user have access?)
│  ├─ Serialize change payload
│  ├─ Send WebSocket frame to client
│  │  {
│  │    "type": "REALTIME_SUBSCRIPTION",
│  │    "event": "UPDATE",
│  │    "data": { "new": {...}, "old": {...} }
│  │  }
│  └─ Frame sent over persistent connection
│
BROWSER RECEIVES UPDATE
│
├─ WebSocket message event fires
├─ Supabase JS client parses message
├─ Calls subscription callback with payload
├─ React updates state (setState)
├─ Component re-renders
├─ User sees live update (no page refresh needed)
│
└─ Latency: 100-500ms (typically faster than polling)

EXAMPLE: Admin verifies document
├─ Admin clicks "Approve"
├─ Application status changes to "verified"
├─ PostgreSQL trigger fires
├─ Realtime broadcasts to admin WebSocket
├─ Admin's dashboard updates live
├─ Borrower (subscribed separately) also gets notified

ADVANTAGES over POLLING
├─ Lower latency (push vs. pull)
├─ Reduced server load
├─ Lower bandwidth usage
├─ Better user experience (real-time feel)
└─ Lower battery consumption (mobile)
```

---

## 5. SECURITY & ACCESS CONTROL

### 5.1 Authentication & Authorization Flow

```
SECURITY LAYERS (Defense in Depth)
│
├─ LAYER 1: Network Security
│  ├─ TLS 1.3 encryption (all traffic)
│  ├─ Certificate pinning (optional, mobile)
│  ├─ HSTS headers (force HTTPS)
│  ├─ CORS policy (restrict origins)
│  └─ DDoS protection (CloudFlare)
│
├─ LAYER 2: Application Security
│  ├─ Input validation (schema, type checking)
│  ├─ Output encoding (prevent XSS)
│  ├─ CSRF protection (SameSite cookies)
│  ├─ Rate limiting (per IP, per user)
│  └─ Request signing (for webhooks)
│
├─ LAYER 3: Authentication
│  ├─ Credentials: Email + Password
│  ├─ Password hashing: bcrypt (+ salt)
│  ├─ JWT tokens: 1-hour expiry
│  ├─ Refresh tokens: 7-day expiry
│  ├─ Token storage: localStorage / secure cookies
│  ├─ Session validation: Token signature check
│  └─ Token refresh: Automatic via refresh_token
│
├─ LAYER 4: Authorization (RBAC)
│  ├─ Roles: borrower, lending_admin, super_admin
│  ├─ Route protection: Check role before rendering
│  ├─ Component visibility: Conditional rendering
│  ├─ API endpoint protection: Verify role + permissions
│  └─ Data filtering: RLS policies at DB level
│
├─ LAYER 5: Row-Level Security (RLS)
│  ├─ Policies per table
│  ├─ Filter by tenant_id (data isolation)
│  ├─ Filter by user_id (personal data)
│  ├─ Filter by role (admin vs. borrower)
│  ├─ Enforced at database level (cannot bypass)
│  └─ Transparent to application code
│
└─ LAYER 6: Audit & Compliance
   ├─ Audit logs: User actions
   ├─ Change tracking: Old/new values
   ├─ Timestamps: When & where
   ├─ IP logging: Source of request
   └─ Compliance reporting: For DPA

RLS POLICY EXAMPLES
│
├─ Borrower can only view own applications:
│  CREATE POLICY "borrower_own_applications"
│    ON credit_applications
│    FOR SELECT
│    TO authenticated
│    USING (borrower_id = auth.uid());
│
├─ Admin can only view tenant's data:
│  CREATE POLICY "admin_tenant_isolation"
│    ON credit_applications
│    FOR SELECT
│    TO authenticated
│    USING (
│      tenant_id = (
│        SELECT tenant_id FROM user_profiles
│        WHERE user_id = auth.uid()
│      )
│    );
│
└─ Super admin can view all (no USING clause):
   CREATE POLICY "super_admin_all_access"
     ON credit_applications
     FOR SELECT
     TO authenticated
     USING (
       (SELECT role FROM user_profiles WHERE user_id = auth.uid()) = 'super_admin'
     );
```

### 5.2 Data Encryption & Protection

```
DATA PROTECTION STRATEGY
│
├─ IN TRANSIT (Network)
│  ├─ HTTPS / TLS 1.3
│  ├─ Cipher suites: AES-256-GCM, ChaCha20-Poly1305
│  ├─ Certificate: Signed by trusted CA
│  ├─ Key exchange: ECDHE (Forward Secrecy)
│  ├─ All connections: Frontend ↔ Supabase
│  └─ Webhook connections: PayMongo ↔ Edge Functions
│
├─ AT REST (Database)
│  ├─ Database encryption: AES-256
│  ├─ Encrypted tables: All data
│  ├─ Key management: Supabase (auto-managed)
│  ├─ Backup encryption: AES-256
│  ├─ Storage access: Only via Supabase APIs
│  └─ Admin access: Requires multi-factor auth
│
├─ IN STORAGE (File Storage)
│  ├─ S3 bucket encryption: AES-256
│  ├─ Signed URLs: Time-limited access (24 hours)
│  ├─ Private: Not publicly accessible
│  ├─ Access control: Via RLS policies
│  ├─ Audit: Logs all access
│  └─ Retention: Delete old files per policy
│
├─ SENSITIVE DATA HANDLING
│  ├─ Passwords:
│  │  ├─ Hashed immediately (bcrypt)
│  │  ├─ Never transmitted in plain text
│  │  ├─ Never logged
│  │  └─ NEVER stored in application logs
│  │
│  ├─ Credit card info:
│  │  ├─ NEVER stored by us
│  │  ├─ Handled by PayMongo (PCI-DSS compliant)
│  │  ├─ Only token stored (if applicable)
│  │  └─ Cleared from logs
│  │
│  ├─ API Keys:
│  │  ├─ Stored in Edge Function secrets
│  │  ├─ Not in source code / .env files
│  │  ├─ Rotated regularly
│  │  ├─ Audit access
│  │  └─ Revoke compromised keys immediately
│  │
│  ├─ Personal Information (PII):
│  │  ├─ Minimal collection (name, email, ID)
│  │  ├─ Encrypted in transit & at rest
│  │  ├─ Access logs maintained
│  │  ├─ Right to access / delete
│  │  └─ DPA compliance
│  │
│  └─ Audit Logs:
│     ├─ PII masked or hashed
│     ├─ Immutable (append-only)
│     ├─ Retained for 12 months
│     ├─ Access restricted to admins
│     └─ Export for compliance

ENCRYPTION KEY HIERARCHY
│
├─ Master Key (Supabase controlled)
│  └─ Database Encryption Key (derives from Master Key)
│     └─ Individual Column Encryption (optional)
│
└─ SSL/TLS Keys
   ├─ Private key: Securely stored
   ├─ Public key: Embedded in certificate
   ├─ Certificate: Renewed annually (auto by Let's Encrypt)
   └─ Key rotation: Automatic on renewal
```

---

## 6. DEPLOYMENT ARCHITECTURE

### 6.1 Multi-Stage Deployment Pipeline

```
DEVELOPMENT ENVIRONMENT
│
├─ Local Development (Developer Machine)
│  ├─ Vite dev server: http://localhost:5173
│  ├─ Supabase local (optional): Docker-based
│  ├─ Hot module replacement (HMR) enabled
│  ├─ Source maps: For debugging
│  ├─ TypeScript checking: Real-time
│  └─ Environment: .env.local
│
├─ Git Repository
│  ├─ Branch: main (production)
│  ├─ Branch: develop (staging)
│  ├─ Branch: feature/* (feature branches)
│  └─ Version control: Track all changes

STAGING ENVIRONMENT
│
├─ Staging Deployment (Pre-production)
│  ├─ Frontend: Vercel / Netlify (staging URL)
│  ├─ Backend: Supabase (staging project)
│  ├─ Database: Separate staging DB
│  ├─ Edge Functions: Deployed to staging
│  ├─ Payments: PayMongo sandbox environment
│  ├─ Data: Realistic test data
│  ├─ Testing: QA team performs testing
│  └─ DNS: staging.hiramease.com
│
├─ Testing Protocol
│  ├─ Unit tests: Jest / Vitest
│  ├─ Integration tests: API tests
│  ├─ E2E tests: Cypress / Playwright
│  ├─ Performance tests: Lighthouse
│  ├─ Security tests: OWASP scanning
│  └─ UAT: User acceptance testing

PRODUCTION ENVIRONMENT
│
├─ Production Deployment (Live)
│  ├─ Frontend Hosting
│  │  ├─ Provider: Vercel / Netlify / Firebase
│  │  ├─ Region: Global CDN
│  │  ├─ Build: Vite optimized build
│  │  ├─ Cache: Aggressive caching with busting
│  │  ├─ SSL: Automatic certificate renewal
│  │  └─ Domain: hiramease.com
│  │
│  ├─ Backend (Supabase)
│  │  ├─ Project: Production project
│  │  ├─ Region: Asia Pacific (Singapore)
│  │  ├─ Database: High-availability configuration
│  │  ├─ Replicas: Read replicas for scaling
│  │  ├─ Backups: Daily encrypted backups (30-day retention)
│  │  └─ DDoS: Protected by Supabase infrastructure
│  │
│  ├─ Edge Functions
│  │  ├─ Deployment: Global edge locations
│  │  ├─ Replicas: Multiple regions (Asia, US, EU)
│  │  ├─ Auto-scaling: Based on invocations
│  │  ├─ Timeout: 10-minute limit
│  │  └─ Monitoring: Logs & metrics dashboard
│  │
│  ├─ Payment Gateway
│  │  ├─ PayMongo: Production environment
│  │  ├─ API endpoint: https://api.paymongo.com/v1/
│  │  ├─ Live transactions: Real money
│  │  └─ Security: PCI-DSS compliance
│  │
│  └─ Monitoring & Observability
│     ├─ Uptime monitoring: 99.9% SLA
│     ├─ Error tracking: Sentry integration (optional)
│     ├─ Performance monitoring: Real User Monitoring
│     ├─ Database monitoring: Query logs
│     ├─ Application logs: Centralized logging
│     ├─ Alerts: Email / Slack notifications
│     └─ Incident response: On-call rotation

DEPLOYMENT WORKFLOW
│
├─ Code change pushed to main branch
├─ GitHub Actions / CI pipeline triggered
│  ├─ Lint code (ESLint)
│  ├─ Run type checking (TypeScript)
│  ├─ Run tests (Jest)
│  ├─ Build application (Vite)
│  ├─ Verify build size
│  └─ Security scan (SAST)
│
├─ If CI passes:
│  ├─ Deploy to staging first
│  ├─ Run E2E tests on staging
│  ├─ Manual QA approval
│  └─ Merge to production branch
│
├─ Production deployment:
│  ├─ Frontend: Automatic via Vercel
│  │  ├─ Build: Vite production build
│  │  ├─ Upload: Static files to CDN
│  │  ├─ Cache busting: Hash-based filenames
│  │  ├─ Rollout: Gradual traffic shift (optional)
│  │  └─ Rollback: One-click if needed
│  │
│  ├─ Backend: Database migrations
│  │  ├─ Apply migrations (if any)
│  │  ├─ Backup: Automatic pre-migration
│  │  ├─ Rollback plan: Available
│  │  └─ Zero-downtime: Supabase handles
│  │
│  └─ Edge Functions: Update code
│     ├─ Deploy new version
│     ├─ Blue-green deployment
│     ├─ Traffic switch: Immediate or gradual
│     └─ Rollback: Instant revert

DEPLOYMENT FREQUENCY
├─ Frontend: Multiple times per day (CI/CD enabled)
├─ Backend: Weekly or as needed
├─ Migrations: Coordinated releases
├─ Edge Functions: Automatic on code push
└─ Paymented: Production-only (no staging)
```

### 6.2 Environment Configuration

```
ENVIRONMENT VARIABLES
│
├─ .env (Source Control - Safe)
│  └─ Public values only
│
├─ .env.local (Git Ignored - Development)
│  ├─ VITE_SUPABASE_URL: Local Supabase
│  ├─ VITE_SUPABASE_ANON_KEY: Development key
│  └─ VITE_APP_URL: http://localhost:5173
│
├─ .env.staging (Vercel Secrets - Staging)
│  ├─ VITE_SUPABASE_URL: Staging Supabase
│  ├─ VITE_SUPABASE_ANON_KEY: Staging key
│  └─ VITE_APP_URL: https://staging.hiramease.com
│
└─ .env.production (Vercel Secrets - Production)
   ├─ VITE_SUPABASE_URL: Production Supabase
   ├─ VITE_SUPABASE_ANON_KEY: Production key
   ├─ VITE_APP_URL: https://hiramease.com
   └─ Analytics tokens (if used)

SUPABASE SECRETS (Edge Functions)
│
├─ Development
│  ├─ paymongo_api_key_dev: Test key
│  └─ webhook_secret_dev: Test secret
│
├─ Staging
│  ├─ paymongo_api_key_sandbox: Sandbox key
│  ├─ webhook_secret_sandbox: Sandbox secret
│  └─ sendgrid_api_key_staging: Staging email
│
└─ Production
   ├─ paymongo_api_key: Live key (restricted)
   ├─ webhook_secret: Live secret (rotated)
   ├─ sendgrid_api_key: Production email
   └─ jwt_secret: Token signing key
```

---

## 7. NETWORK PERFORMANCE & OPTIMIZATION

### 7.1 Performance Metrics & Targets

```
FRONTEND PERFORMANCE
│
├─ Page Load Metrics
│  ├─ First Contentful Paint (FCP): Target < 1.5s
│  ├─ Largest Contentful Paint (LCP): Target < 2.5s
│  ├─ Cumulative Layout Shift (CLS): Target < 0.1
│  ├─ Time to Interactive (TTI): Target < 3.5s
│  └─ Total Blocking Time (TBT): Target < 300ms
│
├─ Asset Optimization
│  ├─ JavaScript:
│  │  ├─ Bundle size: Target < 200KB (gzipped)
│  │  ├─ Code splitting: By route
│  │  ├─ Tree shaking: Remove unused code
│  │  ├─ Minification: Vite automatic
│  │  └─ Lazy loading: Dynamic imports
│  │
│  ├─ CSS:
│  │  ├─ Bundle size: Target < 50KB (gzipped)
│  │  ├─ Tailwind: PurgeCSS removes unused
│  │  ├─ Minification: Vite automatic
│  │  └─ Critical CSS: Inline for FCP
│  │
│  ├─ Images:
│  │  ├─ Format: WebP with JPEG fallback
│  │  ├─ Sizes: Responsive images
│  │  ├─ Lazy loading: <img loading="lazy">
│  │  └─ Compression: Optimized per image
│  │
│  └─ Fonts:
│     ├─ System fonts: No external fonts (reduce HTTP)
│     ├─ Font loading: font-display: swap
│     └─ Fallbacks: Serif / Sans-serif
│
├─ Caching Strategy
│  ├─ Browser cache: 1 year (asset hash in filename)
│  ├─ CDN cache: 24 hours (HTML files)
│  ├─ Service Worker: (Optional, for PWA)
│  └─ IndexedDB: For application state
│
└─ Network Optimization
   ├─ HTTP/2: Multiple concurrent requests
   ├─ Compression: Gzip/Brotli enabled
   ├─ DNS prefetching: For third-party domains
   ├─ Connection pooling: Reuse TCP connections
   └─ Keep-alive: Persistent connections

BACKEND PERFORMANCE
│
├─ API Response Times
│  ├─ Simple query (< 1000 rows): Target < 100ms
│  ├─ Complex query (with joins): Target < 500ms
│  ├─ Aggregation queries: Target < 1s
│  ├─ Edge Function: Target < 5s
│  └─ Payment intent: Target < 2s
│
├─ Database Optimization
│  ├─ Indexes: On foreign keys, frequently filtered columns
│  ├─ Query optimization: Explain plans reviewed
│  ├─ Connection pooling: PgBouncer (30 connections per app)
│  ├─ Caching: Redis (optional, for hot data)
│  ├─ Partitioning: For large tables (optional)
│  └─ Vacuuming: Automatic maintenance
│
├─ Scalability
│  ├─ Database replicas: Read-only for scaling
│  ├─ Connection pooling: Limits active connections
│  ├─ Rate limiting: 100 requests/min per IP
│  ├─ Pagination: Avoid large result sets
│  └─ Async processing: Background jobs via Edge Functions
│
└─ Monitoring
   ├─ Slow query log: Queries > 1s
   ├─ Connection count: Alert if > 25
   ├─ Storage usage: Alert if > 80% full
   ├─ Backup status: Verify daily
   └─ Replication lag: Monitor for failover prep

NETWORK BANDWIDTH OPTIMIZATION
│
├─ Request Compression
│  ├─ Accept-Encoding: gzip, deflate, brotli
│  ├─ Typical compression ratio: 70-80%
│  │  └─ 10KB → 2KB
│  └─ CPU cost: Negligible for modern servers
│
├─ Response Batching
│  ├─ Combine multiple requests
│  ├─ GraphQL batch queries (if implemented)
│  ├─ Reduce round trips: 3 requests → 1 request
│  └─ Bandwidth saved: 30-50%
│
├─ Delta Sync (for real-time)
│  ├─ Only send changed fields
│  ├─ Instead of full object
│  └─ Bandwidth saved: 60-80%
│
└─ Offline Support (Service Worker)
   ├─ Cache API responses
   ├─ Serve offline
   ├─ Sync when online
   └─ Better UX for unreliable networks
```

### 7.2 Network Optimization Techniques

```
FRONTEND OPTIMIZATION
│
├─ Code Splitting
│  ├─ Route-based chunks
│  │  ├─ /borrower-dashboard → borrower-chunk.js
│  │  ├─ /admin-dashboard → admin-chunk.js
│  │  └─ Loaded on demand (not on page load)
│  │
│  ├─ Vendor splitting
│  │  ├─ node_modules → vendor.js
│  │  ├─ Cached separately (rarely changes)
│  │  └─ Size: ~50-100KB
│  │
│  └─ Async imports
│     └─ const Component = lazy(() => import('./Component'))
│
├─ Tree Shaking
│  ├─ Remove unused code
│  ├─ Lucide React: Only import used icons
│  ├─ Tailwind: Only include used utilities
│  └─ Vite: Automatic via rollup
│
├─ Preloading Critical Assets
│  ├─ <link rel="preload" href="..." as="script">
│  ├─ Bootstrap bundle: preload
│  ├─ API calls: prefetch
│  └─ Fonts: Preload (if external)
│
└─ Lazy Loading
   ├─ Images: <img loading="lazy">
   ├─ Components: React.lazy()
   ├─ Routes: Dynamic imports
   └─ Intersection Observer API

BACKEND OPTIMIZATION
│
├─ Query Optimization
│  ├─ Use indexes: Speed up WHERE clauses
│  ├─ Join optimization: Correct join type
│  ├─ Aggregation: Use database functions (not app logic)
│  ├─ Limit results: Pagination to avoid large transfers
│  └─ Select columns: Don't SELECT * (wasteful)
│
├─ Connection Pooling
│  ├─ Limit active connections
│  ├─ Reuse connections
│  ├─ Reduces connection overhead
│  └─ Configuration: Pool size = CPU cores × 4
│
├─ Caching Layers
│  ├─ Application cache
│  │  ├─ Query results cache (Redis)
│  │  ├─ TTL: 5-60 minutes
│  │  ├─ Invalidate on updates
│  │  └─ Bypass on cache miss
│  │
│  ├─ Database query cache
│  │  ├─ PostgreSQL built-in
│  │  ├─ Automatic invalidation
│  │  └─ Limited size (shared buffers)
│  │
│  └─ CDN caching
│     ├─ Static assets: 1 year
│     ├─ API responses: 5-60 minutes (configurable)
│     ├─ Invalidation: Purge on updates
│     └─ Geo-distributed
│
└─ Asynchronous Processing
   ├─ Heavy computations: Edge Functions
   ├─ Email sending: Async queue
   ├─ Webhooks: Fire-and-forget
   ├─ Reports: Background jobs
   └─ Notifications: Background tasks
```

---

## 8. DISASTER RECOVERY & HIGH AVAILABILITY

### 8.1 High Availability Architecture

```
REDUNDANCY & FAILOVER
│
├─ Frontend Redundancy
│  ├─ CDN edge nodes: 200+ locations globally
│  ├─ Automatic failover: Routing to next edge
│  ├─ Multi-region: Americas, Europe, Asia
│  ├─ Cache replication: Across regions
│  ├─ DNS failover: Automatic via CloudFlare
│  └─ RTO: < 1 minute, RPO: < 1 second
│
├─ Backend Redundancy (Supabase)
│  ├─ Database cluster: Multi-node setup
│  ├─ Primary: Read/Write, active
│  ├─ Replicas: Read-only, hot standbys
│  ├─ Automatic failover: On primary failure
│  ├─ Failover time: < 30 seconds
│  └─ RTO: < 1 minute, RPO: < 10 seconds
│
├─ Storage Redundancy
│  ├─ S3 replication: Cross-region
│  ├─ Versioning: Enabled for all files
│  ├─ Backup: Separate S3 bucket
│  ├─ Retention: 30-day retention policy
│  └─ Recovery: Restore from any version
│
├─ DNS Redundancy
│  ├─ Primary DNS: CloudFlare
│  ├─ Secondary DNS: Alternative provider
│  ├─ Health checks: Monitor both
│  ├─ Failover: Automatic
│  └─ Propagation: 5 minutes
│
└─ Edge Functions Redundancy
   ├─ Multi-region deployment
   ├─ Global load balancing
   ├─ Automatic failover
   ├─ No single point of failure
   └─ 99.99% uptime SLA

BACKUP STRATEGY
│
├─ Database Backups
│  ├─ Frequency: Daily automated
│  ├─ Retention: 30 days rolling
│  ├─ Location: Off-site encrypted storage
│  ├─ Encryption: AES-256
│  ├─ Point-in-time: Available for 7 days
│  ├─ Verification: Monthly restore test
│  └─ RTO: 1-4 hours (depending on size)
│
├─ Application Backups
│  ├─ Source code: Git repository
│  ├─ Build artifacts: Build logs retained
│  ├─ Configuration: Version controlled
│  ├─ Secrets: Encrypted in secret manager
│  └─ Recovery: Redeploy from git tag
│
├─ Storage Backups
│  ├─ File versioning: Enabled
│  ├─ Cross-region replication
│  ├─ Backup bucket: Separate region
│  ├─ Retention: 30+ days
│  └─ Encryption: End-to-end
│
└─ Compliance Backups
   ├─ Audit logs: Immutable, separate storage
   ├─ Retention: 1+ years for compliance
   ├─ Encryption: AES-256
   ├─ Access: Restricted to compliance team
   └─ Integrity: WORM (Write Once, Read Many)

DISASTER RECOVERY PROCEDURES
│
├─ RTO (Recovery Time Objective)
│  ├─ Application data loss: < 1 hour
│  ├─ Full system restoration: < 4 hours
│  ├─ Service recovery: < 30 minutes
│  └─ Partial recovery: < 10 minutes
│
├─ RPO (Recovery Point Objective)
│  ├─ Database: < 10 minutes
│  ├─ Files: < 1 hour
│  ├─ Configuration: < 1 minute
│  └─ Acceptable data loss: < 10 MB
│
├─ Failover Procedures
│  ├─ Automatic: No manual intervention
│  ├─ DNS switch: Instant or gradual
│  ├─ Database failover: Automatic promotion
│  ├─ Traffic routing: Immediate to healthy node
│  ├─ Notification: Alert team immediately
│  └─ Post-incident: Root cause analysis
│
├─ Testing Schedule
│  ├─ Monthly: Backup restoration test
│  ├─ Quarterly: Full disaster recovery drill
│  ├─ Annually: Multi-region failover test
│  ├─ Documentation: Up-to-date procedures
│  ├─ Team training: Regular scenarios
│  └─ Metrics: Track recovery success
│
└─ Incident Response
   ├─ Detection: Automated monitoring
   ├─ Alerting: Email + Slack + SMS
   ├─ Escalation: On-call rotation
   ├─ Mitigation: Automatic or manual switch
   ├─ Communication: Status page updates
   ├─ Resolution: Fix underlying issue
   ├─ Post-mortem: Improvement plan
   └─ Prevention: Implement safeguards

MONITORING & ALERTING
│
├─ System Health Checks
│  ├─ Uptime monitoring: Every 1 minute
│  ├─ Health endpoints: API response time
│  ├─ Database connectivity: Ping test
│  ├─ DNS resolution: Verify propagation
│  └─ SSL certificate: Check expiry
│
├─ Performance Monitoring
│  ├─ API latency: Alert if > 2s
│  ├─ Database load: Alert if > 80%
│  ├─ Memory usage: Alert if > 90%
│  ├─ Storage usage: Alert if > 80%
│  └─ Error rate: Alert if > 1%
│
├─ Security Monitoring
│  ├─ Failed login attempts: Alert if > 5/min
│  ├─ DDoS detection: Rate limiting active
│  ├─ Unauthorized access: Log all attempts
│  ├─ Data exfiltration: Monitor unusual patterns
│  └─ Malware scanning: Automated scans
│
└─ Alerts Channels
   ├─ Email: Critical alerts
   ├─ Slack: All alerts
   ├─ SMS: Page on-call for P1 issues
   ├─ PagerDuty: Incident escalation
   └─ Status Page: Public communication
```

### 8.2 System Architecture Resilience

```
FAULT TOLERANCE
│
├─ Circuit Breaker Pattern
│  ├─ PayMongo API call failure
│  ├─ Retry logic: 3 attempts with exponential backoff
│  ├─ Timeout: 10 seconds
│  ├─ Fallback: Queue for later retry
│  └─ Status: Open / Closed / Half-open
│
├─ Graceful Degradation
│  ├─ Real-time features unavailable
│  │  └─ Fallback to polling (slower but works)
│  │
│  ├─ External API down
│  │  └─ Queue operations for async retry
│  │
│  ├─ Database read replica down
│  │  └─ Route to primary (slower reads)
│  │
│  └─ CDN edge node down
│     └─ Route to next nearest edge
│
├─ Load Balancing
│  ├─ API Gateway: Load balance across instances
│  ├─ Database: Read replicas for scaling
│  ├─ CDN: Global load balancing
│  ├─ DNS: Round-robin across regions
│  └─ Algorithm: Least connections preferred
│
└─ Rate Limiting
   ├─ Global: 10,000 requests/min per tenant
   ├─ Per-IP: 100 requests/min
   ├─ Per-user: 1000 requests/hour
   ├─ Per-endpoint: Specific limits
   └─ Backoff: Exponential retry with jitter

NETWORK RESILIENCE
│
├─ Connection Reliability
│  ├─ TCP: Automatic retransmission
│  ├─ HTTPS: Keep-alive enabled
│  ├─ WebSocket: Auto-reconnect on disconnect
│  ├─ Timeout: Progressive backoff
│  └─ Max retries: 3 attempts
│
├─ Data Consistency
│  ├─ Database transactions: ACID compliance
│  ├─ Idempotency: Safe to retry failed requests
│  ├─ Payment webhooks: Idempotent (retry-safe)
│  ├─ State synchronization: Event sourcing
│  └─ Conflict resolution: Last-write-wins
│
└─ Network Partitioning
   ├─ Detection: Timeout + ping failures
   ├─ Response: Redirect to healthy node
   ├─ Queue: Store operations during partition
   ├─ Replay: Recover from partition
   └─ Monitoring: Alert for split-brain scenarios

FINANCIAL TRANSACTION SAFETY
│
├─ Payment Processing
│  ├─ Atomic transactions: All or nothing
│  ├─ Idempotent keys: Prevent duplicate charges
│  ├─ Timeout handling: Verify charge status
│  ├─ Webhook verification: Signature check
│  └─ Reconciliation: Automated daily
│
├─ Loan Data Integrity
│  ├─ Amount consistency: Application = Loan
│  ├─ Payment schedule: Immutable once created
│  ├─ Interest calculation: Deterministic algorithm
│  ├─ Balance tracking: Running total validated
│  └─ Late fee: Calculated consistently
│
└─ Audit Trail
   ├─ Immutable logs: Cannot be modified
   ├─ Timestamp precision: Microseconds
   ├─ User attribution: All actions logged
   ├─ Data changes: Before/after values
   └─ Compliance: Available for audits
```

---

## CONCLUSION

### Network Architecture Summary

The HiramEase platform employs a **multi-layered, cloud-native network architecture** optimized for security, scalability, and reliability:

**Key Characteristics:**
- **Distributed CDN**: Global content delivery for frontend
- **Serverless Backend**: Supabase handles infrastructure scaling
- **Encrypted Communication**: TLS 1.3 for all connections
- **Zero-Trust Security**: JWT verification, RLS policies, audit logging
- **High Availability**: Multi-region failover, automatic backups
- **Real-Time Capabilities**: WebSocket-based live updates
- **Payment Security**: PCI-DSS compliant third-party integration
- **Monitoring & Observability**: Comprehensive alerting and logging

**Performance Targets:**
- Frontend Load: < 2.5 seconds LCP
- API Response: < 500ms (avg)
- Database Query: < 100ms (simple)
- Uptime: 99.9% SLA

This architecture supports a production-ready fintech platform capable of handling secure, real-time loan management operations across Southeast Asia.

