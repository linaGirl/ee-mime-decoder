

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" )
		, TransformStream 	= require( "stream" ).Transform
		, MimeHeader 		= require( "./MimeHeader" );



	var MimeMultiPart = module.exports = new Class( {
		inherits: TransformStream


		, buffered: ""
		, offset: 0
		, headersScanned: false
		, parts: []
	

		, init: function( options ){
			TransformStream.call( this );

			if ( options ){
				this.headers 			= options.headers;
				this.parent				= options.parent;
				this.boundary 			= options.boundary;
				this.boundaryMaxLength 	= options.boundaryMaxLength;
			}
		}



		, _getHeaders: function(){
			var result, reg = /(\n|\r\n|\n\r){2}/;

			reg.lastIndex = this.offset;

			// check if there is enough data for a complete header
			if ( result reg.exec( this.buffered ) ){

				// store the non header part
				this.offset = result.index + result[ 1 ].length;

				// do the header parsing
				return new MimeHeader( data.substr( 0, result.index ) );
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
						// find next boundary at the end of the current part
						if ( result = this.boundary.exec( this.buffered ) ){
							this.currentPart.write( this.buffered.substring( this.offset, result.index ), function( err ){
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
					// need to create a part

					if ( this.boundary ){
						// set offset to after the next boundary
						this.boundary.lastIndex = this.offset;

						if ( result = this.boundary.exec( this.buffered ) ){
							this.offset = result.index + result[ 1 ].length;
						}
						else {
							// boundary not found, wait for more data
							return callback();
						}
					}

					headers = this.__getHeaders();

					if ( type.object( headers ) ){
						contentType = headers.get( "content-type" ).value.toLowerCase();

						// create the correct new stream
						if ( contentType.indexOf( "multipart/" ) === 0 ) {
							// new multipart
							var   boundary 			= new RegExp( "(\\-\\-" + contentType.boundary + "\-{0,2}(?:\\n|\\r\\n|\\n\\r))", "g" )
								, boundaryMaxLength = this.boundaryMaxLength = contentType.boundary + 6;

							this.currentPart = new MimeMultiPart( { headers: headers, parent: this, boundary: boundary, boundaryMaxLength: boundaryMaxLength } );
						}
						else {
							if ( contentType.value.toLowerCase().indexOf( "text/" ) === -1 || ( headers.has( "content-disposition" ) && headers.get( "content-disposition", true ).value.toLowerCase() !== "inline" ) ){
								// streaming part ( not text or content disposition othe than )
								this.currentPart = new MimePartStream( { headers: headers, parent: this } );
							}
							else {
								// normal part
								this.currentPart = new MimePart( { headers: headers, parent: this } );
							}
						}

						// we will push all data parts to our stream, endig events are not important for us
						this.currentPart.on( "data", this.handlePart.bind( this ) );
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

				if ( type.object( headers ) ){
					this.headersScanned = true;
					contentType = headers.get( "content-type" ).value.toLowerCase();

					if ( contentType.indexOf( "multipart/" ) === 0 ) {
						// multipart message
						this.boundary = new RegExp( "(\\-\\-" + contentType.boundary + "\-{0,2}(?:\\n|\\r\\n|\\n\\r))", "g" );
						this.boundaryMaxLength = contentType.boundary + 6;
					}

					this.__scan( callback );
				}
			}
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
							else {
								this.currentPart.end( callback );
							}
						}.bind( this ) );
					}
					else {
						callback( new Error( "failed to decode mime message!" ).setName( "DecodeMIMEMEssageException" ) );
					}
				}
				else {
					this.currentPart.write( this.buffered, function( err ){
						if ( err ) callback( err );
						else {
							this.currentPart.end( callback );
						}
					}.bind( this ) );
				}
			}
			else {
				callback( new Error( "failed to decode mime message!" ).setName( "DecodeMIMEMEssageException" ) );
			}
		}
	} );