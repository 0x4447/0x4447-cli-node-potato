let term = require('terminal-kit').terminal;
let upload = require('../helpers/upload');

//
//	This promises is responsible for updating the content of a selected
//	S3 bucket and invalidating the CloudFront Distribution Cash
//
module.exports = function(container) {

	return new Promise(function(resolve, reject) {

		get_s3_buckets(container)
			.then(function(container) {

				return query_for_bucket_policy(container);

			}).then(function(container) {

				return find_out_which_bucket_is_public(container);

			}).then(function(container) {

				return pick_a_bucket(container);

			}).then(function(container) {

				return upload(container);

			}).then(function(container) {

				return list_cloudfront_distributions(container);

			}).then(function(container) {

				return look_for_distribution_id(container);

			}).then(function(container) {

				return invalidate_cloudfront(container);

			}).then(function(container) {

				return resolve(container);

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
//	Read all the buckets that are hosted on this S3 account
//
function get_s3_buckets(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this view if the information was already passed in the
		//		CLI
		//
		if(container.bucket)
		{
			//
			//	->	Move to the next chain
			//
			return resolve(container);
		}

		//
		//	2.	List all buckets
		//
		container.s3.listBuckets(function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			//
			//	2.	Save the bucket names for the next chain
			//
			container.raw_buckets = data.Buckets;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});
	});
}

//
//	Get the ACL for each bucket so we can later filter out and keep only
//	buckets that are public. So we shorten the list of the buckets that we
//	show up.
//
function query_for_bucket_policy(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	An array that will hold all the promises to get the ACL
		//		for each bucket.
		//
		let promises = [];

		//
		//	2.	Loop over the result and add the name to the array
		//
		container.raw_buckets.forEach(function(bucket) {

			//
			//	1.	Add the promise to the array to be executed later with
			//		Promise.all().
			//
			promises.push(

				new Promise(function(resolve, reject) {

					container.s3.getBucketPolicy({
						Bucket: bucket.Name
					}, function(error, bp) {

						//
						//	1.	Do not check for errors because if a bucket
						//		is in a different region the AWS SDK will
						//		throw the error, and those errors we don't
						//		care about.
						//
						if (error) { }

						//
						//	2.	By default we assume there was no Policy
						//		attached to the bucket
						//
						let statement = null;

						//
						//	3.	Check if the policy is in place
						//
						if(bp)
						{
							//
							//	1.	Just save the first statement which in
							//		this case will always have just one
							//		object in the array. Which potato adds
							//		to make the bucket accessible for CloudFront
							//
							statement = JSON.parse(bp.Policy).Statement[0]
						}

						//
						//	->	Return the result
						//
						return resolve({
							bucket_name: bucket.Name,
							statement: statement
						});

					})

				})

			);

		});

		//
		//	3.	Execute all the quires to AWS S3.
		//
		Promise.all(promises)
		.then(function(data) {

			//
			//	->	Save the result for the next chain.
			//
			container.bucket_policys = data;

			//
			//	-> Move to the next chain.
			//
			return resolve(container);

		}).catch(function(error) {

			//
			//	->	Stop the chain and surface the error.
			//
			return reject(error);

		});

	});
}

//
//	Loop over the bucket that were enriched with Policy data and find out the
//	public buckets, and discard the rest.
//
function find_out_which_bucket_is_public(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	The array that will hold only the public buckets.
		//
		let public_buckets = [];

		//
		//	2.	Loop over each bucket and check for the right Policy.
		//
		container.bucket_policys.forEach(function(data) {

			//
			//	1.	Check if we have a policy.
			//
			if(data.statement)
			{
				//
				//	1.	Convert the strings that we care about in to boolean
				//		values.
				//
				let effect 		= (data.statement.Effect 	== 'Allow') 		? true : false;
				let principal 	= (data.statement.Principal == '*') 			? true : false;
				let action 		= (data.statement.Action 	== 's3:GetObject') 	? true : false;

				//
				//	2.	Sum all of our boolean values and see if we got all
				//		3 metrics that describe a public bucket.
				//
				if((effect + principal + action) == 3)
				{
					//
					//	1.	Save he bucket for other promises to use.
					//
					public_buckets.push(data.bucket_name)
				}
			}

		});

		//
		//	3.	Save the public bucket names for the next chain
		//
		container.buckets = public_buckets;

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});
}

//
//	Ask the user to pick a bucket to be updated
//
function pick_a_bucket(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this view if the information was already passed in the
		//		CLI
		//
		if(container.bucket)
		{
			//
			//	->	Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tChoose the bucket that you want to update");

		term('\n');

		//
		//	2.	Draw the menu with one tab to the left to so the UI stay
		//		consistent
		//
		let options = {
			leftPadding: "\t"
		}

		//
		//	3.	Draw the drop down menu
		//
		term.singleColumnMenu(container.buckets, options, function(error, res) {

			//
			//	1.	Get the Property name based on the user selection
			//
			let bucket = container.buckets[res.selectedIndex];

			//
			//	2.	Save the selection for other promises to use. It will
			//		be used in API calls
			//
			container.bucket = bucket;

			//
			//	->	Move to the next chain
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
//	Get all the CloudFront Distributions so we can find out the ID that
//	we have to use to invalidate the data, so cloud front will actually
//	show the changes
//
function list_cloudfront_distributions(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Ask for the distributions
		//
		container.cloudfront.listDistributions({}, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	2.	Save the response as is for the next chain
			//
			container.distributions = data.DistributionList.Items

			//
			//	->	Move to the next step once the animation finishes drawing
			//
			return resolve(container);

		});

	});
}

//
//	Loop over all the distributions to find out the ID based on the
//	domain name selected by the user
//
function look_for_distribution_id(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Make a variable that will hold the Distribution ID
		//
		let distribution_id = null;

		//
		//	2.	Loop over the result and look for the domain
		//
		for(let key in container.distributions)
		{
			//
			//	1.	See if the distribution contains the domain that we
			//		care about
			//
			if(container.distributions[key].Aliases.Items[0] == container.bucket)
			{
				//
				//	1.	Save the Distribution ID once we found the domain
				//
				distribution_id = container.distributions[key].Id

				//
				//	->	Stop the loop to preserve CPU cycles
				//
				break;
			}
		}

		//
		//	3.	Save the distribution ID for the next chain
		//
		container.distribution_id = distribution_id

		//
		//	->	Move to the next step once the animation finishes drawing
		//
		return resolve(container);

	});
}

//
//	Tell CloudFront to invalidate the cash so it can get new data that we
//	just uploaded
//
function invalidate_cloudfront(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Settings for CloudFront
		//
		let params = {
			DistributionId: container.distribution_id,
			InvalidationBatch: {
				CallerReference: new Date().toString(),
				Paths: {
					Quantity: 1,
					Items: ["/*"]
				}
			}
		};

		//
		//	2.	Invalidate the cash
		//
		container.cloudfront.createInvalidation(params, function(error, data) {

			//
			//	1.	Check if there was no error
			//
			if(error)
			{
				return reject(new Error(error.message));
			}

			//
			//	->	Move to the next chain
			//
			return resolve(container);

		});

	});
}