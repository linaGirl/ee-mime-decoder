

	var   Class 			= require('ee-class')
		, log 				= require('ee-log')
		, argv 				= require('ee-argv')
		, type 				= require('ee-types')
		, TransformStream 	= require('stream').Transform
		, StreamCollector	= require('ee-stream-collector')
		, MimePart 			= require('./MimePart')
		, MimePartStream 	= require('./MimePartStream')
		, MimeHeader 		= require('./MimeHeader');



	var debug = argv.has('debug-mime-decoder');




	var MimeMultiPart = module.exports = new Class( {
		inherits: TransformStream

		, isStream: function(){ return false; }

		/*, buffered: ""
		, offset: 0
		, headersScanned: false*/
		, parts: []
		

		, init: function(options){
			// hide most of the properties (enumerable = false)
			this._setProperty('buffered', '');
			this._setProperty('offset', 0);
			this._setProperty('headersScanned', false);
			this._setProperty('headers');
			this._setProperty('parent');
			this._setProperty('boundary');
			this._setProperty('boundaryMaxLength');
			this._setProperty('currentPart');
			this._setProperty('_boundaryScanRequired');


			this._setProperty('decoder');
			this._setProperty('_readableState');
			this._setProperty('_events');
			this._setProperty('_maxListeners');
			this._setProperty('_writableState');
			this._setProperty('_transformState');
			this._setProperty('domain');
			this._setProperty('readable');
			this._setProperty('writable');
			this._setProperty('allowHalfOpen');
			this._setProperty('pipe', this.pipe);
			this._setProperty('on', this.on);
			this._setProperty('pause', this.pause);
			this._setProperty('resume', this.resume);
			this._setProperty('addListener', this.addListener);

			// initilize the stream
			TransformStream.call(this, {objectMode: true});

			// got a config?
			if (options){
				if (type.object(options.headers)) {

					this.headers 			= options.headers;
					this.parent				= options.parent;
					this.boundary 			= options.boundary;
					this.boundaryMaxLength 	= options.boundaryMaxLength;
					this.headersScanned 	= true;
				}
			}
		}

		, _setProperty: function(key, value) {
			Object.defineProperty(this, key, {value: value, configurable: true, writable: true});
		}

		, get length(){
			return this.parts.length;
		}

		, hasChildren: function(){
			return this.length > 0;
		}

		, hasHeader: function( name ){
			return this.headers.has( name );
		}

		, getHeader: function( name ){
			return this.headers.get( name, true );
		}


		, _getHeaders: function(){
			var result, reg = /((?:\n|\r\n|\n\r){2})/g, oldOffset;

			if (debug) log.error('scanning for header ...');

			reg.lastIndex = this.offset;

			// check if there is enough data for a complete header
			if (result = reg.exec(this.buffered)){
				if (debug) log.error('  header found ...');

				// store the non header part
				oldOffset = this.offset;
				this.offset = result.index + result[1].length;

				if (debug) {
					log.warn('----------------- header text ----------------');
					log(this.buffered.substring(oldOffset, this.offset-result[1].length));
					log.warn('--------------- end header text --------------');
				}

				// do the header parsing
				return new MimeHeader(this.buffered.substring(oldOffset, this.offset-result[1].length));
			}			

			return null;
		}



		, handlePart: function(part){
			this.push(part);
		}



		/*
		 * the _scan method parses the message, calls the callback
		 * when vomplete or an error is encountered
		 *
		 * @param <Function> callabck
		 */
		, _scan: function(callback){
			var   result
				, headers
				, contentType
				, len
				, boundary
				, contentDisposition
				, collector;


			// do we need to scan past the next multipart boundary?
			if (this._boundaryScanRequired) { 
				// set correct offset on boundary
				this.boundary.lastIndex = this.offset;
				if (debug) log.error('  trying to skip next boundary ...');

				if (result = this.boundary.exec(this.buffered)) {
					if (debug) log.error('  skipped ...');
					this._boundaryScanRequired = false;
					this.offset = result.index + result[1].length;
				}

				result = undefined;
			}


			if (debug) {
				log.warn('---------- scanning -----------');
				log.debug('offset: '+this.offset);
				//log('before offset: '+this.buffered.substring(this.offset -40, this.offset))
				//log('after offset: '+this.buffered.substring(this.offset, this.offset+120))
				log.warn('----------------- buffer ---------------------');
				log(this.buffered.substr(this.offset, 2000));
				log.warn('--------------- end buffer -------------------');
			}



			if (this.headersScanned){
				// headers were scanned, extracting content
				if (debug) log.info('  extracting content ...');

				if (this.currentPart){
					// a content part has been created, add data to it
					if (debug) log.info('    working on an existing part ...');

					if (this.boundary){
						// a boundary was defined, search for it ( this is a multipart)
						if (debug) log.info('        working on a multipart message ...');

						// start searching from the current offset in the buffer
						this.boundary.lastIndex = this.offset;


						// find next boundary, the end of the current part
						if (result = this.boundary.exec(this.buffered)){
							if (debug) log.info('          found the next boundary ...');

							// boundary was found, write it to the current part
							this.currentPart.write(this.buffered.substring(this.offset, result.index), function(err){
								if (err) callback(err);
								else {
									// the current part can be ended
									this.currentPart.end(function(err){
										if (err) callback(err);
										else {
											// tell the scanner to create a new part
											delete this.currentPart;

											// remove all data not used anymore, reset offset
											this.buffered = this.buffered.substr(result.index + result[1].length);
											this.offset = 0;

											// look for the next part
											this._scan(callback);
										}
									}.bind(this));									
								}
							}.bind(this));
						}
						else {	
							if (debug) log.info('        boundary not found, buffering content, waiting for more data ...');			
							// write all data exept for th elast bytes which may be used by the next boundary (dont cut it)
							len = this.buffered.length - this.boundaryMaxLength;
							this.currentPart.write(this.buffered.substring(this.offset, len > 0 ? len : 0), callback);

							// slice buffer, reset offset
							this.buffered = this.buffered.substr(len);
							this.offset = 0;
						}
					}
					else {
						if (debug) log.info('      emptying buffer into current part (simple part) ...');
						// not a multipart, write all available data, reset buffer
						this.currentPart.write(this.buffered.substr(this.offset), callback);
						this.buffered = '';
						this.offset = 0;
					}
				}
				else {
					if (debug) log.info('    starting on a new part, looking for headers ...');
					// we're goig to start a new part, look for headers first
					headers = this._getHeaders();

					if (headers){
						if (debug) log.info('      headers found ...');

						// headers found, start f a new part
						contentType = headers.get('content-type', true);						

						// decide if we're going to work on a multipart message or on a simple part
						if (contentType.value.toLowerCase().indexOf('multipart/') === 0) {
							// new multipart part
							if (debug) log.info('        starting a new multipart message ...');

							// find the boundary for the multipart message
							var boundary = this._createMultipartBoundary(contentType);

							// create the new multipart parser (this class)
							this.currentPart = new MimeMultiPart({
								  headers 			: headers
								, parent 			: this
								, boundary 			: boundary.boundary
								, boundaryMaxLength : boundary.boundaryMaxLength 
							});

							// push extracted parts to the stream implementation
							this.currentPart.on('data', this.handlePart.bind(this));
						}
						else {
							// simple message, not a multipart
							if (debug) log.info('        starting a new simple part ...');

							// check if the current part is a file or a simple text part
							contentDisposition = headers.get('content-disposition', true);
							if (contentDisposition && contentDisposition.value.toLowerCase().trim() !== 'form-data'){
								if (debug) log.info('          working on a file, emitting stream ...');

								// a new streaming part
								this.currentPart = new MimePartStream({
									  headers: headers
									, parent: this
								});

								// emit the part, it must be consumed from the outside ( files, attachments )
								this.push(this.currentPart);
							}
							else {
								if (debug) log.info('          working on a simple part, collecting data ...');
								// normal part
								this.currentPart = new MimePart({
									  headers: headers
									, parent: this
								});

								// collect all data from that stream
								collector = new StreamCollector();

								collector.on("end", function(data) {
									if (debug) log.info('            part was finished ...');
									this.currentPart.data = data ? (contentType.value.toLowerCase().indexOf('text') === 0 ? data.toString() : data) : '';
									this.push(this.currentPart);
								}.bind(this));

								// collect all data of this part
								this.currentPart.pipe(collector);
							}
						}

						// store part
						this.parts.push(this.currentPart);

						// scan on the remeaing data
						this._scan(callback);
					}
					else {
						// headers not found, wait for more data
						return callback();
					}
				}
			}
			else {
				if (debug) log.info('  looking for message headers ...');
				// need to get the headers first to be able to decide in which mode to scan
				var headers = this._getHeaders();

				if (headers){
					if (debug) log.info('    headers found :)');
					this.headersScanned = true;

					contentType = headers.get('content-type', true);

					if (contentType.value.toLowerCase().indexOf('multipart/') === 0) {
						if (debug) log.info('      marking myself as a multipart message ...');

						// extract boundary for multipart message
						boundary 				= this._createMultipartBoundary(contentType, true);
						this.boundary 			= boundary.boundary;
						this.boundaryMaxLength 	= boundary.boundaryMaxLength;
					}

					this._scan(callback);
				}
			}
		}



		/*
		 * the _createMultipartBoundary method creates an regexp for scanning for 
		 * the multipart boundary
		 *
		 * @param <String> contentType, contains the content type of the current part
		 * @param <Boolean> doscan, wheter to scan for the next boundary
		 */
		, _createMultipartBoundary: function(contentType, doscan){
			var   boundary 			= new RegExp('((?:\\n|\\r\\n|\\n\\r)*(\\-){0,2}' + contentType.boundary.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&') + '(?:\-{2}\s*|\s*(?:\\n|\\r\\n|\\n\\r)+))', 'g')
				, boundaryMaxLength = contentType.boundary.length + 10
				, result;


			boundary.lastIndex = this.offset;

			// before the next scan the next boundary must be skipped ( at the beginning of multipart )
			if (doscan) this._boundaryScanRequired = true;

			return {
				  boundary: boundary
				, boundaryMaxLength: boundaryMaxLength
			};
		}



		, _transform: function(chunk, encoding, callback){
			this.buffered += chunk.toString();
			this._scan(callback);
		}



		, _flush: function( callback ){
			var result;

			if ( this.currentPart ){
				if ( this.boundary ){
					// seek last boundary
					this.boundary.lastIndex = this.offset;
					if ( result = this.boundary.exec( this.buffered ) ){
						this.currentPart.write( this.buffered.substring( this.offset, result.index ), function( err ){
							if ( err ) callback( err );
							else this.currentPart.end( callback );
						}.bind( this ) );
					}
					else callback( new Error( "failed to decode mime message!" ).setName( "DecodeMIMEMEssageException" ) );
				}
				else {
					this.currentPart.write( this.buffered, function( err ){
						if ( err ) callback( err );
						else this.currentPart.end( callback );
					}.bind( this ) );
				}
			}
			else callback();
		}
	} );