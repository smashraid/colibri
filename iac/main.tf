provider "aws" {
  region = var.aws_region[local.env_name]
  assume_role {
    role_arn     = var.aws_role
    session_name = var.aws_session
  }

  # region     = "us-east-2"
  # access_key = ""
  # secret_key = ""
  # token      = ""
}

data "aws_route53_zone" "zone" {
  zone_id      = var.aws_hosted_zone_id[local.env_name]
  private_zone = false
}

data "aws_lb" "lb" {
  name = var.aws_load_balancer_name[local.env_name]
}

resource "aws_route53_record" "record" {
  zone_id = data.aws_route53_zone.zone.zone_id
  name    = "colibri.${data.aws_route53_zone.zone.name}"
  type    = "A"
  set_identifier = local.env_name

  alias {
    name                   = data.aws_lb.lb.dns_name
    zone_id                = data.aws_lb.lb.zone_id
    evaluate_target_health = true
  }
}