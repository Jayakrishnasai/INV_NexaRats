# Nexarats Production Deployment: Step-by-Step Guide

Follow this guide to deploy your full-stack inventory system to production.

---

## **Phase 1: Database Setup (Supabase)**

1. **Create Project**: Sign in to [Supabase](https://supabase.com) and create a new project.
2. **Run Migrations**:
   - Go to the **SQL Editor** in your Supabase dashboard.
   - Copy the contents of [`devops/supabase/migration-template.sql`](supabase/migration-template.sql).
   - Paste and **Run**. This sets up your `organizations`, `profiles`, and `products` tables.
3. **Collect API Keys**:
   - Go to **Project Settings > API**.
   - Copy: `Project URL`, `anon public key`, and `service_role key`.

---

## **Phase 2: Infrastructure Provisioning (Terraform)**

1. **Configure Variables**:
   - Navigate to `devops/terraform/`.
   - Rename `terraform.tfvars.example` to `terraform.tfvars`.
   - The `supabase_url` is already set to `https://hcqeyxbdymqnapbhvdog.supabase.co`.
   - Fill in your AWS region, Cloudflare IDs, and the remaining Supabase keys.
2. **Initialize & Apply**:

   ```bash
   cd devops/terraform
   terraform init
   terraform apply
   ```

   - *Note: This will automatically create your AWS ECR repos, ECS Cluster, EFS Storage, and Cloudflare Pages project.*
3. **Note Outputs**: Terraform will output your ECR URLs. You will need these for your CI/CD setup.

---

## **Phase 4: Service Deployment**

1. **Trigger Frontend Deploy**:
   - Push changes to the `main` branch.
   - Check the **Actions** tab. The `Frontend Deployment` pipeline will build your React app and push it to Cloudflare Pages.
2. **Trigger Backend Deploy**:
   - The `Backend Deployment` pipeline will build your Docker images for the API and WhatsApp services, push them to ECR, and update your ECS Service.
3. **Persistence Check**:
   - Verify that your ECS Task has successfully mounted the EFS volume for WhatsApp session data (`/app/.wwebjs_auth`).

---

## **Phase 5: Verification & Monitoring**

1. **API Health**: Visit `https://your-api-domain.com/health`. You should see `{"status":"ok"}`.
2. **WhatsApp Pairing**:
   - Use the backend API to retrieve the QR code.
   - Scan with your phone. The session will be saved to EFS.
3. **Logs**:
   - Check **CloudWatch Logs** for any startup errors in your containers.
   - Check **Cloudflare Dash** for frontend build logs.

---

**Success!** Your Nexarats Inventory system is now live.
