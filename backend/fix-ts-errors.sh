#!/bin/bash

# Script to fix TypeScript strict mode errors

# Fix error.middleware.ts - change void return to Response
sed -i 's/): void => {/): Response => {/g' src/middleware/error.middleware.ts

# Fix unused imports - remove them
sed -i '/^import.*APIError.*from/d' src/middleware/auth/auth.middleware.ts
sed -i '/^import.*DailyStats.*from/d' src/models/Newsletter.ts
sed -i '/^import.*MonthlyData.*from/d' src/controllers/dashboard.controller.ts
sed -i '/^import.*MailchimpSubscriber.*from/d' src/controllers/subs.controller.ts
sed -i '/^import.*Types.*from/d' src/types/api.ts
sed -i '/^import.*Request, Response, NextFunction.*from/d' src/routes/subscription.routes.ts && \
sed -i '1 i import { Request, Response } from "express";' src/routes/subscription.routes.ts
sed -i '/^import.*MailchimpMemberResponse.*from/d' src/services/Integrations/mailchimp.ts

echo "TypeScript error fixes completed"
