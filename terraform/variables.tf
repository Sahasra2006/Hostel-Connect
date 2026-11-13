variable "aws_region" {
  type        = string
  description = "AWS region for infrastructure provisioning"
  default     = "us-east-1"
}

variable "cluster_name" {
  type        = string
  description = "EKS cluster name"
  default     = "hostelconnect-eks"
}

variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC"
  default     = "10.0.0.0/16"
}

variable "node_instance_type" {
  type        = string
  description = "EC2 Instance type for node group"
  default     = "t3.small"
}
