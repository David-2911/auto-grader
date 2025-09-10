# Auto-Grader Infrastructure as Code
terraform {
  required_version = ">= 1.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.4"
    }
  }

  backend "s3" {
    # Configure your S3 backend
    bucket = "your-terraform-state-bucket"
    key    = "autograder/terraform.tfstate"
    region = "us-west-2"
    
    # Optional: DynamoDB table for state locking
    dynamodb_table = "terraform-state-lock"
    encrypt        = true
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = "Auto-Grader"
      Environment = var.environment
      ManagedBy   = "Terraform"
    }
  }
}

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
}

data "aws_caller_identity" "current" {}

data "aws_region" "current" {}

# Local values
locals {
  common_tags = {
    Project     = "Auto-Grader"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
  
  name_prefix = "autograder-${var.environment}"
}
