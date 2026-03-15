output "bucket_ids" {
  description = "Scaleway Object Storage bucket IDs"
  value       = { for k, v in scaleway_object_bucket.main : k => v.id }
}

output "bucket_names" {
  description = "Scaleway Object Storage bucket names"
  value       = { for k, v in scaleway_object_bucket.main : k => v.name }
}

output "bucket_endpoints" {
  description = "Scaleway Object Storage bucket endpoints"
  value       = { for k, v in scaleway_object_bucket.main : k => "https://s3.${var.region}.scw.cloud/${v.name}" }
}

output "bucket_regions" {
  description = "Scaleway Object Storage bucket regions"
  value       = { for k, v in scaleway_object_bucket.main : k => var.region }
}




