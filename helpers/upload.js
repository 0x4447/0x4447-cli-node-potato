let fs = require('fs');
let read = require('fs-readdir-recursive')
let mime = require('mime-types')
let path = require('path');
let term = require('terminal-kit').terminal;

//
//	This variable allows the progress bar to be drawn
//
let progress_bar;

//
//	This Promises is responsible for just uploading files to S3.
//
module.exports = function(container) {

	return new Promise(function(resolve, reject) {

		read_all_files(container)
			.then(function(container) {

				return proxy_uploader(container)

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
//	Read all the files in the directory while skipping some that we don't
//	need on S3
//
function read_all_files(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Read all file recursively
		//
		let files = read(container.dir, function(name) {

			if(name == '.git') 			return false;
			if(name == '.gitignore') 	return false;
			if(name == '.DS_Store') 	return false;
			if(name == 'README.md') 	return false;

			return true;

		});

		//
		//	2.	Save all the files path that we got
		//
		container.files = files;

		//
		//	->	Move to the next chain
		//
		return resolve(container);

	});
}

//
//	This promises is responsible for drawing on the screen the progress bar
//	the first time and then start the upload process in a way that we wait
//	for the upload process to finish.
//
function proxy_uploader(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Upload to S3 only if we actually have files to be uploaded.
		//
		if(container.files.length === 0)
		{
			//
			//	->	Move to the next chain
			//
			return resolve(container);
		}

		//
		//	2.	Draw on the screen a message letting the user know
		//		what to expect from this upload process
		//
		term.clear();

		term("\n");

		term.brightWhite("\tUpload process begun...");

		term("\n");

		term.brightWhite("\tFrom this point on, you won't be needed.");

		term("\n");

		term.brightWhite("\tTake a brake...");

		term("\n");
		term("\n");

		//
		//	3.	Draw the progress bar with default options
		//
		progress_bar = term.progressBar({
			width: 80,
			title: '\tUploading:',
			percent: true,
			eta: true,
			items: container.files.length
		});

		//
		//	4.	Call the function responsible for uploading files to S3 in
		//		a way where its wait for the upload process to finish.
		//
		uploader(container, function(error) {

			//
			//	1.	Check if there was an error
			//
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

//	 ______  _    _  _   _   _____  _______  _____  ____   _   _   _____
//	|  ____|| |  | || \ | | / ____||__   __||_   _|/ __ \ | \ | | / ____|
//	| |__   | |  | ||  \| || |        | |     | | | |  | ||  \| || (___
//	|  __|  | |  | || . ` || |        | |     | | | |  | || . ` | \___ \
//	| |     | |__| || |\  || |____    | |    _| |_| |__| || |\  | ____) |
//	|_|      \____/ |_| \_| \_____|   |_|   |_____|\____/ |_| \_||_____/
//

//
//	The main upload function that will loop over all the files that
//	we read and stop only once there are no more files to be uploaded.
//
function uploader(container, callback)
{
	//
	//	1.	Take out a file path from the array
	//
	let file = container.files.shift();

	//
	//	2.	Check if we got anything from the previous operation.
	//
	if(!file)
	{
		//
		//	->	Exit this function and return to the promise chain
		//
		return callback();
	}

	//
	//	3.	Construct the full path to the file so it can be red
	//
	let full_path_file = container.dir + '/' + file

	//
	//	4.	Figure out the Mime type of the file so we can tell S3
	//		what file is it dealing with. This way the page will be
	//		displayed, if not the site will be downloaded instead of
	//		displayed.
	//
	let mime_type = mime.lookup(full_path_file)

	//
	//	5.	If we weren't able to get a mime type then we set a default one
	//		of just plain text.
	//
	if(!mime_type)
	{
		mime_type = 'text/plain';
	}

	//
	//	6.	Get the name of the file by discarding the format and the path
	//
	let base_name = path.basename(file);

	//
	//	7.	Tell the progress bar the name of the first item
	//
	progress_bar.startItem(base_name);

	//
	//	8.	Prepare the options for S3
	//
	let params = {
		Bucket: container.bucket,
		Key: file,
		ContentType: mime_type,
		Body: fs.createReadStream(full_path_file)
	};

	//
	//	9.	Upload the file to S3 as a Stream
	//
	container.s3.upload(params, function(error, data) {

		//
		//	1.	Check if there was an error
		//
		if(error)
		{
			return callback(error);
		}

		//
		//	2.	Tell the progress bar which item is done
		//
		progress_bar.itemDone(file);

		//
		//	->	Restart the function to see if we can upload another file
		//
		uploader(container, callback)

	});
}