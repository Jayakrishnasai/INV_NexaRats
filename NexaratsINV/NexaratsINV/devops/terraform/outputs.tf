output "ecr_repository_backend_url" {
  value = aws_ecr_repository.backend.repository_url
}

output "ecr_repository_whatsapp_url" {
  value = aws_ecr_repository.whatsapp.repository_url
}

output "ecs_cluster_name" {
  value = aws_ecs_cluster.main.name
}

output "efs_id" {
  value = aws_efs_file_system.wa_auth.id
}

output "cloudflare_pages_url" {
  value = cloudflare_pages_project.frontend.subdomain
}
