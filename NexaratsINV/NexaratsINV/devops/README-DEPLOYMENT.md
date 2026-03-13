# Nexarats DevOps Infrastructure - Deployment Guide

This guide explains how to deploy the Nexarats Inventory system to production.

## Architecture

- **Frontend**: Cloudflare Pages
- **Backend**: AWS ECS Fargate (API & WhatsApp Services)
- **Database**: Managed Supabase PostgreSQL

## 1. Supabase Setup

1. Create a new Supabase project.
2. Go to **SQL Editor** and run the contents of [migration-template.sql](supabase/migration-template.sql).
3. Copy the `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` to your secrets manager.

## 2. GitHub Secrets Configuration

Add the following secrets to your GitHub Repository (**Settings > Secrets and variables > Actions**):

### Cloudflare (Frontend)

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `VITE_API_BASE_URL` (Production API URL)
- `VITE_WHATSAPP_API_URL` (Production WA URL)
- `WA_API_KEY` (Shared secret between services)

### AWS (Backend)

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `AWS_ACCOUNT_ID`

## 3. AWS Infrastructure Setup

1. Create two ECR repositories: `nexarats-backend` and `nexarats-whatsapp`.
2. Create an ECS Cluster named `nexarats-cluster`.
3. Create an EFS file system and update the `fileSystemId` in [ecs-task-definition.json](aws/ecs-task-definition.json).
4. Add backend secrets to **AWS Secrets Manager**.

## 4. Infrastructure as Code (Terraform)

Automate the creation of ECR, ECS, EFS, and Cloudflare projects:

1. Navigate to `devops/terraform/`.
2. Copy `terraform.tfvars.example` to `terraform.tfvars` and fill in your secrets.
3. Run:

```bash
terraform init
terraform apply
```

## 5. Local Development

To run the entire stack locally using Docker:

```bash
./devops/scripts/deploy.sh
```

## 6. Monitoring

- **Backend Health**: `https://api.nexarats.com/health`
- **CloudWatch Logs**: View logs under `/ecs/nexarats-backend` and `/ecs/nexarats-whatsapp`.
