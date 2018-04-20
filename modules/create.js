let url = require('url');
let term = require('terminal-kit').terminal;
let upload = require('../helpers/upload');

//
//	This promise is responsible for deploying a new  static website by
//	automatically configuring
//
//	- Certificate Manager
//	- Route 53
//	- S3
//	- CloudFront
//
module.exports = function(container) {

	return new Promise(function(resolve, reject) {

		ask_for_the_domain(container)
			.then(function(container) {

				return get_root_domain(container);

			}).then(function(container) {

				return list_all_certificates(container);

			}).then(function(container) {

				return look_for_domain_certificate(container);

			}).then(function(container) {

				return create_a_certificate(container);

			}).then(function(container) {

				return get_certificate_metadata(container);

			}).then(function(container) {

				return list_hosted_zones(container)

			}).then(function(container) {

				return look_for_domain(container)

			}).then(function(container) {

				return pre_certificate_check(container)

			}).then(function(container) {

				return update_route53_with_cert_validation(container);

			}).then(function(container) {

				return check_certificate_validity(container);

			}).then(function(container) {

				return check_if_bucket_exists(container)

			}).then(function(container) {

				return create_a_bucket(container)

			}).then(function(container) {

				return convert_bucket_to_site(container)

			}).then(function(container) {

				return change_bucket_policy(container)

			}).then(function(container) {

				return upload(container)

			}).then(function(container) {

				return create_a_distribution(container)

			}).then(function(container) {

				return get_all_domain_records(container);

			}).then(function(container) {

				return look_for_domain_entry(container);

			}).then(function(container) {

				return delete_domain_entry(container);

			}).then(function(container) {

				return create_a_route_53_record(container)

			}).then(function(container) {

				return print_domain_configuration(container)

			}).then(function(container) {

				return resolve(container)

			}).catch(function(error) {

				return reject(error);

			});

	});
}

//  _____    _____     ____    __  __   _____    _____   ______    _____
// |  __ \  |  __ \   / __ \  |  \/  | |_   _|  / ____| |  ____|  / ____|
// | |__) | | |__) | | |  | | | \  / |   | |   | (___   | |__    | (___
// |  ___/  |  _  /  | |  | | | |\/| |   | |    \___ \  |  __|    \___ \
// | |      | | \ \  | |__| | | |  | |  _| |_   ____) | | |____   ____) |
// |_|      |_|  \_\  \____/  |_|  |_| |_____| |_____/  |______| |_____/
//

//
//	Ask the user the name of the domain they want to create
//
function ask_for_the_domain(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this view if the information was already passed in the
		//		CLI
		//
		if(container.bucket)
		{
			//
			//	-> Move to the next promise
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tType the domain name: ");

		//
		//	1.	Listen for the user input
		//
		term.inputField({}, function(error, dns) {

			//
			//	1.	Save the domain as is for any other sourpuss then changing
			//		the domain settings.
			//
			container.bucket = dns;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Get the root domain from the DNS address
//
function get_root_domain(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	2.	Save the URL while getting the base domain, for example:
		//
		//		subdomain.0x4447.com
		//
		//		becomes
		//
		//		0x4447.com
		//
		//		No matter how deep the subdomain goes.
		//
		container.domain = container.bucket.split('.').slice(-2).join('.');

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});
}

//
//	List all the SSL certificates in the account
//
function list_all_certificates(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tGetting all Certificates...");

		//
		//	1.	Ask AWS for all the certificates in the account
		//
		container.acm.listCertificates({}, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	2.	Save an array of certs to the proceed
			//
			container.certificates = data.CertificateSummaryList

			//
			//	->	Move to the next step once the animation finishes drawing
			//
			return resolve(container);

		});

	});
}

//
//	Take the list of certificates that we got and look if we already have
//	that certificate for that specific domain
//
function look_for_domain_certificate(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tLooking for Domain Certificate...");

		//
		//	1.	Create a variable to store the ARN of the cert
		//
		let arn = null;

		//
		//	2.	Loop over all the certs that we got
		//
		for(let key in container.certificates)
		{
			//
			//	1.	Look for a match
			//
			if(container.certificates[key].DomainName == container.bucket)
			{
				//
				//	1.	Save the ARN once it is found
				//
				arn = container.certificates[key].CertificateArn

				//
				//	->	Stop the loop to preserve CPU
				//
				break;
			}
		}

		//
		//	3.	Save the ARN to be used in the next chain
		//
		container.cert_arn = arn;

		//
		//	->	Move to the next step once the animation finishes drawing
		//
		return resolve(container);

	});
}

//
//	If we didn't find the certificate then we create one
//
function create_a_certificate(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this step if the ARN is found
		//
		if(container.cert_arn)
		{
			//
			//	->	Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tCreating the Certificate...");

		//
		//	2.	Prepare the data to create a certificate
		//
		//		Warning:
		//
		//			IdempotencyToken - is used by AWS to understand if you
		//			by mistake made the same request multiple times. This
		//			way you won't get a ton of cert that are the same.
		//
		let params = {
			DomainName: container.bucket,
			IdempotencyToken: 'rnd_0x4447',
			ValidationMethod: 'DNS'
		};

		//
		//	3.	Tell AWS that we want a new certificate
		//
		container.acm.requestCertificate(params, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	2.	Save an array of certs to the proceed
			//
			container.cert_arn = data.CertificateArn;

			//
			//	->	Move to the next step once the animation finishes drawing
			//
			return resolve(container);

		});

	});
}

//
//	After creating the certificate we need to get some extra information
//	so we can then use this information later in the code.
//
//	This promise will also loop 30 times and wait since when you create a
//	certificate all its meta-data won't be available right away.
//
function get_certificate_metadata(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tGetting Certificate Meta-Data...");

		//
		//	1.	Make a variable that will keep all the information to create
		//		a certificate
		//
		let params = {
			CertificateArn: container.cert_arn
		};

		//
		//	2.	Start the main loop and set the counter at 0
		//
		main(0)

		//
		//	3.	The main function that will loop until it get the Resource
		//		record to then use to update the DNS setting of the domain
		//
		//		We need to do it this way because when you create a Cert
		//		AWS will take a moment before the cert set in stone.
		//
		//		This main will also timeout after 15 sec.
		//
		function main(count)
		{
			//
			//	1.	Get the full description of the cert
			//
			container.acm.describeCertificate(params, function(error, data) {

				//
				//	1.	Check if there was no error
				//
				if(error)
				{
					return reject(new Error(error.message));
				}

				//
				//	2. Save the information to validate the cert
				//
				let record = data.Certificate.DomainValidationOptions[0].ResourceRecord;

				//
				//	3.	Check if we reached the limits of retries
				//
				if(count >= 30)
				{
					//
					//	1.	If we reached the limit we stop the app because
					//		there is no point in stressing out AWS
					//
					return reject(new Error("Unable to get a cert ARN"));
				}

				//
				//	4.	Check if we got the data that we need from AWS
				//
				if(record)
				{
					//
					//	1.	Save the data for the next chain
					//
					container.cert_validation = record

					//
					//	->	Move to the next step once the animation finishes
					//		drawing
					//
					return resolve(container);
				}

				//
				//	5.	Set a timeout of 1 sec
				//
				setTimeout(function() {

					//
					//	1.	Increases the counter so we can keep track of how
					//		many loops did we do.
					//
					count++;

					//
					//	2.	Restart the main function to check if now we'll
					//		get what we need
					//
					main(count);

				}, 1000);

			});

		}

	});
}

//
//	Query Route 53 to get all the domains that are available in the account
//
function list_hosted_zones(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tListing Hosted Zones...");

		//
		//	1.	Query Route 53 for all the Zones (domains)
		//
		container.route53.listHostedZones({}, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	3.	Save the result for the next chain
			//
			container.zones = data.HostedZones;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Go over the array of domains that we got and look for the one that we
//	care about
//
function look_for_domain(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tLooking for Domain...");

		//
		//	1.	Create a variable that will store the Zone ID
		//
		let zone_id = '';

		//
		//	2.	Loop over all the Zones that we got to look for the
		//		domain and grab the Zone ID
		//
		for(let key in container.zones)
		{
			//
			//	1.	Compare the domains
			//
			if(container.zones[key].Name == container.domain + '.')
			{
				//
				//	1.	Save the Zone ID
				//
				zone_id = container.zones[key].Id.split("/")[2];

				//
				//	->	Brake to preserve CPU cycles
				//
				break;
			}
		}

		//
		//	3.	Save the zone ID for later
		//
		container.zone_id = zone_id;

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});

}

//
//	First we do a quick check if the certificate is already verified, and based
//	on this we might skip other future steps
//
function pre_certificate_check(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tPre check of the certificate...");

		//
		//	1.	Make a variable that will keep all the information to create
		//		a certificate
		//
		let params = {
			CertificateArn: container.cert_arn
		};

		//
		//	1.	Get the full description of the cert
		//
		container.acm.describeCertificate(params, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	2. Save the information to validate the cert
			//
			let status = data.Certificate.DomainValidationOptions[0].ValidationStatus;

			//
			//	4.	Check if the cert is valid
			//
			if(status === 'SUCCESS')
			{
				//
				//	1.	Mark the cert to be valid so we can make future
				//		decision in the future.
				//
				container.cert_already_valid = true;
			}

			//
			//	->	Move to the next step once the animation finishes
			//		drawing
			//
			return resolve(container);

		});

	});
}

//
//	Now that we have a new certificate, and we also found the Zone ID of the
//	domain, we can add a new entry i the DNS so AWS can confirm the cert
//	for us.
//
function update_route53_with_cert_validation(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Check if:
		//
		//		- No Domain found on Route 53
		//		- and Cert is invalid
		//
		//		And if this matches, then we display instructions how to
		//		update the DNS to allow the cert verification.
		//
		if(!container.zone_id && !container.cert_already_valid)
		{
			term("\n");
			term("\n");
			term.yellow("\tYour domain is not managed by Route 53, please edit the DNS record and add the following:");
			term("\n");
			term("\n");
			term.yellow("\t" + container.cert_validation.Name + " CNAME " + container.cert_validation.Value);
			term("\n");
			term("\n");

			//
			//	->	After displaying the message stop the app.
			//
			return process.exit(11);
		}

		//
		//	2.	Skip this step if the cert is already valid
		//
		if(container.cert_already_valid)
		{
			//
			//	-> Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tUpdate Route 53 with Certificate validation...");

		//
		//	1.	Create all the options to create a new record that will
		//		be used to confirm the ownership of the cert
		//
		let params = {
			ChangeBatch: {
				Changes: [
				{
					Action: "CREATE",
					ResourceRecordSet: {
						Name: container.cert_validation.Name,
						ResourceRecords: [{
							Value: container.cert_validation.Value
						}],
						TTL: 60,
						Type: container.cert_validation.Type
					}
				}
				],
				Comment: "Proof of ownership"
			},
			HostedZoneId: container.zone_id
		};

		//
		//	2.	Create a new DNS record
		//
		container.route53.changeResourceRecordSets(params, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	->	Move to the next step once the animation finishes drawing
			//
			return resolve(container);

		});

	});
}

//
//	After we added the entry to validate the cert we need to wait for
//	AWS to validate it. To do this we are going to constantly check the
//	state of the cert until it gets confirmed.
//
function check_certificate_validity(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tWaiting 30 sec for Certificate to validate...");

		//
		//	1.	Make a variable that will keep all the information to create
		//		a certificate
		//
		let params = {
			CertificateArn: container.cert_arn
		};

		//
		//	2.	Start the main loop and set the counter at 0
		//
		main(0);

		//
		//	3.	The main function that will loop until it get the Resource
		//		record to then use to update the DNS setting of the domain
		//
		//		We need to do it this way because when you create a Cert
		//		AWS will take a moment before the cert set in stone.
		//
		//		This main will also timeout after 15 sec.
		//
		function main(count)
		{
			//
			//	1.	Get the full description of the cert
			//
			container.acm.describeCertificate(params, function(error, data) {

				//
				//	1.	Check if there was no error
				//
				if(error)
				{
					return reject(new Error(error.message));
				}

				//
				//	2. Save the information to validate the cert
				//
				let status = data.Certificate.DomainValidationOptions[0].ValidationStatus;

				//
				//	3.	Check if we reached the limits of retries
				//
				if(status === 'FAILED')
				{
					//
					//	1.	If we reached the limit we stop the app because
					//		there is no point in stressing out AWS
					//
					return reject(new Error("Cert failed to confirm"));
				}

				//
				//	4.	Check if we got the data that we need from AWS
				//
				if(status === 'SUCCESS')
				{
					//
					//	->	Move to the next step once the animation finishes
					//		drawing
					//
					return resolve(container);
				}

				//
				//	3.	Check if we reached the limits of retries
				//
				if(count >= 30)
				{
					//
					//	1. Explain the situation
					//
					term("\n");
					term("\n");
					term.yellow("\tWe did try for 30 sec but the cert is still waiting for validation.");
					term("\n");
					term.yellow("\tYou should visit the following AWS Console section to monitor the cert");
					term("\n");
					term("\n");
					term.yellow("\thttps://console.aws.amazon.com/acm/home?region=" + container.region);
					term("\n");
					term("\n");
					term.yellow("\tOnce the cert is validated re-run this CLI with the same domain that you used before.");
					term("\n");
					term("\n");

					//
					//	->	Exit the app since there is nothing more to do.
					//
					return process.exit(11);
				}

				//
				//	5.	Set a timeout of 1 sec
				//
				setTimeout(function() {

					//
					//	1.	Increases the counter so we can keep track of how
					//		many loops did we do.
					//
					count++;

					//
					//	2.	Restart the main function to check if now we'll
					//		get what we need
					//
					main(count);

				}, 1000);

			});

		}

	});
}

//
//	Before we do anything use the domain provided by the user and we check to
//	see if it is exists already by trying to read the default index.html file
//
function check_if_bucket_exists(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tChecking if the S3 Bucket Exists...");

		//
		//	1.	The options for S3
		//
		let params = {
			Bucket: container.bucket,
			Key: 'home'
		};

		//
		//	2.	Try to get a file from the provided bucket
		//
		container.s3.getObject(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(data)
			{
				return reject(new Error("The website already exists"));
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Now that we know that the bucked doesn't exists we can create it
//
function create_a_bucket(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tCreating the S3 Bucket...");

		//
		//	1.	The options for S3
		//
		let params = {
			Bucket: container.bucket
		};

		//
		//	2.	Create the bucket
		//
		container.s3.createBucket(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	2.	Make a precise Bucket URL so CloudFront will redirect all
			//		request to the main domain and not straight to the
			//		S3 Bucket prior to the domain propagation
			//
			container.bucket_url_path = container.bucket + '.s3-website-' + container.region + '.amazonaws.com';

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	After creating a bucket we need to tell S3 that this bucket will be
//	hosting a website
//
function convert_bucket_to_site(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tConverting the S3 Bucket in to a website...");

		//
		//	1.	The options for S3
		//
		let params = {
			Bucket: container.bucket,
			WebsiteConfiguration: {
				ErrorDocument: {
					Key: "error"
				},
				IndexDocument: {
					Suffix: "home"
				}
			}
		};

		//
		//	2.	Convert the bucket in to a website
		//
		container.s3.putBucketWebsite(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Update the Bucket policy to make sure it is accessible by the public.
//	Otherwise CloudFront won't be able to publish the site.
//
function change_bucket_policy(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tChanging S3 Bucket Policy...");

		//
		//	1.	Set the parameters to change the Bucket policy
		//
		let params = {
			Bucket: container.bucket,
			Policy: JSON.stringify({
				Version: '2012-10-17',
				Statement: [
				{
					Sid: 'PublicReadGetObject',
					Effect: 'Allow',
					Principal: '*',
					Action: 's3:GetObject',
					Resource: 'arn:aws:s3:::' + container.bucket + '/*'
				}
				]
			})
		};

		//
		//	2.	Replace the Policy
		//
		container.s3.putBucketPolicy(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

////////////////////////////////////////////////////////////////////////////////
//
//	Upload the file to the S3 bucket so we can deliver something
//
//	.upload();
//
////////////////////////////////////////////////////////////////////////////////

//
//	Now that we have everything, we can finally use all this data and
//	create a CloudFront Distribution
//
function create_a_distribution(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tCreating a CloudFront Distribution...");

		//
		//	1.	All the setting necessary to create a CF Distribution
		//
		let params = {
			DistributionConfig: {
				CallerReference: new Date().toString(),
				Comment: '-',
				DefaultCacheBehavior: {
					ForwardedValues: {
						Cookies: {
							Forward: 'none'
						},
						QueryString: false,
						Headers: {
							Quantity: 0
						},
						QueryStringCacheKeys: {
							Quantity: 0
						}
					},
					MinTTL: 0,
					TargetOriginId: container.bucket_url_path,
					TrustedSigners: {
						Enabled: false,
						Quantity: 0
					},
					ViewerProtocolPolicy: 'redirect-to-https',
					AllowedMethods: {
						Items: ['GET', 'HEAD'],
						Quantity: 2,
						CachedMethods: {
							Items: ['GET', 'HEAD'],
							Quantity: 2
						}
					},
					Compress: true,
					DefaultTTL: 86400,
					LambdaFunctionAssociations: {
						Quantity: 0,
					},
					MaxTTL: 31536000,
					SmoothStreaming: false
				},
				Enabled: true,
				Origins: {
					Quantity: 1,
					Items: [{
						DomainName: container.bucket_url_path,
						Id: container.bucket_url_path,
						CustomOriginConfig: {
							HTTPPort: 80,
							HTTPSPort: 443,
							OriginProtocolPolicy: 'http-only',
							OriginSslProtocols: {
								Quantity: 1,
								Items: ['TLSv1.1']
							}
						}
					}]
				},
				Aliases: {
					Quantity: 1,
					Items: [container.bucket]
				},
				CacheBehaviors: {
					Quantity: 0
				},
				CustomErrorResponses: {
					Quantity: 0
				},
				DefaultRootObject: 'home',
				HttpVersion: 'http2',
				IsIPV6Enabled: true,
				PriceClass: 'PriceClass_100',
				Restrictions: {
					GeoRestriction: {
						Quantity: 0,
						RestrictionType: 'none'
					}
				},
				ViewerCertificate: {
					ACMCertificateArn: container.cert_arn,
					CloudFrontDefaultCertificate: false,
					MinimumProtocolVersion: 'TLSv1.1_2016',
					SSLSupportMethod: 'sni-only'
				}
			}
		};

		//
		//	2.	Create the distribution
		//
		container.cloudfront.createDistribution(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	2.	Save the unique domain name of CloudFront which will
			//		be used to create a DNS record so the domain will
			//		point in the right place
			//
			container.cloudfront_domain_name = data.Distribution.DomainName

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Get all the DNS settings for a specific domain so we can see if what
//	we want to set can be set.
//
function get_all_domain_records(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tGetting all the Domain Records...");

		//
		//	1.	Specify the Domain that we want the date from
		//
		params = {
			HostedZoneId: container.zone_id
		};

		//
		//	2.	Request all the DSN records
		//
		container.route53.listResourceRecordSets(params, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	2.	Save the result for the next chain
			//
			container.entries = data.ResourceRecordSets

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Loop over the DNS records and check if the record type that we want to
//	already exists
//
function look_for_domain_entry(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.yellow("\tLooking for domain entry...");

		//
		//	1.	Create a variable that will store the DNS entry
		//
		let dns_entry = null;

		//
		//	2.	Loop over all the Zones that we got to look for the
		//		domain and grab the Zone ID
		//
		for(let key in container.entries)
		{
			//
			//	1.	Check if the domain name entry matches our own
			//
			if(container.entries[key].Name == container.bucket + '.')
			{
				//
				//	1.	Once the have the domain matching see if it has a
				//		record of type A
				//
				if(container.entries[key].Type == 'A')
				{
					//
					//	1.	Save the whole object since it is needed to
					//		delete the entry, and this whole object is
					//		used to match the delete action
					//
					dns_entry = container.entries[key]

					//
					//	->	Brake to preserve CPU cycles
					//
					break;
				}
			}
		}

		//
		//	3.	Save the entry for the next entry
		//
		container.dns_entry = dns_entry;

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});
}

//
//	Make sure that if there is already a A entry in the domain setting we
//	remove it before adding the new one.
//
function delete_domain_entry(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1. Check if a record was found
		//
		if(!container.dns_entry)
		{
			//
			//	->	Move to the next step
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tDeleting duplicate entry...");

		//
		//	2.	Create the Delete action for Route 53
		//
		let params = {
			ChangeBatch: {
				Changes: [{
					Action: "DELETE",
					ResourceRecordSet: container.dns_entry
				}]
			},
			HostedZoneId: container.zone_id
		};

		//
		//	3.	Perform the action on Route 53
		//
		container.route53.changeResourceRecordSets(params, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	2.	Wait few sec since the delete action is not instant, but
			//		it is fast enough that constantly checking is overkill
			//
			setTimeout(function() {

				//
				//	->	Move to the next step
				//
				return resolve(container);

			}, 3000)

		});

	});
}

//
//	Create a DNS entry that will point the domain to the CloudFront
//	Distribution. If the domain is not found in Route 53 we just display
//	what needs to be set in the DNS
//
function create_a_route_53_record(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Update a record only if we have the domain in ROute 53
		//
		if(!container.zone_id)
		{
			//
			//	-> Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tCreating a new Entry...");

		//
		//	2.	All the options to add a new record
		//
		let options = {
			ChangeBatch: {
				Changes: [{
					Action: "CREATE",
					ResourceRecordSet: {
						AliasTarget: {
							DNSName: container.cloudfront_domain_name,
							EvaluateTargetHealth: false,
							HostedZoneId: 'Z2FDTNDATAQYW2' // Fixed ID CloudFront distribution
						},
						Name: container.bucket,
						Type: "A"
					}
				}],
				Comment: "S3 Hosted Site"
			},
			HostedZoneId: container.zone_id
		};

		//
		//	3.	Execute the change on Route 53
		//
		container.route53.changeResourceRecordSets(options, function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	If we don't have the domain in Route 53 then we just print out
//	what needs to be set in the domain to make sure all the traffic
//	goes to CloudFront
//
function print_domain_configuration(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this step if we have the domain in Route 53 because
		//		it means that we were able to automatically update
		//		the record
		//
		if(container.zone_id)
		{
			//
			//	-> Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.brightWhite("\tPlease update your DNS record with the following...");

		term("\n");

		term.brightWhite("\tPoint your domain name " + container.domain + " to the following A record");

		term("\n");

		term.brightWhite("\t" + container.cloudfront_domain_name);

		term("\n");
		term("\n");

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});
}