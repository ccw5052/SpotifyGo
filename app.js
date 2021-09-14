var SpotifyWebApi = require('spotify-web-api-node');
const express = require('express')
var config = require('./config.json')

const scopes = [
    'ugc-image-upload',
    'user-read-playback-state',
    'user-modify-playback-state',
    'user-read-currently-playing',
    'streaming',
    'app-remote-control',
    'user-read-email',
    'user-read-private',
    'playlist-read-collaborative',
    'playlist-modify-public',
    'playlist-read-private',
    'playlist-modify-private',
    'user-library-modify',
    'user-library-read',
    'user-top-read',
    'user-read-playback-position',
    'user-read-recently-played',
    'user-follow-read',
    'user-follow-modify'
  ];
  
  var spotifyApi = new SpotifyWebApi({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    redirectUri: config.redirectUri
  });

  var playlistId = config.playlistId
  var playlistName = config.playlistName

  const app = express();

  app.get('/login', (req, res) => {
    res.redirect(spotifyApi.createAuthorizeURL(scopes));
  });
  
  app.get('/callback', (req, res) => {
    const error = req.query.error;
    const code = req.query.code;
    const state = req.query.state;
  
    if (error) {
      console.error('Callback Error:', error);
      res.send(`Callback Error: ${error}`);
      return;
    }
  
    spotifyApi
      .authorizationCodeGrant(code)
      .then(data => {
        const access_token = data.body['access_token'];
        const refresh_token = data.body['refresh_token'];
        const expires_in = data.body['expires_in'];
  
        spotifyApi.setAccessToken(access_token);
        spotifyApi.setRefreshToken(refresh_token);
  
        console.log('access_token:', access_token);
        console.log('refresh_token:', refresh_token);
  
        console.log(
          `Sucessfully retreived access token. Expires in ${expires_in} s.`
        );
        res.send('Success! You can now close the window.');
  
        setInterval(async () => {
          const data = await spotifyApi.refreshAccessToken();
          const access_token = data.body['access_token'];
  
          console.log('The access token has been refreshed!');
          console.log('access_token:', access_token);
          spotifyApi.setAccessToken(access_token);
        }, expires_in / 2 * 1000);

        if (playlistId == ""){
            console.log("try to created a new playlist")
            createNewPlayList(playlistName);
        }else{
            console.log("Playlist not empty. Try to update the playlist");
            removeAllFromPlayList(playlistId);
            getMySavedTracks();
            console.log("Playlist updated");
        }

      })
      .catch(error => {
        console.error('Error getting Tokens:', error);
        res.send(`Error getting Tokens: ${error}`);
      });
  });

  app.listen(8888, () =>
  console.log(
    'HTTP Server up. Now go to http://localhost:8888/login in your browser.'
  )
);

function createNewPlayList(name){
    (async () => {
        // const result = await spotifyApi.createPlaylist(name);

        playlistId = (await spotifyApi.createPlaylist(name)).body.id;
                
        console.log("PlayList Created with id: "+ playlistId);
        console.log("Please update the code config");
    })().catch(e =>{
        console.error(e);
    })
}

function removeAllFromPlayList(playlistId){
    (async ()=> {
        const p = await spotifyApi.getPlaylistTracks(playlistId);
        const p1 = await spotifyApi.getPlaylist(playlistId);
        var total = p.body.total;
        const snapId = p1.body.snapshot_id;
        console.log(p.body.total);
        console.log(snapId);

        let positions = [];
        var position = 0;

        if (total<=0)
            return;

        while (total>0){
            positions.push(position++);
            total-=1;
        }

        if (positions != []){
            const r = await spotifyApi.removeTracksFromPlaylistByPosition(playlistId, positions ,snapId);
        }

    })().catch(e => {
        console.error(e);
    })
}

function addTrackToPlayList(playlistId, tracks){
    (async ()=> {
        const r = await spotifyApi.addTracksToPlaylist(playlistId, tracks);
    })().catch(e =>{
        console.error(e);
    })
}

function getMySavedTracks(){
    (async () => {
    
        var mySaveTracks = await spotifyApi.getMySavedTracks({limit: 1});

        var total = mySaveTracks.body.total;
        var offset = 0;
        const limit = 50;

        let tracks = [];

        while (total>0){
    
            let uris = [];

            mySaveTracks = await spotifyApi.getMySavedTracks({offset: offset , limit: limit});

            if (total>=20){
                offset+= limit;
                total-= limit;
            }else{
                total=0;
            }

            for (let track_obj of mySaveTracks.body.items){
                const track = track_obj.track;
                tracks.push(track);
                uris.push(track.uri);
            }
            addTrackToPlayList(playlistId, uris);
        }
        console.log(tracks.length);
        
    })().catch(e =>{
        console.error(e);
    })
}