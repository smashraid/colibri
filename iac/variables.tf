variable "aws_role" {}
variable "aws_session" {}
variable "aws_region" {}
variable "aws_account_id" {}
variable "aws_hosted_zone_id" {}
variable "aws_load_balancer_name" {}
variable "aws_route53_record_name" {}
variable "tags" {}

locals {
  env_name   = lower(terraform.workspace)
  region     = var.aws_region[local.env_name]
  account_id = var.aws_account_id[local.env_name]
}