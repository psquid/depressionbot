var fs = require('fs');
var timers = require('./timer');
var jsbot = require('./jsbot');
require('./snippets');

var DBot = function(timers) {
    // Load external files
    this.config = JSON.parse(fs.readFileSync('config.json', 'utf-8'));
    this.db = null;
    var rawDB;
    try {
        var rawDB = fs.readFileSync('db.json', 'utf-8');
    } catch (e) {
        this.db = {};  /* if no db file, make empty one */
    }
    if(!this.db) {  /* if it wasn't empty */
        this.db = JSON.parse(rawDB);
    }

    /* repair any deficiencies in the DB; if this is a new DB, that's everything */
    if(!this.db.hasOwnProperty("bans")) {
        this.db.bans = {};
    }
    if(!this.db.bans.hasOwnProperty("*")) {
        this.db.bans["*"] = [];
    }
    if(!this.db.hasOwnProperty("quoteArrs")) {
        this.db.quoteArrs = {};
    }
    if(!this.db.hasOwnProperty("kicks")) {
        this.db.kicks = {};
    }
    if(!this.db.hasOwnProperty("kickers")) {
        this.db.kickers = {};
    }
    if(!this.db.hasOwnProperty("modehate")) {
        this.db.modehate = [];
    }
    if(!this.db.hasOwnProperty("locks")) {
        this.db.locks = [];
    }

    // Populate bot properties with config data
    this.name = this.config.name || 'dbox';
    this.admin = this.config.admin || [ 'reality' ];
    this.password = this.config.password || 'lolturtles';
    this.nickserv = this.config.nickserv || 'zippy';
    this.server = this.config.server || 'elara.ivixor.net';
    this.port = this.config.port || 6667;
    this.webPort = this.config.webPort || 443;
    this.moduleNames = this.config.modules || [ 'command', 'js', 'admin', 'kick', 'modehate', 'quotes', 'puns', 'spelling', 'web', 'youare' ];
    this.sessionData = {};

    this.timers = timers.create();

    this.instance = jsbot.createJSBot(this.name, this.server, this.port, this, function() {
            if(this.config.hasOwnProperty('channels')) {
                this.config.channels.each(function(channel) {
                    this.instance.join(channel);
                }.bind(this));
        }
    }.bind(this), this.nickserv, this.password);

    // Load the modules and connect to the server
    this.reloadModules();
    this.instance.connect();
};

// Say something in a channel
DBot.prototype.say = function(channel, data) {
    this.instance.say(channel, data);
};

DBot.prototype.act = function(channel, data) {
    this.instance.send('PRIVMSG', channel, ':\001ACTION ' + data + '\001');
}

// Save the database file
DBot.prototype.save = function() {
    fs.writeFile('db.json', JSON.stringify(this.db, null, '    '));
};

// Hot-reload module files.
DBot.prototype.reloadModules = function() {
    if(this.modules) { // Run 'onDestroy' code for each module if it exists.
        this.modules.each(function(module) {
            if(module.onDestroy) {
                module.onDestroy();
            }
        });
    }

    this.rawModules = [];
    this.modules = [];
    this.commands = {};
    this.timers.clearTimers();
    this.save();

    // enforce having command. it can still be reloaded, but dbot _will not_ function without it, so not having it should be impossible
    if(!this.moduleNames.include("command")) {
        this.moduleNames.push("command");
    }

    // Reload Javascript snippets
    var path = require.resolve('./snippets');
    delete require.cache[path];
    require('./snippets');

    this.moduleNames.each(function(name) {
        var cacheKey = require.resolve('./modules/' + name);
        delete require.cache[cacheKey];
        try {
            this.rawModules.push(require('./modules/' + name));
        } catch(err) {
            console.log('Failed to load module: ' + name);
        }
    }.bind(this));

    this.instance.removeListeners();

    this.modules = this.rawModules.collect(function(rawModule) {
        var module = rawModule.fetch(this);

        if(module.listener) {
            this.instance.addListener(module.on, module.listener);
        }

        if(module.onLoad) {
            var newCommands = module.onLoad();
            for(key in newCommands) {
                if(newCommands.hasOwnProperty(key) && Object.prototype.isFunction(newCommands[key])) {
                    this.commands[key] = newCommands[key];
                }
            }
        }

        return module;
    }.bind(this));
};

DBot.prototype.cleanNick = function(key) {
    key = key.toLowerCase();
    while(key.endsWith("_")) {
        if(this.db.quoteArrs.hasOwnProperty(key)) {
            return key;
        }
        key = key.substring(0, key.length-1);
    }
    return key;
}

new DBot(timers);
