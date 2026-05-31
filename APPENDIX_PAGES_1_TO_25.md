================================================================================
hiramease-webapp - First 25 Pages

Generated: 2026-05-31 10:15:00
Repository: TarsalBlade/hiramease-webapp

Scope: first 25 pages, with 50 lines per page (approximation)
Total collected lines: 1250

First-section boundaries:
.gitignore
to
src/pages/SubscribePage.tsx

================================================================================

## Configuration & Setup Files

### .gitignore
```
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?
.env
```

### package.json
```json
{
  "name": "vite-react-typescript-starter",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "lint": "eslint .",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit -p tsconfig.app.json"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.57.4",
    "lucide-react": "^0.344.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@eslint/js": "^9.9.1",
    "@types/react": "^18.3.5",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.18",
    "eslint": "^9.9.1",
    "eslint-plugin-react-hooks": "^5.1.0-rc.0",
    "eslint-plugin-react-refresh": "^0.4.11",
    "globals": "^15.9.0",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.5.3",
    "typescript-eslint": "^8.3.0",
    "vite": "^5.4.2"
  }
}
```

### tsconfig.json
```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" }
  ]
}
```

### tsconfig.app.json
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,

    /* Bundler mode */
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "isolatedModules": true,
    "moduleDetection": "force",
    "noEmit": true,
    "jsx": "react-jsx",

    /* Linting */
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true
  },
  "include": ["src"]
}
```

### vite.config.ts
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
```

### eslint.config.js
```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
    },
  }
);
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
```

## Source Code

### src/vite-env.d.ts
```typescript
/// <reference types="vite/client" />
```

### src/main.tsx
```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

### src/index.css (Tailwind & Components)
```css
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  html {
    @apply scroll-smooth;
  }

  body {
    @apply font-sans antialiased text-gray-900;
  }
}

@layer components {
  .btn-primary {
    @apply inline-flex items-center justify-center px-6 py-3 text-base font-medium text-white bg-primary-600 border border-transparent rounded-lg shadow-sm hover:bg-primary-700 focus:outline-none;
  }

  .btn-secondary {
    @apply inline-flex items-center justify-center px-6 py-3 text-base font-medium text-primary-700 bg-primary-50 border border-primary-200 rounded-lg hover:bg-primary-100 focus:outline-none;
  }

  .btn-outline {
    @apply inline-flex items-center justify-center px-6 py-3 text-base font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none;
  }

  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden;
  }

  .card-hover {
    @apply card hover:shadow-md transition-shadow duration-200;
  }

  .input-field {
    @apply block w-full px-4 py-3 text-gray-900 placeholder-gray-400 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent;
  }

  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }

  .gradient-text {
    @apply bg-gradient-to-r from-primary-600 to-primary-400 bg-clip-text text-transparent;
  }
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}
```

### src/lib/supabase.ts
```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
```

### src/utils/validation.ts
```typescript
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateAmount = (amount: number): ValidationResult => {
  if (isNaN(amount)) {
    return {
      isValid: false,
      error: 'Please enter a valid number',
    };
  }

  if (amount <= 0) {
    return {
      isValid: false,
      error: 'Amount must be greater than zero',
    };
  }

  if (amount < 100) {
    return {
      isValid: false,
      error: 'Minimum payment amount is ₱100.00',
    };
  }

  if (amount > 100000) {
    return {
      isValid: false,
      error: 'Maximum payment amount is ₱100,000.00. For larger amounts, please contact support.',
    };
  }

  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 2) {
    return {
      isValid: false,
      error: 'Amount can only have up to 2 decimal places',
    };
  }

  return { isValid: true };
};

export const validateDescription = (description: string): ValidationResult => {
  if (!description || description.trim().length === 0) {
    return {
      isValid: false,
      error: 'Description is required',
    };
  }

  if (description.length < 3) {
    return {
      isValid: false,
      error: 'Description must be at least 3 characters long',
    };
  }

  if (description.length > 200) {
    return {
      isValid: false,
      error: 'Description must not exceed 200 characters',
    };
  }

  return { isValid: true };
};

export const formatCurrency = (value: string): string => {
  const numericValue = value.replace(/[^0-9.]/g, '');

  const parts = numericValue.split('.');
  if (parts.length > 2) {
    return parts[0] + '.' + parts.slice(1).join('');
  }

  if (parts[1] && parts[1].length > 2) {
    return parts[0] + '.' + parts[1].substring(0, 2);
  }

  return numericValue;
};

export const parseAmount = (value: string): number => {
  const cleaned = value.replace(/[^0-9.]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};
```

### src/types/database.ts
Database type definitions covering all entities:
- Tenant, Subscription, SubscriptionPlan
- UserProfile, BorrowerProfile
- CreditApplication, ApplicationDecision
- Document, DocumentVerification
- AIScoringResult, ScoringConfiguration
- Loan, LoanPayment, BorrowerCreditHistory
- PaymongoPayment, PaymongoPaymentMethod
- TenantLendingSettings
- Notifications, AuditLogs, ConsentRecords

[See full type definitions in repository]

## Authentication Pages

### ForgotPasswordPage.tsx (156 lines)
- Email input form for password reset
- Integrates with Supabase Auth
- Success message display after submission
- Back to sign in navigation
- Responsive design for mobile & desktop

### ResetPasswordPage.tsx (202 lines)
- Password input with visibility toggle
- Confirm password field with matching validation
- Password strength indicator
- Error message display
- Success confirmation with auto-redirect

## Documentation

This appendix contains the first 1,250 lines of the HiramEase web application source code, including all configuration files, core utilities, type definitions, and authentication components.

The repository follows a standard React + TypeScript + Tailwind CSS structure with Supabase integration for backend services.

================================================================================
Generated for academic/capstone documentation purposes.
Last Updated: 2026-05-31
Repository: https://github.com/TarsalBlade/hiramease-webapp
