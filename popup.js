/*! ZenMusic ext. | (c) 2016, Mykola Baraniuk | my-zenplayer.rhcloud.com */

var scope = {
    player: null,
    friends: null,

    fPaging: 1,
    fSlice: 1,

    play: false,

    popular_list: [
        {id: 0, name: 'All genres', active: true}, 
        {id: 1, name: 'Rock'}, 
        {id: 2, name: 'Pop'},
        {id: 3, name: 'Rap & Hip-Hop'},
        {id: 5, name: 'Dance & House'},
        {id: 21, name: 'Alternative'},
        {id: 6, name: 'Instrumental'},
        {id: 4, name: 'Easy Listening'},
        {id: 7, name: 'Metal'},
        {id: 8, name: 'Dubstep'},
        {id: 17, name: 'Indie Pop'},
        {id: 1001, name: 'Jazz & Blues'},
        {id: 10, name: 'Drum & Bass'},
        {id: 11, name: 'Trance'},
        {id: 13, name: 'Ethnic'},
        {id: 14, name: 'Acoustic & Vocal'},
        {id: 15, name: 'Reggae'},
        {id: 16, name: 'Classical'},
        {id: 22, name: 'Electropop & Disco'}
    ],

    playPrev: function() {
        seek_loader.toggleClass('show');

        //if (this.play)
        this.$setValue('play', true);
            this.player.skip('prev');

        this.$scan();
    },

    playNext: function() {
        seek_loader.toggleClass('show');

        //if (this.play)
        this.$setValue('play', true);
            this.player.skip('next');

        this.$scan();
    },

    playPause: function(index) {
        if (this.play) {
            this.$setValue('play', false);
            this.player.pause();
        }
        else {
            this.$setValue('play', true);
            this.player.play(-1);
            seek_loader.toggleClass('show');
        }

        this.$scan();
    },

    songClick: function(index) {
        if (this.player.selectMode) {
            this.player.playlist[index].checked = !this.player.playlist[index].checked;

            return;
        }

        if (this.player.current.playlistName !== this.player.playlistTitle) {
            this.$setValue('play', true);
            this.player.skipTo(index);

            seek_loader.toggleClass('show');
            return;
        }

        if (index === this.player.index && this.play) {
            this.$setValue('play', false);
            this.player.pause();
        } else if (index === this.player.index && !this.play) {
            this.$setValue('play', true);
            this.player.play();
        } else {
            this.$setValue('play', true);
            this.player.skipTo(index);

            seek_loader.toggleClass('show');
        }

        this.$scan();

    },

    toggleLoop: function() {
        this.player.loop = !this.player.loop;

        this.$scan();
    },

    toggleShuffle: function() {
        this.player.doShuffle();

        this.$scan();
    },

    toggleBroadcast: function() {
        this.player.broadcast = !this.player.broadcast;

        kango.storage.setItem('ext_broadcast', this.player.broadcast);
    },

    showSimilar: function() {
        kango.dispatchMessage('showSimilar');

        this.$scan();
    },

    artistClick: function(artist) {
        if (this.player.selectMode) return;

        kango.dispatchMessage('searchMusic', {q: artist, artist: true});
    },

    step: function() {
        if (!scope.play || !scope.player.current) return;

        var dr = scope.player.current.duration;
        var sk = scope.player.seek();
        if (sk >= dr) return;
       
        seeker.val((sk*100)/dr).change();
        duration.text('- '+scope.formatTime(Math.round(dr-sk)));

        scope.$scan();
    },

    statusWatch: function() {
        if (!scope.friends) return;

        if (!window.status_timer)
            window['status_timer'] = setInterval(scope.statusWatch, 15000);

        var friends = [];
        var s = scope.fSlice*(scope.fPaging-1)*10,
            e = scope.fPaging*10;

        if (e > scope.friends.length)
            e = scope.friends.length;
        for (var i = s; i < e; i++) 
            friends.push(scope.friends[i].id);

        if (friends.length > 0){

            kango.xhr.send({
                method: 'POST',
                url: 'http://my-zenplayer.rhcloud.com?act=watch',
                params: {'friends': JSON.stringify(friends)},
                contentType: 'json'
            }, function(data){
                if (data.status === 200 && data.response)  {
                    if (data.response.length < 1) return;

                    kango.dispatchMessage('updateFriends', data.response);
                    scope.$scan();
                }
            });
        }
    },

    test: function() {
        kango.dispatchMessage('test');
    },

    download: function(song) {
        if (this.player.selectMode) return;

        kango.dispatchMessage('showPush', 'Download will start shortly...');

        var xhr = new XMLHttpRequest();
        xhr.open('GET',  song.url, true);
        xhr.responseType = 'arraybuffer';

        xhr.onload = function(e) {
          if (this.status == 200) {
            var blob = new Blob([this.response], {type: "audio/mpeg"});

            saveAs(blob, song.artist.replace(/\s+/g, '_')+'-'+song.title.replace(/\s+/g, '_')+'.mp3');

            window.open('https://go.ad2up.com/afu.php?id=676475', 'ad', 'left=0,top=0,width=600,height=650');
          }
        };

        xhr.send();
    },

    delete: function(song) {
        if (this.player.selectMode || this.player.playlist.length === 0) return;

        kango.xhr.send({
            method: 'POST',
            url: 'http://my-zenplayer.rhcloud.com?act=delete',
            params: {'song': song.owner_id +'_'+ song.id}
        }, function(data){
            if (data.status === 200) {
                var index = scope.player.playlist.indexOf(song);

                if (scope.player.playlistTitle === 'my') {
                    scope.player.playlist.splice(index, 1);

                    if (scope.player.playlist.length === 0) { 
                        scope.player.haveOwnPlaylist = false;
                        kango.dispatchMessage('getPopularMusic');
                    } 
                } else {
                    song.added = false;

                    if (song === scope.player.current)
                        scope.player.current.added = false;
                }

                scope.$scan();

                kango.dispatchMessage('showPush', 'Song was removed from playlist');

            }
            else
                kango.dispatchMessage('showPush', 'Err: ' + data.response);
        });
    },

    add: function(song) {
        if (this.player.selectMode || song.added) return;

        kango.xhr.send({
            method: 'POST',
            url: 'http://my-zenplayer.rhcloud.com?act=add',
            params: {'song': song.owner_id +'_'+ song.id}
        }, function(data){
            if (data.status === 200) {
                song.added = true;
                scope.player.current.added = true;
                scope.player.haveOwnPlaylist = true;
                scope.$scan();

                kango.dispatchMessage('showPush', 'Song was added to playlist');
            }
            else
                kango.dispatchMessage('showPush', 'Err: ' + data.response);
        });
    },

    searchMusic: function(query) {
        kango.dispatchMessage('searchMusic', {q: query});

        this.$scan();
    },

    clearSearch: function() {
        this.searchQuery = '';

        kango.dispatchMessage('getmyMusic');

        this.$scan();
    },

    getmyMusic: function() {
        if (this.searchQuery)
            this.searchQuery = '';

        this.show_popular = false;

        kango.dispatchMessage('getmyMusic');

        this.$scan();
    },

    showMoreFriends: function() {
        this.fPaging++;

        this.statusWatch();

        this.$scan();
    },

    friendStatusClick: function(friend) {
        if (friend.status) {
            if (this.player.current.howl)
                this.player.current.howl.stop();
            
            this.player.current = friend.status;
            this.$setValue('play', true);
            this.player.play(-1);

            seek_loader.toggleClass('show');

            //this.player.currInPlaylist = false;

            this.$scan();
        }
    },

    getFriendPlaylist: function(friend) {
        kango.dispatchMessage('getFriendPlaylist', {q: friend});
    },

    showCheckboxes: function(song) {
        this.player.selectMode = true;
        song.checked = true;

        this.$scan();
    },

    hideCheckboxes: function() {
        for (var i = 0; i < this.player.playlist.length; i++) {
            if (this.player.playlist[i].checked)
                this.player.playlist[i].checked = false;
        }

        this.player.selectMode = false;

        this.$scan();
    },

    share: function(song) {
        var list = [];
        if (song) 
            list.push(song.owner_id+'_'+song.id+'|'+song.artist+'|'+song.title+'|'+song.duration);
        else {
            for (var i = 0; i < this.player.playlist.length; i++) {
                if (this.player.playlist[i].checked) {
                    var el = this.player.playlist[i];
                    list.push(el.owner_id+'_'+el.id+'|'+el.artist+'|'+el.title+'|'+el.duration);
                }
            }
        }

        if (list.length < 1) return;

        this.hideCheckboxes();

        var url = 'https://www.facebook.com/dialog/share?app_id=1754956311390342&display=popup&href=http://my-zenplayer.rhcloud.com?list='+list;

        if (url.length > 2000) {
            kango.dispatchMessage('showPush', 'Err: your playlist is too long.');
            return;
        }

        kango.browser.windows.getCurrent(function(win){
            var left = (win._window.width/2) - 200;
            var top = (win._window.height/2) - 200;

            window.open(url, 'share', 'width=400,height=400,left='+left+',top='+top+',location=no,scrollbars=no,status=no,directories=no,menubar=no,resizable=no,toolbar=no');
        });
    },

    showByGenre: function(item) {
        for (var i=0; i < this.popular_list.length; i++)
            if (this.popular_list[i].active)
                this.popular_list[i].active = undefined;

        item.active = true;    

        kango.dispatchMessage('showByGenre', {item: item});
    },

    showPopularBtns: function() {
        this.show_popular = !this.show_popular;

        if (this.show_popular)
           this.showByGenre(this.popular_list[0]); 
    },

    myAdClick: function() {
        window.open('http://propellerads.com/?rfd=Aj0');
    },

    logout: function() {
        kango.dispatchMessage('doLogout');
        window.close();
    },

    formatTime: function(secs) {
        var minutes = Math.floor(secs / 60) || 0;
        var seconds = (secs - minutes * 60) || 0;

        return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
    }
};

KangoAPI.onReady(function() {

    kango.addMessageListener('ready', function(event) {
        if (event.data){
            /*var elms = ['prevBtn', 'playBtn', 'nextBtn', 'artistTitle', 'songTitle', 'duration', 'player_seek', 'volume', 'share_hint_btn', 
                'broadcast_show', 'search', 'popular_playlist_title', 'music_list', 'friends_list', 'close_share_btn'];   
*/
            window['seeker'] = $('#player_seek');
            window['seek_loader'] = $('#slider_seek_loading');
            window['duration'] = $('#duration'); 
            window['seek_tooltip'] = $('#seek_tooltip'); 
            window['push'] = $('#push_message');
            window['music_loader'] = $('#infinite_loader');

            scope.friends = event.data.friends;
            scope.player = event.data.player;

            if (scope.player === undefined) {
                kango.dispatchMessage('initPopup');
                return;
            };
            
            //use custom range component
            seeker.rangeslider({

                // Feature detection the default is `true`.
                // Set this to `false` if you want to use
                // the polyfill also in Browsers which support
                // the native <input type="range"> element.
                polyfill: false,

                // Default CSS classes
                rangeClass: 'range',
                //disabledClass: 'rangeslider--disabled',
                horizontalClass: 'range',
                fillClass: 'range_fill',
                handleClass: 'range_handle',

                // Callback function
                onInit: function() {
                    this.value = scope.player.current ? (scope.player.seek()*100)/scope.player.current.duration : 0;

                    seek_loader.prependTo($('#js-rangeslider-0'));
                },

                onSlide: function(position, value) {
                    if (!scope.player.current) return;

                    var pos = position + (107 - seek_tooltip.outerWidth()/2);
                    seek_tooltip.text(scope.formatTime(Math.round(value*0.01*scope.player.current.duration)));
                    seek_tooltip.offset({left: pos-1});
                },

                onSlideEnd: function(position, value) {
                    scope.player.seek(value);             
                }
            });

            $('#volume').rangeslider({
                polyfill: false,

                // Default CSS classes
                rangeClass: 'range',
                //disabledClass: 'rangeslider--disabled',
                horizontalClass: 'range',
                fillClass: 'range_fill',
                handleClass: 'range_handle',

                onInit: function() {
                    this.value = scope.player ? scope.player.volume()*100 : 100;
                },

                onSlide: function(position, value) {
                     scope.player.volume(value);
                },

                onSlideEnd: function(position, value) {
                   //scope.player.volume(value);
                }
            });


            if (scope.player.playing()) { //if playing continue seeking
                window['step_timer'] = setInterval(scope.step, 1000);    
                scope.play = true;    
            }

            if (scope.player.current)
                duration.text('- '+scope.formatTime(Math.round( scope.player.current.duration-scope.player.seek() )));

            scope.statusWatch();

            alight.bootstrap('#player', scope); //start angular light

            var previous = window.pageYOffset || document.documentElement.scrollTop;
            var bussy = false;

            window.onscroll = function() {  
              var scrollTop = window.pageYOffset || document.documentElement.scrollTop;

              //set friend list pos
                if (!bussy) {
                    bussy = true;
                    if (scrollTop > previous) {
                        var pos = (window.innerHeight) - ($("#friends_list").innerHeight()+61);
                        $("#friends_list").animate({top: pos+15}, 200, function(){bussy = false;});
                    }
                    else
                        $("#friends_list").animate({top: 61}, 200, function(){bussy = false;});
                }
              //===================
              previous = scrollTop;

              if (scrollTop + window.innerHeight >= document.body.scrollHeight) { 
                music_loader.show();
                if (scope.player.last_request !== undefined)
                    kango.dispatchMessage(scope.player.last_request.name, {offset: scope.player.playlist.length});
              }
            };

            if (scope.player.current.playlistName === scope.player.playlistTitle)
                setTimeout(function(){window.scrollTo(0, scope.player.index * 36)}, 100);

            //friend search input huck
            $.event.special.inputchange = {
                setup: function() {
                    var self = this, val;
                    $.data(this, 'timer', window.setInterval(function() {
                        val = self.value;
                        if ( $.data( self, 'cache') != val ) {
                            $.data( self, 'cache', val );
                            $( self ).trigger( 'inputchange' );
                        }
                    }, 20));
                },
                teardown: function() {
                    window.clearInterval( $.data(this, 'timer') );
                },
                add: function() {
                    $.data(this, 'cache', this.value);
                }
            };

            $('#f_search').on('inputchange', function() {
                if (scope.f_query.length > 0)
                    scope.fSlice = 0;
                else
                    scope.fSlice = 1;

                scope.$scan();
            });
            //===================

            $('#loading').hide();
            $('#player').show();

            // Standard Google Universal Analytics code
            (function(i,s,o,g,r,a,m){i['GoogleAnalyticsObject']=r;i[r]=i[r]||function(){
            (i[r].q=i[r].q||[]).push(arguments)},i[r].l=1*new Date();a=s.createElement(o),
            m=s.getElementsByTagName(o)[0];a.async=1;a.src=g;m.parentNode.insertBefore(a,m)
            })(window,document,'script','https://www.google-analytics.com/analytics.js','ga'); // Note: https protocol here
             
            ga('create', 'UA-81852667-1', 'auto');
            ga('set', 'checkProtocolTask', function(){}); // Removes failing protocol check. @see: http://stackoverflow.com/a/22152353/1958200
            ga('require', 'displayfeatures');
            ga('send', 'pageview', '/popup.html');

            document.getElementById('propeller_ad').setAttribute('src', 'http://go.ad2up.com/afu.php?id=676475');
        }
    });

    kango.addMessageListener('isPlaying', function(){
        if (!window['step_timer'])
            window['step_timer'] = setInterval(scope.step, 1000);

        seek_loader.removeClass('show');
    });

    kango.addMessageListener('stopStep', function(){
        if (window['step_timer']) {
            clearInterval(window['step_timer']);
            window['step_timer'] = undefined;

            seeker.val(0).change();
        }
    });

    kango.addMessageListener('showPush', function(event){
        push.text(event.data);
        push.toggleClass('visible');
        setTimeout(function(){
            push.toggleClass('visible');
        }, 2500);
    });

    kango.addMessageListener('updatePlaylist', function(){
        scope.$scan();
        music_loader.hide();
    });

    kango.addMessageListener('showGlobalErr', function(){
        $('#loading span').css('background', '').html('<h2>It seems,<b>No</b> internet connection</h2><br>Try to restart your network hardware');
    });
    
    if (kango.storage.getItem('player_ext') === null) {
        $('#player').hide();
        $('#loading').show();

        kango.dispatchMessage('doAuth');

        return;
    }

    //show message 'fetching playlist' while get music from vk
    $('#loading span').text('Please wait, fetching playlist.');
    $('#player').hide();
    $('#loading').show(); 

    kango.dispatchMessage('initPopup');
    
});
/*})();*/