

	var   Class 			= require( "ee-class" )
		, log 				= require( "ee-log" )
		, type 				= require( "ee-types" );



	module.exports = new Class( {

		  headerText: ""
		, headers: {}


		, init: function( text ){
			this.headerText = text.replace(/^\s*/, '').replace(/(?:\n|\r\n|\n\r)\s+/g, ' ').replace(/\s{2,}/, ' ');
		}



		, parse: function(){
			this.headerText.split( /\n|\n\r|\r\n/gi ).forEach( function( header ){
				var index = header.indexOf( ":" );
				if ( index ){
					var headerName = this._decodeHeaderValue( header.substr( 0, index ).trim() ).toLowerCase();
					if ( this.headers[ headerName ] ) {
						if ( !type.array( this.headers[ headerName ] ) ) this.headers[ headerName ] = [ this.headers[ headerName ] ];
						this.headers[ headerName ].push( this._headerFromText( header.substr( index + 1 ).trim() ) );
					}
					else {
						this.headers[ headerName ] = this._headerFromText( header.substr( index + 1 ).trim() );
					}
				} 
				else log( new Error( "failed to parse header: " + header ) ); 
			}.bind( this ) );
		}



		, has: function( id ){
			var val = new RegExp( "(?:\n|\n\r|\r\n|^)" + this._escape(id) + "\s*:", "gi" ).test( this.headerText );;
			if ( id.toLowerCase() === "content-type" ) val = true;
			return val;
		}


		, get: function(id, parsed){
			var header = new RegExp('(?:\n|\n\r|\r\n|^)'+this._escape(id)+'\s*:([^\n\r]+)(?:\n|\n\r|\r\n|$)', 'gi').exec(this.headerText);
			if (header){ 
				if (parsed) return this._headerFromText(header[1]);
				else return header[1];
			}
			else if (id.toLowerCase() === 'content-type'){
				if (parsed) return {value: 'text/plain'};
				else return 'text/plain';
			}

			return null;
		}


		, _escape: function(input) {
			return input.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
		}

		, _headerFromText: function( input ){
			var header = {};

			input.split( /;\s*/i ).map( function( h ){
				var result = /^([a-z0-9_\-]+)\=(.*)$/gi.exec( h );
				if ( result && result.length === 3 ){
					header[ this._decodeHeaderValue( result[ 1 ].toLowerCase().trim() ).toLowerCase() ] = this._decodeHeaderValue( result[ 2 ] );
				}
				else if ( header.value === undefined ) header.value = this._decodeHeaderValue( h );
				else {
					if ( !header.values ) header.values = [];
					header.values.push( this._decodeHeaderValue( h ) );
				}
			}.bind( this ) );

			return header;
		}



		, _decodeHeaderValue: function( value ){
			value = value.trim();
			var result = /=\?([^\?]+)\?([qb])\?([^\?]+)\?=/gi.exec( value ), str;

			if ( result ){
				str = this._decodeString( result[ 2 ], result[ 1 ], result[ 3 ] ).trim();
			}
			else {
				str = value.trim();
			}

			if ( /^[`'"].*[`'"]$/.test( str ) ) return str.substr( 1, str.length - 2 );
			else return str;
		}



		, _decodeString: function( encoding, stringEncoding, str ){
			if ( encoding.toLowerCase() === "q" ){
				return str.replace( /=([0-9a-f]{2})/gi, function( m, hexCode ){ return String.fromCharCode( parseInt( hexCode, 16 ) ); } );
			}
			else {
				return new Buffer( str, "base64" ).toString();
			}
		}	


	} );