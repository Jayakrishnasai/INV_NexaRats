terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# --- ECR Repositories ---
resource "aws_ecr_repository" "backend" {
  name                 = "${var.project_name}-backend"
  image_tag_mutability = "MUTABLE"
}

resource "aws_ecr_repository" "whatsapp" {
  name                 = "${var.project_name}-whatsapp"
  image_tag_mutability = "MUTABLE"
}

# --- ECS Cluster ---
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"
}

# --- EFS for WhatsApp Auth Persistence ---
resource "aws_efs_file_system" "wa_auth" {
  creation_token = "${var.project_name}-wa-auth"
  tags = {
    Name = "${var.project_name}-wa-auth-storage"
  }
}

# --- Cloudflare Pages Project ---
resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = "${var.project_name}-frontend"
  production_branch = "main"

  build_config {
    build_command       = "npm run build"
    destination_dir     = "dist"
    root_dir            = "frontend"
  }

  deployment_configs {
    production {
      environment_variables = {
        VITE_API_BASE_URL     = "https://api.${var.project_name}.com/api/v1"
        VITE_WHATSAPP_API_URL = "https://wa.${var.project_name}.com/api/whatsapp"
        VITE_USE_MOCKS        = "false"
        VITE_WA_API_KEY       = random_password.wa_api_key.result
      }
    }
  }
}

# --- Dynamic Secret Generation ---
resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 64
  special = false
}

resource "random_password" "wa_api_key" {
  length  = 32
  special = false
}

# --- AWS Secrets Manager ---
resource "aws_secretsmanager_secret" "supabase_url" {
  name = "${var.project_name}/SUPABASE_URL"
}

resource "aws_secretsmanager_secret_version" "supabase_url" {
  secret_id     = aws_secretsmanager_secret.supabase_url.id
  secret_string = var.supabase_url
}

resource "aws_secretsmanager_secret" "jwt_secret" {
  name = "${var.project_name}/JWT_SECRET"
}

resource "aws_secretsmanager_secret_version" "jwt_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_secret.id
  secret_string = random_password.jwt_secret.result
}

resource "aws_secretsmanager_secret" "jwt_refresh_secret" {
  name = "${var.project_name}/JWT_REFRESH_SECRET"
}

resource "aws_secretsmanager_secret_version" "jwt_refresh_secret" {
  secret_id     = aws_secretsmanager_secret.jwt_refresh_secret.id
  secret_string = random_password.jwt_refresh_secret.result
}

resource "aws_secretsmanager_secret" "wa_api_key" {
  name = "${var.project_name}/WA_API_KEY"
}

resource "aws_secretsmanager_secret_version" "wa_api_key" {
  secret_id     = aws_secretsmanager_secret.wa_api_key.id
  secret_string = random_password.wa_api_key.result
}
