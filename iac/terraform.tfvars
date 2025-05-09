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

aws_account_id = {
  dev       = "025381531841"
  nonprod   = "174436502675"
  prod      = "144196841275"
}

aws_hosted_zone_id = {
  dev  = "Z09214661J7DTP6EB1W50"
  qa   = "Z04676103EB5YR4JQFUN5"
  prod = "Z0390904ZHF670159TYD"
}

aws_load_balancer_name = {
  dev  = "dig-dev-internal-lb"
  qa   = "dig-qa-internal-lb"
  prod = "dig-prod-internal-lb"
}
