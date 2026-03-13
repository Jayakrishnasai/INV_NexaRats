variable "aws_region" {
  description = "AWS region for deployment"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name used for resource naming"
  type        = string
  default     = "nexarats"
}

# --- Cloudflare ---
variable "cloudflare_api_token" {
  description = "Cloudflare API Token"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

# --- Backend Secrets ---
variable "supabase_url" {
  description = "Supabase Project URL"
  type        = string
}

variable "supabase_service_role_key" {
  description = "Supabase Service Role Key"
  type        = string
  sensitive   = true
}

variable "jwt_secret" {
  description = "JWT Secret for backend auth"
  type        = string
  sensitive   = true
}

variable "razorpay_encryption_key" {
  description = "64-char hex key for Razorpay encryption"
  type        = string
  sensitive   = true
}

variable "wa_api_key" {
  description = "Shared secret for WhatsApp microservice"
  type        = string
  sensitive   = true
}
