const YoutubeDL = require('youtube-dl');
const ytdl = require('ytdl-core');

var MAX_QUEUE_SIZE = 20;
var DEFAULT_VOLUME = 50;
var userVolume = DEFAULT_VOLUME;
var queues = {}

module.exports = {
	join: function(client, msg) {
		var voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if(voiceConnection != null) {
			msg.channel.send(wrap("i am already in the same channel as you"));
			return;
		}
		if(msg.member.voiceChannel) {
			msg.member.voiceChannel.join().then(() => {
				msg.channel.send(wrap("joined channel '" + msg.member.voiceChannel.name + "'"));
			});
		} else {
			msg.channel.send(wrap("you are not in a voice channel"));
		}
	},

	leave: function(client, msg) {
		var voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection == null) {
			msg.channel.send(wrap("i am not in any channel"));
			return;
		}
		msg.channel.send(wrap("leaving channel '" + voiceConnection.channel.name + "'"));
		voiceConnection.disconnect();
	},

	play: function(client, msg, str) {
		// Make sure the bot is in a voice channel.
		var voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection == null) {
			return msg.channel.send(wrap('i am not in a voice channel. use !music join'));
		}

		// Get the queue.
		const queue = this.getQueue(msg.guild.id);

		// Check if the queue has reached its maximum size.
		if (queue.length >= MAX_QUEUE_SIZE) {
			return msg.channel.send(wrap('the queue is full'));
		}

		var isUrl = str.toLowerCase().startsWith('http');

		msg.channel.send(wrap(isUrl ? 'loading song from url..' : 'searching youtube for ' + str + '..')).then(response => {
			str = 'gvsearch1:' + str;
			YoutubeDL.getInfo(str, ['-q', '--no-warnings', '--force-ipv4'], (err, info) => {
				// Verify the info.
				if (err || info.format_id === undefined || info.format_id.startsWith('0')) {
					return response.edit(wrap('invalid video'));
				}

				info.requester = msg.author.id;

				// Queue the video.
				response.edit(wrap('\'' + info.title + '\' added to the queue (' + (queue.length + 1) + ')')).then(() => {
					queue.push(info);
					// Play if only one element in the queue.
					if (queue.length === 1) this.executeQueue(client, msg, queue);
				}).catch(console.log);
			});
		}).catch(console.log);
	},

	skip: function(client, msg) {
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection == null) return msg.channel.send(wrap('no music is being played'));

		const queue = this.getQueue(msg.guild.id);

		msg.channel.send(wrap('skipping \'' + queue[0].title + '\''));

		// Skip.
		queue.splice(0, 0);

		// Resume and stop playing.
		const dispatcher = voiceConnection.player.dispatcher;
		if(dispatcher == undefined) return msg.channel.send(wrap('dispatcher is undefined'));  
		if (voiceConnection.paused) dispatcher.resume();
		dispatcher.end();
	},

	getQueue: function(server) {
		if (!queues[server]) queues[server] = [];
		return queues[server];
	},

	clearQueue: function(msg) {
		const queue = this.getQueue(msg.guild.id);
		queue.splice(1, queue.length);
		msg.channel.send(wrap('queue cleared'));
	},

	executeQueue: function(client, msg, queue) {
		// If the queue is empty, finish.
		if (queue.length === 0) {
			return console.log("Finish the last song in the queue");
		}

		var voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if(voiceConnection == null) {
			return console.log("Trying to execute queue when not in a channel");
		}

		// Get the first item in the queue.
		const video = queue[0];

		console.log("Playing " + video.title + " from " + video.webpage_url);

		let dispatcher = voiceConnection.playStream(ytdl(video.webpage_url, {filter: 'audioonly'}), {seek: 0, volume: (userVolume / 100)});

		voiceConnection.on('error', (error) => {
			// Skip to the next song.
			console.log(error);
			queue.shift();
			executeQueue(msg, queue);
		});

		dispatcher.on('error', (error) => {
			// Skip to the next song.
			console.log(error);
			queue.shift();
			executeQueue(msg, queue);
		});

		dispatcher.on('end', () => {
			// Wait a second.
			setTimeout(() => {
				if (queue.length > 0) {
					// Remove the song from the queue.
					queue.shift();
					// Play the next song in the queue.
					this.executeQueue(client, msg, queue);
				}
			}, 1000);
		});
	},

	showQueue: function(client, msg) {
		// Get the queue.
		const queue = this.getQueue(msg.guild.id);

		let queueStatus = 'stopped';
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection !== null && queue.length > 0) {
			const dispatcher = voiceConnection.player.dispatcher;
			if(dispatcher == undefined) return msg.channel.send(wrap('dispatcher is null'));
			queueStatus = dispatcher.paused ? 'paused' : 'playing';

			var queueText = "";
			for(var i = 0; i < queue.length; i++) {
				queueText += (i + 1) + ": " + queue[i].title + (i == 0 ? ' (' + queueStatus + ')' : '') + '\n';
			}
			queueText += '\nbeep boop.*';

			msg.channel.send('*there ' + (queue.length > 1 ? 'are' : 'is') + ' ' + queue.length + ' song' + (queue.length > 1 ? 's' : '') + ' in the queue:\n\n' + queueText);
			// msg.channel.send(wrap('queue (' + queueStatus + '):\n' + text));
		} else {
			msg.channel.send(wrap('the queue is empty'));
		}
	},

	pause: function(client, msg) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('no music being played'));

		msg.channel.send(wrap('song paused'));
		const dispatcher = voiceConnection.player.dispatcher;
		if (!dispatcher.paused) dispatcher.pause();
	},

	resume: function(client, msg) {
		// Get the voice connection.
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('no music being played'));

		msg.channel.send(wrap('song resumed'));
		const dispatcher = voiceConnection.player.dispatcher;
		if (dispatcher != undefined && dispatcher.paused) dispatcher.resume();
	},

	volume: function(client, msg, volume) {
		if(volume == undefined) {
			volume = DEFAULT_VOLUME;
		}

		// Get the voice connection.
		if(msg.guild === null) return msg.channel.send(wrap('cannot do that, msg.guild is null'));
		const voiceConnection = client.voiceConnections.find(val => val.channel.guild.id == msg.guild.id);
		if (voiceConnection === null) return msg.channel.send(wrap('no music being played'));

		// Get the dispatcher
		const dispatcher = voiceConnection.player.dispatcher;

		if (volume > 200 || volume < 0) return msg.channel.send(wrap('volume out of range (0 to 200)'));

		msg.channel.send(wrap("volume set to " + volume));
		if(dispatcher != undefined) dispatcher.setVolume((volume / 100));
		userVolume = volume;
	}
}

function wrap(text) {
	return '*' + text.replace(/`/g, '`' + String.fromCharCode(8203)) + '. beep boop.*';
}