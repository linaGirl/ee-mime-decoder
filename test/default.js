
	
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
			});
			part.pipe(stream);
		}
	}


	var calculateMessageHash = function(message) {
		var hash = '';
		(message.parts || []).forEach(function(part){ //log.error('part---', part.getHeader('content-disposition'), part);
			if (part.data !== undefined) hash += md5(part.data);
			hash += calculateMessageHash(part);
		});

		return hash;
	}

	var tests = [0,1,2,3,4,5];


	describe('The Decoder', function(){
		if (tests.indexOf(0) >= 0){
			it('Should be able to decode message 1', function(done){
				var decoder = new Decoder();

				decoder.on('data', handleStream);

				decoder.on('end', function(){
					var message = decoder.getMessage();
					assert.equal('d41d8cd98f00b204e9800998ecf8427e03dcf7ae67d521b573d381764ebbc42f', calculateMessageHash(message), 'message hash is different!')
					done();
				});

				fs.createReadStream(project.root+'test/msg1.mime').pipe(decoder);
			});
		}



		if (tests.indexOf(1) >= 0){
			it('Should be able to decode message 2', function(done){
				var decoder = new Decoder();

				decoder.on('data', handleStream);

				decoder.on('end', function(){
					var message = decoder.getMessage();
					assert.equal('8fd00b79a57ca636c5269a06ed3e20eb', calculateMessageHash(message), 'message hash is different!')
					done();
				});

				fs.createReadStream(project.root+'test/msg2.mime').pipe(decoder);
			});
		}



		if (tests.indexOf(2) >= 0){
			it('Should be able to decode message 3', function(done){
				var decoder = new Decoder();

				decoder.on('data', handleStream);

				decoder.on('end', function(){
					var message = decoder.getMessage();
					assert.equal('fa8053b8c2f30c132b7b3c98a61976f837c7640ae14c9ad09b27823098dc8141', calculateMessageHash(message), 'message hash is different!')
					done();
				});

				fs.createReadStream(project.root+'test/msg3.mime').pipe(decoder);
			});
		}



		if (tests.indexOf(3) >= 0){
			it('Should be able to decode message 4', function(done){
				var decoder = new Decoder();

				decoder.on('data', handleStream);

				decoder.on('end', function(){
					var message = decoder.getMessage();
					assert.equal('23c0a943fbebe080fd399d6d6f5c6cd752f8e7716afa2ef5cfebb17d587c63c4', calculateMessageHash(message), 'message hash is different!')
					done();
				});

				fs.createReadStream(project.root+'test/msg4.mime').pipe(decoder);
			});
		}



		if (tests.indexOf(4) >= 0){
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
		}



		if (tests.indexOf(5) >= 0){
			it('Should be able to decode message 6', function(done){
				var decoder = new Decoder('multipart/form-data; boundary=AaB03x');

				decoder.on('data', handleStream);

				decoder.on('end', function(){
					var message = decoder.getMessage();
					assert.equal('4debfdb23bf13d11084b5f6f42f93b897a22164bf25f145183087da4784e81f8cd3b27fe8dee2773db1b7bd3297454cf', calculateMessageHash(message), 'message hash is different!')
					done();
				});

				fs.createReadStream(project.root+'test/msg6.mime').pipe(decoder);
			});
		}
	});
