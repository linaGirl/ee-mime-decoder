
	
	var   Class 			= require('ee-class')
		, log 				= require('ee-log')
		, assert 			= require('assert')
		, travis 			= require('ee-travis')
		, fs 				= require('fs')
		, Decoder 			= require('../')
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
				part.hash = md5(stream.data);
			});
			part.pipe(stream);
		}
	}


	var calculateMessageHash = function(message) {
		var hash = '';
		(message.parts || []).forEach(function(part){
			if (part.hash) hash += part.hash;
			else if (part.data) hash += md5(part.data);
			hash += calculateMessageHash(part);
		});

		return hash;
	}



	describe('The Decoder', function(){
		it('Should be able to decode message 1', function(done){
			var decoder = new Decoder();

			decoder.on('data', handleStream);

			decoder.on('end', function(){
				var message = decoder.getMessage();
				assert.equal('25d33c61d72c4f62c88c9e4332c80de0', calculateMessageHash(message), 'message hash is different!')
				done();
			});

			fs.createReadStream(project.root+'test/msg1.mime').pipe(decoder);
		});



		it('Should be able to decode message 2', function(done){
			var decoder = new Decoder();

			decoder.on('data', handleStream);

			decoder.on('end', function(){
				var message = decoder.getMessage();
				assert.equal('25d33c61d72c4f62c88c9e4332c80de0680b19a5a4ab2c3f8411d8ee5eedbc37', calculateMessageHash(message), 'message hash is different!')
				done();
			});

			fs.createReadStream(project.root+'test/msg2.mime').pipe(decoder);
		});



		it('Should be able to decode message 3', function(done){
			var decoder = new Decoder();

			decoder.on('data', handleStream);

			decoder.on('end', function(){
				var message = decoder.getMessage();
				assert.equal('b2f37d2a842bba7e65dda555acf7a31534fa42efd280978cd7c25620ff0e55af5a44dda67ac19503e5a196cdb00b7ce2', calculateMessageHash(message), 'message hash is different!')
				done();
			});

			fs.createReadStream(project.root+'test/msg3.mime').pipe(decoder);
		});



		it('Should be able to decode message 4', function(done){
			var decoder = new Decoder();

			decoder.on('data', handleStream);

			decoder.on('end', function(){
				var message = decoder.getMessage();
				assert.equal('fc2e32e44349ac11db1cca51149b5ad3e959e4e446fab9556f881dcb43682aca', calculateMessageHash(message), 'message hash is different!')
				done();
			});

			fs.createReadStream(project.root+'test/msg4.mime').pipe(decoder);
		});



		it('Should be able to decode message 5', function(done){
			var decoder = new Decoder('multipart/mixed; boundary="----------------------------722570873451616639732247"');

			decoder.on('data', handleStream);

			decoder.on('end', function(){
				var message = decoder.getMessage();
				assert.equal('fb93818d01553e9fead6873b780580aec239dddc9c7a19eef9af0052da451a8a', calculateMessageHash(message), 'message hash is different!')
				done();
			});

			fs.createReadStream(project.root+'test/msg5.mime').pipe(decoder);
		});
	});
