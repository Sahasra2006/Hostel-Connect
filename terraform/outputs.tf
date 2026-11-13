output "vpc_id" {
  value       = aws_vpc.hostelconnect_vpc.id
  description = "ID of the created AWS VPC"
}

output "eks_cluster_name" {
  value       = aws_eks_cluster.eks.name
  description = "Name of EKS cluster"
}

output "eks_cluster_endpoint" {
  value       = aws_eks_cluster.eks.endpoint
  description = "API Endpoint for EKS cluster"
}

output "eks_cluster_security_group_id" {
  value       = aws_eks_cluster.eks.vpc_config[0].cluster_security_group_id
  description = "Security Group ID of the cluster"
}
