# 0x4447 Potato 🥔

The purpose of the Potato CLI tool is to streamline the process when you want to host a static web page on S3 and deliver it using CloudFront.

<div align="center">
	<img src="https://raw.githubusercontent.com/0x4447/0x4447-cli-potato/master/assets/main.png">
</div>

# How to Install

```
sudo npm install -g 0x4447-potato
```

# IAM Programmatic Credentials

To use this CLI, create a programmatic user with the following permissions:

- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess

# How to Use

```
potato -s PATH_TO_FOLDER
```

# What Potato Does

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

**WARNING**: What if the certificate takes too long to validate? After 30 seconds, the app will quit and print out a detailed explanation of what your next steps are. Take the time to thoroughly go over the printout, and you'll be good.

# Is Deployment Instant?

No, it's not. The following aspects don't happen right away:

- SSL Certificate confirmation
- CloudFront distribution

### SSL Certificate Confirmation

The time frame for this process ranges from 10 seconds to 24 hours. It's completely unpredictable, and there's no way to speed up the process. Because of this, the app will quit if the certificate isn't confirmed within 30 seconds. When that happens, go to the AWS Console to monitor the certificate.

### CloudFront Distribution

This takes up to 15 or 20 minutes, but when you reach this point, you can be certain that the configuration is correct. At this point, you just need to wait until the process is complete. Only then will the domain deliver the website.

# Why This Name?

Why not? We had to call it something. And once you see it, you're not going to forget it. 😃

# The End

If you enjoyed this article/project, please consider giving it a 🌟. And check out our [0x4447 GitHub account](https://github.com/0x4447), where we have additional articles and tools that you might find interesting.

# For Hire 👨‍💻

If you'd like us to help you with something, please feel free to say hello@0x4447.com, and share what's on your mind. We'll take a look, and try our best to help you.



