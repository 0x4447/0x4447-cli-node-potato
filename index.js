#!/usr/bin/env node

let npm = require('./package.json');
let aws = require('aws-sdk');
let term = require('terminal-kit').terminal;
let update = require('./modules/update');
let create = require('./modules/create');
let program = require('commander');
let request = require('request');

//   _____   ______   _______   _______   _____   _   _    _____    _____
//  / ____| |  ____| |__   __| |__   __| |_   _| | \ | |  / ____|  / ____|
// | (___   | |__       | |       | |      | |   |  \| | | |  __  | (___
//  \___ \  |  __|      | |       | |      | |   | . ` | | | |_ |  \___ \
//  ____) | | |____     | |       | |     _| |_  | |\  | | |__| |  ____) |
// |_____/  |______|    |_|       |_|    |_____| |_| \_|  \_____| |_____/
//

//
//	The CLI options for this app. At this moment we just support Version
//
program
	.version(npm.version)
	.option('-s, --source [type]', 		'path to the folder to upload')
	.option('-u, --update', 			'perform an update')
	.option('-c, --create', 			'create a new site')
	.option('-b, --bucket [type]', 		'S3 bucket name')
	.option('-d, --domain [type]', 		'domain of the site')
	.option('-a, --access_key [type]', 	'The Access Key of your AWS Account')
	.option('-t, --secret_key [type]', 	'The Secret Access Key of your AWS Account')
	.parse(process.argv);

//
//	Just add an empty line at the end of the help to make the text more clear
//	to the user
//
program.on('--help', function() {
	console.log("");
});

//
//	Pass the user input to the module
//
program.parse(process.argv);

//
//	Listen for key preses
//
term.on('key', function(name, matches, data ) {

	//
	//	1.	If we detect CTR+C we kill the app
	//
	if(name === 'CTRL_C' )
	{
		//
		//	1. 	Lets make a nice user experience and clean the terminal window
		//		before closing the app
		//
		term.clear();

		//
		//	->	Kill the app
		//
		process.exit();
	}

});

//
//	Check if the user provided the dir source where to copy the file from
//
if(!program.source)
{
	console.log('Missing source');
	process.exit(0);
}

//	 __  __              _____   _   _
//	|  \/  |     /\     |_   _| | \ | |
//	| \  / |    /  \      | |   |  \| |
//	| |\/| |   / /\ \     | |   | . ` |
//	| |  | |  / ____ \   _| |_  | |\  |
//	|_|  |_| /_/    \_\ |_____| |_| \_|
//

//
//	Before we start working, we clean the terminal window
//
term.clear();

//
//	The main container that will be passed around in each chain to collect
//	all the data and keep it in one place
//
let container = {
	dir: process.cwd() + "/" + program.source,
	region: 'us-east-1',
	ask_for_credentials: true
};

//
//	Start the chain
//
check_for_ec2_role(container)
	.then(function(container) {

		return check_for_codebuild_role(container);

	}).then(function(container) {

		return save_cli_data(container);

	}).then(function(container) {

		return display_the_welcome_message(container);

	}).then(function(container) {

		return ask_for_aws_key(container);

	}).then(function(container) {

		return ask_for_aws_secret(container);

	}).then(function(container) {

		return create_aws_objects(container);

	}).then(function(container) {

		return ask_what_to_do(container);

	}).then(function(container) {

		return crossroad(container);

	}).then(function(container) {

		term("\n");
		term("\n");

		//
		//	->	Exit the app
		//
		process.exit();

	}).catch(function(error) {

		//
		//	1.	Clear the screen of necessary text
		//
		term.clear();

		term("\n\n");

		//
		//	2.	Show the error message
		//
		term.red("\t" + error);

		term("\n\n");

		//
		//	->	Exit the app
		//
		process.exit(-1);

	});

//  _____    _____     ____    __  __   _____    _____   ______    _____
// |  __ \  |  __ \   / __ \  |  \/  | |_   _|  / ____| |  ____|  / ____|
// | |__) | | |__) | | |  | | | \  / |   | |   | (___   | |__    | (___
// |  ___/  |  _  /  | |  | | | |\/| |   | |    \___ \  |  __|    \___ \
// | |      | | \ \  | |__| | | |  | |  _| |_   ____) | | |____   ____) |
// |_|      |_|  \_\  \____/  |_|  |_| |_____| |_____/  |______| |_____/
//

//
//	Query the EC2 Instance Metadata to find out if a IAM Role is attached
//	to the instance, this way we can either ask the user for credentials
//	or let the SDK use the Role attached to the EC2 Instance
//
function check_for_ec2_role(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Prepare the request information
		//
		let options = {
			url: 'http://169.254.169.254/latest/meta-data/iam/',
			timeout: 1000
		}

		//
		//	2.	Make the request
		//
		request.get(options, function(error, data) {

			//
			//	1.	We don't check for an error since when you use the
			//		timeout flag, request will throw an error when the time
			//		out happens.
			//
			//		In this case we just don't want for this check to hang
			//		forever
			//

			//
			//	2.	Check to see if we got something back. If Potato
			//		is running on a EC2 instance we should get back the
			//		ROLE_NAME. And if that is the case we know that the
			//		AWS SDK will pick the credentials from the Role
			//		attached to the EC2 Instance.
			//
			if(data)
			{
				if(data.body.length > 0)
				{
					container.ask_for_credentials = false
				}
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Query the CodeBuild Docker Containerto find out if a IAM Role is attached
//	to the container, this way we can either ask the user for credentials
//	or let the SDK use the Role attached to the EC2 Instance
//
function check_for_codebuild_role(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Prepare the request information
		//
		let options = {
			url: 'http://169.254.170.2' + process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI,
			timeout: 1000
		}

		//
		//	2.	Make the request
		//
		request.get(options, function(error, data) {

			//
			//	1.	We don't check for an error since when you use the
			//		timeout flag, request will throw an error when the time
			//		out happens.
			//
			//		In this case we just don't want for this check to hang
			//		forever
			//

			//
			//	2.	Check to see if we got something back. If Potato
			//		is running on a EC2 instance we should get back the
			//		ROLE_NAME. And if that is the case we know that the
			//		AWS SDK will pick the credentials from the Role
			//		attached to the EC2 Instance.
			//
			if(data)
			{
				if(data.body.length > 0)
				{
					//
					//	1.	Convert JSON to a JS Object
					//
					let body = JSON.parse(data.body);

					//
					//	2.	Check to see if we got something back. If Potato
					//		is running inside a container in CodeBuild we should get
					//		back the RoleArn. And if that is the case we know that the
					//		AWS SDK will pick the credentials from the Role
					//		attached to CodeBuild Instance.
					//
					if(body.RoleArn)
					{
						container.ask_for_credentials = false
					}
				}
			}

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Check what type of information was passed and save it so we can skip
//	some menu actions and run the command programmatically
//
function save_cli_data(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Check if one of the options is enabled
		//
		if(program.create || program.update)
		{
			//
			//	1.	By default assume always that we are dealing with
			//		an update.
			//
			container.selection = 'Update';

			//
			//	2.	Check if we need to change opinion.
			//
			if(program.create)
			{
				container.selection = 'Create';
			}
		}

		//
		//	2.	Check if the bucket name was passed.
		//
		if(program.bucket)
		{
			container.bucket = program.bucket;
		}

		//
		//	3.	Check if the user passed the credentials in the CLI
		//
		if(program.access_key && program.secret_key)
		{
			//
			//	1.	Save the credentials passed in the CLI
			//
			container.aws_access_key_id 		= program.access_key;
			container.aws_secret_access_key 	= program.secret_key;

			//
			//	2.	Mark this run not to ask the user for the credentials
			//		since the information was passed in the CLI.
			//
			container.ask_for_credentials = false;
		}

		//
		//	->	Move to the next promise
		//
		return resolve(container);

	});


}

//
//	Draw on the screen a nice welcome message to show our user how
//	cool we are :)
//
function display_the_welcome_message(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Don't display the welcome message if we are dealing with the
		//		CLI
		//
		if(program.create || program.update)
		{
			//
			//	->	Move to the next promise
			//
			return resolve(container);
		}

		term("\n");

		//
		//	2.	Set the options that will draw the banner
		//
		let options = {
			flashStyle: term.brightWhite,
			style: term.brightYellow,
			delay: 20
		}

		//
		//	3.	The text to be displayed on the screen
		//
		let text = "\tStarting Potato";

		//
		//	4.	Draw the text
		//
		term.slowTyping(text, options, function() {

			//
			//	->	Move to the next step once the animation finishes drawing
			//
			return resolve(container);

		});

	});
}

//
//	Make sure the Configuration file is actually available in the system
//
function ask_for_aws_key(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Check if we have to ask the for credentials
		//
		if(!container.ask_for_credentials)
		{
			//
			//	-> Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		//
		//	2.	Ask input from the user
		//
		term.yellow("\tPlease paste your AWS Access Key ID: ");

		//
		//	3.	Listen for the user input
		//
		term.inputField({}, function(error, aws_access_key_id) {

			term("\n");

			term.yellow("\tLoading...");

			//
			//	1.	Save the URL
			//
			container.aws_access_key_id = aws_access_key_id;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	Make sure the Credentials file is actually available in the system
//
function ask_for_aws_secret(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Check if we have to ask the for credentials
		//
		if(!container.ask_for_credentials)
		{
			//
			//	-> Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		//
		//	1.	Ask input from the user
		//
		term.yellow("\tPlease paste your AWS Secret Access Key: ");

		//
		//	2.	Listen for the user input
		//
		term.inputField({}, function(error, aws_secret_access_key) {

			term("\n");

			term.yellow("\tLoading...");

			//
			//	1.	Save the URL
			//
			container.aws_secret_access_key = aws_secret_access_key;

			//
			//	-> Move to the next chain
			//
			return resolve(container);

		});

	});
}

//
//	After we get all the necessary credentials we use them to create
//	all the AWS object used to programmatically make all the work
//
function create_aws_objects(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Create basic settings for the constructor
		//
		let s3 = {
			region: container.region
		}

		let cloudfront = {
			region: container.region
		}

		let route53 = {
			region: container.region
		}

		let acm = {
			region: container.region
		}

		//
		//	2.	Update constructor settings if the user had to past the
		//		credentials
		//
		if(container.ask_for_credentials)
		{
			s3.accessKeyId = container.aws_access_key_id
			s3.secretAccessKey = container.aws_secret_access_key

			cloudfront.accessKeyId = container.aws_access_key_id
			cloudfront.secretAccessKey = container.aws_secret_access_key

			route53.accessKeyId = container.aws_access_key_id
			route53.secretAccessKey = container.aws_secret_access_key

			acm.accessKeyId = container.aws_access_key_id
			acm.secretAccessKey = container.aws_secret_access_key
		}

		//
		//	3.	Create the AWS S3 object
		//
		container.s3 = new aws.S3(s3);

		//
		//	4.	Create the AWS CloudFront object
		//
		container.cloudfront = new aws.CloudFront(cloudfront);

		//
		//	5.	Create the AWS Route 53 object
		//
		container.route53 = new aws.Route53(route53);

		//
		//	6. Create the AWS Certificate Manager object
		//
		container.acm = new aws.ACM(acm);

		//
		//	-> Move to the next chain
		//
		return resolve(container);

	});
}

//
//	Ask the user what to do, since this app can create or update a project
//
function ask_what_to_do(container)
{
	return new Promise(function(resolve, reject) {

		//
		//	1.	Skip this view if the information was already passed in the
		//		CLI
		//
		if(container.selection)
		{
			//
			//	->	Move to the next chain
			//
			return resolve(container);
		}

		term.clear();

		term("\n");

		term.yellow("\tUpdate or create a new website?");

		term('\n');

		//
		//	2.	Default settings how to draw the ASCII menu
		//
		let options = {
			leftPadding: "\t"
		};

		//
		//	3.	The two options to show the user
		//
		let question = [
			'Update',
			'Create'
		];

		//
		//	4.	Draw the drop down menu
		//
		term.singleColumnMenu(question, options, function(error, res) {

			term("\n");
			term("\n");

			term.yellow("\tLoading...");

			term("\n");
			term("\n");

			//
			//	1.	Get the Property name based on the user selection
			//
			let selection = question[res.selectedIndex];

			//
			//	2.	Save the user selection
			//
			container.selection = selection;

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
//	This is a function that depending on the option selected by the user
//	returns just one specific promises that will then perform the
//	action selected by the user.
//
function crossroad(container)
{
	if(container.selection == 'Update')
	{
		return update(container);
	}

	if(container.selection == 'Create')
	{
		return create(container);
	}
}
