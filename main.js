/*! ZenMusic ext. | (c) 2016, Mykola Baraniuk | my-zenplayer.rhcloud.com */
//(function () {

	function checkInternet(callback) {
		kango.xhr.send({
			method: 'GET',
			url: 'http://google.com/'
		},
		function(data){
			var status;
			if (data.status === 0)
				status = false;
			else
				status = true;

			callback(status);
		});
	}

	var init_run_c = 1;
	var auth_run_c = 1;

	function init(list) {
		if (init_run_c < 6 && auth_run_c > 1) {
			kango.dispatchMessage('showGlobalErr');
			//auth_run_c = 1;
			return;
		}
		if (init_run_c > 5) {

			checkInternet(function(status){
				if (status)
					kango.dispatchMessage('doAuth');
				else
					kango.dispatchMessage('showGlobalErr');
			});

			auth_run_c++;
			init_run_c = 1;
			return;
		}
		init_run_c++;

		kango.xhr.send({
			method: 'GET',
			url: 'https://graph.facebook.com/v2.7/me/friends?access_token='+token[1],
			contentType: 'json'
		}, 
		function(data) {
		    if (data.status === 200 && data.response) {
		    	myFriends = data.response.data;

		    	if (list) {
		    		_getVkMusic(list, function(res){

		    			if (!player){
							player = new Player(res.list);
						}
		    			
		    			if (res.isPopular) 
		    				player.playlistTitle = 'Popular music';
		    			else 
				    		player.haveOwnPlaylist = true;

		    			player.volume(volume);
		    			player.broadcast = broadcast;

		    			kango.dispatchMessage('ready', {friends: myFriends, player: player});
		    		});
				    
		    	} else
			    	kango.xhr.send({
						method: 'GET',
						//url: 'http://great.hol.es/?act=init',
						url: 'http://my-zenplayer.rhcloud.com?act=init',
						contentType: 'json'
					}, 
					function(data) {
					    if (data.status === 200 && data.response) {
					    	_getVkMusic(data.response, function(res){
					    		if (res.list.length > 0) {
					    			if (!player){
										player = new Player(res.list);
									}
					    			
					    			if (res.isPopular) {
					    				player.playlistTitle = 'Popular music';
					    				player.haveOwnPlaylist = false;
					    				player.last_request = {name: 'getPopularMusic'};
					    			}
					    			else {
					    				player.haveOwnPlaylist = true;
					    				player.last_request = {name: 'getmyMusic'};
					    			}

					    			player.volume(volume);
					    			player.broadcast = broadcast;

					    			kango.dispatchMessage('ready', {friends: myFriends, player: player});
						    	} else {
						    		_getVkMusic(null, function(res){
						    			if (!player){
											player = new Player(res.list);
										}

										player.playlistTitle = 'Popular music';
					    				player.haveOwnPlaylist = false;
					    				player.last_request = {name: 'getPopularMusic'};

					    				kango.dispatchMessage('ready', {friends: myFriends, player: player});
						    		});
						    	}

				    		});

					    }
					    else { // something went wrong
					    	kango.console.log('something went wrong. hol.es->init');
					    	init();
					    }
					});

				kango.browser.addEventListener(kango.browser.event.TAB_REMOVED, function() {
					var tab_c = 0;
				    kango.browser.windows.getAll(function(wins) {
				        for (var i=0; i < wins.length; i++) {
				         	wins[i].getTabs(function(tabs) {
						        tab_c += tabs.length;
						    });
				        }
					});

					if (tab_c === 0)
						kango.xhr.send({
							method: 'GET',
							url: 'http://my-zenplayer.rhcloud.com?act=remove_status'
						},
						function(){
						});
				});

		    	if (data.response.paging.next)
		    		_fetch_friends(data.response.paging.next);

		    }
		    else { // something went wrong
		        kango.console.log('something went wrong. fb friends');
		        init();
		    }
		});
		
	}

	function _fetch_friends(url) {
		kango.xhr.send({
			method: 'GET',
			url: url,
			contentType: 'json'
		},
		function(r){
			if (r.status === 200 && r.response) {
				myFriends = myFriends.concat(r.response.data);

				if (r.response.paging.next)
					_fetch_friends(r.response.paging.next);
			}
		});
	}

	function _getVkMusic(list, callback, offset) {

		if (list !== null && list.length > 0) { //if you have songs in playlist

			if (Object.prototype.toString.call(list) === "[object Array]")
				list = list.toString();

			kango.xhr.send({
				method: 'POST',
				url: 'https://api.vk.com/method/execute?code=return API.audio.getById({audios:'+list+'});&access_token='+token[0],
				contentType: 'json'
			}, 
			function(data) {
			    if (data.status === 200 && data.response) {
			    	callback({list: data.response.response});
			    }
			    else { // something went wrong
			        kango.console.log('something went wrong. vk music');
			        alert('Something went wrong geting music');
			    }
			});
		} else { //get some popular songs (you have not any songs in playlist yet)
			var url = 'https://api.vk.com/method/execute?code=return API.audio.getPopular({count: 100, only_eng: 1, genre_id:0});&access_token='+token[0];
			if (offset)
				url += '&offset='+offset;
			kango.xhr.send({
				method: 'GET',
				url: url,
				contentType: 'json'
			}, 
			function(data) {
			    if (data.status === 200 && data.response) {
			    	callback({list: data.response.response, isPopular: true});
			    }
			    else { // something went wrong
			        kango.console.log('something went wrong. vk music popular');
			        alert('Something went wrong geting music');
			    }
			});
		}
	}

	/*<-- FB stuff -->*/
	function _getLongToken() {//result token in message 'authDone'
		//var fb_url = 'https://www.facebook.com/dialog/oauth?client_id=1754956311390342&display=popup&response_type=token&scope=public_profile,user_friends&redirect_uri=http://great.hol.es?act=auth';
		kango.browser.windows.getCurrent(function(win){
            var left = (win._window.width/2) - 200;
            var top = (win._window.height/2) - 200;

            var fb_url = 'https://www.facebook.com/dialog/oauth?client_id=1754956311390342&display=popup&response_type=token&scope=public_profile,user_friends&redirect_uri=http://my-zenplayer.rhcloud.com?act=auth';
			window.open(fb_url, 'anonymous', "width=400,height=400,left="+left+",top="+top+",location=no,scrollbars=no,status=no,directories=no,menubar=no,resizable=no,toolbar=no");
        });
		
	}
	

	kango.addMessageListener('authDone', function(event) {
	    if (event.data) {
	    	kango.storage.setItem('player_ext', event.data.token);
	    	token = event.data.token.split('.');
	    	if (event.data.list.length < 1)
	    		init();
	    	else
		    	init(event.data.list);
	    } else
	    	kango.console.log('something went wrong. auth done');
	});

	kango.addMessageListener('doAuth', function() {// run if no local token keys

		checkInternet(function(status){
			if (status)
				_getLongToken();
			else
				kango.dispatchMessage('showGlobalErr');
		});
	   
	});

	kango.addMessageListener('doLogout', function() {
	   kango.xhr.send({
	   		method: 'GET',
            url: 'https://www.facebook.com/logout.php?next=http://my-zenplayer.rhcloud.com/&access_token='+token[1],
	   },
	   function(data) {
	   		if (data.status === 200) {
	   			kango.storage.removeItem('player_ext');
	   		}

	   });
	});

	kango.addMessageListener('initPopup', function(event) {
        event.source.dispatchMessage('ready', {friends: myFriends, player: player});   
    });

    kango.addMessageListener('getPopularMusic', function(event) {
    	var offset = event.data ? event.data.offset : undefined;

    	_getVkMusic(null, function(res){
    		if (offset)
    			player.playlist = player.playlist.concat(res.list);
    		else
				player.playlist = res.list;

			player.playlistTitle = 'Popular music';

			player.last_request = {name: 'getPopularMusic'};

			kango.dispatchMessage('updatePlaylist');
		}, offset);
    });

    kango.addMessageListener('getmyMusic', function(event) {
    	var url = 'http://my-zenplayer.rhcloud.com?act=init';

    	if (event.data !== null && event.data !== undefined)
    		url += '&offset='+event.data.offset;

    	kango.xhr.send({
            method: 'GET',
            url: url,
            contentType: 'json'
        }, function(data){
            if (data.status === 200 && data.response) {


               _getVkMusic(data.response, function(res){
               		if (event.data !== null && event.data)
               			player.playlist = player.playlist.concat(res.list);
               		else
						player.playlist = res.list;

					if (res.isPopular) {
	    				player.playlistTitle = 'Popular music';
	    				player.haveOwnPlaylist = false;
					}
	    			else {
	    				player.haveOwnPlaylist = true;
						player.playlistTitle = 'my';
	    			}

	    			player.last_request = {name: 'getmyMusic'};

					kango.dispatchMessage('updatePlaylist');
				});
            } else
            	kango.console.log('something went wrong. geting my music');
        });
    });

    kango.addMessageListener('showSimilar', function(event){
    	var curr = player.current;
        if (!curr) {
        	curr = player.playlist[0];
        };
		var url = 'https://api.vk.com/method/execute?code=return API.audio.getRecommendations({count:100});&access_token='+token[0];

        if (event.data)
        	url += '&target_audio='+ player.last_request.q+'&offset='+event.data.offset;
        else
        	url += '&target_audio='+curr.owner_id+'_'+curr.id;

        kango.xhr.send({
            method: 'GET',
            url: url,
            contentType: 'json'
        }, function(data){
            if (data.status === 200 && data.response) {
            	if (event.data) {
            		player.playlist = player.playlist.concat(data.response.response.items);
            		player.last_request = {name: 'showSimilar', q: player.last_request.q};
            	}
            	else {
                	player.playlist = data.response.response.items;
                	player.last_request = {name: 'showSimilar', q: curr.owner_id+'_'+curr.id};
            	}

                player.playlistTitle = 'Similar to: '+curr.artist+' - '+curr.title;

                kango.dispatchMessage('updatePlaylist');
            }
        });
    });

    kango.addMessageListener('searchMusic', function(event) {
        if (event.data.q === '') 
        	kango.dispatchMessage('getmyMusic');
        else {
        	var s_q = event.data.q ? event.data.q : player.last_request.q;
        	var s_artist = event.data.artist ? event.data.artist : player.last_request.artist;

        	var url = 'https://api.vk.com/method/execute?code=return API.audio.search({q:'+s_q+', count:100, auto_complete:1, sort:2});&access_token='+token[0];

        	if (s_artist)
        		url += '&performer_only=1';
        	
			if (event.data.offset)
				url += '&offset='+event.data.offset;

	        kango.xhr.send({
	            method: 'GET',
	            url: url,
	            contentType: 'json'
	        }, function(data){
	            if (data.status === 200 && data.response) {
	            	if (event.data.offset)
	            		player.playlist = player.playlist.concat(data.response.response.items);
	            	else
	                	player.playlist = data.response.response.items;

	                if (s_artist)
	                	player.playlistTitle = 'Similar by artist: '+s_q;
	                else
	                	player.playlistTitle = 'search';

	                player.last_request = {q: s_q, artist: s_artist, name: 'searchMusic'};

	                kango.dispatchMessage('updatePlaylist');
	            }
	        });
	    }
    });

    kango.addMessageListener('updateFriends', function(event) {
    	var statuses = [];
    	var pos = [];

		for (var j = 0; j < event.data.length; j++)
	    	for (var i = 0; i < myFriends.length; i++)
    			if (myFriends[i].id === event.data[j].id) {
    				var song =  myFriends[i].status ? myFriends[i].status.owner_id+'_'+ myFriends[i].status.id : undefined;

    				if (song !== event.data[j].status) {
    					if (event.data[j].status === null)
    						myFriends[i].status = null;
    					else {
	    					statuses.push(event.data[j].status);
	    					pos.push(i);
	    				}
    				}
    			}

    	if (statuses.length > 0)
	    	_getVkMusic(statuses, function(res){
				for (var i = 0; i < statuses.length; i++)
					myFriends[pos[i]].status = res.list[i];
			});
    });

    kango.addMessageListener('getFriendPlaylist', function(event) {
    	var friend = event.data.q ? event.data.q : player.last_request.q;

    	var url = 'http://my-zenplayer.rhcloud.com?act=f_playlist';
    	if (event.data && event.data.offset)
        	url += '&offset='+event.data.offset;

    	kango.xhr.send({
            method: 'POST',
            url: url,
            params: {'friend': friend.id},
            contentType: 'json'
        }, 
        function(data){
            if (data.status === 200 && data.response) {
            	if (event.data && event.data.offset && data.response.length < 1)
            		return;

                if (data.response.length < 1) {
                    kango.dispatchMessage('showPush',  friend.name + ' hasn\'t any audio file yet');
                    kango.dispatchMessage('updatePlaylist');
                    return;
                }

                _getVkMusic(data.response, function(res){
                	if (event.data.offset)
                		player.playlist = player.playlist.concat(res.list);
                	else
		        		player.playlist = res.list;

		        	player.playlistTitle = friend.name + '\'s audio files';

		        	player.last_request = {name: 'getFriendPlaylist', q: friend};

		        	kango.dispatchMessage('updatePlaylist');
		        });

                
                //scope.player.currInPlaylist = false;
            } else
                 kango.dispatchMessage('showPush', 'Err: ' + data.response);
        });

    });

    kango.addMessageListener('playFromFb', function(event){
    	if (!event.data) return;
    	
    	_getVkMusic(event.data, function(res){
    		if (player.current.howl)
			    player.current.howl.stop();

        	player.playlist = res.list;
        	player.index = 0;
        	player.current = res.list[0];
        	player.playlistTitle = 'Audio from Facebook';
        	player.last_request = {name: 'playFromFb'};

        	(function theLoop (i) {
			  setTimeout(function () {
			  	if (i % 2 !== 0)
			    	kango.ui.browserButton.setIcon('res/play.png');
			    else
			    	kango.ui.browserButton.setIcon('res/play_i.png');

			    if (--i) {          // If i > 0, keep going
			      theLoop(i);       // Call the loop again, and pass it the current value of i
			    } else {
			    	player.play();
			    	kango.dispatchMessage('initPopup');
			    } 

			  }, 160);
			})(7);

        	kango.dispatchMessage('updatePlaylist');
        });
    });

    kango.addMessageListener('showByGenre', function(event){
    	var url = 'https://api.vk.com/method/execute?code=return API.audio.getPopular({only_eng:1, count:100});&access_token='+token[0];

    	if (event.data.offset)
    		url +='&genre_id='+player.last_request.q.id + '&offset='+event.data.offset;
    	else
    		url += '&genre_id='+event.data.item.id;

    	kango.xhr.send({
            method: 'GET',
            url: url,
            contentType: 'json'
        }, function(data){
            if (data.status === 200 && data.response) {
            	if (event.data.offset) {
                	player.playlist = player.playlist.concat(data.response.response);
                	player.playlistTitle = 'Music by genre: '+ player.last_request.q.name;
                	player.last_request = {name: 'showByGenre', q: player.last_request.q};
            	} else {
                	player.playlist = data.response.response;
                	player.playlistTitle = 'Music by genre: '+ event.data.item.name;
                	player.last_request = {name: 'showByGenre', q: event.data.item};
            	}

                kango.dispatchMessage('updatePlaylist');
            }
        });
    });

    var player = undefined;
    
  	var myFriends;
	var token = kango.storage.getItem('player_ext');

	var volume = kango.storage.getItem('ext_vol') || 1;
	var broadcast = kango.storage.getItem('ext_broadcast') || true;

	if (token !== null) {
		token = token.split('.');
		init();
	}

//})();

