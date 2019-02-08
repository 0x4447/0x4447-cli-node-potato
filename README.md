# 🥔 Potato

We built Potato to cut down on time, stress, and drama. The process of deploying a static page to S3 and configuring CloudFront, Certificate Manager, and Route53 is tedious and prone to error. It also involves too many steps to remember – and so, Potato was grown.

You might wonder why we didn't create a CloudFormation template. The reason is simple: CF doesn't fully support Route53, so creating a certificate and updating the domain with the correct information would require a special Lambda. You can see that we could quickly end up in a complex spiral.

With Potato, we can use code to overcome all the limitations of CF and configure everything in one go. Potato also streamlines the process of updating a static site.

<div align="center">
	<img src="https://raw.githubusercontent.com/0x4447/0x4447-cli-potato/master/assets/main.png">
</div>

# How to install

```
] sudo npm install -g @0x4447/potato
```

# How to use

```
] potato -s PATH_TO_FOLDER
```

# Where to get help

```
] potato -h
```

# What to expect

The CLI offers the following options:

### Update

This option allows you to update the content of a site on S3 and automatically invalidate the CloudFront Distribution Cache. Just provide the path to the folder containing the new content, and the CLI automatically does the rest for you. All you have to do is follow the steps on the screen.

### Create

This process is more involved, but it will save your sanity - and quite a bit of time. When you select this option, you'll be asked for the domain name you'd like to use for your website. Once that information is provided, everything else is automatic. At that point, all you need to do is sit down and relax.

The following is a list of everything that happens in the background:

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

**WARNING**: What if the certificate takes too long to validate? After 60 seconds, the app quits and prints out a detailed explanation of what your next steps should be. Take the time to thoroughly go over the printout, and you'll be good.

# Credentials

To use this CLI, create a programmatic user or create a role with the following permissions:

- AmazonS3FullAccess
- CloudFrontFullAccess
- AmazonRoute53FullAccess
- AWSCertificateManagerFullAccess

## How to pass the credentials

Each time you run Potato, it does the following:

1. Check whether it's running on an EC2 server and whether there's an attached role
2. If this fails, it will check whether it's running inside a CodeBuld container and then check for a Role
3. Lastly, if all fails, the app prompts for credentials

# Is deployment instant?

No, it's not. The following aspects don't happen right away:

- SSL Certificate confirmation
- CloudFront distribution

### SSL Certificate confirmation

The time frame for this process ranges from 10 seconds to 24 hours. It's completely unpredictable, and there's no way to speed up the process. Because of this, the app quits if the certificate isn't confirmed within 60 seconds. When that happens, go to the AWS Console to monitor the certificate.

### CloudFront distribution

This takes up to 15 or 20 minutes, but when you reach this point, you can be certain that the configuration is correct. At this point, you just need to wait until the process is complete. Only then does the domain deliver the website.

# Companion software

The Potato CLI tool also works well with the following software:

- [Avocado](https://www.npmjs.com/package/@0x4447/avocado): a mini-framework that enables you to create basic HTML websites without the complexity of modern frameworks
- [Strawberry](https://www.npmjs.com/package/@0x4447/strawberry): allows you to create redirects supporting HTTP and HTTPS for your site.

# The End

If you enjoyed this project, please consider giving it a 🌟. And check out our [0x4447 GitHub account](https://github.com/0x4447), which contains additional resources you might find useful or interesting.

## Sponsor 🎊

This project is brought to you by 0x4447 LLC, a software company specializing in building custom solutions on top of AWS. Follow this link to learn more: https://0x4447.com. Alternatively, send an email to [hello@0x4447.email](mailto:hello@0x4447.email?Subject=Hello%20From%20Repo&Body=Hi%2C%0A%0AMy%20name%20is%20NAME%2C%20and%20I%27d%20like%20to%20get%20in%20touch%20with%20someone%20at%200x4447.%0A%0AI%27d%20like%20to%20discuss%20the%20following%20topics%3A%0A%0A-%20LIST_OF_TOPICS_TO_DISCUSS%0A%0ASome%20useful%20information%3A%0A%0A-%20My%20full%20name%20is%3A%20FIRST_NAME%20LAST_NAME%0A-%20My%20time%20zone%20is%3A%20TIME_ZONE%0A-%20My%20working%20hours%20are%20from%3A%20TIME%20till%20TIME%0A-%20My%20company%20name%20is%3A%20COMPANY%20NAME%0A-%20My%20company%20website%20is%3A%20https%3A%2F%2F%0A%0ABest%20regards.).
