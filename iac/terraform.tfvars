## General Variables ##

tags = {
  "domain"      = "digital"
  "workload"    = "colibri"
  "application" = "colibri"
  "team"        = "Digital Owned Communication"
}

## AWS Variables ##

aws_role = "#{AWS.Role}"

aws_session = "#{AWS.SessionName}"

aws_region = "us-east-2"

aws_hosted_zone_id = {
  dev  = "Z04024463TZ31XAH1LFIR"
  qa   = "Z04908861I75TPU44A3E"
  prod = "Z0474853S6BS7P4OD5IV"
}

aws_load_balancer_name = {
  dev  = "tz-dev-internal-lb"
  qa   = "tz-qa-internal-lb"
  prod = "tz-prod-internal-lb"
}
