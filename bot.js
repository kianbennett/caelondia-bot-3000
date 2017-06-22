const request = require('request');
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

	if(cmd == "wave") {
		message.channel.send("*waves back at " + message.author.username + "*");
		return;
	}
	if(cmd == "joke") {
		request.get({ url:"https://icanhazdadjoke.com/", json:true }, function (error, response, body) {
            if (!error && response.statusCode == 200) {
                message.channel.send(body.joke);
            }
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
	message.channel.send("*unrecognised command. beep boob.*");
}

function getHelpText() {
	var s = "*these are my commands. beep boop.*\n\n" +
	"!wave\n" +
	"!joke\n" +
	"!shutdown\n";
	return s;
}