# HiramEase Platform - Input Mechanisms Documentation

## Table of Contents
1. [Input Mechanism Overview](#1-input-mechanism-overview)
2. [User Authentication Inputs](#2-user-authentication-inputs)
3. [Form-Based Inputs](#3-form-based-inputs)
4. [File Upload Mechanisms](#4-file-upload-mechanisms)
5. [Payment Input Handling](#5-payment-input-handling)
6. [Data Validation & Error Handling](#6-data-validation--error-handling)
7. [Real-time Input Processing](#7-real-time-input-processing)
8. [Accessibility & UX](#8-accessibility--ux)
9. [Security in Input Processing](#9-security-in-input-processing)
10. [API Input Handling](#10-api-input-handling)

---

## 1. INPUT MECHANISM OVERVIEW

### 1.1 Input Flow Architecture

```
USER INTERACTION
│
├─ Direct User Input
│  ├─ Text fields (email, password, names)
│  ├─ Number inputs (amounts, quantities)
│  ├─ File uploads (documents, images)
│  ├─ Select dropdowns (role, type selection)
│  ├─ Radio buttons (payment methods)
│  ├─ Checkboxes (consent, agreement)
│  └─ Drag & drop (file uploads)
│
├─ Indirect Input
│  ├─ Click events (buttons, links)
│  ├─ Navigation (route changes)
│  ├─ Search parameters (URL query strings)
│  └─ System events (WebSocket messages)
│
└─ External Input
   ├─ PayMongo webhooks
   ├─ Email/SMS delivery
   ├─ API responses
   └─ Database state changes

                ↓

CLIENT-SIDE PROCESSING
│
├─ Event Listeners
│  ├─ onChange: For real-time input
│  ├─ onSubmit: For form submission
│  ├─ onDrop: For drag & drop
│  ├─ onClick: For button actions
│  └─ onDrag: For drag visual feedback
│
├─ React State Management
│  ├─ useState: Local form state
│  ├─ useContext: Auth context
│  ├─ useRef: File input refs
│  └─ useCallback: Event optimization
│
├─ Client-Side Validation
│  ├─ Type checking (string, number)
│  ├─ Format validation (email, phone)
│  ├─ Length constraints
│  ├─ Range validation (min/max)
│  ├─ File type & size checks
│  └─ Password strength rules
│
├─ Data Transformation
│  ├─ Currency formatting (peso symbols)
│  ├─ String sanitization (XSS prevention)
│  ├─ File reading (FileReader API)
│  ├─ Date parsing
│  └─ Number parsing
│
└─ UI Feedback
   ├─ Real-time validation messages
   ├─ Error highlighting (red border)
   ├─ Loading states
   ├─ Success confirmations
   └─ Disabled buttons

                ↓

NETWORK TRANSMISSION
│
├─ Request Construction
│  ├─ Payload serialization (JSON)
│  ├─ Authorization header (JWT)
│  ├─ CORS headers
│  └─ Content-Type header
│
├─ Encryption
│  ├─ HTTPS / TLS 1.3
│  ├─ Certificate verification
│  ├─ Cipher negotiation
│  └─ Forward secrecy
│
└─ Transmission
   ├─ HTTP/2 multiplexing
   ├─ Request compression
   ├─ Connection reuse
   └─ Error handling (retry)

                ↓

SERVER-SIDE PROCESSING (Supabase)
│
├─ Request Validation
│  ├─ Schema validation (JSON schema)
│  ├─ Type checking
│  ├─ Constraint verification
│  └─ SQL injection prevention
│
├─ Authentication
│  ├─ JWT token verification
│  ├─ Token expiry check
│  ├─ User ID extraction
│  └─ Signature validation
│
├─ Authorization
│  ├─ Role-based access control
│  ├─ Resource ownership check
│  ├─ Tenant isolation
│  └─ Permission verification
│
├─ Business Logic
│  ├─ Data processing
│  ├─ Database operations
│  ├─ Side effect execution
│  └─ Edge function invocation
│
├─ Row-Level Security
│  ├─ RLS policy evaluation
│  ├─ User ID verification
│  ├─ Tenant ID isolation
│  ├─ Role-based filtering
│  └─ Data masking (if needed)
│
└─ Response Construction
   ├─ Payload serialization
   ├─ Status code setting
   ├─ Header configuration
   └─ Compression

                ↓

RESPONSE HANDLING (Client)
│
├─ Network Response
│  ├─ HTTP status code check
│  ├─ TLS decryption
│  ├─ Decompression (gzip)
│  └─ JSON parsing
│
├─ Error Handling
│  ├─ 4xx client errors (validation)
│  ├─ 5xx server errors (retry)
│  ├─ Network errors (fallback)
│  └─ Timeout handling (exponential backoff)
│
├─ State Update
│  ├─ React state (setState)
│  ├─ LocalStorage persistence
│  ├─ Context propagation
│  └─ Component re-render
│
└─ User Feedback
   ├─ Success messages
   ├─ Error alerts
   ├─ Loading indicators
   └─ UI state changes
```

### 1.2 Input Categories & Methods

```
INPUT CATEGORY                    MECHANISM                    VALIDATION
─────────────────────────────────────────────────────────────────────────────
Text Input (Email, Name)          <input type="text">          Length, format
                                  onChange handler             Regex patterns

Number Input (Amount, Quantity)   <input type="text">          Min/max range
                                  Currency formatting          Decimal places

Password Input                    <input type="password">      Min length
                                  Toggle visibility            Special chars

File Upload                       <input type="file">          File type
                                  Drag & drop                  File size
                                  Change handler               MIME type

Select/Dropdown                   <select> or custom           Predefined options
                                  Button groups                Value whitelist

Radio Buttons                     <input type="radio">         Single selection
                                  Visual feedback              Mutually exclusive

Checkboxes                        <input type="checkbox">      Multiple selection
                                  Consent verification        Boolean value

Date Input                        HTML5 or custom              Range validation
                                  Date picker                  Format standardization

Search Input                      <input type="search">        Debouncing
                                  Real-time filtering          XSS protection
```

---

## 2. USER AUTHENTICATION INPUTS

### 2.1 Sign-Up Form Inputs

**Location**: `src/pages/auth/SignUpPage.tsx`

```
STEP 1: ROLE SELECTION
│
├─ Input: role (borrower, lending_admin, super_admin)
├─ Type: Radio buttons
├─ Validation: Required, predefined options
├─ Default: "borrower"
└─ Effect: Determines subsequent form fields

STEP 2: COMPANY INFORMATION (Lending Admin Only)
│
├─ Company Name
│  ├─ Type: Text input
│  ├─ Validation: Required, max 100 chars
│  ├─ Sanitization: Trim whitespace
│  └─ State: companyName (string)
│
├─ Registration Type
│  ├─ Type: Dropdown (DTI / SEC)
│  ├─ Validation: Required, predefined options
│  └─ State: registrationType (DTI | SEC)
│
├─ Registration Number
│  ├─ Type: Text input
│  ├─ Validation: Required, alphanumeric
│  └─ State: registrationNumber (string)
│
├─ Company Email
│  ├─ Type: Email input
│  ├─ Validation: Required, valid email format
│  ├─ Format: email@domain.com
│  └─ State: companyEmail (string)
│
└─ Company Phone
   ├─ Type: Phone input
   ├─ Validation: Optional, phone format
   ├─ Format: +63 or 09XX XXXX XXX
   └─ State: companyPhone (string)

STEP 3: ACCOUNT INFORMATION
│
├─ First Name
│  ├─ Type: Text input
│  ├─ Validation: Required, 2-50 chars
│  └─ State: firstName (string)
│
├─ Last Name
│  ├─ Type: Text input
│  ├─ Validation: Required, 2-50 chars
│  └─ State: lastName (string)
│
├─ Email
│  ├─ Type: Email input
│  ├─ Validation: Required, valid email
│  ├─ Uniqueness: Checked server-side
│  └─ State: email (string)
│
├─ Password
│  ├─ Type: Password field with visibility toggle
│  ├─ Validation:
│  │  ├─ Min length: 8 characters
│  │  ├─ Must contain uppercase (A-Z)
│  │  ├─ Must contain lowercase (a-z)
│  │  ├─ Must contain number (0-9)
│  │  └─ Must contain special char (!@#$%^&*)
│  ├─ Display: Toggle eye icon
│  └─ State: password (string), showPassword (boolean)
│
├─ Confirm Password
│  ├─ Type: Password field
│  ├─ Validation: Must match password field
│  ├─ Real-time check: On blur or change
│  └─ State: confirmPassword (string)
│
└─ Password Strength Indicator
   ├─ Weak: 1-2 criteria met (red)
   ├─ Fair: 3 criteria met (yellow)
   └─ Strong: 4+ criteria met (green)

STEP 4: CONSENT & AGREEMENT
│
├─ Data Processing Consent
│  ├─ Type: Checkbox
│  ├─ Label: "I consent to data processing for loan evaluation"
│  ├─ Validation: Required (must be checked)
│  └─ State: consentGiven (boolean)
│
├─ Terms & Conditions
│  ├─ Type: Checkbox
│  ├─ Label: "I agree to Terms & Conditions"
│  ├─ Validation: Required
│  └─ Link: External terms document
│
└─ Marketing Communications (Optional)
   ├─ Type: Checkbox
   ├─ Label: "Receive updates and offers"
   └─ State: marketingConsent (boolean)
```

### 2.2 Login Form Inputs

**Location**: `src/pages/auth/LoginPage.tsx`

```
EMAIL INPUT
│
├─ Type: Email field
├─ Validation: Required, valid email format
├─ Placeholder: "your@email.com"
├─ Autocomplete: "email"
├─ State: email (string)
└─ Server Check: Account exists

PASSWORD INPUT
│
├─ Type: Password field with visibility toggle
├─ Validation: Required, non-empty
├─ Placeholder: "••••••••"
├─ Autocomplete: "current-password"
├─ Visibility Toggle:
│  ├─ Icon: Eye / Eye-off
│  ├─ OnClick: Toggle showPassword state
│  └─ Visual Feedback: Field type changes
├─ State: password (string), showPassword (boolean)
└─ Server Check: Credentials match

FORM-LEVEL VALIDATIONS
│
├─ Client-Side
│  ├─ Email format validation
│  ├─ Password required check
│  ├─ Form not submitted twice (loading state)
│  └─ Disable submit if invalid
│
└─ Server-Side (Supabase Auth)
   ├─ Email existence check
   ├─ Password verification (bcrypt compare)
   ├─ Account status check (active, suspended, etc.)
   ├─ 2FA if configured
   └─ Session creation (JWT token)
```

### 2.3 Sign-Up Form Processing

```javascript
async function handleSubmit() {
  // Step 1: Client-side validation
  if (password !== confirmPassword) {
    setError('Passwords do not match');
    return;
  }

  if (!consentGiven) {
    setError('You must consent to data processing to continue');
    return;
  }

  setLoading(true);
  setError(null);

  try {
    // Step 2: Call Supabase auth.signUp()
    const { data: authData, error: signUpError } = await signUp(
      email,
      password
    );

    if (signUpError || !authData.user) {
      throw signUpError || new Error('Sign up failed');
    }

    const userId = authData.user.id;

    // Step 3: Call role-specific RPC function
    if (role === 'lending_admin') {
      const { data: rpcResult, error: rpcError } =
        await supabase.rpc('register_lending_company', {
          p_user_id: userId,
          p_first_name: firstName,
          p_last_name: lastName,
          p_email: email,
          p_company_name: companyName,
          p_registration_type: registrationType,
          p_registration_number: registrationNumber,
          p_company_email: companyEmail,
          p_company_phone: companyPhone || null,
        });

      if (rpcError) throw rpcError;
      if (!rpcResult?.success) {
        throw new Error(rpcResult?.error || 'Failed to register company');
      }
    }

    // Step 4: On success, trigger navigation or subscription flow
    onSuccess();

  } catch (err) {
    setError(
      err instanceof Error ? err.message : 'An error occurred'
    );
  } finally {
    setLoading(false);
  }
}
```

---

## 3. FORM-BASED INPUTS

### 3.1 Loan Application Form

**Location**: `src/components/dashboard/LoanDisbursement.tsx`

```
LOAN AMOUNT
│
├─ Type: Number input (custom with currency format)
├─ Input Mechanism:
│  ├─ User types: "50000"
│  ├─ Display: "P50,000.00"
│  ├─ State stores: 50000 (number)
│  └─ onChange: formatCurrency() applied
│
├─ Validation:
│  ├─ Min: P1,000
│  ├─ Max: P500,000 (configurable per tenant)
│  ├─ Increment: By 100 (step="100")
│  └─ Required: Yes
│
├─ Error States:
│  ├─ NaN: "Please enter a valid number"
│  ├─ Too low: "Minimum loan amount is P1,000"
│  ├─ Too high: "Maximum loan amount is P500,000"
│  └─ Exceeds remaining: "Insufficient credit limit"
│
└─ Real-time Feedback:
   ├─ Remaining credit updated
   ├─ Loan schedule recalculated
   ├─ Monthly payment updated
   └─ Interest computed

LOAN TERM (MONTHS)
│
├─ Type: Select dropdown / Number slider
├─ Options: [3, 6, 12, 24, 36, 48, 60] months
├─ Validation: Required, predefined options
├─ Default: 12 months
├─ Real-time Update:
│  ├─ Monthly payment recalculated
│  ├─ Total interest recomputed
│  ├─ Payment schedule regenerated
│  └─ Interest rate adjusted (if tiered)
│
└─ Display Format:
   ├─ Label: "36 months (3 years)"
   ├─ Visual timeline: Months shown
   └─ Monthly payment: Updated per selection

LOAN PURPOSE
│
├─ Type: Dropdown select
├─ Options:
│  ├─ Business operations
│  ├─ Equipment purchase
│  ├─ Working capital
│  ├─ Expansion
│  ├─ Debt consolidation
│  └─ Other
│
├─ Validation: Required, predefined
├─ Conditional: If "Other", show text field
│  ├─ Max length: 200 characters
│  ├─ Validation: Not empty
│  └─ Placeholder: "Describe your loan purpose"
│
└─ Use Case: Risk assessment factor

COLLATERAL (Optional)
│
├─ Type: Checkbox + amount field
├─ If checked:
│  ├─ Show collateral value input
│  ├─ Type: Currency field
│  ├─ Validation: > 0
│  ├─ Min: P1,000
│  └─ Max: P10,000,000
│
├─ Collateral Type:
│  ├─ Dropdown: Real estate, vehicle, equipment, etc.
│  └─ Description: Text area (optional)
│
└─ Impact:
   ├─ Affects credit score
   ├─ May improve loan terms
   └─ Risk mitigation

SUBMISSION VALIDATION
│
├─ Client-side check:
│  ├─ All required fields filled
│  ├─ Ranges valid
│  ├─ Password/consent provided
│  └─ No pending applications
│
├─ Server-side check:
│  ├─ User has active subscription
│  ├─ Application limit not exceeded (monthly)
│  ├─ User not blacklisted
│  ├─ Required documents uploaded
│  └─ KYC verified
│
└─ Submit Button State:
   ├─ Disabled if validation fails
   ├─ Loading spinner on submit
   ├─ Disabled during submission
   └─ Re-enabled on error
```

### 3.2 Company Profile Form

**Location**: `src/components/dashboard/CompanyProfile.tsx`

```
BASIC INFORMATION SECTION
│
├─ Company Name
│  ├─ Type: Text input
│  ├─ Validation: Max 100 chars, required
│  ├─ Read-only: After first submission (immutable)
│  └─ State: companyName (string)
│
├─ Registration Type
│  ├─ Type: Dropdown (DTI / SEC)
│  ├─ Validation: Required
│  ├─ Read-only: After registration
│  └─ State: registrationType (DTI | SEC)
│
├─ Registration Number
│  ├─ Type: Text input
│  ├─ Validation: Alphanumeric, required
│  ├─ Format: Standardized (DTI or SEC format)
│  ├─ Uniqueness: Checked server-side
│  └─ State: registrationNumber (string)
│
└─ Business Type
   ├─ Type: Dropdown / Multiselect
   ├─ Options: [Retail, Services, Manufacturing, Technology, etc.]
   ├─ Validation: At least 1 selected
   └─ State: businessTypes (array<string>)

CONTACT INFORMATION SECTION
│
├─ Email
│  ├─ Type: Email input
│  ├─ Validation: Valid email, unique
│  ├─ Verification: Email confirmation sent
│  └─ State: email (string)
│
├─ Phone Number
│  ├─ Type: Tel input with country code selector
│  ├─ Format: +63 9XX XXXX XXX
│  ├─ Validation: Valid phone, SMS verification optional
│  └─ State: phone (string)
│
├─ Fax (Optional)
│  ├─ Type: Tel input
│  ├─ Validation: Valid format if provided
│  └─ State: fax (string | null)
│
└─ Website (Optional)
   ├─ Type: URL input
   ├─ Validation: Valid URL format
   ├─ Format: https://example.com
   └─ State: website (string | null)

ADDRESS SECTION
│
├─ Street Address
│  ├─ Type: Text input
│  ├─ Validation: Required, max 100 chars
│  └─ State: streetAddress (string)
│
├─ City / Municipality
│  ├─ Type: Searchable dropdown
│  ├─ Options: Philippine cities
│  ├─ Validation: Required
│  └─ State: city (string)
│
├─ Province
│  ├─ Type: Dropdown
│  ├─ Options: Philippine provinces
│  ├─ Cascading: Filters cities
│  └─ State: province (string)
│
├─ Postal Code
│  ├─ Type: Text input
│  ├─ Validation: 4 digits, valid for city
│  └─ State: postalCode (string)
│
└─ Country
   ├─ Type: Read-only field (default: Philippines)
   └─ State: country (string)

FINANCIAL INFORMATION SECTION
│
├─ Monthly Revenue
│  ├─ Type: Currency input
│  ├─ Validation: > 0, max reasonable amount
│  ├─ Format: Peso with decimals
│  └─ State: monthlyRevenue (number)
│
├─ Annual Revenue
│  ├─ Type: Currency input (computed or input)
│  ├─ Validation: Reasonable multiple of monthly
│  └─ State: annualRevenue (number)
│
├─ Number of Employees
│  ├─ Type: Number select
│  ├─ Validation: > 0, <= 10000
│  └─ State: employeeCount (number)
│
└─ Years in Business
   ├─ Type: Number select (1-50+ years)
   ├─ Validation: >= 0
   └─ State: yearsInBusiness (number)

DOCUMENT UPLOAD SECTION
│
├─ Business License
│  ├─ Type: File upload
│  ├─ Formats: PDF, PNG, JPEG
│  ├─ Max size: 10 MB
│  ├─ Required: Yes
│  └─ Handler: onUpload('business_license', file)
│
├─ Tax Identification Number (TIN) Document
│  ├─ Type: File upload
│  ├─ Formats: PDF, PNG, JPEG
│  ├─ Max size: 10 MB
│  ├─ Required: Yes
│  └─ Handler: onUpload('tin_document', file)
│
└─ Financial Statements
   ├─ Type: File upload
   ├─ Formats: PDF
   ├─ Max size: 50 MB
   ├─ Required: Yes
   └─ Handler: onUpload('financial_statements', file)

FORM ACTIONS
│
├─ Save Button
│  ├─ Action: POST/PUT to API
│  ├─ Validation: All required fields filled
│  ├─ Disabled: If unchanged or invalid
│  ├─ Loading: Show spinner
│  └─ Success: Show toast notification
│
├─ Cancel Button
│  ├─ Action: Reset form to initial state
│  ├─ Confirm: If changes unsaved
│  └─ Behavior: Re-fetch from server
│
└─ Edit Button
   ├─ Toggle form from read-only to editable
   └─ Some fields immutable (company name, registration)
```

---

## 4. FILE UPLOAD MECHANISMS

### 4.1 File Upload Component

**Location**: `src/components/dashboard/FileUpload.tsx`

```
ACCEPTED FILE TYPES
│
├─ Images: PNG, JPEG, JPG
├─ Documents: PDF
├─ MIME types validated:
│  ├─ image/png
│  ├─ image/jpeg
│  ├─ image/jpg
│  └─ application/pdf
│
└─ Validation:
   ├─ Client-side: MIME type check
   ├─ Server-side: File extension + content check
   └─ CRITICAL: Never trust client MIME type

FILE SIZE LIMITS
│
├─ Default: 10 MB per file
├─ Maximum: 50 MB (for financial statements)
├─ Minimum: 1 KB (to ensure valid file)
│
└─ Validation:
   ├─ bytes > maxSizeMB * 1024 * 1024 → error
   └─ Error message: "File size exceeds 10MB limit"

UPLOAD MECHANISMS
│
├─ 1. CLICK TO UPLOAD
│  ├─ Hidden file input: <input type="file" hidden>
│  ├─ Trigger: inputRef.current?.click()
│  ├─ Handler: onChange event
│  ├─ Behavior: File dialog opens
│  └─ Multiple: One file at a time
│
├─ 2. DRAG & DROP
│  ├─ Event: onDragEnter, onDragOver, onDrop
│  ├─ preventDefault() on drag events
│  ├─ Visual feedback: Border highlight
│  ├─ dragActive state: Blue highlight
│  └─ Drop handler: e.dataTransfer.files[0]
│
├─ 3. PASTE FROM CLIPBOARD
│  ├─ Event: onPaste (if implemented)
│  ├─ Access: event.clipboardData.files
│  └─ Behavior: Same as click/drag
│
└─ 4. FILE INPUT DIALOG
   ├─ Standard browser file picker
   ├─ Filter: accept=".pdf,.jpg,.jpeg,.png"
   ├─ Multiple: false (single file)
   └─ Handler: onChange event

UPLOAD FLOW
│
├─ Step 1: User initiates upload
│  ├─ Method: Click, drag, or paste
│  ├─ UI: Highlight area, show cursor
│  └─ State: dragActive = true (visual)
│
├─ Step 2: File validation
│  ├─ Type check: MIME type in ACCEPTED_TYPES
│  ├─ Size check: file.size <= maxSizeMB * 1024 * 1024
│  ├─ If invalid:
│  │  ├─ Set error message
│  │  ├─ Clear preview
│  │  ├─ Display error UI
│  │  └─ Return early (no upload)
│  │
│  └─ If valid: Continue to step 3
│
├─ Step 3: Generate preview (if image)
│  ├─ Use FileReader API
│  ├─ reader.readAsDataURL(file)
│  ├─ On load: setPreview(dataURL)
│  ├─ Preview display:
│  │  ├─ <img src={preview} style={{...}} />
│  │  ├─ Width: 16x16 or 64x64 px
│  │  ├─ Border radius: rounded
│  │  └─ Aspect ratio: object-cover
│  │
│  └─ For non-images: Show file icon
│
├─ Step 4: Display file in UI
│  ├─ File name: existingFile.file.name
│  ├─ File size: formatFileSize(bytes)
│  ├─ File type: Determine from MIME
│  ├─ Checkmark: Indicate success
│  ├─ "Replace file" button: For updates
│  └─ Remove (X) button: Clear file
│
├─ Step 5: Call parent handler
│  ├─ Function: onUpload(type, file)
│  ├─ Type: Document type (e.g., "valid_id")
│  ├─ File: File object
│  │  ├─ file.name
│  │  ├─ file.size
│  │  ├─ file.type
│  │  └─ file.lastModified
│  │
│  ├─ Parent responsibility: Upload to storage
│  └─ Return: No immediate server call
│
└─ Step 6: Server-side upload
   ├─ Parent component handles:
   │  ├─ Create Supabase storage client
   │  ├─ Generate unique path: UUID + filename
   │  ├─ Upload file: supabase.storage.upload(path, file)
   │  ├─ On error: Retry with exponential backoff
   │  ├─ On success: Store path in database
   │  └─ Generate signed URL: Valid for 24 hours
   │
   └─ Database update:
      ├─ INSERT document record
      ├─ Store file_path
      ├─ Store file_size
      ├─ Store file_type
      ├─ Set uploaded_by = user_id
      └─ Set uploaded_at = NOW()

FILE PREVIEW COMPONENT
│
├─ Existing File Display:
│  ├─ Show file icon (PDF / image)
│  ├─ File name (truncated if long)
│  ├─ File size (formatted: KB, MB)
│  ├─ Green checkmark (verification status)
│  ├─ Preview thumbnail (if image)
│  └─ Remove button (X icon)
│
├─ Upload Zone (No File):
│  ├─ Dashed border
│  ├─ Upload icon
│  ├─ "Drag & drop or click to upload"
│  ├─ Supported formats list
│  ├─ Max file size notice
│  └─ Cursor: pointer on hover
│
├─ Interactive States:
│  ├─ Default: Gray border, gray icon
│  ├─ Hover: Blue border, blue icon
│  ├─ Drag active: Blue background, blue border
│  ├─ Error: Red border, red icon, error text
│  ├─ Loading: Spinner, disabled
│  └─ Success: Green checkmark, file displayed
│
└─ Error Display:
   ├─ Red banner below upload area
   ├─ Alert triangle icon
   ├─ Error message: "Invalid file type"
   ├─ Suggestion: "Only PNG, JPEG, and PDF..."
   └─ Auto-clear: On new file selection

FILE REMOVAL
│
├─ Remove Handler:
│  ├─ Function: removeFile()
│  ├─ Action: Clear preview state
│  ├─ Action: Clear error state
│  ├─ Call: onUpload(type, null) → parent removes
│  └─ Note: Does NOT delete from server
│
├─ Database Cleanup:
│  ├─ Parent component (BorrowerManagement, etc.)
│  ├─ On file remove: DELETE from documents
│  ├─ Or: Mark as deleted (soft delete)
│  ├─ Storage: Delete file from S3 bucket
│  └─ Audit: Log removal action
│
└─ Replace File:
   ├─ Button: "Replace file"
   ├─ Behavior: Open file picker again
   ├─ Old file: Cleared from preview
   ├─ New file: Validated and previewed
   └─ Save: Parent handles update
```

### 4.2 Document Upload Validation

```typescript
// Validation logic from FileUpload component

interface FileUploadProps {
  label: string;
  description: string;
  type: string; // 'valid_id', 'tin_document', 'business_license', etc.
  files: { type: string; file: File }[];
  onUpload: (type: string, file: File) => void;
  maxSizeMB?: number; // Default: 10
  accept?: string; // ".pdf,.jpg,.jpeg,.png"
}

const ACCEPTED_TYPES = {
  'image/png': true,
  'image/jpeg': true,
  'image/jpg': true,
  'application/pdf': true,
};

const validateFile = useCallback((file: File): string | null => {
  // Check file type
  if (!ACCEPTED_TYPES[file.type as keyof typeof ACCEPTED_TYPES]) {
    return 'Invalid file type. Only PNG, JPEG, and PDF files are accepted.';
  }

  // Check file size
  if (file.size > maxSizeMB * 1024 * 1024) {
    return `File size exceeds ${maxSizeMB}MB limit.`;
  }

  return null; // Valid file
}, [maxSizeMB]);

const handleFile = useCallback((file: File) => {
  setError(null);

  const validationError = validateFile(file);
  if (validationError) {
    setError(validationError);
    return;
  }

  // If image, generate preview
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  } else {
    setPreview(null);
  }

  // Call parent handler
  onUpload(type, file);
}, [type, onUpload, validateFile]);
```

---

## 5. PAYMENT INPUT HANDLING

### 5.1 Payment Form Inputs

**Location**: `src/components/payment/PaymentForm.tsx`

```
AMOUNT INPUT
│
├─ Type: Custom currency input
├─ Display Format: "P" prefix + formatted number
├─ Input Format: Numeric only (decimal allowed)
│
├─ Real-time Processing:
│  ├─ User types: "50000"
│  ├─ Handler: handleAmountChange()
│  ├─ Process:
│  │  ├─ Remove non-numeric: replace(/[^0-9.]/g, '')
│  │  ├─ Split by decimal: split('.')
│  │  ├─ Validate parts: max 2 decimal parts
│  │  ├─ Validate decimals: max 2 places
│  │  ├─ Parse to number: parseFloat()
│  │  └─ Update state: setAmount(parsed)
│  │
│  └─ Validation (if allowCustomAmount):
│     ├─ NaN check: parseFloat() returns NaN
│     ├─ Minimum: P100.00
│     ├─ Maximum: P100,000.00
│     ├─ Decimal places: Max 2
│     ├─ On error: setValidationError()
│     └─ Button disabled: If error set
│
├─ Validation Functions (src/utils/validation.ts):
│  ├─ validateAmount(amount: number):
│  │  ├─ Check NaN: "Please enter a valid number"
│  │  ├─ Check <= 0: "Amount must be greater than zero"
│  │  ├─ Check < 100: "Minimum payment amount is ₱100.00"
│  │  ├─ Check > 100000: "Maximum payment amount is ₱100,000.00"
│  │  ├─ Check decimals: "Amount can only have up to 2 decimal places"
│  │  └─ Return: { isValid: true/false, error?: string }
│  │
│  └─ formatCurrency(value: string) → string:
│     ├─ Remove non-numeric: /[^0-9.]/g
│     ├─ Split by decimal
│     ├─ Validate max 2 parts
│     ├─ Limit decimals to 2 places
│     └─ Return: Cleaned numeric string
│
└─ Display Format:
   ├─ Input: P<amount>
   ├─ Button: "Pay P50,000.00"
   ├─ Confirmation: "You are about to pay P50,000.00..."
   └─ Uses: toLocaleString('en-PH', { minimumFractionDigits: 2 })

PAYMENT METHOD SELECTION
│
├─ Type: Button group (radio-like)
├─ Default: "card"
├─ Options: 5 payment methods
│  ├─ Card (Visa, Mastercard, JCB)
│  │  ├─ Icon: CreditCard
│  │  ├─ Label: "Card"
│  │  └─ Description: "Visa, Mastercard"
│  │
│  ├─ GCash (Mobile wallet)
│  │  ├─ Icon: Smartphone
│  │  ├─ Label: "GCash"
│  │  └─ Description: "Digital wallet"
│  │
│  ├─ GrabPay (E-wallet)
│  │  ├─ Icon: Smartphone
│  │  ├─ Label: "GrabPay"
│  │  └─ Description: "Digital wallet"
│  │
│  ├─ PayMaya (Digital payment)
│  │  ├─ Icon: Smartphone
│  │  ├─ Label: "PayMaya"
│  │  └─ Description: "Digital payment"
│  │
│  └─ QR Philippines (QR code)
│     ├─ Icon: QrCode
│     ├─ Label: "QR Ph"
│     └─ Description: "Scan to pay"
│
├─ Selection Behavior:
│  ├─ onClick: setSelectedMethod(type)
│  ├─ Visual feedback:
│  │  ├─ Selected: Blue border, blue background
│  │  ├─ Unselected: Gray border, white background
│  │  └─ Hover: Border highlight
│  │
│  └─ Disabled: If loading (during payment)
│
├─ Note to User:
│  ├─ Text: "You will choose your final payment method on the secure PayMongo checkout page."
│  ├─ Purpose: Inform that selection is tentative
│  ├─ Implication: Different method can be chosen on PayMongo
│  └─ Display: Small gray text below options
│
└─ State: selectedMethod (string) = 'card' (default)
```

### 5.2 Payment Form Flow

```
USER INITIATES PAYMENT
│
├─ Step 1: Form Display
│  ├─ Amount display: P{amount} or input field
│  ├─ Description: Plan name (e.g., "Premium Plan - Monthly")
│  ├─ Payment methods: 5 options
│  ├─ Submit button: "Pay P{amount}"
│  └─ Security note: Lock icon + HTTPS reassurance
│
├─ Step 2: User clicks "Pay" button
│  ├─ Handler: initiatePayment()
│  ├─ Validation: validateAmount(amount)
│  │  ├─ If error: setValidationError() → show error
│  │  └─ If valid: Continue
│  │
│  ├─ Modal popup: Confirmation
│  │  ├─ Title: "Confirm Payment"
│  │  ├─ Message: "You are about to pay P{amount} for {description}..."
│  │  ├─ Buttons: "Yes, Proceed to Payment" | "Cancel"
│  │  └─ Type: warning (orange/yellow styling)
│  │
│  └─ User chooses:
│     ├─ Cancel: Close modal, stay on form
│     └─ Proceed: handlePayment()
│
├─ Step 3: Payment handler execution
│  ├─ setLoading(true)
│  ├─ setError('') → clear previous errors
│  │
│  ├─ Try block:
│  │  ├─ Call: createCheckoutSession(payload)
│  │  │  ├─ amount: pesosTocentavos(amount) → convert PHP to centavos
│  │  │  ├─ description: {plan name}
│  │  │  ├─ planId: Subscription plan ID
│  │  │  └─ tenantId: Current user's tenant
│  │  │
│  │  ├─ Response check: if response.checkoutUrl
│  │  │  ├─ YES: window.location.href = checkoutUrl
│  │  │  │        → Redirect to PayMongo checkout
│  │  │  │
│  │  │  └─ NO: setError('Could not redirect...')
│  │  │
│  │  └─ Catch errors:
│  │     ├─ If error.message.includes('not authenticated')
│  │     │  └─ userFriendlyError = "Your session has expired..."
│  │     │
│  │     ├─ If error.message.includes('network')
│  │     │  └─ userFriendlyError = "Network error..."
│  │     │
│  │     ├─ setError(userFriendlyError)
│  │     ├─ onError?.(userFriendlyError) → callback to parent
│  │     └─ Display error UI
│  │
│  └─ Finally:
│     ├─ setLoading(false)
│     └─ setShowConfirmation(false)
│
└─ Step 4: PayMongo checkout flow
   ├─ User redirected to PayMongo
   ├─ User selects actual payment method
   ├─ User completes payment
   ├─ PayMongo sends webhook to our Edge Function
   ├─ Database updated with payment status
   └─ User redirected back to app (optional)
```

### 5.3 Currency Handling Utilities

```typescript
// src/utils/validation.ts

export const formatCurrency = (value: string): string => {
  // Remove non-numeric characters except decimal point
  const numericValue = value.replace(/[^0-9.]/g, '');

  const parts = numericValue.split('.');

  // Only allow one decimal point
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  // Limit decimal places to 2
  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].substring(0, 2);
  }

  return numericValue;
};

export const parseAmount = (value: string): number => {
  // Clean and parse to number
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const validateAmount = (amount: number): ValidationResult => {
  if (isNaN(amount)) {
    return { isValid: false, error: 'Please enter a valid number' };
  }

  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than zero' };
  }

  if (amount < 100) {
    return { isValid: false, error: 'Minimum payment amount is ₱100.00' };
  }

  if (amount > 100000) {
    return {
      isValid: false,
      error: 'Maximum payment amount is ₱100,000.00. For larger amounts, please contact support.'
    };
  }

  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'Amount can only have up to 2 decimal places'
    };
  }

  return { isValid: true };
};

// src/services/paymongoService.ts

export const pesosTocentavos = (pesos: number): number => {
  return Math.round(pesos * 100); // 50.99 → 5099
};

export const centavostoPesos = (centavos: number): number => {
  return centavos / 100; // 5099 → 50.99
};
```

---

## 6. DATA VALIDATION & ERROR HANDLING

### 6.1 Client-Side Validation Strategy

```
VALIDATION LAYERS (Progressive Enhancement)
│
├─ LAYER 1: HTML5 Built-in
│  ├─ <input type="email"> → Email format
│  ├─ <input type="password"> → Hidden text
│  ├─ <input type="tel"> → Phone hint
│  ├─ <input type="number"> → Numeric only
│  ├─ <input required> → Browser validation
│  └─ <input pattern="..."> → Regex validation
│
├─ LAYER 2: React Event Handlers
│  ├─ onChange: Real-time input validation
│  ├─ onBlur: Field validation when leaving
│  ├─ onFocus: Clear previous errors
│  └─ onSubmit: Final form validation
│
├─ LAYER 3: Custom Validation Functions
│  ├─ validateAmount(amount) → Check range
│  ├─ validateEmail(email) → Regex + format
│  ├─ validatePassword(pwd) → Strength rules
│  ├─ validateDescription(desc) → Length check
│  ├─ validateFile(file) → Type + size
│  └─ Custom: Business logic validation
│
└─ LAYER 4: API Request Validation
   ├─ Before sending:
   │  ├─ Serialize JSON
   │  ├─ Validate schema
   │  ├─ Check all required fields
   │  └─ Final sanity checks
   │
   └─ Response check:
      ├─ HTTP status code
      ├─ Error field in response
      └─ Data integrity

VALIDATION ERROR TYPES
│
├─ INPUT ERRORS
│  ├─ Missing required field
│  ├─ Invalid format (email, phone)
│  ├─ Value out of range (min/max)
│  ├─ Text length violated
│  ├─ Special characters not allowed
│  └─ Custom business rule failed
│
├─ FILE ERRORS
│  ├─ Invalid file type
│  ├─ File size too large
│  ├─ File cannot be read
│  ├─ Corrupted file
│  └─ Insufficient storage
│
├─ AUTHENTICATION ERRORS
│  ├─ Email already exists
│  ├─ Passwords don't match
│  ├─ Session expired
│  ├─ Invalid credentials
│  └─ Account suspended
│
├─ NETWORK ERRORS
│  ├─ No internet connection
│  ├─ Server timeout
│  ├─ Server error (5xx)
│  ├─ CORS error
│  └─ Malformed response
│
└─ BUSINESS LOGIC ERRORS
   ├─ Insufficient credit limit
   ├─ Application already submitted
   ├─ Subscription expired
   ├─ Daily limit exceeded
   └─ Business rule violation

ERROR DISPLAY PATTERNS
│
├─ INLINE FIELD ERRORS
│  ├─ Location: Below input field
│  ├─ Icon: AlertTriangle or AlertCircle
│  ├─ Color: Red (#dc2626 or similar)
│  ├─ Message: Clear, actionable
│  ├─ Example: "Minimum payment amount is ₱100.00"
│  └─ Auto-clear: On new input or blur
│
├─ FORM-LEVEL ERRORS
│  ├─ Location: Top of form
│  ├─ Style: Red banner / alert box
│  ├─ Message: General error or first field error
│  ├─ Example: "Passwords do not match"
│  └─ Dismiss: User action or timeout
│
├─ INPUT FIELD STYLING
│  ├─ Default: Gray border, light background
│  ├─ Focus: Blue border, subtle highlight
│  ├─ Error: Red border, light red background
│  ├─ Disabled: Gray background, reduced opacity
│  ├─ Success: Green border, light green background
│  └─ Loading: Gray border, disabled cursor
│
├─ MODAL ERRORS
│  ├─ Location: Modal dialog center
│  ├─ Icon: AlertCircle (red)
│  ├─ Buttons: "Okay" (dismiss), "Retry"
│  ├─ Message: Large, prominent
│  └─ Usage: Critical errors only
│
└─ TOAST / SNACKBAR ERRORS
   ├─ Location: Bottom-right corner
   ├─ Icon: X (close) or checkmark
   ├─ Auto-dismiss: 5 seconds
   ├─ Message: Short, concise
   ├─ Duration: 3-5 seconds
   └─ Usage: Non-blocking errors
```

### 6.2 Password Validation

```typescript
const validatePassword = (password: string): {
  strength: 'weak' | 'fair' | 'strong';
  errors: string[];
  score: number;
} => {
  const errors: string[] = [];
  const checks = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecial: /[!@#$%^&*]/.test(password),
  };

  if (!checks.minLength) {
    errors.push('At least 8 characters');
  }
  if (!checks.hasUppercase) {
    errors.push('At least one uppercase letter (A-Z)');
  }
  if (!checks.hasLowercase) {
    errors.push('At least one lowercase letter (a-z)');
  }
  if (!checks.hasNumber) {
    errors.push('At least one number (0-9)');
  }
  if (!checks.hasSpecial) {
    errors.push('At least one special character (!@#$%^&*)');
  }

  const score = Object.values(checks).filter(Boolean).length;
  const strength = score <= 2 ? 'weak' : score === 3 ? 'fair' : 'strong';

  return { strength, errors, score };
};
```

---

## 7. REAL-TIME INPUT PROCESSING

### 7.1 Real-time Validation Features

```
SEARCH / FILTER INPUT
│
├─ User types: Character by character
├─ Event: onChange handler
├─ Processing:
│  ├─ Debounce: 300-500ms delay
│  ├─ Trim whitespace
│  ├─ Convert to lowercase (case-insensitive)
│  ├─ Send to database: SELECT * WHERE name ILIKE '%query%'
│  ├─ Results: Auto-complete suggestions
│  └─ Limit: Show top 10 results
│
├─ Debouncing Implementation:
│  ├─ useCallback + useEffect + cleanup
│  ├─ OR: Custom debounce hook
│  ├─ Purpose: Reduce API calls (e.g., 1 call vs 50)
│  └─ Example: Search for company name
│
└─ XSS Prevention:
   ├─ Sanitize query input
   ├─ Use parameterized queries
   ├─ React auto-escapes JSX
   └─ No eval() or dangerouslySetInnerHTML

CURRENCY INPUT FORMATTING
│
├─ User types: "50000.99"
├─ Real-time:
│  ├─ Display: "P 50,000.99" (with comma)
│  ├─ Internal: 50000.99 (number)
│  ├─ Input box: "50000.99" (without formatting)
│  └─ Button label: "Pay P 50,000.99" (with formatting)
│
├─ Locale-specific formatting:
│  ├─ toLocaleString('en-PH', {
│  │    minimumFractionDigits: 2,
│  │    maximumFractionDigits: 2,
│  │    currency: 'PHP'
│  │  })
│  └─ Output: "₱50,000.99" or "50,000.99 PHP"
│
└─ Real-time validation:
   ├─ On each keystroke: validate range
   ├─ Show error if: < 100 or > 100,000
   ├─ Clear error on valid input
   └─ Disable submit button if error

MULTISELECT / CHECKBOX GROUP
│
├─ User clicks: Checkbox
├─ Event: onChange handler
├─ State update:
│  ├─ If checked: Add to array
│  ├─ If unchecked: Remove from array
│  └─ Example: const [selected, setSelected] = useState([])
│
├─ Real-time validation:
│  ├─ Minimum selection: At least 1
│  ├─ Maximum selection: Up to 5
│  ├─ Dependent: If A selected, B required
│  └─ Show count: "3 selected"
│
└─ UI Feedback:
   ├─ Checked: Blue checkmark, highlight
   ├─ Indeterminate: Gray checkmark (some selected)
   └─ Disabled: Gray, cannot click

AMOUNT CALCULATION
│
├─ Loan amount: P50,000
├─ Term: 12 months
├─ Interest rate: 12% p.a.
├─ On change to ANY field:
│  ├─ Calculate: Monthly interest
│  ├─ Calculate: Total interest
│  ├─ Calculate: Monthly payment
│  ├─ Calculate: Total payable
│  ├─ Update UI: In real-time
│  └─ Display: Amortization schedule
│
├─ Formula:
│  ├─ Monthly rate: (annual rate / 100) / 12
│  ├─ Payment: P × [r(1+r)^n] / [(1+r)^n - 1]
│  │  Where: P = principal, r = rate, n = periods
│  └─ Total interest: (Monthly payment × n) - P
│
└─ Formatting:
   ├─ Display: Peso sign + comma + 2 decimals
   ├─ Example: "P12,345.67"
   └─ Input: Numeric only (no formatting)
```

### 7.2 Real-time UI Updates

```javascript
// Example: Real-time loan calculation

const handleLoanAmountChange = (e) => {
  const amount = parseFloat(e.target.value) || 0;
  setLoanAmount(amount);

  // Recalculate all dependent values
  calculatePaymentSchedule(amount, term, interestRate);
  updateMonthlyPayment();
  updateTotalInterest();
  updateAmortizationTable();
};

const calculatePaymentSchedule = (principal, term, rate) => {
  const monthlyRate = (rate / 100) / 12;
  const numerator = monthlyRate * Math.pow(1 + monthlyRate, term);
  const denominator = Math.pow(1 + monthlyRate, term) - 1;
  const monthlyPayment = principal * (numerator / denominator);

  setMonthlyPayment(monthlyPayment);

  // Generate table
  let balance = principal;
  const schedule = [];

  for (let i = 1; i <= term; i++) {
    const interest = balance * monthlyRate;
    const principal_payment = monthlyPayment - interest;
    balance -= principal_payment;

    schedule.push({
      month: i,
      payment: monthlyPayment,
      principal: principal_payment,
      interest: interest,
      balance: Math.max(0, balance) // Avoid negative due to rounding
    });
  }

  setAmortizationSchedule(schedule);
};
```

---

## 8. ACCESSIBILITY & UX

### 8.1 Accessibility Features

```
KEYBOARD NAVIGATION
│
├─ Tab order: Logical flow (left-to-right, top-to-bottom)
├─ Skip links: Jump to main content
├─ Escape key: Close modals, clear searches
├─ Enter key: Submit forms
├─ Arrow keys: Navigate dropdowns, select lists
│
├─ Focus Management:
│  ├─ Focus visible: Blue outline (2px)
│  ├─ Focus trap: Modal keeps focus inside
│  ├─ Focus restoration: Return focus on close
│  └─ Focus styling: No outline removed
│
└─ ARIA Attributes:
   ├─ aria-label: For icon-only buttons
   ├─ aria-required: For required fields
   ├─ aria-invalid: For error states
   ├─ aria-describedby: Link errors to fields
   ├─ aria-hidden: Hide decorative icons
   ├─ role="alert": For error messages
   └─ role="status": For live region updates

SCREEN READER SUPPORT
│
├─ Form Labels:
│  ├─ <label htmlFor="email">Email</label>
│  ├─ <input id="email" />
│  └─ Association: Essential for SR users
│
├─ Error Messages:
│  ├─ aria-describedby="error-email"
│  ├─ <span id="error-email">Invalid email format</span>
│  ├─ SR reads: "Email field invalid email format"
│  └─ Role: "alert" to announce immediately
│
├─ Form Field Help Text:
│  ├─ aria-describedby="help-password"
│  ├─ <small id="help-password">Min 8 chars...</small>
│  └─ SR reads: "Password field Min 8 chars..."
│
└─ Success Messages:
   ├─ Role: "status"
   ├─ aria-live: "polite" (wait for pause)
   ├─ Content: "Account created successfully"
   └─ SR announces after form submission

INPUT LABELING
│
├─ Form Fields:
│  ├─ REQUIRED: Explicit label + asterisk
│  ├─ OPTIONAL: Label + "(optional)"
│  ├─ Label position: Above input (mobile) or beside (desktop)
│  ├─ Label styling: Bold, dark gray (WCAG AA contrast)
│  └─ Font size: 14-16px (readable)
│
├─ Placeholder Text:
│  ├─ NEVER rely on alone (accessibility issue)
│  ├─ USE: As additional hint only
│  ├─ Example: placeholder="john@example.com"
│  ├─ Appearance: Light gray, low contrast
│  └─ Visibility: Hidden on browser fill
│
├─ Error Messages:
│  ├─ Color: Red (#dc2626 or similar)
│  ├─ Icon: Alongside text (not color-only)
│  ├─ Location: Directly below/near field
│  ├─ Font size: Same as label (14-16px)
│  ├─ Font weight: Regular or bold
│  └─ Contrast: WCAG AAA (7:1 minimum)
│
└─ Helper Text:
   ├─ Color: Gray (#666 or #777)
   ├─ Font size: Smaller than label (12-14px)
   ├─ Examples: "Min 8 characters", "Optional"
   ├─ Location: Below label or field
   └─ Visibility: Always visible (not hover-only)

COLOR CONTRAST REQUIREMENTS
│
├─ WCAG AA Standard (minimum):
│  ├─ Normal text: 4.5:1 ratio
│  ├─ Large text (18+ pt): 3:1 ratio
│  └─ Graphics/UI: 3:1 ratio
│
├─ WCAG AAA Standard (enhanced):
│  ├─ Normal text: 7:1 ratio
│  ├─ Large text: 4.5:1 ratio
│  └─ Graphics/UI: 3:1 ratio
│
├─ Common HiramEase Combinations:
│  ├─ Label (dark gray #333) on white: 12.6:1 ✓ (AAA)
│  ├─ Error (red #dc2626) on white: 6.2:1 ✓ (AAA)
│  ├─ Helper (gray #666) on white: 7.1:1 ✓ (AAA)
│  ├─ Button text (white) on blue: 8.3:1 ✓ (AAA)
│  └─ Placeholder (gray #999) on white: 3.2:1 (AA only)
│
└─ Testing:
   ├─ Tool: WebAIM Contrast Checker
   ├─ Tool: WAVE browser extension
   ├─ Testing: All input states (focus, error, disabled)
   └─ Requirement: Color-blind friendly (no red/green only)
```

### 8.2 Mobile Input UX

```
TOUCH-FRIENDLY SIZING
│
├─ Button size: 44×44 px minimum (accessibility standard)
├─ Input field height: 40-48 px (easy to tap)
├─ Tap target padding: 8-16 px between elements
├─ Font size: 16 px minimum (prevents zoom on iOS)
│
└─ Mobile-Specific Inputs:
   ├─ type="email" → Shows email keyboard (@ symbol)
   ├─ type="tel" → Shows numeric keypad
   ├─ type="number" → Shows numeric keypad
   ├─ type="date" → Shows native date picker
   ├─ type="search" → Shows search keyboard (X clear button)
   └─ inputMode="numeric" → Alternative to type=number

VIRTUAL KEYBOARD HANDLING
│
├─ Input focus:
│  ├─ Keyboard appears automatically (iOS/Android)
│  ├─ Scroll input into view
│  ├─ Padding bottom: Add space below (avoid hiding)
│  └─ Focus: Restore focus on navigation
│
├─ Keyboard types:
│  ├─ Email: inputMode="email"
│  ├─ Phone: inputMode="tel"
│  ├─ Search: inputMode="search"
│  ├─ Decimal: inputMode="decimal"
│  ├─ Numeric: inputMode="numeric"
│  └─ Default: Virtual keyboard with all keys
│
└─ Keyboard dismissal:
   ├─ Submit button → Dismiss keyboard
   ├─ Escape key → Dismiss keyboard
   ├─ Outside tap → Dismiss keyboard
   └─ Done button → Dismiss keyboard (iOS)

MOBILE FORM OPTIMIZATION
│
├─ Single column layout (not multi-column)
├─ Large touch targets (44×44 px)
├─ Clear input field on error (allow re-entry)
├─ Show validation in real-time (not on submit)
├─ Collapse sections (accordion) for long forms
├─ Progress indicator (step 2 of 5)
├─ Save progress (local storage for draft forms)
└─ Clear visual hierarchy (priority inputs first)
```

---

## 9. SECURITY IN INPUT PROCESSING

### 9.1 Input Sanitization & Prevention

```
XSS (CROSS-SITE SCRIPTING) PREVENTION
│
├─ React Auto-Escaping:
│  ├─ {text} → Automatically escaped
│  ├─ <div>{userInput}</div> → Safe from XSS
│  ├─ Dangerous: dangerouslySetInnerHTML (NEVER use)
│  └─ Dangerous: innerHTML = userInput
│
├─ Input Sanitization:
│  ├─ Strip HTML tags: input.replace(/<[^>]*>/g, '')
│  ├─ Encode special chars: &, <, >, ", '
│  ├─ Whitelist allowed characters
│  ├─ Example: Email field only allows: @.-_alphanumeric
│  └─ Database: Stored as plain text, escaped on retrieval
│
├─ Content Security Policy (CSP):
│  ├─ Header: Content-Security-Policy: ...
│  ├─ Restricts: Script sources, style sources, etc.
│  ├─ Inline scripts: Blocked by default
│  ├─ External scripts: Only from allowed domains
│  └─ Prevents: Injection attacks, inline XSS
│
└─ Output Encoding:
   ├─ Context-aware encoding:
   │  ├─ HTML context: Encode &, <, >, ", '
   │  ├─ URL context: URL encode special chars
   │  ├─ JavaScript context: JSON encode
   │  └─ CSS context: CSS encode
   │
   └─ React: Built-in escaping for attributes and text

SQL INJECTION PREVENTION
│
├─ Parameterized Queries (Used by Supabase):
│  ├─ Example: supabase.from('table').eq('id', userId)
│  ├─ SAFE: Variable is param, not concatenated
│  ├─ Unsafe: "SELECT * FROM table WHERE id = " + userId
│  └─ Never: Build SQL strings manually
│
├─ Input Validation:
│  ├─ Email: Must match email regex
│  ├─ Number: Must be parseFloat() successful
│  ├─ String: Max length enforced
│  ├─ Type check: Ensure expected type
│  └─ Reject: Invalid formats early
│
├─ Row-Level Security (RLS):
│  ├─ Database enforces: Users see only allowed rows
│  ├─ Example: WHERE user_id = auth.uid()
│  ├─ Prevents: Direct database access bypasses
│  ├─ Cannot bypass: Even if you modify SQL
│  └─ Additional layer: Beyond input validation
│
└─ Error Messages:
   ├─ Generic: "Invalid input" (don't reveal DB structure)
   ├─ Never reveal: Table names, column names, schema
   ├─ Never reveal: Query syntax or error details
   └─ Log detailed: Errors for admin debugging (secure logs)

CSRF (CROSS-SITE REQUEST FORGERY) PREVENTION
│
├─ Same-Site Cookies:
│  ├─ SameSite=Strict: Cookie not sent to cross-site
│  ├─ SameSite=Lax: Cookie sent on safe methods (GET)
│  ├─ SameSite=None: Requires Secure flag (HTTPS)
│  └─ Supabase default: Lax or Strict
│
├─ CSRF Token (if not using SameSite):
│  ├─ Generate: Random token per session
│  ├─ Store: In session (backend)
│  ├─ Include: In form <input type="hidden">
│  ├─ Verify: Token on form submission
│  └─ Renew: Token per request or session
│
├─ Request Methods:
│  ├─ GET: Should NOT modify state
│  ├─ POST/PUT/DELETE: Requires CSRF token
│  ├─ Headers: X-CSRF-Token header
│  └─ Validation: Backend verifies token
│
└─ External Forms:
   ├─ Cross-origin: Blocked if SameSite enabled
   ├─ Same-origin form: Uses session cookie
   ├─ Protection: Automatic with SameSite
   └─ No action needed: Framework handles

PASSWORD SECURITY
│
├─ Client-side:
│  ├─ NEVER log passwords
│  ├─ NEVER transmit unnecessarily
│  ├─ Display strength meter
│  ├─ Mask on input (type="password")
│  ├─ Toggle visibility (optional, with privacy warning)
│  └─ No confirmation repeat: Risky UX
│
├─ Server-side (Supabase Auth):
│  ├─ Hashing: bcrypt algorithm
│  ├─ Salt: Random salt per password
│  ├─ Cost: 12 rounds (expensive, anti-brute-force)
│  ├─ Storage: Never in plain text
│  ├─ Comparison: Constant-time (prevent timing attacks)
│  └─ Logging: Password never logged or displayed
│
├─ Password Reset:
│  ├─ Send link: Email with token (short-lived)
│  ├─ Token TTL: 15-30 minutes
│  ├─ One-time use: Token invalidated after use
│  ├─ HTTPS only: Secure link transmission
│  ├─ New password: Same validation rules as signup
│  └─ Notification: Email confirm on reset
│
└─ Password Best Practices:
   ├─ Min 8 characters (industry standard)
   ├─ Uppercase, lowercase, number, special char
   ├─ No dictionary words (optional check)
   ├─ No username/email contained (optional check)
   ├─ No common patterns (1234, qwerty)
   └─ Breach database check (HaveIBeenPwned API)

RATE LIMITING
│
├─ API Endpoints:
│  ├─ Global: 10,000 requests/min per tenant
│  ├─ Per-IP: 100 requests/min
│  ├─ Per-user: 1,000 requests/hour
│  ├─ Per-endpoint: Specific limits (login, signup)
│  └─ Brute-force: 5 failed attempts = 15 min ban
│
├─ Login Attempts:
│  ├─ Max failed attempts: 5
│  ├─ Lockout duration: 15 minutes
│  ├─ Notification: Email on suspicious activity
│  └─ Recovery: Manual unlock or time-based
│
├─ Payment Attempts:
│  ├─ Max per session: 3 attempts
│  ├─ Timeout: 1 hour between attempts
│  ├─ Alert: Notify on repeated failures
│  └─ Block: Suspicious patterns flagged
│
└─ Implementation:
   ├─ Supabase Auth: Built-in limits
   ├─ Edge Functions: Custom limits per endpoint
   ├─ API Gateway: Global rate limiting
   ├─ Backoff: Exponential retry (1s, 2s, 4s, 8s)
   └─ Client: Disable button during cooldown
```

### 9.2 Secure Input Patterns

```typescript
// SECURE: Email validation
const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 100;
};

// SECURE: Parameterized query (using Supabase)
const { data, error } = await supabase
  .from('users')
  .select('id, email')
  .eq('email', userEmail) // Parameter binding
  .maybeSingle();

// UNSAFE: String concatenation (DON'T DO THIS)
// const query = `SELECT * FROM users WHERE email = '${userEmail}'`;

// SECURE: Input sanitization
const sanitizeInput = (input: string): string => {
  return input
    .trim()
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .slice(0, 100); // Length limit
};

// SECURE: Password strength validation
const isStrongPassword = (pwd: string): boolean => {
  return (
    pwd.length >= 8 &&
    /[A-Z]/.test(pwd) && // Has uppercase
    /[a-z]/.test(pwd) && // Has lowercase
    /\d/.test(pwd) && // Has number
    /[!@#$%^&*]/.test(pwd) // Has special char
  );
};

// SECURE: File validation (client-side)
const validateFile = (file: File): string | null => {
  const allowedTypes = ['image/png', 'image/jpeg', 'application/pdf'];

  if (!allowedTypes.includes(file.type)) {
    return 'Invalid file type';
  }

  if (file.size > 10 * 1024 * 1024) { // 10 MB
    return 'File too large';
  }

  return null; // Valid
};

// SECURE: CSRF token in form (example)
// <form method="POST" action="/api/submit">
//   <input type="hidden" name="_csrf" value={csrfToken} />
//   <input type="text" name="username" />
// </form>
```

---

## 10. API INPUT HANDLING

### 10.1 API Request Structure

```
HTTP REQUEST STRUCTURE
│
├─ Method: POST / PUT / GET / DELETE
├─ Endpoint: /rest/v1/{table}
├─ Headers:
│  ├─ Content-Type: application/json
│  ├─ Authorization: Bearer {JWT_TOKEN}
│  └─ X-Client-Info: supabase-js/version
│
└─ Body (JSON):
   └─ Payload data (varies by endpoint)

REQUEST EXAMPLE: Create Loan Application
│
POST /rest/v1/credit_applications
Content-Type: application/json
Authorization: Bearer eyJhbGc...
│
{
  "application_number": "APP-2024-001",
  "borrower_id": "user-uuid-123",
  "loan_amount_php": 50000,
  "term_months": 12,
  "purpose": "business",
  "status": "submitted",
  "monthly_payment": 4441.44,
  "interest_rate": 12,
  "interest_amount": 3097.23,
  "total_amount_payable": 53097.23
}

REQUEST EXAMPLE: Sign Up
│
POST /auth/v1/signup
Content-Type: application/json
│
{
  "email": "user@example.com",
  "password": "SecureP@ss123",
  "data": {
    "first_name": "John",
    "last_name": "Doe",
    "role": "borrower"
  }
}

REQUEST EXAMPLE: File Upload
│
POST /storage/v1/object/documents/{bucket}/file.pdf
Content-Type: application/octet-stream
Authorization: Bearer {JWT_TOKEN}
│
[Binary file data...]
```

### 10.2 API Response Structure

```
SUCCESS RESPONSE (200 OK)
│
{
  "id": "app-uuid-123",
  "application_number": "APP-2024-001",
  "borrower_id": "user-uuid-123",
  "loan_amount_php": 50000,
  "status": "submitted",
  "created_at": "2024-03-20T10:30:00Z",
  "updated_at": "2024-03-20T10:30:00Z"
}

ERROR RESPONSE (400 / 401 / 403 / 500)
│
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Loan amount must be between 1000 and 500000"
  }
}

AUTHENTICATION ERROR (401 Unauthorized)
│
{
  "error": {
    "code": "INVALID_JWT",
    "message": "JWT expired or invalid"
  }
}

AUTHORIZATION ERROR (403 Forbidden)
│
{
  "error": {
    "code": "ACCESS_DENIED",
    "message": "You do not have permission to access this resource"
  }
}

SERVER ERROR (500 Internal Server Error)
│
{
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred",
    "requestId": "req-123-abc"
  }
}
```

### 10.3 Client-Side Request Handling

```typescript
// Making a secure API request

async function submitLoanApplication(data: LoanApplicationData) {
  try {
    // Step 1: Validate data client-side
    const validation = validateLoanData(data);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    // Step 2: Get auth token
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    // Step 3: Make request with Supabase client
    const { data: response, error } = await supabase
      .from('credit_applications')
      .insert([{
        borrower_id: session.user.id,
        loan_amount_php: data.amount,
        term_months: data.term,
        purpose: data.purpose,
        status: 'submitted'
      }])
      .select();

    if (error) {
      throw error;
    }

    return response[0]; // Return created record

  } catch (err) {
    // Step 4: Handle errors
    if (err instanceof Error) {
      console.error('Request failed:', err.message);

      // User-friendly error
      if (err.message.includes('not authenticated')) {
        throw new Error('Your session has expired. Please log in again.');
      } else if (err.message.includes('UNIQUE')) {
        throw new Error('This application already exists.');
      } else {
        throw err;
      }
    }
    throw err;
  }
}

// Example error handling in component
function LoanForm() {
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    try {
      const result = await submitLoanApplication(formData);
      // Success - navigate or show confirmation
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <>
      {error && <div className="error-alert">{error}</div>}
      {/* Form inputs */}
    </>
  );
}
```

---

## SUMMARY

The HiramEase platform implements a **comprehensive, multi-layered input mechanism** that ensures:

### Security:
- XSS prevention through React escaping
- SQL injection prevention via parameterized queries
- CSRF protection through SameSite cookies
- Input validation at client & server
- Rate limiting & brute-force protection
- Secure password handling with bcrypt

### User Experience:
- Real-time validation with clear error messages
- Mobile-friendly touch targets (44×44 px)
- Accessible keyboard navigation
- Screen reader support with ARIA
- Currency formatting & calculation
- File upload with drag & drop
- Payment method selection

### Data Integrity:
- Type validation (string, number, etc.)
- Format validation (email, phone, currency)
- Range validation (min/max amounts)
- Business logic validation (credit limits, etc.)
- Server-side RLS enforcement
- Audit logging of all inputs

### Accessibility (WCAG AA/AAA):
- Semantic HTML with proper labels
- ARIA attributes for screen readers
- Color contrast ratios ≥ 4.5:1
- Keyboard navigation throughout
- Focus management in modals
- Error announcements to assistive tech

This multi-layered approach ensures the platform is secure, accessible, and user-friendly across all input mechanisms.

