let fs = require('fs');
let term = require('terminal-kit').terminal;
let read = require('fs-readdir-recursive')
let mime = require('mime-types')
let path = require('path');

module.exports = function(container) {

	return new Promise(function(resolve, reject) {

		get_s3_buckets(container)
			.then(function(container) {

				return pick_a_bucket(container);

			}).then(function(container) {

				return read_all_files(container);

			}).then(function(container) {

				return proxy_uploader(container);

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
//	Read the configuration file
//
function get_s3_buckets(container)
{
	return new Promise(function(resolve, reject) {

		container.s3.listBuckets(function(error, data) {

			//
			//	1.	Check if there was an error
			//
			if(error)
			{
				return reject(error);
			}

			let buckets = []

			data.Buckets.forEach(function(bucket) {

				buckets.push(bucket.Name);

			});

			container.buckets = buckets;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});
	});
}

//
//	Make sure the Configuration file is actually available in the system
//
function pick_a_bucket(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		//
		//	1.	Draw the menu with one tab to the left to so the UI stay
		//		consistent
		//
		let options = {
			leftPadding: "\t"
		}

		//
		//	2.	Tell the user what we want from hi or her
		//
		term.yellow("\tChoose the bucket that you want to update");

		term('\n');

		//
		//	3.	Draw the drop down menu
		//
		term.singleColumnMenu(container.buckets, options, function(error, res) {

			term("\n");

			term.yellow("\tLoading...");

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



//
//	Read all the files in the directory
//
function read_all_files(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	2.	Read all file recursively
		//
		let files = read(container.dir)
					.filter(function(name) {

						if(name[0] !== '.')
						{
							return true;
						}

					}).filter(function(name) {

						if(name !== 'README.md')
						{
							return true;
						}

					});

		//
		//	3.	Save all the files that we got
		//
		container.files = files;

		//
		//	->	Move to the next chain
		//
		return resolve(container);

	});
}

//
//	Read all the files in the directory
//
function proxy_uploader(container)
{
	return new Promise(function(resolve, reject) {

		term.clear();

		term("\n");

		term.brightWhite("\tUpload process begun...");

		term("\n");

		term.brightWhite("\tFrom this point on, you won't be needed.");

		term("\n");

		term.brightWhite("\tTake a brake...");

		term("\n");
		term("\n");

		progress_bar = term.progressBar({
			width: 80,
			title: '\tUploading:',
			percent: true,
			eta: true,
			items: container.files.length
		});

		uploader(container, function() {

			//
			//	->	Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Read all the files in the directory
//
function invalidate_cloudfront(container)
{
	return new Promise(function(resolve, reject) {

		var params = {
			DistributionId: container.distribution_id,
			InvalidationBatch: {
				CallerReference: new Date().toString(),
				Paths: {
					Quantity: 1,
					Items: ["/*"]
				}
			}
		};

		container.cloudfront.createInvalidation(params, function(error, data) {

			if(error)
			{
				return reject(error);
			}

			//
			//	->	Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Make sure the Configuration file is actually available in the system
//
function uploader(container, callback)
{

	let file = container.files.shift();

	if(!file)
	{
		return callback();
	}

	let full_path_file = container.dir + '/' + file

	let mime_type = mime.lookup(full_path_file)


	let base_name = path.basename(file);

	progress_bar.startItem(base_name);

	let params = {
		Bucket: container.bucket,
		Key: file,
		ContentType: mime_type,
		Body: fs.createReadStream(full_path_file)
	};

	container.s3.upload(params, function(error, data) {

		//
		//	1.	Check if there was an error
		//
		if(error)
		{
			return reject(error);
		}

		progress_bar.itemDone(file);

		//
		//
		//
		uploader(container, callback)

	});


}