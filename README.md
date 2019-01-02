# 🥔 Potato

The purpose of the Potato CLI tool is to streamline the process when you want to host a static web page on S3 and deliver it using CloudFront.

<div align="center">
	<img src="https://raw.githubusercontent.com/0x4447/0x4447-cli-potato/master/assets/main.png">
</div>

# How to Install

```
] sudo npm install -g @0x4447/potato
```

# How to Use

```
] potato -s PATH_TO_FOLDER
```

# Where to get Help

```
] potato -h
```

# What to Expect

With this CLI, you have the following options:

### Update

This option allows you to update the content of a site on S3 and automatically invalidate the CloudFront Distribution Cache. Just provide the path to the folder that contains the new content, and the CLI will automatically do the rest for you. All you have to do is follow the steps on the screen.

### Create

This process is more involved, but it will save your sanity, as well as quite a bit of time. When you select this option, you'll be asked for the domain name you'd like to use for your website. When you supply that information, everything else is automatic, so all you need to do is sit down and relax. The following is a list of all of the things that will happen in the background:

- list_all_certificates
- look_for_domain_certificate
- create_a_certificate
- get_certificate_metadata
- list_hosted_zones
- look_for_domain
- update_route53_with_cert_validation
- check_certificate_validity
- check_if_bucket_exists
- create_a_bucket
- convert_bucket_to_site
- change_bucket_policy
- upload
- create_a_distribution
- get_all_domain_records
- look_for_domain_entry
- delete_domain_entry
- create_a_route_53_record
- print_domain_configuration

**WARNING**: What if the certificate takes too long to validate? After 60 seconds, the app will quit and print out a detailed explanation of what your next steps are. Take the time to thoroughly go over the printout, and you'll be good.

# Credentials

To use this CLI, create a programmatic user or create a role with the following permissions:

- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess

# Is Deployment Instant?

No, it's not. The following aspects don't happen right away:

- SSL Certificate confirmation
- CloudFront distribution

### SSL Certificate Confirmation

The time frame for this process ranges from 10 seconds to 24 hours. It's completely unpredictable, and there's no way to speed up the process. Because of this, the app will quit if the certificate isn't confirmed within 60 seconds. When that happens, go to the AWS Console to monitor the certificate.

### CloudFront Distribution

This takes up to 15 or 20 minutes, but when you reach this point, you can be certain that the configuration is correct. At this point, you just need to wait until the process is complete. Only then will the domain deliver the website.

# Companion Software

This CLI tools works well also with the following software:

- [Avocado](https://www.npmjs.com/package/@0x4447/avocado): a mini framework that helps you create basic HTML websites without the complexity of modern frameworks.
- [Strawberry](https://www.npmjs.com/package/@0x4447/strawberry): helps you create redirects supporting HTTP and HTTPS for your site.

# The End

If you enjoyed this project, please consider giving it a 🌟. And check out our [0x4447 GitHub account](https://github.com/0x4447), where we have additional resources that you might find useful or interesting.

## Sponsor 🎊

This project is brought to you by 0x4447 LLC, a software company specializing in build custom solutions on top of AWS. Find out more by following this link: https://0x4447.com or, say [hello@0x4447.email](mailto:hello@0x4447.email?Subject=Hello%20From%20Repo&Body=Hi%2C%0A%0AMy%20name%20is%20NAME%2C%20and%20I%27d%20like%20to%20get%20in%20touch%20with%20someone%20at%200x4447.%0A%0AI%27d%20like%20to%20discuss%20the%20following%20topics%3A%0A%0A-%20LIST_OF_TOPICS_TO_DISCUSS%0A%0ASome%20useful%20information%3A%0A%0A-%20My%20full%20name%20is%3A%20FIRST_NAME%20LAST_NAME%0A-%20My%20time%20zone%20is%3A%20TIME_ZONE%0A-%20My%20working%20hours%20are%20from%3A%20TIME%20till%20TIME%0A-%20My%20company%20name%20is%3A%20COMPANY%20NAME%0A-%20My%20company%20website%20is%3A%20https%3A%2F%2F%0A%0ABest%20regards.).
