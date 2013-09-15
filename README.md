## ee-mime-decoder

decode mime messages. the decoder implements the interface of a writable stream ( v2 ) and a object readable stream ( v2 ). if the decoder encounters binary data like a file upload it will return a separate readable stream for every binary part which is found in the mime message. each of this streams must be consumed, else the decoding of the message will never finish.

If you need to decode mime messages from a http form request you should use the «ee-formdata-reader» module which is much simpler then this module.

# installation
	
	npm install ee-mime-decoder


# usage
	
	var   MimeDecoder 		= require( "ee-mime-decoder" )
		, StreamCollector 	= require( "ee-stream-collector" );


	webserver.on( "request", function( req, res ){
		var   decoder 		= new MimeDecoder();

		// send data from request directly to the decoder
		req.pipe( decoder );


		// handle incoming decoded mime message parts
		decoder.on( "data", function( obj ){
			if ( obj.isStream ){
				// mime objet implementing the readable stream interface
				// we got a binary mime part ( e.g. attachment, file upload )

				if ( iWantToCacheTheFileInMemory ){
					// collect data an store on the mime object

					var collector = new StreamCollector();
					collector.on( "end", function(){
						// store the data on the mime object
						obj.data = collector.data;
					} );

					// pipe data into collector
					obj.pipe( collector );
				}
				else if ( iWantToStoreTheFilesInTheFileSystem ){
					// store the file in the fs
					ob.pipe( fs.createWriteStream( "/path/to/the/new/file" ) );

					// we need to know where the data was stored
					obj.path = "/path/to/the/new/file";
				}
				else {
					// do whatever you want
				}
			}
			else {
				// mime object, we dont need to store the data because its stored on the mimeMessage object of the collector
				console.dir( obj );
			}
		} );


		// all data was received, we can now work with it
		decoder.on( "end", function(){
			var mimeMessage = decoder.getMessage();

			mimeMessage.parts.forEach( function( part ){
				console.log( part.length, part.getHeader( "content-type" ) );
				if ( part.hasChildren() ) console.log( "the part has %s children", part.parts.length );
			} );
		} );
	} );
