

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, TransformStream 	= require( "stream" ).Transform
		, StreamCollector	= require( "ee-stream-collector" )
		, MimePart 			= require( "./MimePart" )
		, MimePartStream 	= require( "./MimePartStream" )
		, MimeHeader 		= require( "./MimeHeader" );




	var MimeMultiPart = module.exports = new Class( {
		inherits: TransformStream

		, isStream: function(){ return false; }

		/*, buffered: ""
		, offset: 0
		, headersScanned: false*/
		, parts: []
		

		, init: function(options){

			this._setProperty('buffered', '');
			this._setProperty('offset', 0);
			this._setProperty('headersScanned', false);
			this._setProperty('headers');
			this._setProperty('parent');
			this._setProperty('boundary');
			this._setProperty('boundaryMaxLength');
			this._setProperty('currentPart');


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

			TransformStream.call(this, {objectMode: true});


			if (options){
				if (type.object( options.headers )) {

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


		, __getHeaders: function(){
			var result, reg = /(\n|\r\n|\n\r){2}/g, oldOffset;

			reg.lastIndex = this.offset;

			// check if there is enough data for a complete header
			if ( result = reg.exec( this.buffered ) ){

				// store the non header part
				oldOffset = this.offset;
				this.offset = result.index + result[ 1 ].length;

				// do the header parsing
				return new MimeHeader( this.buffered.substring( oldOffset, this.offset ) );
			}			

			return null;
		}



		, handlePart: function( part ){
			this.push( part );
		}



		// find next part
		, __scan: function( callback ){
			var result, headers, contentType;

			if ( this.headersScanned ){
				// working on the content

				if ( this.currentPart ){
					// send data to the current part

					if ( this.boundary ){
						this.boundary.lastIndex = this.offset;

						// find next boundary at the end of the current part
						if ( result = this.boundary.exec( this.buffered ) ){

							this.currentPart.write( this.buffered.substring( this.offset + 1, result.index ), function( err ){
								if ( err ) callback( err );
								else {
									this.currentPart.end( function( err ){
										if ( err ) callback( err );
										else {
											delete this.currentPart;

											this.buffered = this.buffered.substr( result.index + result[ 1 ].length );
											this.offset = 0;

											this.__scan( callback );
										}
									}.bind( this ) );									
								}
							}.bind( this ) );
						}
						else {							
							// write most of the data
							this.currentPart.write( this.buffered.substring( this.offset, this.buffered.length - this.boundaryMaxLength ), callback );
							this.buffered = this.buffered.substr( this.buffered.length - this.boundaryMaxLength );
							this.offset = 0;
						}
					}
					else {
						// not a multipart, write all available data
						this.currentPart.write( this.buffered.substr( this.offset ), callback );
						this.buffered = "";
						this.offset = 0;
					}
				}
				else {

					headers = this.__getHeaders();

					if ( headers ){ 
						contentType = headers.get( "content-type", true );

						// create the correct new stream
						if ( contentType.value.toLowerCase().indexOf( "multipart/" ) === 0 ) {
							// new multipart
							var config 			= this.__createMultipartBoundary( contentType, true );
							this.currentPart 	= new MimeMultiPart( { headers: headers, parent: this, boundary: config.boundary, boundaryMaxLength: config.boundaryMaxLength } );
							this.currentPart.on( "data", this.handlePart.bind( this ) );
						}
						else {
							if (headers.has("content-disposition") && headers.get("content-disposition", true).value.toLowerCase().trim() !== "form-data"){
							
								this.currentPart = new MimePartStream( { headers: headers, parent: this } );

								// emit the part, it must be consumed from the outside ( files, attachments )
								this.push(this.currentPart);
							}
							else {
								// normal part
								var   part 			= new MimePart( { headers: headers, parent: this } )
									, collector 	= new StreamCollector();

								collector.on( "end", function( data ){
									part.data = headers.get("content-type", true).value.toLowerCase().indexOf('text') === 0 ? data.toString() : data;
									this.push(part);
								}.bind( this ) );

								// collect all data of this part
								part.pipe( collector );

								// store
								this.currentPart = part;
							}
						}

						// store part
						this.parts.push( this.currentPart );

						// scan on the remeaing data
						this.__scan( callback );
					}
					else {
						// headers not found, wait for more data
						return callback();
					}
				}
			}
			else {
				// need to get the headers first to be able to decide in which mode to scan
				var headers = this.__getHeaders();


				if ( headers ){
					this.headersScanned = true;
					contentType = headers.get( "content-type", true );
					if ( contentType.value.toLowerCase().indexOf( "multipart/" ) === 0 ) {
						// multipart message
						var config 				= this.__createMultipartBoundary( contentType, true );
						this.boundary 			= config.boundary;
						this.boundaryMaxLength 	= config.boundaryMaxLength;
					}

					this.__scan( callback );
				}
			}
		}


		, __createMultipartBoundary: function( contentType, doscan ){
			var   boundary 			= new RegExp( "((?:\\n|\\r\\n|\\n\\r)*(\\-){0,2}" + contentType.boundary.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&') + "(?:\-{2}\s*|\s*(?:\\n|\\r\\n|\\n\\r)+))", "g" )
				, boundaryMaxLength = contentType.boundary.length + 10
				, result;


			boundary.lastIndex = this.offset;

			if ( doscan ){
				if ( result = boundary.exec( this.buffered ) ) this.offset = result.index + result[ 1 ].length;
			}

			return { boundary: boundary, boundaryMaxLength: boundaryMaxLength };
		}



		, _transform: function( chunk, encoding, callback ){
			this.buffered += chunk.toString();
			this.__scan( callback );
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