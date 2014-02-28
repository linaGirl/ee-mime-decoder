
	
	var   Class 			= require('ee-class')
		, log 				= require('ee-log')
		, fs 				= require('fs')
		, Decoder 			= require('./')
		, project 			= require('ee-project')
		, StreamCollector 	= require('ee-stream-collector')
		, crypto 			= require('crypto');


	var md5 = function(buf){
		return crypto.createHash('md5').update(buf).digest('hex');
	}


	// collect stream data in buffer, create hash
	var handleStream = function(part){
		if (part.isStream()) {
			var stream = new StreamCollector();
			stream.on('end', function(){
				part.data = stream.data;
			});
			part.pipe(stream);
		}
	}




	var decoder = new Decoder('multipart/form-data; boundary=AaB03x');

	decoder.on('data', handleStream);

	decoder.on('end', function(){
		var message = decoder.getMessage();
		log(message);
	});

	fs.createReadStream(project.root+'test/msg6.mime').pipe(decoder);

