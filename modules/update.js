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
			//	2.	The variable that will hold all the buckets names
			//
			let buckets = [];

			//
			//	3.	Loop over the result and add the name to the array
			//
			data.Buckets.forEach(function(bucket) {

				//
				//	1.	Add the name to the array
				//
				buckets.push(bucket.Name);

			});

			//
			//	4.	Save the bucket names for the next chain
			//
			container.buckets = buckets;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});
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