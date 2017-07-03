const request = require('request');
const translate = require('google-translate-api');
var exec = require('child_process').exec;
const music = require('./music.js');
const Discord = require("discord.js");
const client = new Discord.Client();

// Authentication
try {
	var auth = require("./auth.json");
} catch (e){
	console.log("No auth.json file found.");
	process.exit();
}

client.login(auth.bot_token);	

// On bot start
client.on("ready", () => {
  	console.log("Bot started!");

  	const hook = new Discord.WebhookClient('auth.webhook_id', 'auth.webhook_token');
	// hook.send('I am alive!');
});

// Listen for messages
client.on("message", (message) => {
  	if (message.content.startsWith("!") && !message.author.bot) { // If a message starts with ! and isn't from a bot
  		parseMessage(message);
  	}
});

// When the bot is stopped
client.on("disconnect", () => {
	console.log("Bot stopped.");
	process.exit();
});

// If process is killed externally (e.g. ctrl-c)
process.on('SIGINT', function () {
	if(client != undefined) {
		client.destroy();
	}
});

// Does stuff with the message
function parseMessage(message) {
	var cmd = message.content.substring(1); // Command after !
	var spaceIndex = cmd.indexOf(' '); // Location of the first space (-1 if no space)

	if(cmd == "wave") {
		message.channel.send("*waves back at " + message.author.username + "*");
		return;
	}
	if(cmd == "joke") {
		getJsonFromUrl("https://icanhazdadjoke.com/", function(body) {
			message.channel.send(body.joke);
		});
        return;
	}
	if(cmd.startsWith("gif")) {
		if(spaceIndex == -1) {
			message.channel.send("*give me something to search for. beep boop.*");
		} else {
			var search = cmd.substr(spaceIndex + 1);	
			var url = "http://api.giphy.com/v1/gifs/search?api_key=3800f4abd08841648f7160f6a2e0b515&limit=10&q=" + search;
			getJsonFromUrl(url, function(body) {
				var results = body.data;
        		var r = Math.floor((Math.random() * results.length));
        		var image_url = results[r].url;
        		if(image_url) message.channel.send(image_url);
			})
		}
		return;
	}
	if(cmd.startsWith("wiki")) {
		if(spaceIndex == -1) {
			message.channel.send("*give me something to search for. beep boop.*");
		} else {
			var search = cmd.substr(spaceIndex + 1);
			var url = "https://en.wikipedia.org/w/api.php?format=json&action=query&prop=extracts&exintro=&explaintext=&redirects=1&titles=" + search;
			getJsonFromUrl(url, function(body) {
				for (var page in body.query.pages) {
        			var extract = body.query.pages[page].extract;
        			if(extract == undefined) {
						message.channel.send("*i can't find anything about that. beep boop.*");
						return;
        			}
        			if (extract.length >= 2000) {
        				extract = extract.substring(0, 1950) + "...\n\n*too long for me. beep boop.*";
        			}
        			message.channel.send(extract);
        			break;
        		}
        	}, function(error) {
        		message.channel.send("*i can't find anything about that. beep boop.*");
        	});
		}
		return;
	}
	if(cmd == "xkcd") {
		var urlLatest = "http://xkcd.com/info.0.json";
		getJsonFromUrl(urlLatest, function(body) {
			var r = Math.floor((Math.random() * body.num));
	    	var url = "http://xkcd.com/" + r + "/info.0.json";
	    	getJsonFromUrl(url, function(body) {
				message.channel.send(body.img);
	    	}, function(error) {
				console.log("error: " + error);
	    	});
		}, function(error) {
			console.log("error: " + error);
		});
    	return;
	}
	if(cmd.startsWith("ermahgerd")) {
		if(spaceIndex == -1) {
			message.channel.send("*give me something to translate. beep boop.*");
		} else {
			var mentions = Array.from(message.mentions.users.values());
			if(mentions == undefined || mentions.length == 0) {
				var text = cmd.substr(spaceIndex + 1);
				var url = "http://ermahgerd.herokuapp.com/ternslert?value=" + text;
   				getJsonFromUrl(url, function(body) {
   					var value = body.value;
					if(value) message.channel.send(value);
   				});
			} else {
				mentions.forEach(function(item, index, array) {
					// var m = user.getMessage(message.channel, user.lastMessage.id)
					// var text = m.content;
					if(item != message.author) {
						var text = item.lastMessage.content;
						var url = "http://ermahgerd.herokuapp.com/ternslert?value=" + text;
						getJsonFromUrl(url, function(body) {
							var value = body.value;
							if(value) message.channel.send(value);
						});
					} else {
						message.channel.send("*cannot do that to yourself. beep boop.*");
					}
				});
			}
		}
		return;
	}
	if(cmd.startsWith("8ball")) {
		if(spaceIndex == -1) {
			message.channel.send("*give me a question and i will give an answer. beep boop.*");
		} else {
			if(cmd.includes("?")) {
				message.channel.send(get8BallAnswer());
			} else {
				message.channel.send("*that is not a question, fool. beep boop.*");
			}
		}
		return;
	}
	if(cmd.startsWith("insult")) {
		var mentions = Array.from(message.mentions.users.values());
		if (message.mentions.everyone) {
			client.users.forEach(function(item, index, array) {
				message.channel.send(Insulter.insult(item.username));
			});
			return;
		}
		if (mentions == undefined || mentions.length == 0) {
			message.channel.send("*tell me who to insult. beep boop.*");
		} else {
			mentions.forEach(function(item, index, array) {
				message.channel.send(Insulter.insult(item.username));
			});
		}
		return;
	}
	if(cmd.startsWith("translate")) {
		var split = cmd.split(" ");

		if(split.length < 4) {
			message.channel.send("*give me something to translate. beep boop.*");
			return;
		}

		// Gets everything after the third space
		var str = cmd.split(' ').slice(3).join(' ');

		// console.log("Translating: '" + str + "' from: '" + split[1] + "' to: '" + split[2]) + "'";
		translate(str, { from: split[1], to: split[2] }).then(res => {
		    message.channel.send(res.text);
		}).catch(err => {
		    console.error(err);
		});
		return;
	}
	if(cmd.startsWith("league")) {
		if (!auth.riot_api_key) {
			console.log("riot_api_key not found in auth.json");
			return;
		}
		if (spaceIndex == -1) {
			message.channel.send("*give me something to search for. beep boop.*");
		} else {
			var summoner = cmd.substr(spaceIndex + 1);
			var reg = "euw1";

			var urlSummoner = "https://" + reg + ".api.riotgames.com/lol/summoner/v3/summoners/by-name/" + summoner + "?api_key=" + auth.riot_api_key;
			getJsonFromUrl(urlSummoner, function(body) {
				var summId = body.id;
				var name = body.name;

				var urlMastery = "https://" + reg + ".api.riotgames.com/lol/champion-mastery/v3/champion-masteries/by-summoner/" + summId + "?api_key=" + auth.riot_api_key;
				getJsonFromUrl(urlMastery, function(body) {
					if(body[0] == undefined) {
						message.channel.send("*could not find information for this summoner. beep boop.*");
						return;
					}
					var topChampId = body[0].championId;

					var urlChampion = "https://" + reg + ".api.riotgames.com/lol/static-data/v3/champions/" + topChampId + "?locale=en_US&tags=info&api_key=" + auth.riot_api_key;
					getJsonFromUrl(urlChampion, function(body) {
						var topChampName = body.name;

						var urlLeague = "https://" + reg + ".api.riotgames.com/lol/league/v3/positions/by-summoner/" + summId + "?api_key=" + auth.riot_api_key;
						getJsonFromUrl(urlLeague, function(body) {
							if(body[0] == undefined) {
								message.channel.send(name + "'s favourite champion is " + topChampName + ". They haven't even played ranked, the scrub.");
								return;
							}
							var firstQueue = body[0];
							var tier = capitalizeFirstLetter(firstQueue.tier);
							var rank = firstQueue.rank;
							var lp = firstQueue.leaguePoints;

							message.channel.send(name + " is a " + tier + " " + rank + " scrub (" + lp + "lp). Their favourite champion is " + topChampName + ".");
						});
					});
				});
			}, function(error) {
				message.channel.send("*that summoner doesn't exist. beep boop*");
			});
		}
		return;
	}
	if(cmd.startsWith("role")) {
		if (spaceIndex == -1) {
			message.channel.send("*give me a role to search for. beep boop.*");
		} else {
			var numChamps = 5;
			var role = cmd.substr(spaceIndex + 1).trim().toLowerCase();
			if(role != "top" && role != "jungle" && role != "mid" && role != "adc" && role != "support") {
				return message.channel.send("*i do not know that role. beep boop.*");
			}

			var url = "http://api.champion.gg/v2/champions?limit=50&sort=winRate-desc&api_key=" + auth.championgg_api_key;
			var champions = [];
			getJsonFromUrl(url, function(body) {
				var patch = body[0].patch;
				for(var i = 0; i < body.length; i++) {
					if(body[i].role == "DUO_CARRY") body[i].role = "adc";
					if(body[i].role == "DUO_SUPPORT") body[i].role = "support";
					if(body[i].role == "MIDDLE") body[i].role = "mid";
					if(body[i].role.toLowerCase() == role) {
						champions.push(body[i].championId);
					}
					if(champions.length >= numChamps) break;
				}

				var champNames = [];
				for(var i = 0; i < champions.length; i++) {
					var urlChampion = "https://euw1.api.riotgames.com/lol/static-data/v3/champions/" + champions[i] + "?locale=en_US&tags=info&api_key=" + auth.riot_api_key;
					getJsonFromUrl(urlChampion, function(body) {
						champNames.push(body.name);
						if(champNames.length >= numChamps) {
							var str = "The champions with the highest win rate for " + role + " (patch " + patch + ") are ";
							for(var c = 0; c < champNames.length; c++) {
								str += champNames[c];
								if(c < champNames.length - 2) str += ", ";
								if(c == champNames.length - 2) str += " and ";
								if(c == champNames.length - 1) str += ".";
							}
							message.channel.send(str);
						}
					}, function(error) {console.log(error)});
				}
			}, function(error) {console.log(error)});
		}
		return;
	}
	if(cmd == "bans") {
		var numChamps = 5;
		var url = "http://api.champion.gg/v2/champions?limit=" + numChamps + "&sort=banRate-desc&api_key=" + auth.championgg_api_key;
		var champNames = [];
		getJsonFromUrl(url, function(body) {
			var patch = body[0].patch;

			for(var i = 0; i < body.length; i++) {
				var urlChampion = "https://euw1.api.riotgames.com/lol/static-data/v3/champions/" + body[i].championId + "?locale=en_US&tags=info&api_key=" + auth.riot_api_key;
				getJsonFromUrl(urlChampion, function(body) {
					champNames.push(body.name);
					if(champNames.length >= numChamps) {
						var str = "The most popular champions to ban (patch " + patch + ") are ";
						for(var c = 0; c < champNames.length; c++) {
							str += champNames[c];
							if(c < champNames.length - 2) str += ", ";
							if(c == champNames.length - 2) str += " and ";
							if(c == champNames.length - 1) str += ".";
						}
						message.channel.send(str);
					}
				});
			}
		});
		return;
	}
	if(cmd.startsWith("music")) {
		if (spaceIndex == -1) {
			message.channel.send("*i need more than that. beep boop.*");
			return;
		} else {
			var cmd2 = cmd.substr(spaceIndex + 1)
			if(cmd2 == "join") {
				music.join(client, message);
				return;
			}
			if(cmd2 == "leave") {
				music.leave(client, message);
				return;
			}
			if(cmd2.startsWith("play")) {
				var si = cmd2.indexOf(' ');
				if(si == -1) {
					message.channel.send("*give me a url or something to search. beep boop.*");
				} else {
					var cmd3 = cmd2.substr(si + 1);
					music.play(client, message, cmd3);
				}
				return;
			}
			if(cmd2 == "clear") {
				music.clearQueue(message);
				return;
			}
			if(cmd2 == "skip") {
				music.skip(client, message);
				return;
			}
			if(cmd2 == "pause") {
				music.pause(client, message);
				return;
			}
			if(cmd2 == "resume") {
				music.resume(client, message);
				return;
			}
			if(cmd2 == "queue") {
				music.showQueue(client, message);
				return;
			}
			if(cmd2.startsWith("volume")) {
				var si = cmd2.indexOf(' ');
				if(si == -1) {
					music.volume(client, message);
				} else {
					var cmd3 = cmd2.substr(si + 1);
					var n = parseInt(cmd3);
					if(!isNaN(n)) {
						music.volume(client, message, n);
					} else {
						message.channel.send("*volume must be a number. beep boop.*");
					}
				}
				return;
			}
			if(cmd2 == "help") {
				message.channel.send(getMusicHelpText());
				return;
			}
		}
	}
	if(cmd == "elaineelaineelaine") {
		message.channel.send("*Beeeeennnnn!!!!*");
		return;
	}
	if(cmd == "hurryupjazer") {
		url = "https://api.github.com/repos/nythril/quaver/branches/nightly";
		getJsonFromUrl(url, function(body) {
			var iso8601 = body.commit.commit.author.date;
			var dateCurrent = new Date();
			var dateCommit = new Date(iso8601);
			var interval = dateInterval(dateCommit, dateCurrent);

			var str = "It has been ";
			if(interval.years > 0) {
				str += interval.years + " years";
			} else if(interval.months > 0) {
				str += interval.months + " months" + (interval.days > 0 ? " and " + interval.days + " days" : "");	
			} else if(interval.days > 0) {
				str += interval.days + " days and " + interval.hours + " hours";
			} else if(interval.hours > 0) {
				str += interval.hours + " hours and " + interval.minutes + " minutes";
			} else {
				str += interval.minutes + " minutes";
			}

			message.channel.send(str + " since Quaver's last nightly commit. Get a move on!");
		}, null, {
			// Github api requests require a User-Agent in the header
			headers: { 'User-Agent': 'KianBennett' }
		});
		return;
	}
	if(cmd == "help") {
		message.channel.send(getHelpText());
		return;
	}
	if(cmd == "shutdown") {
		message.channel.send("*i am not loved. beep boop. shutting down...*");
		client.destroy();
		return;
	}
	if(cmd == "update") {
		message.channel.send("*checking for updates. beep boop.*");

		console.log("sending pull request...");
		// sends github pull request. if an update is found nodemon will automatically detect it and restart
		exec('git pull origin master', function(error, stdout, stderr) {
			console.log(stdout);
		});
		return;
	}
	message.channel.send("*unrecognised command. beep boop.*");
}

function getJsonFromUrl(url, onResponse, onError, opt) {
	var options = { url:url, json:true };
	// Merge the values of options parameter into the default options
	if(opt != undefined) {
		options = Object.assign(options, opt);
	}
	request.get(options, function (error, response, body) {
    	if (!error && response.statusCode == 200) {
    		if(onResponse) onResponse(body);
    	} else {
    		if(onError) onError(JSON.stringify(response));
    	}
	});
}

function getHelpText() {
	var s = "*these are my commands. beep boop.*\n\n" +
	"!wave\n" +
	"!joke\n" +
	"!gif <search>\n" +
	"!wiki <search>\n" +
	"!xkcd\n" +
	"!8ball <question>\n" +
	"!insult <victim(s)>\n" +
	"!translate <from> <to> <text>\n" +
	"!league <summoner>\n" +
	"!role <role>\n" +
	"!bans\n" +
	"!music help\n" +
	"!shutdown\n";
	return s;
}

function getMusicHelpText() {
	var s = "!music join\n" +
	"!music leave\n" +
	"!music play <search/url>\n" +
	"!music clear\n" +
	"!music skip\n" + 
	"!music pause\n" + 
	"!music resume\n" + 
	"!music queue\n" + 
	"!music volume <volume>\n" +
	"\n*beep boop.*";
	return s;
}

function get8BallAnswer() {
	var values = [
		"It is certain.",
		"It is decidedly so.",
		"Without a doubt.",
		"Yes, definitely!",
		"You may rely on it.",
		"As I see it, yes.",
		"Most likely.",
		"Outlook good.",
		"Yes.",
		"Signs point to yes.",
		"Reply hazy, try again.",
		"Ask again later.",
		"Better not tell you now.",
		"Cannot predict now.",
		"Concentrate and ask again.",
		"Don't count on it.",
		"My reply is no.",
		"My sources say no.",
		"Outlook not so good.",
		"Very doubtful.",
	];
	var r = Math.floor((Math.random() * values.length));
	return values[r];
}

var Insulter = {
    a: 'tossing,bloody,shitting,wanking,stinky,raging,dementing,dumb,dipping,fucking,dipping,holy,maiming,cocking,ranting,twunting,hairy,spunking,flipping,slapping,sodding,blooming,frigging,sponglicking,guzzling,glistering,cock wielding,failed,artist formally known as,unborn,pulsating,naked,throbbing,lonely,failed,stale,spastic,senile,strangely shaped,virgin,bottled,twin-headed,fat,gigantic,sticky,prodigal,bald,bearded,horse-loving,spotty,spitting,dandy,fritzl-admiring,friend of a,indeterminable,overrated,fingerlicking,diaper-wearing,leg-humping,gold-digging,mong loving,trout-faced,cunt rotting,flip-flopping,rotting,inbred,badly drawn,undead,annoying,whoring,leaking,dripping,racist,slutty,cross-eyed,irrelevant,mental,rotating,scurvy looking,rambling,gag sacking,cunting,wrinkled old,dried out,sodding,funky,silly,unhuman,bloated,wanktastic,bum-banging,cockmunching,animal-fondling,stillborn,scruffy-looking,hard-rubbing,rectal,glorious,eye-less,constipated,bastardized,utter,hitler\'s personal,irredeemable,complete,enormous,go suck a,fuckfaced,broadfaced,titless,son of a,demonizing,pigfaced,treacherous,retarded'.split(','),
    b: 'cock,tit,cunt,wank,piss,crap,shit,arse,sperm,nipple,anus,colon,shaft,dick,poop,semen,slut,suck,earwax,fart,scrotum,cock-tip,tea-bag,jizz,cockstorm,bunghole,food trough,bum,butt,shitface,ass,nut,ginger,llama,tramp,fudge,vomit,cum,lard,puke,sphincter,nerf,turd,cocksplurt,cockthistle,dickwhistle,gloryhole,gaylord,spazz,nutsack,fuck,spunk,shitshark,shitehawk,fuckwit,dipstick,asswad,chesticle,clusterfuck,douchewaffle,retard'.split(','), 
    c: 'force,bottom,hole,goatse,testicle,balls,bucket,biscuit,stain,boy,flaps,erection,mange,twat,twunt,mong,spack,diarrhea,sod,excrement,faggot,pirate,asswipe,sock,sack,barrel,head,zombie,alien,minge,candle,torch,pipe,bint,jockey,udder,pig,dog,cockroach,worm,MILF,sample,infidel,spunk-bubble,stack,handle,badger,wagon,bandit,lord,bogle,bollock,tranny,knob,nugget,king,hole,kid,trailer,lorry,whale,rag,foot'.split(','),
    d: 'licker,raper,lover,shiner,blender,fucker,assjacker,butler,packer,rider,wanker,sucker,felcher,wiper,experiment,wiper,bender,dictator,basher,piper,slapper,fondler,plonker,bastard,handler,herder,fan,amputee,extractor,professor,graduate,voyeur'.split(','),
    
    combos: ['a,b,c', 'a,b,d', 'b,c', 'b,d'],

    constructor: function() {
        this.combos = this.combos.map(function(c){return c.split(',')});
        this.insult();
    },
    
    insult: function(name) {
        var insult = this.get();
        var startsWithVowel = insult.startsWith("a") || insult.startsWith("e") || insult.startsWith("i") || insult.startsWith("o") || insult.startsWith("u");
        return name + " is a" + (startsWithVowel ? "n " : " ") + insult + ".";;
    },
    
    get: function(){
    	var a_r = this.a[Math.floor((Math.random() * this.a.length))];
    	var b_r = this.b[Math.floor((Math.random() * this.b.length))];
    	var c_r = this.c[Math.floor((Math.random() * this.c.length))];
    	var d_r = this.d[Math.floor((Math.random() * this.d.length))];

    	var r = Math.floor((Math.random() * this.combos.length));

    	if(r == 0) return a_r + " " + b_r + " " + c_r;
    	if(r == 1) return a_r + " " + b_r + " " + d_r;
    	if(r == 2) return b_r + " " + c_r;
    	if(r == 3) return b_r + " " + d_r;
    }        
};

function capitalizeFirstLetter(str) {
    return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1);
}

// from https://stackoverflow.com/questions/1968167/difference-between-dates-in-javascript
function dateInterval(date1, date2) {
    if (date1 > date2) { // swap
        var result = interval(date2, date1);
        result.years  	= -result.years;
        result.months 	= -result.months;
        result.days   	= -result.days;
        result.hours  	= -result.hours;
        result.minutes 	= -result.minutes;
        return result;
    }
    result = {
        years:  	date2.getYear()  - date1.getYear(),
        months: 	date2.getMonth() - date1.getMonth(),
        days:   	date2.getDate()  - date1.getDate(),
        hours:  	date2.getHours() - date1.getHours(),
        minutes:  	date2.getMinutes() - date1.getMinutes()
    };
    if(result.minutes < 0) {
    	result.hours--;
    	result.minutes += 60;
    }
    if (result.hours < 0) {
        result.days--;
        result.hours += 24;
    }
    if (result.days < 0) {
        result.months--;
        // days = days left in date1's month, 
        //   plus days that have passed in date2's month
        var copy1 = new Date(date1.getTime());
        copy1.setDate(32);
        result.days = 32-date1.getDate()-copy1.getDate()+date2.getDate();
    }
    if (result.months < 0) {
        result.years--;
        result.months+=12;
    }
    return result;
}